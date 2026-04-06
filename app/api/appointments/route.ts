import { prisma } from "@/lib/prisma"
import { AppointmentStatus } from "../../../generated/prisma/client"
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
  AppointmentCreationError,
  createAppointmentForStore,
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
  } catch (e) {
    if (e instanceof AppointmentCreationError) {
      return badRequest(e.message)
    }
    console.error("[POST /api/appointments]", e)
    return serverError()
  }
}
