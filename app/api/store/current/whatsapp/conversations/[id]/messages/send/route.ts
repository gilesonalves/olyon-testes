import { NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { getBotSettingsForStore } from "@/lib/bot/settings"
import { prisma, Prisma } from "@/lib/prisma"
import {
  sendMetaTextMessage,
  type MetaTextOutboundResult,
} from "@/lib/whatsapp/meta-outbound"
import { findActiveWhatsAppConnectionByStoreId } from "@/lib/whatsapp/connection"
import { whatsappSendManualMessageSchema } from "@/lib/validators/whatsapp-attendance"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

type MetaTextOutboundErrorResult = Extract<
  MetaTextOutboundResult,
  { ok: false }
>

type OutboundMessageRecord = {
  id: string
  direction: "IN" | "OUT"
  text: string | null
  payload: Prisma.JsonValue | null
  providerMessageId: string | null
  createdAt: Date
}

async function requireStoreAdmin() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(guard.error)
      : forbidden(guard.error)
  }

  return guard
}

function validationError(
  details: ReturnType<typeof whatsappSendManualMessageSchema.safeParse>
) {
  if (details.success) {
    return badRequest("Payload invalido.")
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Payload invalido.",
      details: details.error.flatten(),
    },
    { status: 400 }
  )
}

function conflict(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 409 })
}

function badGateway(error: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status: 502 }
  )
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isObjectRecord)
}

function isMetaCustomerCareWindowError(result: MetaTextOutboundErrorResult) {
  const graphErrorMessage = result.graphError?.message ?? ""
  const searchableText = [
    result.error,
    graphErrorMessage,
    result.graphError?.type,
    result.errorCode,
    result.graphError?.code,
    result.graphError?.subcode,
  ]
    .filter((value) => value != null)
    .join(" ")
    .toLowerCase()

  return (
    result.graphError?.code === 131047 ||
    searchableText.includes("24") ||
    searchableText.includes("outside the allowed window") ||
    searchableText.includes("re-engagement") ||
    searchableText.includes("customer service window")
  )
}

function metaSendErrorResponse(result: MetaTextOutboundErrorResult) {
  const details = {
    errorCode: result.errorCode,
    metaStatusCode: result.statusCode,
    graphError: result.graphError,
    graphResponse: result.graphResponse,
    responsePreview: result.responsePreview,
  }

  if (isMetaCustomerCareWindowError(result)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Nao foi possivel enviar mensagem livre. O cliente precisa ter enviado uma mensagem nas ultimas 24 horas; fora dessa janela use um template aprovado.",
        details,
      },
      { status: 409 }
    )
  }

  return badGateway(
    result.error || "Nao foi possivel enviar a mensagem pela Meta Graph API.",
    details
  )
}

function getMessageStatusFromPayload(payload: Prisma.JsonValue | null) {
  if (!isObjectRecord(payload)) {
    return "SENT"
  }

  const deliveryRequest = isObjectRecord(payload.deliveryRequest)
    ? payload.deliveryRequest
    : null

  if (deliveryRequest?.ok === false) {
    return "FAILED"
  }

  const graphResponse = isObjectRecord(payload.graphResponse)
    ? payload.graphResponse
    : null
  const graphMessages = getRecordArray(graphResponse?.messages)
  const graphStatus = graphMessages[0]?.status

  return typeof graphStatus === "string" && graphStatus.length > 0
    ? graphStatus.toUpperCase()
    : "SENT"
}

