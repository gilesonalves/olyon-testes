import {
  MetaWhatsAppTemplatesError,
  sendMetaWhatsAppTemplate,
  type MetaWhatsAppTemplateSendResult,
} from "@/lib/meta/meta-templates"
import {
  AppointmentReminderKind,
  Prisma,
  prisma,
} from "@/lib/prisma"
import {
  formatDateTimeForBot,
  getBotTimezone,
} from "@/lib/bot/datetime"
import { findActiveWhatsAppConnectionByStoreId } from "@/lib/whatsapp/connection"

const DEFAULT_TEMPLATE_LANGUAGE = "pt_BR"

type AppointmentReminderTemplateConfig = {
  name: string
  language: string
}

export type AppointmentReminderSendResult =
  | {
      ok: true
      providerMessageId: string
      providerStatus: string
      conversationMessageId: string | null
      persistenceError: string | null
    }
  | {
      ok: false
      statusReason:
        | "WHATSAPP_CONNECTION_NOT_FOUND"
        | "REMINDER_TEMPLATE_NOT_CONFIGURED"
        | "META_TEMPLATE_SEND_FAILED"
        | "META_TEMPLATE_SEND_ERROR"
      error: string
      providerMessageId: string | null
      providerStatus: string | null
    }

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function getTemplateName(kind: AppointmentReminderKind) {
  const envName =
    kind === AppointmentReminderKind.ONE_HOUR
      ? "WHATSAPP_APPOINTMENT_REMINDER_ONE_HOUR_TEMPLATE_NAME"
      : "WHATSAPP_APPOINTMENT_REMINDER_FIFTEEN_MINUTES_TEMPLATE_NAME"

  return {
    envName,
    value: process.env[envName]?.trim() ?? "",
  }
}

export function getAppointmentReminderTemplateConfig(
  kind: AppointmentReminderKind
):
  | { ok: true; config: AppointmentReminderTemplateConfig }
  | { ok: false; error: string } {
  const templateName = getTemplateName(kind)
  const language =
    process.env.WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE?.trim() ||
    DEFAULT_TEMPLATE_LANGUAGE

  if (!templateName.value) {
    return {
      ok: false,
      error: `${templateName.envName} nao configurado.`,
    }
  }

  return {
    ok: true,
    config: {
      name: templateName.value,
      language,
    },
  }
}

export function normalizeWhatsAppReminderRecipient(value: string | null) {
  if (!value) {
    return null
  }

  const digits = value.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

function getSendError(result: MetaWhatsAppTemplateSendResult) {
  return (
    result.graphError?.message ??
    result.responsePreview ??
    `A Meta retornou status ${result.statusCode} ao enviar o template.`
  )
}

async function persistReminderConversationMessage(params: {
  reminderId: string
  appointmentId: string
  storeId: string
  to: string
  customerName: string
  serviceName: string | null
  appointmentStartAt: Date
  kind: AppointmentReminderKind
  template: AppointmentReminderTemplateConfig
  connection: {
    id: string
    phoneNumberId: string
  }
  sendResult: MetaWhatsAppTemplateSendResult
  attemptedAt: Date
}) {
  const timeZone = getBotTimezone()
  const formattedStartAt = formatDateTimeForBot(
    params.appointmentStartAt,
    timeZone
  )
  const serviceLabel = params.serviceName?.trim() || "Agendamento"
  const textPreview = `Lembrete: ${serviceLabel} de ${params.customerName} em ${formattedStartAt}.`

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.upsert({
      where: {
        storeId_channel_contact: {
          storeId: params.storeId,
          channel: "WHATSAPP",
          contact: params.to,
        },
      },
      update: {},
      create: {
        storeId: params.storeId,
        channel: "WHATSAPP",
        contact: params.to,
        state: "IDLE",
        context: toJsonValue({ timezone: timeZone }),
      },
      select: {
        id: true,
      },
    })

    return tx.conversationMessage.create({
      data: {
        storeId: params.storeId,
        conversationId: conversation.id,
        direction: "OUT",
        providerMessageId: params.sendResult.graphMessageId ?? undefined,
        text: textPreview,
        payload: toJsonValue({
          source: "appointment_reminder",
          appointmentReminderId: params.reminderId,
          appointmentId: params.appointmentId,
          reminderKind: params.kind,
          text: textPreview,
          outbound: {
            kind: "template",
            templateName: params.template.name,
            languageCode: params.template.language,
          },
          provider: "meta",
          whatsappConnectionId: params.connection.id,
          phoneNumberId: params.connection.phoneNumberId,
          graphMessageId: params.sendResult.graphMessageId,
          providerMessageId: params.sendResult.graphMessageId,
          deliveryRequest: {
            ok: params.sendResult.ok,
            statusCode: params.sendResult.statusCode,
            attemptedAt: params.attemptedAt.toISOString(),
          },
          graphResponse: params.sendResult.graphResponse,
        }),
      },
      select: {
        id: true,
      },
    })
  })
}

