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
  listEligibleStaffForService,
  listAvailableSlotsForDate,
} from "@/lib/appointments/availability"
import { getBotTimezone, getDateKeyInTimeZone } from "@/lib/bot/datetime"

function serializeSlot(slot: {
  startAt: Date
  endAt: Date
  label: string
}) {
  return {
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    label: slot.label,
  }
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
      searchDate: searchParams.get("searchDate"),
      searchStartAt: searchParams.get("searchStartAt"),
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
      notBefore: searchDate === currentDateKey ? new Date() : null,
    })

    return ok(slots.map(serializeSlot))
  } catch (e) {
    console.error("[GET /api/appointments/availability]", e)
    return serverError()
  }
}
