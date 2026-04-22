import { prisma, type Prisma } from "@/lib/prisma"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { AppointmentStatusUpdateSchema } from "@/lib/validators/appointment"
import {
  getBotTimezone,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
} from "@/lib/bot/datetime"

type Params = {
  params: Promise<{ id: string }>
}

function serializeAppointment(appointment: {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  startAt: Date
  endAt: Date
  status: string
  source: string
  notes: string | null
  metadata: unknown
  createdAt: Date
  service: {
    id: string
    name: string
    durationMin: number
  } | null
  membership: {
    id: string
    user: {
      name: string
    }
  } | null
}, timeZone: string) {
  return {
    id: appointment.id,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    customerEmail: appointment.customerEmail,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    date: getDateKeyInTimeZone(appointment.startAt, timeZone),
    startTime: getTimeKeyInTimeZone(appointment.startAt, timeZone),
    endTime: getTimeKeyInTimeZone(appointment.endAt, timeZone),
    status: appointment.status,
    source: appointment.source,
    notes: appointment.notes,
    metadata: appointment.metadata,
    createdAt: appointment.createdAt.toISOString(),
    service: appointment.service,
    staff: appointment.membership
      ? {
          membershipId: appointment.membership.id,
          name: appointment.membership.user.name,
        }
      : null,
  }
}

function getMetadataRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, Prisma.JsonValue>
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return { error: "non-serializable payload" } as Prisma.InputJsonValue
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params
    const existing = await prisma.appointment.findFirst({
      where: {
        id,
        storeId: guard.storeId,
      },
      select: {
        id: true,
        status: true,
        metadata: true,
      },
    })

    if (!existing) {
      return notFound("Agendamento nao encontrado.")
    }

    const body = await req.json()
    const parsed = AppointmentStatusUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" | ") || "Payload invalido"
      )
    }

    const actor = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { name: true },
    })

    const changedAt = new Date().toISOString()
    const statusChangeEntry = {
      from: existing.status,
      to: parsed.data.status,
      changedAt,
      changedBy: "panel",
      changedByUserId: guard.userId,
      changedByUserName: actor?.name ?? null,
      changedByRole: guard.role,
    }

    const metadataRecord = getMetadataRecord(existing.metadata)
    const metadataPayload = metadataRecord
      ? {
          ...metadataRecord,
          lastStatusChange: statusChangeEntry,
          statusHistory: Array.isArray(metadataRecord.statusHistory)
            ? [...metadataRecord.statusHistory, statusChangeEntry]
            : [statusChangeEntry],
        }
      : existing.metadata == null
        ? {
            lastStatusChange: statusChangeEntry,
            statusHistory: [statusChangeEntry],
          }
        : {
            legacyMetadata: existing.metadata,
            lastStatusChange: statusChangeEntry,
            statusHistory: [statusChangeEntry],
          }

    const timeZone = getBotTimezone()
    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        metadata: toJsonValue(metadataPayload),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMin: true,
          },
        },
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
    })

    return ok(serializeAppointment(appointment, timeZone))
  } catch (e) {
    console.error("[PATCH /api/appointments/[id]/status]", e)
    return serverError()
  }
}
