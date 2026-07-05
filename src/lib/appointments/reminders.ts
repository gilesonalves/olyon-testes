import {
  AppointmentReminderKind,
  AppointmentReminderStatus,
  AppointmentStatus,
  type Prisma,
  prisma,
} from "@/lib/prisma"
import {
  sendAppointmentReminderTemplate,
} from "@/lib/whatsapp/appointment-reminder"
import { normalizeBrazilianPhoneForWhatsApp } from "@/lib/whatsapp/phone"

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
]
const RECONCILIATION_HORIZON_MS = 24 * 60 * 60 * 1000
const DISPATCH_GRACE_MS = 5 * 60 * 1000
const DEFAULT_DISPATCH_BATCH_SIZE = 50
const MAX_ERROR_LENGTH = 4_000

const REMINDER_OFFSETS_MINUTES: Record<AppointmentReminderKind, number> = {
  [AppointmentReminderKind.ONE_HOUR]: 60,
  [AppointmentReminderKind.FIFTEEN_MINUTES]: 15,
}

export type AppointmentReminderReconcileResult = {
  created: number
  skipped: number
}

export type AppointmentReminderDispatchResult = {
  claimed: number
  sent: number
  skipped: number
  failed: number
}

function truncateError(value: string) {
  return value.length <= MAX_ERROR_LENGTH
    ? value
    : `${value.slice(0, MAX_ERROR_LENGTH - 3)}...`
}

function getScheduledFor(startAt: Date, kind: AppointmentReminderKind) {
  return new Date(
    startAt.getTime() - REMINDER_OFFSETS_MINUTES[kind] * 60 * 1000
  )
}

async function markReminderSkipped(id: string, statusReason: string) {
  await prisma.appointmentReminder.update({
    where: { id },
    data: {
      status: AppointmentReminderStatus.SKIPPED,
      statusReason,
      error: null,
      lockedAt: null,
    },
  })
}

async function markReminderFailed(params: {
  id: string
  statusReason: string
  error: string
  providerMessageId?: string | null
  providerStatus?: string | null
}) {
  await prisma.appointmentReminder.update({
    where: { id: params.id },
    data: {
      status: AppointmentReminderStatus.FAILED,
      statusReason: params.statusReason,
      error: truncateError(params.error),
      providerMessageId: params.providerMessageId,
      providerStatus: params.providerStatus,
      lockedAt: null,
    },
  })
}

export async function reconcileAppointmentReminders(params?: {
  now?: Date
  horizonMs?: number
}): Promise<AppointmentReminderReconcileResult> {
  const now = params?.now ?? new Date()
  const horizonEnd = new Date(
    now.getTime() + (params?.horizonMs ?? RECONCILIATION_HORIZON_MS)
  )
  const missedBefore = new Date(now.getTime() - DISPATCH_GRACE_MS)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: {
        in: ACTIVE_APPOINTMENT_STATUSES,
      },
      startAt: {
        gt: now,
        lte: horizonEnd,
      },
    },
    select: {
      id: true,
      storeId: true,
      startAt: true,
      customerPhone: true,
    },
    orderBy: {
      startAt: "asc",
    },
    take: 500,
  })

  const pending: Prisma.AppointmentReminderCreateManyInput[] = []
  const skipped: Prisma.AppointmentReminderCreateManyInput[] = []

  for (const appointment of appointments) {
    if (!normalizeBrazilianPhoneForWhatsApp(appointment.customerPhone)) {
      continue
    }

    for (const kind of Object.values(AppointmentReminderKind)) {
      const scheduledFor = getScheduledFor(appointment.startAt, kind)
      const isMissed = scheduledFor < missedBefore
      const row: Prisma.AppointmentReminderCreateManyInput = {
        storeId: appointment.storeId,
        appointmentId: appointment.id,
        kind,
        appointmentStartAt: appointment.startAt,
        scheduledFor,
        status: isMissed
          ? AppointmentReminderStatus.SKIPPED
          : AppointmentReminderStatus.PENDING,
        statusReason: isMissed ? "REMINDER_WINDOW_MISSED" : null,
      }

      if (isMissed) {
        skipped.push(row)
      } else {
        pending.push(row)
      }
    }
  }

  const [pendingResult, skippedResult] = await Promise.all([
    pending.length
      ? prisma.appointmentReminder.createMany({
          data: pending,
          skipDuplicates: true,
        })
      : Promise.resolve({ count: 0 }),
    skipped.length
      ? prisma.appointmentReminder.createMany({
          data: skipped,
          skipDuplicates: true,
        })
      : Promise.resolve({ count: 0 }),
  ])

  return {
    created: pendingResult.count + skippedResult.count,
    skipped: skippedResult.count,
  }
}

