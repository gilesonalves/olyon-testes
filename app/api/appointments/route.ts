import { AppointmentStatus, prisma } from "@/lib/prisma"
import {
  badRequest,
  created,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import {
  AppointmentCreateSchema,
  AppointmentListQuerySchema,
} from "@/lib/validators/appointment"
import {
  AppointmentConflictRequiresConfirmationError,
  AppointmentCreationError,
  createAppointmentForStore,
  MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE,
} from "@/lib/appointments/create"
import {
  addDaysToDateKey,
  combineDateKeyAndTime,
  getBotTimezone,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
} from "@/lib/bot/datetime"

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

function serializeSlot(slot: {
  startAt: Date
  endAt: Date
  label: string
}, timeZone: string) {
  return {
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    date: getDateKeyInTimeZone(slot.startAt, timeZone),
    time: getTimeKeyInTimeZone(slot.startAt, timeZone),
    endTime: getTimeKeyInTimeZone(slot.endAt, timeZone),
    label: slot.label,
  }
}

function getValidDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getSafeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function serializeSlotSafely(slot: {
  startAt: unknown
  endAt: unknown
  label?: unknown
}, timeZone: string) {
  const startAt = getValidDate(slot.startAt)
  const endAt = getValidDate(slot.endAt)
  const label = getSafeString(slot.label, "Horario em conflito")

  if (!startAt || !endAt) {
    return {
      startAt: startAt?.toISOString() ?? "",
      endAt: endAt?.toISOString() ?? "",
      date: "",
      time: "",
      endTime: "",
      label,
    }
  }

  return serializeSlot(
    {
      startAt,
      endAt,
      label,
    },
    timeZone
  )
}

function serializeConflictingAppointmentsSafely(
  appointments: unknown,
  timeZone: string
) {
  if (!Array.isArray(appointments)) {
    return []
  }

  return appointments.map((appointment) => {
    const item =
      appointment && typeof appointment === "object"
        ? (appointment as Record<string, unknown>)
        : {}
    const startAt = getValidDate(item.startAt)
    const endAt = getValidDate(item.endAt)

    return {
      id: getSafeString(item.id, ""),
      customerName: getSafeString(item.customerName, "Cliente sem nome"),
      date: startAt ? getDateKeyInTimeZone(startAt, timeZone) : "",
      startTime: startAt ? getTimeKeyInTimeZone(startAt, timeZone) : "",
      endTime: endAt ? getTimeKeyInTimeZone(endAt, timeZone) : "",
      staffMembershipId:
        typeof item.staffMembershipId === "string" ? item.staffMembershipId : null,
      staffName: typeof item.staffName === "string" ? item.staffName : null,
    }
  })
}

function isManualConflictError(
  error: unknown
): error is AppointmentConflictRequiresConfirmationError {
  if (error instanceof AppointmentConflictRequiresConfirmationError) {
    return true
  }

  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as Record<string, unknown>
  const details =
    candidate.details && typeof candidate.details === "object"
      ? (candidate.details as Record<string, unknown>)
      : null

  return (
    candidate.code === MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE &&
    details !== null
  )
}

export async function GET(req: Request) {
  try {
    const guard = await requireMembershipRole("STAFF")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { searchParams } = new URL(req.url)
    const parsedQuery = AppointmentListQuerySchema.safeParse({
      date: searchParams.get("date"),
    })

    if (!parsedQuery.success) {
      return badRequest(
        parsedQuery.error.issues.map((issue) => issue.message).join(" | ") || "Query invalida"
      )
    }

    const timeZone = getBotTimezone()
    const where: {
      storeId: string
      status: {
        in: AppointmentStatus[]
      }
      startAt?: {
        gte: Date
        lte: Date
      }
    } = {
      storeId: guard.storeId,
      status: {
        in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
    }

    if (parsedQuery.data.date) {
      const dayStart = combineDateKeyAndTime(parsedQuery.data.date, "00:00", timeZone)
      const nextDayStart = combineDateKeyAndTime(
        addDaysToDateKey(parsedQuery.data.date, 1),
        "00:00",
        timeZone
      )

      where.startAt = {
        gte: dayStart,
        lte: new Date(nextDayStart.getTime() - 1),
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
      orderBy: [
        { startAt: "asc" },
        { createdAt: "desc" },
      ],
    })

    return ok(appointments.map((appointment) => serializeAppointment(appointment, timeZone)))
  } catch (error) {
    console.error("[GET /api/appointments]", error)
    return serverError()
  }
}

export async function POST(req: Request) {
  const timeZone = getBotTimezone()

  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const body = await req.json()
    const parsed = AppointmentCreateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" | ") || "Payload invalido"
      )
    }

    const input = parsed.data

    const createdByUser = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { name: true },
    })

    const appointment = await createAppointmentForStore({
      db: prisma,
      storeId: guard.storeId,
      input,
      source: "ADMIN",
      metadata: {
        createdBy: "panel",
        createdByUserId: guard.userId,
        createdByUserName: createdByUser?.name ?? null,
        createdByRole: guard.role,
      },
    })

    return created(serializeAppointment(appointment, timeZone))
  } catch (error) {
    if (isManualConflictError(error)) {
      const requestedStartAt = getValidDate(error.details.requestedStartAt)
      const requestedEndAt = getValidDate(error.details.requestedEndAt)
      const requestedSlot = serializeSlotSafely(
        {
          startAt: requestedStartAt,
          endAt: requestedEndAt,
          label:
            requestedStartAt && requestedEndAt
              ? `${getTimeKeyInTimeZone(requestedStartAt, timeZone)} - ${getTimeKeyInTimeZone(requestedEndAt, timeZone)}`
              : "Horario em conflito",
        },
        timeZone
      )
      const conflictingAppointments = serializeConflictingAppointmentsSafely(
        error.details.conflictingAppointments,
        timeZone
      )
      const suggestions = Array.isArray(error.details.suggestions)
        ? error.details.suggestions.map((slot) => serializeSlotSafely(slot, timeZone))
        : []
      const message =
        "Este horario entra em conflito com outro agendamento do profissional. Voce pode escolher outro horario ou confirmar este encaixe manual mesmo com risco de atraso."

      console.warn("[POST /api/appointments] conflict requires confirmation", {
        code: error.code,
        requestedSlot,
        conflictingAppointmentsCount: conflictingAppointments.length,
        suggestionsCount: suggestions.length,
      })

      return Response.json(
        {
          ok: false,
          error: message,
          message,
          code: MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE,
          details: {
            requiresConfirmation: true,
            canOverride: true,
            reason:
              error.details.reason === "APPOINTMENT_CONFLICT"
                ? error.details.reason
                : "APPOINTMENT_CONFLICT",
            requestedSlot,
            conflictingAppointmentsCount: conflictingAppointments.length,
            conflictingAppointments,
            suggestions,
          },
        },
        { status: 409 }
      )
    }

    if (error instanceof AppointmentCreationError) {
      return badRequest(error.message)
    }

    console.error("[POST /api/appointments]", error)
    return serverError()
  }
}
