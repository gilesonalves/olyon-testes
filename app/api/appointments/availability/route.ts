import { prisma } from "@/lib/prisma"
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { AppointmentAvailabilityQuerySchema } from "@/lib/validators/appointment"
import {
  checkAvailabilityForSlot,
  listEligibleStaffForService,
  listAvailableSlotsForDate,
} from "@/lib/appointments/availability"
import {
  getBotTimezone,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
} from "@/lib/bot/datetime"

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

export async function GET(req: Request) {
  try {
    const guard = await requireMembershipRole("STAFF")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { searchParams } = new URL(req.url)
    const parsed = AppointmentAvailabilityQuerySchema.safeParse({
      serviceId: searchParams.get("serviceId"),
      staffMembershipId: searchParams.get("staffMembershipId"),
      excludeAppointmentId: searchParams.get("excludeAppointmentId"),
      searchDate: searchParams.get("searchDate"),
      searchStartAt: searchParams.get("searchStartAt"),
      validateSelection: searchParams.get("validateSelection"),
    })

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" | ") || "Query invalida"
      )
    }

    const input = parsed.data
    const timeZone = getBotTimezone()
    const searchDate =
      input.searchDate ??
      (input.searchStartAt ? getDateKeyInTimeZone(input.searchStartAt, timeZone) : null)

    if (!searchDate) {
      return badRequest("Data da busca e obrigatoria.")
    }

    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        storeId: guard.storeId,
        active: true,
      },
      select: {
        id: true,
        durationMin: true,
      },
    })

    if (!service) {
      return badRequest("Servico invalido para a loja atual.")
    }

    let resolvedStaffMembershipId = input.staffMembershipId

    if (resolvedStaffMembershipId) {
      const eligibleStaff = await prisma.membership.findFirst({
        where: {
          id: resolvedStaffMembershipId,
          storeId: guard.storeId,
          types: { some: { type: "PROFISSIONAL" } },
          services: { some: { serviceId: input.serviceId } },
        },
        select: {
          id: true,
        },
      })

      if (!eligibleStaff) {
        return badRequest("O profissional selecionado nao executa esse servico nesta loja.")
      }
    } else {
      const eligibleStaff = await listEligibleStaffForService({
        db: prisma,
        storeId: guard.storeId,
        serviceId: input.serviceId,
      })

      if (eligibleStaff.length === 0) {
        return badRequest("Nao ha profissional elegivel para esse servico nesta loja.")
      }

      if (eligibleStaff.length > 1) {
        return badRequest("Selecione um profissional para consultar horarios disponiveis.")
      }

      resolvedStaffMembershipId = eligibleStaff[0].membershipId
    }

    if (input.validateSelection) {
      if (!input.searchStartAt) {
        return badRequest("Horario inicial da validacao e obrigatorio.")
      }

      const validation = await checkAvailabilityForSlot({
        db: prisma,
        storeId: guard.storeId,
        requestedStartAt: input.searchStartAt,
        durationMin: service.durationMin,
        timeZone,
        staffMembershipId: resolvedStaffMembershipId,
        ignoreAppointmentId: input.excludeAppointmentId,
        suggestionsLimit: 5,
      })

      const requestedSlot = serializeSlotSafely(
        {
          startAt: validation.startAt,
          endAt: validation.endAt,
          label: `${getTimeKeyInTimeZone(validation.startAt, timeZone)} - ${getTimeKeyInTimeZone(validation.endAt, timeZone)}`,
        },
        timeZone
      )
      const suggestions = validation.suggestions.map((slot) =>
        serializeSlotSafely(slot, timeZone)
      )
      const conflictingAppointments = validation.available
        ? []
        : serializeConflictingAppointmentsSafely(
            validation.conflictingAppointments,
            timeZone
          )

      if (!validation.available && validation.reason === "APPOINTMENT_CONFLICT") {
        console.warn("[GET /api/appointments/availability] conflict detected", {
          requestedSlot,
          conflictingAppointmentsCount: conflictingAppointments.length,
          suggestionsCount: suggestions.length,
        })
      }

      return ok({
        available: validation.available,
        canOverride: !validation.available && validation.reason === "APPOINTMENT_CONFLICT",
        reason: validation.available ? null : validation.reason,
        message: validation.available ? null : validation.message,
        slot: requestedSlot,
        suggestions,
        conflictingAppointmentsCount: validation.available
          ? 0
          : conflictingAppointments.length,
        conflictingAppointments,
      })
    }

    const currentDateKey = getDateKeyInTimeZone(new Date(), timeZone)

    if (searchDate < currentDateKey) {
      return ok([])
    }

    const slots = await listAvailableSlotsForDate({
      db: prisma,
      storeId: guard.storeId,
      dateKey: searchDate,
      durationMin: service.durationMin,
      timeZone,
      staffMembershipId: resolvedStaffMembershipId,
      ignoreAppointmentId: input.excludeAppointmentId,
      notBefore: searchDate === currentDateKey ? new Date() : null,
    })

    return ok(slots.map((slot) => serializeSlot(slot, timeZone)))
  } catch (e) {
    console.error("[GET /api/appointments/availability]", e)
    return serverError()
  }
}