export async function sendAppointmentReminderTemplate(params: {
  reminderId: string
  appointmentId: string
  storeId: string
  kind: AppointmentReminderKind
  to: string
  customerName: string
  serviceName: string | null
  appointmentStartAt: Date
}): Promise<AppointmentReminderSendResult> {
  const templateConfig = getAppointmentReminderTemplateConfig(params.kind)

  if (!templateConfig.ok) {
    return {
      ok: false,
      statusReason: "REMINDER_TEMPLATE_NOT_CONFIGURED",
      error: templateConfig.error,
      providerMessageId: null,
      providerStatus: null,
    }
  }

  const connection = await findActiveWhatsAppConnectionByStoreId(params.storeId)

  if (!connection) {
    return {
      ok: false,
      statusReason: "WHATSAPP_CONNECTION_NOT_FOUND",
      error: "Conexao WhatsApp ativa da loja nao encontrada.",
      providerMessageId: null,
      providerStatus: null,
    }
  }

  const attemptedAt = new Date()
  const formattedStartAt = formatDateTimeForBot(
    params.appointmentStartAt,
    getBotTimezone()
  )

  let sendResult: MetaWhatsAppTemplateSendResult

  try {
    sendResult = await sendMetaWhatsAppTemplate({
      phoneNumberId: connection.phoneNumberId,
      accessToken: connection.accessToken,
      to: params.to,
      templateName: templateConfig.config.name,
      languageCode: templateConfig.config.language,
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: params.customerName,
            },
            {
              type: "text",
              text: formattedStartAt,
            },
          ],
        },
      ],
    })
  } catch (error) {
    return {
      ok: false,
      statusReason: "META_TEMPLATE_SEND_ERROR",
      error:
        error instanceof MetaWhatsAppTemplatesError || error instanceof Error
          ? error.message
          : "Falha inesperada ao enviar template de lembrete.",
      providerMessageId: null,
      providerStatus: null,
    }
  }

  if (!sendResult.ok || !sendResult.graphMessageId) {
    return {
      ok: false,
      statusReason: "META_TEMPLATE_SEND_FAILED",
      error: getSendError(sendResult),
      providerMessageId: sendResult.graphMessageId,
      providerStatus: sendResult.ok ? "accepted_without_message_id" : "failed",
    }
  }

  try {
    const message = await persistReminderConversationMessage({
      ...params,
      template: templateConfig.config,
      connection,
      sendResult,
      attemptedAt,
    })

    return {
      ok: true,
      providerMessageId: sendResult.graphMessageId,
      providerStatus: "accepted",
      conversationMessageId: message.id,
      persistenceError: null,
    }
  } catch (error) {
    return {
      ok: true,
      providerMessageId: sendResult.graphMessageId,
      providerStatus: "accepted",
      conversationMessageId: null,
      persistenceError:
        error instanceof Error
          ? error.message
          : "Falha ao persistir ConversationMessage OUT do lembrete.",
    }
  }
}
