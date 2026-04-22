import { prisma } from "@/lib/prisma"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { AppointmentUpdateSchema } from "@/lib/validators/appointment"
import { checkAvailabilityForSlot } from "@/lib/appointments/availability"
import {
  combineDateKeyAndTime,
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

export async function PUT(req: Request, { params }: Params) {
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
        storeId: true,
        serviceId: true,
        staffMembershipId: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        startAt: true,
        endAt: true,
        notes: true,
        status: true,
      },
    })

    if (!existing) {
      return notFound("Agendamento nao encontrado.")
    }

    const body = await req.json()
    const parsed = AppointmentUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" | ") || "Payload invalido"
      )
    }

    const input = parsed.data
    const timeZone = getBotTimezone()
    const nextStatus = input.status ?? existing.status
    const hasScheduleChange =
      input.serviceId !== undefined ||
      input.staffMembershipId !== undefined ||
      input.date !== undefined ||
      input.time !== undefined
    const hasExplicitDateTimeChange = input.date !== undefined && input.time !== undefined

    if (nextStatus === "CANCELED" && hasScheduleChange) {
      return badRequest("Nao combine cancelamento com remarcacao no mesmo envio.")
    }

    let nextServiceId = existing.serviceId
    let nextStaffMembershipId = existing.staffMembershipId
    let nextStartAt = existing.startAt
    let nextEndAt = existing.endAt

    if (hasScheduleChange) {
      nextServiceId = input.serviceId ?? existing.serviceId
      nextStaffMembershipId =
        input.staffMembershipId !== undefined ? input.staffMembershipId : existing.staffMembershipId
      nextStartAt =
        hasExplicitDateTimeChange && input.date && input.time
          ? combineDateKeyAndTime(input.date, input.time, timeZone)
          : existing.startAt

      if (!nextServiceId) {
        return badRequest("Servico invalido para o agendamento.")
      }

      if (Number.isNaN(nextStartAt.getTime())) {
        return badRequest("Data/hora invalida.")
      }

      if (
        hasExplicitDateTimeChange &&
        !input.allowPastScheduling &&
        nextStartAt.getTime() < Date.now()
      ) {
        return badRequest("Nao e possivel agendar no passado.")
      }

      const service = await prisma.service.findFirst({
        where: {
          id: nextServiceId,
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

      if (nextStaffMembershipId) {
        const eligibleStaff = await prisma.membership.findFirst({
          where: {
            id: nextStaffMembershipId,
            storeId: guard.storeId,
            types: { some: { type: "PROFISSIONAL" } },
            services: { some: { serviceId: service.id } },
          },
          select: {
            id: true,
          },
        })

        if (!eligibleStaff) {
          return badRequest("O profissional selecionado nao executa esse servico nesta loja.")
        }
      }

      const availability = await checkAvailabilityForSlot({
        db: prisma,
        storeId: guard.storeId,
        requestedStartAt: nextStartAt,
        durationMin: service.durationMin,
        timeZone,
        staffMembershipId: nextStaffMembershipId,
        excludeAppointmentId: existing.id,
        suggestionsLimit: 5,
      })

      if (!availability.available) {
        return badRequest(availability.message)
      }

      nextStartAt = availability.startAt
      nextEndAt = availability.endAt
      nextServiceId = service.id
    }

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        serviceId: nextServiceId ?? undefined,
        staffMembershipId: nextStaffMembershipId ?? null,
        customerName: input.customerName ?? existing.customerName,
        customerPhone:
          input.customerPhone !== undefined ? input.customerPhone : existing.customerPhone,
        customerEmail:
          input.customerEmail !== undefined ? input.customerEmail : existing.customerEmail,
        startAt: nextStartAt,
        endAt: nextEndAt,
        notes: input.notes !== undefined ? input.notes : existing.notes,
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
    console.error("[PUT /api/appointments/[id]]", e)
    return serverError()
  }
}

export async function DELETE(_: Request, { params }: Params) {
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
      },
    })

    if (!existing) {
      return notFound("Agendamento nao encontrado.")
    }

    await prisma.appointment.delete({
      where: {
        id: existing.id,
      },
    })

    return ok({ deleted: true })
  } catch (e) {
    console.error("[DELETE /api/appointments/[id]]", e)
    return serverError()
  }
}
