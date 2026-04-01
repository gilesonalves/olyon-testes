import { prisma } from "@/lib/prisma"
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
import { checkAvailabilityForSlot } from "@/lib/appointments/availability"
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
      startAt?: {
        gte: Date
        lte: Date
      }
    } = {
      storeId: guard.storeId,
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
  } catch (e) {
    console.error("[GET /api/appointments]", e)
    return serverError()
  }
}

export async function POST(req: Request) {
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
    const timeZone = getBotTimezone()

    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        storeId: guard.storeId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        durationMin: true,
      },
    })

    if (!service) {
      return badRequest("Servico invalido para a loja atual.")
    }

    if (input.staffMembershipId) {
      const eligibleStaff = await prisma.membership.findFirst({
        where: {
          id: input.staffMembershipId,
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
    }

    const requestedStartAt = combineDateKeyAndTime(input.date, input.time, timeZone)
    if (Number.isNaN(requestedStartAt.getTime())) {
      return badRequest("Data/hora invalida.")
    }

    if (requestedStartAt.getTime() < Date.now()) {
      return badRequest("Nao e possivel agendar no passado.")
    }

    const createdByUser = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { name: true },
    })

    const availability = await checkAvailabilityForSlot({
      db: prisma,
      storeId: guard.storeId,
      requestedStartAt,
      durationMin: service.durationMin,
      timeZone,
      staffMembershipId: input.staffMembershipId,
      suggestionsLimit: 5,
    })

    if (!availability.available) {
      return badRequest(availability.message)
    }

    const appointment = await prisma.appointment.create({
      data: {
        storeId: guard.storeId,
        status: "SCHEDULED",
        serviceId: service.id,
        staffMembershipId: input.staffMembershipId,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? undefined,
        customerEmail: input.customerEmail ?? undefined,
        startAt: availability.startAt,
        endAt: availability.endAt,
        notes: input.notes ?? undefined,
        source: "ADMIN",
        metadata: {
          createdBy: "panel",
          createdByUserId: guard.userId,
          createdByUserName: createdByUser?.name ?? null,
          createdByRole: guard.role,
        },
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

    return created(serializeAppointment(appointment, timeZone))
  } catch (e) {
    console.error("[POST /api/appointments]", e)
    return serverError()
  }
}
