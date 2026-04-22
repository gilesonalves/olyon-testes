import { prisma } from "@/lib/prisma"
import { badRequest, notFound, ok, serverError } from "@/lib/api/response"
import { findActiveStoreBySlug } from "@/lib/public-booking"
import { PublicAppointmentAvailabilityQuerySchema } from "@/lib/validators/appointment"
import {
  listEligibleStaffForService,
  listAvailableSlotsForDate,
} from "@/lib/appointments/availability"
import {
  getBotTimezone,
  getDateKeyInTimeZone,
  getTimeKeyInTimeZone,
} from "@/lib/bot/datetime"

type Params = {
  params: Promise<{ slug: string }>
}

function serializeSlot(
  slot: {
    startAt: Date
    endAt: Date
    label: string
  },
  timeZone: string
) {
  return {
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    date: getDateKeyInTimeZone(slot.startAt, timeZone),
    time: getTimeKeyInTimeZone(slot.startAt, timeZone),
    endTime: getTimeKeyInTimeZone(slot.endAt, timeZone),
    label: slot.label,
  }
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { slug } = await params
    const store = await findActiveStoreBySlug(slug)

    if (!store) {
      return notFound("Loja nao encontrada.")
    }

    const { searchParams } = new URL(req.url)
    const parsed = PublicAppointmentAvailabilityQuerySchema.safeParse({
      serviceId: searchParams.get("serviceId"),
      staffMembershipId: searchParams.get("staffMembershipId"),
      searchDate: searchParams.get("searchDate"),
    })

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" | ") || "Query invalida"
      )
    }

    const input = parsed.data
    const timeZone = getBotTimezone()

    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        storeId: store.id,
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

    const eligibleStaff = await listEligibleStaffForService({
      db: prisma,
      storeId: store.id,
      serviceId: service.id,
    })

    const selectedProfessional = eligibleStaff.find(
      (professional) => professional.membershipId === input.staffMembershipId
    )

    if (!selectedProfessional) {
      return badRequest("O profissional selecionado nao executa esse servico nesta loja.")
    }

    const currentDateKey = getDateKeyInTimeZone(new Date(), timeZone)

    if (input.searchDate < currentDateKey) {
      return ok([])
    }

    const slots = await listAvailableSlotsForDate({
      db: prisma,
      storeId: store.id,
      dateKey: input.searchDate,
      durationMin: service.durationMin,
      timeZone,
      staffMembershipId: selectedProfessional.membershipId,
      notBefore: input.searchDate === currentDateKey ? new Date() : null,
    })

    return ok(slots.map((slot) => serializeSlot(slot, timeZone)))
  } catch (e) {
    console.error("[GET /api/public/agenda/[slug]/availability]", e)
    return serverError()
  }
}