function buildOutboundTextPayload(params: {
  source: "manual_attendance" | "manual_attendance_handoff_notice"
  text: string
  sendResult: MetaTextOutboundResult
  attemptedAt: Date
  sentByUserId: string
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
    sentByUserId: params.sentByUserId,
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

function toMessageResponse(message: OutboundMessageRecord) {
  return {
    id: message.id,
    direction: message.direction,
    body: message.text,
    type: "TEXT",
    status: getMessageStatusFromPayload(message.payload),
    externalId: message.providerMessageId,
    createdAt: message.createdAt.toISOString(),
    sentAt: message.createdAt.toISOString(),
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params
    if (!id) {
      return badRequest("Informe o id da conversa.")
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Body JSON invalido.")
    }

    if ("storeId" in body) {
      return badRequest(
        "O storeId nao pode ser enviado. A loja atual e resolvida pela sessao."
      )
    }

    const parsed = whatsappSendManualMessageSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(parsed)
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        storeId: authResult.storeId,
        channel: "WHATSAPP",
      },
      select: {
        id: true,
        contact: true,
        state: true,
      },
    })

    if (!conversation) {
      return notFound("Conversa WhatsApp nao encontrada para a loja atual.")
    }

    const to = conversation.contact.trim()
    if (!to) {
      return badRequest("A conversa WhatsApp nao possui destinatario valido.")
    }

    const connection = await findActiveWhatsAppConnectionByStoreId(
      authResult.storeId
    )

    if (!connection) {
      return conflict(
        "Conexao WhatsApp ativa da loja atual nao encontrada. Conecte a loja antes de enviar mensagens."
      )
    }

    const botSettings = await getBotSettingsForStore(authResult.storeId)
    const shouldSendHandoffMessage = conversation.state !== "PAUSED"
    let handoffMessage: OutboundMessageRecord | null = null

    if (shouldSendHandoffMessage) {
      const handoffSentAt = new Date()
      const handoffSendResult = await sendMetaTextMessage({
        storeId: authResult.storeId,
        to,
        text: botSettings.humanHandoffMessage,
      })

      if (!handoffSendResult.ok) {
        return metaSendErrorResponse(handoffSendResult)
      }

      const handoffPayload = buildOutboundTextPayload({
        source: "manual_attendance_handoff_notice",
        text: botSettings.humanHandoffMessage,
        sendResult: handoffSendResult,
        attemptedAt: handoffSentAt,
        sentByUserId: authResult.userId,
      })

      handoffMessage = await prisma.$transaction(async (tx) => {
        const createdHandoffMessage = await tx.conversationMessage.create({
          data: {
            storeId: authResult.storeId,
            conversationId: conversation.id,
            direction: "OUT",
            providerMessageId: handoffSendResult.graphMessageId ?? undefined,
            text: botSettings.humanHandoffMessage,
            payload: handoffPayload,
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

        const conversationUpdate = await tx.conversation.updateMany({
          where: {
            id: conversation.id,
            storeId: authResult.storeId,
            channel: "WHATSAPP",
          },
          data: {
            state: "PAUSED",
            lastMessageAt: createdHandoffMessage.createdAt,
          },
        })

        if (conversationUpdate.count !== 1) {
          throw new Error("Conversation scope mismatch during handoff notice.")
        }

        return createdHandoffMessage
      })
    }

    const sentAt = new Date()
    const sendResult = await sendMetaTextMessage({
      storeId: authResult.storeId,
      to,
      text: parsed.data.text,
    })

    if (!sendResult.ok) {
      return metaSendErrorResponse(sendResult)
    }

    const payload = buildOutboundTextPayload({
      source: "manual_attendance",
      text: parsed.data.text,
      sendResult,
      attemptedAt: sentAt,
      sentByUserId: authResult.userId,
    })

    const result = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.conversationMessage.create({
        data: {
          storeId: authResult.storeId,
          conversationId: conversation.id,
          direction: "OUT",
          providerMessageId: sendResult.graphMessageId ?? undefined,
          text: parsed.data.text,
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

      const conversationUpdate = await tx.conversation.updateMany({
        where: {
          id: conversation.id,
          storeId: authResult.storeId,
          channel: "WHATSAPP",
        },
        data: {
          state: "PAUSED",
          lastMessageAt: createdMessage.createdAt,
        },
      })

      if (conversationUpdate.count !== 1) {
        throw new Error("Conversation scope mismatch during manual send.")
      }

      const updatedConversation = await tx.conversation.findFirst({
        where: {
          id: conversation.id,
          storeId: authResult.storeId,
          channel: "WHATSAPP",
        },
        select: {
          id: true,
          state: true,
          lastMessageAt: true,
        },
      })

      if (!updatedConversation) {
        throw new Error("Updated conversation not found after manual send.")
      }

      return {
        message: createdMessage,
        conversation: updatedConversation,
      }
    })

    return ok({
      message: toMessageResponse(result.message),
      handoffMessage: handoffMessage ? toMessageResponse(handoffMessage) : null,
      handoffError: null,
      conversation: {
        id: result.conversation.id,
        state: result.conversation.state,
        lastMessageAt:
          handoffMessage?.createdAt.toISOString() ??
          result.conversation.lastMessageAt?.toISOString() ??
          null,
      },
      graphMessageId: sendResult.graphMessageId,
    })
  } catch (error) {
    console.error(
      "[POST /api/store/current/whatsapp/conversations/[id]/messages/send]",
      error
    )
    return serverError("Nao foi possivel enviar mensagem WhatsApp.")
  }
}