export async function dispatchPendingAppointmentReminders(params?: {
  now?: Date
  batchSize?: number
}): Promise<AppointmentReminderDispatchResult> {
  const now = params?.now ?? new Date()
  const missedBefore = new Date(now.getTime() - DISPATCH_GRACE_MS)
  const batchSize = Math.max(
    1,
    Math.min(params?.batchSize ?? DEFAULT_DISPATCH_BATCH_SIZE, 100)
  )
  const result: AppointmentReminderDispatchResult = {
    claimed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  }

  const candidates = await prisma.appointmentReminder.findMany({
    where: {
      status: AppointmentReminderStatus.PENDING,
      scheduledFor: {
        lte: now,
      },
    },
    orderBy: {
      scheduledFor: "asc",
    },
    take: batchSize,
    select: {
      id: true,
    },
  })

  for (const candidate of candidates) {
    const claimed = await prisma.appointmentReminder.updateMany({
      where: {
        id: candidate.id,
        status: AppointmentReminderStatus.PENDING,
      },
      data: {
        status: AppointmentReminderStatus.PROCESSING,
        attempts: {
          increment: 1,
        },
        lockedAt: new Date(),
        statusReason: "DISPATCHING",
        error: null,
      },
    })

    if (claimed.count !== 1) {
      continue
    }

    result.claimed += 1

    const reminder = await prisma.appointmentReminder.findUnique({
      where: {
        id: candidate.id,
      },
      include: {
        appointment: {
          select: {
            id: true,
            storeId: true,
            status: true,
            customerName: true,
            customerPhone: true,
            startAt: true,
            service: {
              select: {
                name: true,
              },
            },
            membership: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!reminder) {
      continue
    }

    const appointment = reminder.appointment

    if (reminder.scheduledFor < missedBefore) {
      await markReminderSkipped(reminder.id, "REMINDER_WINDOW_MISSED")
      result.skipped += 1
      continue
    }

    if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
      await markReminderSkipped(
        reminder.id,
        "APPOINTMENT_STATUS_NOT_ELIGIBLE"
      )
      result.skipped += 1
      continue
    }

    if (
      appointment.startAt.getTime() !== reminder.appointmentStartAt.getTime()
    ) {
      await markReminderSkipped(reminder.id, "APPOINTMENT_RESCHEDULED")
      result.skipped += 1
      continue
    }

    if (
      appointment.storeId !== reminder.storeId ||
      appointment.id !== reminder.appointmentId
    ) {
      await markReminderSkipped(reminder.id, "APPOINTMENT_SCOPE_MISMATCH")
      result.skipped += 1
      continue
    }

    const recipient = normalizeBrazilianPhoneForWhatsApp(
      appointment.customerPhone
    )

    if (!recipient) {
      await markReminderSkipped(reminder.id, "INVALID_CUSTOMER_PHONE")
      result.skipped += 1
      continue
    }

    try {
      const sendResult = await sendAppointmentReminderTemplate({
        reminderId: reminder.id,
        appointmentId: appointment.id,
        storeId: appointment.storeId,
        kind: reminder.kind,
        to: recipient,
        customerName: appointment.customerName,
        serviceName: appointment.service?.name ?? null,
        professionalName: appointment.membership?.user.name ?? null,
        appointmentStartAt: appointment.startAt,
      })

      if (!sendResult.ok) {
        if (
          sendResult.statusReason === "STORE_WHATSAPP_NOT_CONNECTED" ||
          sendResult.statusReason === "TEMPLATE_NOT_APPROVED"
        ) {
          await markReminderSkipped(reminder.id, sendResult.statusReason)
          result.skipped += 1
          continue
        }

        await markReminderFailed({
          id: reminder.id,
          statusReason: sendResult.statusReason,
          error: sendResult.error,
          providerMessageId: sendResult.providerMessageId,
          providerStatus: sendResult.providerStatus,
        })
        result.failed += 1
        continue
      }

      await prisma.appointmentReminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          status: AppointmentReminderStatus.SENT,
          sentAt: new Date(),
          providerMessageId: sendResult.providerMessageId,
          providerStatus: sendResult.providerStatus,
          statusReason: sendResult.persistenceError
            ? "CONVERSATION_MESSAGE_PERSIST_FAILED"
            : "META_ACCEPTED",
          error: sendResult.persistenceError
            ? truncateError(sendResult.persistenceError)
            : null,
          lockedAt: null,
        },
      })
      result.sent += 1
    } catch (error) {
      await markReminderFailed({
        id: reminder.id,
        statusReason: "UNEXPECTED_DISPATCH_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao despachar lembrete.",
      })
      result.failed += 1
    }
  }

  return result
}
