import { NextRequest } from "next/server"
import { AppointmentStatus, prisma } from "@/lib/prisma"
import { blockedScheduleCreateSchema } from "@/lib/validators/schedule"
import { getCurrentStoreIdOrThrow } from "@/lib/store/current-store"
import {
  addDaysToDateKey,
  combineDateKeyAndTime,
  getBotTimezone,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
} from "@/lib/bot/datetime"

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
] as const

const BLOCK_CONFLICT_REQUIRES_CONFIRMATION_CODE =
  "APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION"

type BlockedWindow = {
  startAt: Date
  endAt: Date
}

function normalizeMembershipId(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function resolveProfessionalMembershipId(storeId: string, membershipId: string | null) {
  if (!membershipId) {
    return null
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      storeId,
      types: { some: { type: "PROFISSIONAL" } },
    },
    select: { id: true },
  })

  if (!membership) {
    throw new Error("Profissional invalido para a loja atual.")
  }

  return membership.id
}

function buildBlockedWindows(params: {
  dates: string[]
  allDay: boolean
  startTime?: string
  endTime?: string
  timeZone: string
}) {
  return params.dates.map((dateKey) => ({
    startAt: params.allDay
      ? combineDateKeyAndTime(dateKey, "00:00", params.timeZone)
      : combineDateKeyAndTime(dateKey, params.startTime ?? "00:00", params.timeZone),
    endAt: params.allDay
      ? combineDateKeyAndTime(addDaysToDateKey(dateKey, 1), "00:00", params.timeZone)
      : combineDateKeyAndTime(dateKey, params.endTime ?? "00:00", params.timeZone),
  })) satisfies BlockedWindow[]
}

async function listConflictingAppointments(params: {
  db: Pick<typeof prisma, "appointment">
  storeId: string
  membershipId: string | null
  windows: BlockedWindow[]
}) {
  return params.db.appointment.findMany({
    where: {
      storeId: params.storeId,
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
      ...(params.membershipId ? { staffMembershipId: params.membershipId } : {}),
      OR: params.windows.map((window) => ({
        startAt: { lt: window.endAt },
        endAt: { gt: window.startAt },
      })),
    },
    select: {
      id: true,
      customerName: true,
      startAt: true,
      endAt: true,
      staffMembershipId: true,
      membership: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
  })
}

function serializeConflictingAppointments(
  appointments: Awaited<ReturnType<typeof listConflictingAppointments>>,
  timeZone: string
) {
  return appointments.map((appointment) => ({
    id: appointment.id,
    customerName: appointment.customerName,
    date: getDateKeyInTimeZone(appointment.startAt, timeZone),
    startTime: getTimeKeyInTimeZone(appointment.startAt, timeZone),
    endTime: getTimeKeyInTimeZone(appointment.endAt, timeZone),
    staffMembershipId: appointment.staffMembershipId,
    staffName: appointment.membership?.user.name ?? null,
  }))
}

export async function GET(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)
    const timeZone = getBotTimezone()

    const items = await prisma.blockedSchedule.findMany({
      where: { storeId },
      include: {
        membership: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })

    const data = items.map((item) => ({
      id: item.id,
      date: getDateKeyInTimeZone(item.date, timeZone),
      allDay: item.allDay,
      startTime: item.startTime ?? undefined,
      endTime: item.endTime ?? undefined,
      membershipId: item.membership?.id ?? null,
      membershipName: item.membership?.user.name ?? null,
    }))

    return Response.json({ ok: true, data })
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { storeId } = await getCurrentStoreIdOrThrow(req)
    const timeZone = getBotTimezone()

    const body = await req.json()
    const parsed = blockedScheduleCreateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { ok: false, message: "Payload invalido", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const membershipId = await resolveProfessionalMembershipId(
      storeId,
      normalizeMembershipId(parsed.data.membershipId)
    )
    const { dates, allDay, startTime, endTime, conflictAction } = parsed.data
    const windows = buildBlockedWindows({
      dates,
      allDay,
      startTime,
      endTime,
      timeZone,
    })
    const result = await prisma.$transaction(async (tx) => {
      const conflictingAppointments = await listConflictingAppointments({
        db: tx,
        storeId,
        membershipId,
        windows,
      })

      if (conflictingAppointments.length > 0 && !conflictAction) {
        return {
          type: "conflict" as const,
          conflictingAppointments,
        }
      }

      const created = await tx.blockedSchedule.createMany({
        data: dates.map((dateKey) => ({
          storeId,
          membershipId,
          date: parseDateKey(dateKey),
          allDay,
          startTime: allDay ? null : (startTime ?? null),
          endTime: allDay ? null : (endTime ?? null),
        })),
      })

      let canceledAppointmentsCount = 0

      if (
        conflictAction === "CANCEL_CONFLICTING_APPOINTMENTS" &&
        conflictingAppointments.length > 0
      ) {
        const canceled = await tx.appointment.updateMany({
          where: {
            storeId,
            id: {
              in: conflictingAppointments.map((appointment) => appointment.id),
            },
            status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
          },
          data: {
            status: AppointmentStatus.CANCELED,
          },
        })

        canceledAppointmentsCount = canceled.count
      }

      return {
        type: "created" as const,
        createdCount: created.count,
        conflictingAppointmentsCount: conflictingAppointments.length,
        canceledAppointmentsCount,
      }
    })

    if (result.type === "conflict") {
      const message = `Existem ${result.conflictingAppointments.length} agendamentos ativos no periodo selecionado. Escolha se deseja mantê-los ou cancelá-los antes de salvar o bloqueio.`

      return Response.json(
        {
          ok: false,
          error: message,
          message,
          code: BLOCK_CONFLICT_REQUIRES_CONFIRMATION_CODE,
          details: {
            requiresConfirmation: true,
            conflictActionOptions: [
              "KEEP_EXISTING_APPOINTMENTS",
              "CANCEL_CONFLICTING_APPOINTMENTS",
            ],
            conflictingAppointmentsCount: result.conflictingAppointments.length,
            conflictingAppointments: serializeConflictingAppointments(
              result.conflictingAppointments,
              timeZone
            ),
          },
        },
        { status: 409 }
      )
    }

    return Response.json(
      {
        ok: true,
        data: {
          created: result.createdCount,
          conflictAction: conflictAction ?? null,
          conflictingAppointmentsCount: result.conflictingAppointmentsCount,
          canceledAppointmentsCount: result.canceledAppointmentsCount,
        },
      },
      { status: 201 }
    )
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "Erro"
    const status = msg === "Unauthorized" ? 401 : 400
    return Response.json({ ok: false, message: msg }, { status })
  }
}
