import { getBotSettingsForStore } from "@/lib/bot/settings"
import { Prisma, prisma } from "@/lib/prisma"
import {
  sendMetaTextMessage,
  type MetaTextOutboundResult,
} from "@/lib/whatsapp/meta-outbound"

export type HumanAttendanceOutboundMessage = {
  id: string
  direction: "IN" | "OUT"
  text: string | null
  payload: Prisma.JsonValue | null
  providerMessageId: string | null
  createdAt: Date
}

type HumanHandoffNoticeResult =
  | {
      ok: true
      message: HumanAttendanceOutboundMessage
      sendResult: Extract<MetaTextOutboundResult, { ok: true }>
    }
  | {
      ok: false
      sendResult: Extract<MetaTextOutboundResult, { ok: false }>
    }

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export function buildManualAttendanceOutboundPayload(params: {
  source: "manual_attendance" | "manual_attendance_handoff_notice"
  text: string
  sendResult: MetaTextOutboundResult
  attemptedAt: Date
  sentByUserId?: string
  trigger?: "panel" | "smb_message_echoes"
}) {
  const payload = {
    source: params.source,
    text: params.text,
    outbound: {
      kind: "text",
      text: params.text,
    },
    provider: params.sendResult.provider,
    whatsappConnectionId: params.sendResult.whatsappConnectionId,
    phoneNumberId: params.sendResult.phoneNumberId,
    graphMessageId: params.sendResult.graphMessageId,
    providerMessageId: params.sendResult.graphMessageId,
    deliveryRequest: {
      ok: params.sendResult.ok,
      statusCode: params.sendResult.statusCode,
      attemptedAt: params.attemptedAt.toISOString(),
    },
    graphResponse: params.sendResult.graphResponse,
    ...(params.sentByUserId ? { sentByUserId: params.sentByUserId } : {}),
    ...(params.trigger ? { humanAttendanceTrigger: params.trigger } : {}),
  }

  if (params.sendResult.ok) {
    return toJsonValue(payload)
  }

  return toJsonValue({
    ...payload,
    errorCode: params.sendResult.errorCode,
    error: params.sendResult.error,
    graphError: params.sendResult.graphError,
    responsePreview: params.sendResult.responsePreview,
  })
}

export async function pauseWhatsAppConversationForHumanAttendance(params: {
  db: Prisma.TransactionClient
  storeId: string
  conversationId: string
  lastMessageAt: Date
}) {
  const conversationUpdate = await params.db.conversation.updateMany({
    where: {
      id: params.conversationId,
      storeId: params.storeId,
      channel: "WHATSAPP",
    },
    data: {
      state: "PAUSED",
      lastMessageAt: params.lastMessageAt,
    },
  })

  if (conversationUpdate.count !== 1) {
    throw new Error("Conversation scope mismatch during human handoff.")
  }
}

export async function sendWhatsAppHumanHandoffNotice(params: {
  storeId: string
  conversationId: string
  to: string
  sentByUserId?: string
  trigger: "panel" | "smb_message_echoes"
}): Promise<HumanHandoffNoticeResult> {
  const botSettings = await getBotSettingsForStore(params.storeId)
  const attemptedAt = new Date()
  const sendResult = await sendMetaTextMessage({
    storeId: params.storeId,
    to: params.to,
    text: botSettings.humanHandoffMessage,
  })

  if (!sendResult.ok) {
    return {
      ok: false,
      sendResult,
    }
  }

  const payload = buildManualAttendanceOutboundPayload({
    source: "manual_attendance_handoff_notice",
    text: botSettings.humanHandoffMessage,
    sendResult,
    attemptedAt,
    sentByUserId: params.sentByUserId,
    trigger: params.trigger,
  })

  const message = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.conversationMessage.create({
      data: {
        storeId: params.storeId,
        conversationId: params.conversationId,
        direction: "OUT",
        providerMessageId: sendResult.graphMessageId ?? undefined,
        text: botSettings.humanHandoffMessage,
        payload,
      },
      select: {
        id: true,
        direction: true,
        text: true,
        payload: true,
        providerMessageId: true,
        createdAt: true,
      },
    })

    await pauseWhatsAppConversationForHumanAttendance({
      db: tx,
      storeId: params.storeId,
      conversationId: params.conversationId,
      lastMessageAt: createdMessage.createdAt,
    })

    return createdMessage
  })

  return {
    ok: true,
    message,
    sendResult,
  }
}
