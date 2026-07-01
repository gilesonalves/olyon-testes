import { buildBotFlowResetContext } from "@/lib/bot/flow"
import { getBotSettingsForStore } from "@/lib/bot/settings"
import {
  Prisma,
  prisma,
  type ConversationState,
} from "@/lib/prisma"
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

export const HUMAN_ATTENDANCE_AUTO_RESUME_MINUTES = 30

export type HumanAttendanceExpirationResult =
  | {
      status: "wasNotPaused"
      inactiveMinutes: null
      lastMessageAt: Date | null
      context: null
    }
  | {
      status: "stillPaused"
      inactiveMinutes: number | null
      lastMessageAt: Date | null
      context: null
    }
  | {
      status: "resumedByInactivity"
      inactiveMinutes: number
      lastMessageAt: Date
      context: Record<string, unknown>
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

function getJsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }

  return {}
}

function getInactiveMinutes(lastMessageAt: Date, now: Date) {
  const inactiveMilliseconds = Math.max(
    0,
    now.getTime() - lastMessageAt.getTime()
  )

  return Math.floor((inactiveMilliseconds / 60_000) * 10) / 10
}

export async function resolveHumanAttendanceExpiration(params: {
  db: Prisma.TransactionClient
  storeId: string
  conversation: {
    id: string
    state: ConversationState
    lastMessageAt: Date | null
    context: Prisma.JsonValue | null
  }
  now: Date
}): Promise<HumanAttendanceExpirationResult> {
  if (params.conversation.state !== "PAUSED") {
    return {
      status: "wasNotPaused",
      inactiveMinutes: null,
      lastMessageAt: params.conversation.lastMessageAt,
      context: null,
    }
  }

  const lastMessageAt = params.conversation.lastMessageAt

  if (!lastMessageAt) {
    return {
      status: "stillPaused",
      inactiveMinutes: null,
      lastMessageAt: null,
      context: null,
    }
  }

  const inactiveMinutes = getInactiveMinutes(lastMessageAt, params.now)

  if (inactiveMinutes < HUMAN_ATTENDANCE_AUTO_RESUME_MINUTES) {
    return {
      status: "stillPaused",
      inactiveMinutes,
      lastMessageAt,
      context: null,
    }
  }

  const resetContext = {
    ...getJsonRecord(params.conversation.context),
    ...buildBotFlowResetContext(false),
  }

  await params.db.appointmentDraft.updateMany({
    where: {
      storeId: params.storeId,
      conversationId: params.conversation.id,
      status: "DRAFT",
    },
    data: {
      status: "ABANDONED",
    },
  })

  const resumedConversation = await params.db.conversation.updateMany({
    where: {
      id: params.conversation.id,
      storeId: params.storeId,
      channel: "WHATSAPP",
      state: "PAUSED",
    },
    data: {
      state: "IDLE",
      context: toJsonValue(resetContext),
    },
  })

  if (resumedConversation.count !== 1) {
    throw new Error(
      "Conversation scope mismatch during inactivity auto-resume."
    )
  }

  return {
    status: "resumedByInactivity",
    inactiveMinutes,
    lastMessageAt,
    context: resetContext,
  }
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
