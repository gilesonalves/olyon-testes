import type { Prisma, PrismaClient } from "../../../generated/prisma/client"
import { AppointmentStatus } from "../../../generated/prisma/client"
import {
  type AvailabilityConflictingAppointment,
  checkAvailabilityForSlot,
  type SuggestedSlot,
} from "@/lib/appointments/availability"
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
  allowConflict?: boolean
  notes?: string | null
}

export const MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE =
  "MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION"

export type ManualAppointmentConflictDetails = {
  reason: "APPOINTMENT_CONFLICT"
  requestedStartAt: Date
  requestedEndAt: Date
  conflictingAppointments: AvailabilityConflictingAppointment[]
  suggestions: SuggestedSlot[]
}

export class AppointmentCreationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AppointmentCreationError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AppointmentConflictRequiresConfirmationError extends AppointmentCreationError {
  code = MANUAL_APPOINTMENT_CONFLICT_REQUIRES_CONFIRMATION_CODE
  details: ManualAppointmentConflictDetails

  constructor(message: string, details: ManualAppointmentConflictDetails) {
    super(message)
    this.name = "AppointmentConflictRequiresConfirmationError"
    this.details = details
  }
}

function getMetadataObject(
  value: Prisma.InputJsonValue | undefined
): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return { ...(value as Prisma.InputJsonObject) }
}

function buildConflictAuditMetadata(params: {
  source: "ADMIN" | "WEB" | "WHATSAPP"
  conflictingAppointments: AvailabilityConflictingAppointment[]
}) {
  return {
    manualConflictOverride: {
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      confirmedBySource: params.source,
      conflictingAppointmentsCount: params.conflictingAppointments.length,
      conflictingAppointments: params.conflictingAppointments.map((appointment) => ({
        id: appointment.id,
        customerName: appointment.customerName,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        staffMembershipId: appointment.staffMembershipId,
        staffName: appointment.staffName,
      })),
    },
  } satisfies Prisma.InputJsonObject
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
    if (availability.reason === "APPOINTMENT_CONFLICT") {
      if (!params.input.allowConflict) {
        console.warn("[createAppointmentForStore] conflict requires confirmation", {
          storeId: params.storeId,
          source: params.source,
          requestedStartAt: availability.startAt.toISOString(),
          requestedEndAt: availability.endAt.toISOString(),
          conflictingAppointmentsCount: availability.conflictingAppointments.length,
        })

        throw new AppointmentConflictRequiresConfirmationError(availability.message, {
          reason: "APPOINTMENT_CONFLICT",
          requestedStartAt: availability.startAt,
          requestedEndAt: availability.endAt,
          conflictingAppointments: availability.conflictingAppointments,
          suggestions: availability.suggestions,
        })
      }
    } else {
      throw new AppointmentCreationError(availability.message)
    }
  }

  const appointmentStartAt = availability.startAt
  const appointmentEndAt = availability.endAt
  const metadata =
    !availability.available && availability.reason === "APPOINTMENT_CONFLICT"
      ? {
          ...getMetadataObject(params.metadata),
          ...buildConflictAuditMetadata({
            source: params.source,
            conflictingAppointments: availability.conflictingAppointments,
          }),
        }
      : params.metadata

  return params.db.appointment.create({
    data: {
      storeId: params.storeId,
      status: AppointmentStatus.SCHEDULED,
      serviceId: service.id,
      staffMembershipId: params.input.staffMembershipId,
      customerName: params.input.customerName,
      customerPhone: params.input.customerPhone ?? undefined,
      customerEmail: params.input.customerEmail ?? undefined,
      startAt: appointmentStartAt,
      endAt: appointmentEndAt,
      notes: params.input.notes ?? undefined,
      source: params.source,
      metadata,
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
