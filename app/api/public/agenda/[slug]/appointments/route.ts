import { created, badRequest, notFound, serverError } from "@/lib/api/response"
import { prisma } from "@/lib/prisma"
import { findActiveStoreBySlug } from "@/lib/public-booking"
import {
  AppointmentCreationError,
  createAppointmentForStore,
} from "@/lib/appointments/create"
import { PublicAppointmentCreateSchema } from "@/lib/validators/appointment"
import { getBotTimezone, getDateKeyInTimeZone, getTimeKeyInTimeZone } from "@/lib/bot/datetime"

type Params = {
  params: Promise<{ slug: string }>
}

function serializeAppointment(
  appointment: {
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
  },
  timeZone: string
) {
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

export async function POST(req: Request, { params }: Params) {
  try {
    const { slug } = await params
    const store = await findActiveStoreBySlug(slug)

    if (!store) {
      return notFound("Loja nao encontrada.")
    }

    const body = await req.json()
    const parsed = PublicAppointmentCreateSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" | ") || "Payload invalido"
      )
    }

    const timeZone = getBotTimezone()
    const appointment = await createAppointmentForStore({
      db: prisma,
      storeId: store.id,
      input: {
        ...parsed.data,
        staffMembershipId: parsed.data.staffMembershipId,
        allowPastScheduling: false,
      },
      source: "WEB",
      metadata: {
        createdBy: "public_agenda_link",
        storeSlug: store.slug,
      },
    })

    return created(serializeAppointment(appointment, timeZone))
  } catch (e) {
    if (e instanceof AppointmentCreationError) {
      return badRequest(e.message)
    }

    console.error("[POST /api/public/agenda/[slug]/appointments]", e)
    return serverError()
  }
}
