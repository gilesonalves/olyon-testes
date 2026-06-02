import { NextRequest, NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma, Prisma } from "@/lib/prisma"
import { whatsappConversationMessagesQuerySchema } from "@/lib/validators/whatsapp-attendance"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

type ConversationMessageRecord = {
  id: string
  direction: "IN" | "OUT"
  text: string | null
  payload: Prisma.JsonValue | null
  providerMessageId: string | null
  createdAt: Date
}

type DraftPreview = {
  customerName: string | null
  customerPhone: string | null
}

async function requireStoreMember() {
  const guard = await requireMembershipRole("STAFF")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(guard.error)
      : forbidden(guard.error)
  }

  return guard
}

function validationError(
  details: ReturnType<typeof whatsappConversationMessagesQuerySchema.safeParse>
) {
  if (details.success) {
    return badRequest("Parametros invalidos.")
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Parametros invalidos.",
      details: details.error.flatten(),
    },
    { status: 400 }
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function getJsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (isRecord(value)) {
    return value
  }

  return {}
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord)
}

function getMessageBody(message: ConversationMessageRecord) {
  const text = toOptionalString(message.text)
  if (text) {
    return text
  }

  const payload = getJsonRecord(message.payload)
  const payloadText = toOptionalString(payload.text)
  if (payloadText) {
    return payloadText
  }

  const messagePayload = isRecord(payload.message) ? payload.message : null
  const textPayload = messagePayload && isRecord(messagePayload.text)
    ? messagePayload.text
    : null

  return toOptionalString(textPayload?.body)
}

function getMessageType(message: ConversationMessageRecord) {
  const payload = getJsonRecord(message.payload)
  const outbound = isRecord(payload.outbound) ? payload.outbound : null
  const outboundKind = toOptionalString(outbound?.kind)
  if (outboundKind) {
    return outboundKind.toUpperCase()
  }

  const messageType = toOptionalString(payload.messageType)
  if (messageType) {
    return messageType.toUpperCase()
  }

  const messagePayload = isRecord(payload.message) ? payload.message : null
  const providerType = toOptionalString(messagePayload?.type)

  return providerType ? providerType.toUpperCase() : "TEXT"
}

function getMessageStatus(message: ConversationMessageRecord) {
  if (message.direction === "IN") {
    return "RECEIVED"
  }

  const payload = getJsonRecord(message.payload)
  const deliveryRequest = isRecord(payload.deliveryRequest)
    ? payload.deliveryRequest
    : null

  if (deliveryRequest?.ok === false) {
    return "FAILED"
  }

  const statusEvents = getRecordArray(payload.statusEvents)
  const lastStatusEvent = statusEvents.at(-1)
  const status = toOptionalString(lastStatusEvent?.status)
  if (status) {
    return status.toUpperCase()
  }

  const graphResponse = isRecord(payload.graphResponse)
    ? payload.graphResponse
    : null
  const graphMessages = getRecordArray(graphResponse?.messages)
  const graphStatus = toOptionalString(graphMessages[0]?.status)
  if (graphStatus) {
    return graphStatus.toUpperCase()
  }

  return deliveryRequest?.ok === true ? "SENT" : null
}

function getExternalId(message: ConversationMessageRecord) {
  if (message.providerMessageId) {
    return message.providerMessageId
  }

  const payload = getJsonRecord(message.payload)
  return (
    toOptionalString(payload.graphMessageId) ??
    toOptionalString(payload.providerMessageId)
  )
}

function getCustomerNameFromPayload(payload: Prisma.JsonValue | null | undefined) {
  const record = getJsonRecord(payload)
  const contacts = Array.isArray(record.contacts) ? record.contacts : []

  for (const contact of contacts) {
    if (!isRecord(contact)) {
      continue
    }

    const profile = isRecord(contact.profile) ? contact.profile : null
    const name = toOptionalString(profile?.name)

    if (name) {
      return name
    }
  }

  return null
}

function getCustomerName(params: {
  drafts: DraftPreview[]
  messages: ConversationMessageRecord[]
}) {
  const draftName = params.drafts
    .map((draft) => toOptionalString(draft.customerName))
    .find(Boolean)

  if (draftName) {
    return draftName
  }

  const inboundProfileName = params.messages
    .filter((message) => message.direction === "IN")
    .map((message) => getCustomerNameFromPayload(message.payload))
    .find(Boolean)

  return inboundProfileName ?? null
}

function getCustomerPhone(params: {
  contact: string
  drafts: DraftPreview[]
}) {
  return (
    params.drafts
      .map((draft) => toOptionalString(draft.customerPhone))
      .find(Boolean) ??
    toOptionalString(params.contact) ??
    null
  )
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireStoreMember()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params
    if (!id) {
      return badRequest("Informe o id da conversa.")
    }

    const parsed = whatsappConversationMessagesQuerySchema.safeParse({
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    })

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
        lastMessageAt: true,
        updatedAt: true,
        createdAt: true,
        drafts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            customerName: true,
            customerPhone: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: parsed.data.limit,
          select: {
            id: true,
            direction: true,
            text: true,
            payload: true,
            providerMessageId: true,
            createdAt: true,
          },
        },
      },
    })

    if (!conversation) {
      return notFound("Conversa WhatsApp nao encontrada para a loja atual.")
    }

    const messages = [...conversation.messages].reverse()

    return ok({
      conversation: {
        id: conversation.id,
        state: conversation.state,
        lastMessageAt: (
          conversation.lastMessageAt ??
          conversation.updatedAt ??
          conversation.createdAt
        ).toISOString(),
        customerName: getCustomerName({
          drafts: conversation.drafts,
          messages,
        }),
        customerPhone: getCustomerPhone({
          contact: conversation.contact,
          drafts: conversation.drafts,
        }),
      },
      messages: messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        body: getMessageBody(message),
        type: getMessageType(message),
        status: getMessageStatus(message),
        externalId: getExternalId(message),
        createdAt: message.createdAt.toISOString(),
        sentAt: message.direction === "OUT" ? message.createdAt.toISOString() : null,
      })),
    })
  } catch (error) {
    console.error(
      "[GET /api/store/current/whatsapp/conversations/[id]/messages]",
      error
    )
    return serverError("Nao foi possivel listar mensagens da conversa WhatsApp.")
  }
}
