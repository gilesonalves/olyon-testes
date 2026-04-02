import type { Prisma, PrismaClient } from "../../../generated/prisma/client"
import { AppointmentStatus } from "../../../generated/prisma/client"
import { checkAvailabilityForSlot } from "@/lib/appointments/availability"
import { combineDateKeyAndTime, getBotTimezone } from "@/lib/bot/datetime"

type CreateAppointmentDbClient = Pick<
  PrismaClient,
  | "service"
  | "membership"
  | "appointment"
  | "weekScheduleDay"
  | "membershipWeekScheduleDay"
  | "blockedSchedule"
>

type CreateAppointmentInput = {
  serviceId: string
  staffMembershipId: string | null
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  date: string
  time: string
  allowPastScheduling?: boolean
  notes?: string | null
}

export class AppointmentCreationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AppointmentCreationError"
  }
}

export async function createAppointmentForStore(params: {
  db: CreateAppointmentDbClient
  storeId: string
  input: CreateAppointmentInput
  source: "ADMIN" | "WEB" | "WHATSAPP"
  metadata?: Prisma.InputJsonValue
}) {
  const timeZone = getBotTimezone()

  const service = await params.db.service.findFirst({
    where: {
      id: params.input.serviceId,
      storeId: params.storeId,
      active: true,
    },
    select: {
      id: true,
      durationMin: true,
    },
  })

  if (!service) {
    throw new AppointmentCreationError("Servico invalido para a loja atual.")
  }

  if (params.input.staffMembershipId) {
    const eligibleStaff = await params.db.membership.findFirst({
      where: {
        id: params.input.staffMembershipId,
        storeId: params.storeId,
        types: { some: { type: "PROFISSIONAL" } },
        services: { some: { serviceId: service.id } },
      },
      select: {
        id: true,
      },
    })

    if (!eligibleStaff) {
      throw new AppointmentCreationError(
        "O profissional selecionado nao executa esse servico nesta loja."
      )
    }
  }

  const requestedStartAt = combineDateKeyAndTime(params.input.date, params.input.time, timeZone)
  if (Number.isNaN(requestedStartAt.getTime())) {
    throw new AppointmentCreationError("Data/hora invalida.")
  }

  if (!params.input.allowPastScheduling && requestedStartAt.getTime() < Date.now()) {
    throw new AppointmentCreationError("Nao e possivel agendar no passado.")
  }

  const availability = await checkAvailabilityForSlot({
    db: params.db,
    storeId: params.storeId,
    requestedStartAt,
    durationMin: service.durationMin,
    timeZone,
    staffMembershipId: params.input.staffMembershipId,
    suggestionsLimit: 5,
  })

  if (!availability.available) {
    throw new AppointmentCreationError(availability.message)
  }

  return params.db.appointment.create({
    data: {
      storeId: params.storeId,
      status: AppointmentStatus.SCHEDULED,
      serviceId: service.id,
      staffMembershipId: params.input.staffMembershipId,
      customerName: params.input.customerName,
      customerPhone: params.input.customerPhone ?? undefined,
      customerEmail: params.input.customerEmail ?? undefined,
      startAt: availability.startAt,
      endAt: availability.endAt,
      notes: params.input.notes ?? undefined,
      source: params.source,
      metadata: params.metadata,
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
}
