import { NextRequest, NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma, Prisma } from "@/lib/prisma"
import { whatsappConversationListQuerySchema } from "@/lib/validators/whatsapp-attendance"

export const runtime = "nodejs"

type MessagePreview = {
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

const SEARCH_CANDIDATE_LIMIT = 500

const conversationListSelect = {
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
    take: 5,
    select: {
      id: true,
      direction: true,
      text: true,
      payload: true,
      providerMessageId: true,
      createdAt: true,
    },
  },
} as const

const conversationOrderBy = [
  { lastMessageAt: { sort: "desc", nulls: "last" } },
  { updatedAt: "desc" },
  { createdAt: "desc" },
] satisfies Prisma.ConversationOrderByWithRelationInput[]

type ConversationListRecord = Prisma.ConversationGetPayload<{
  select: typeof conversationListSelect
}>

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
  details: ReturnType<typeof whatsappConversationListQuerySchema.safeParse>
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

function getMessageBody(message: MessagePreview | null | undefined) {
  if (!message) {
    return null
  }

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
  messages: MessagePreview[]
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

function normalizeSearchValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function matchesSearchValue(value: unknown, normalizedQuery: string) {
  const normalizedValue = normalizeSearchValue(value)

  if (normalizedValue.includes(normalizedQuery)) {
    return true
  }

  const queryDigits = onlyDigits(normalizedQuery)
  if (!queryDigits) {
    return false
  }

  return onlyDigits(normalizedValue).includes(queryDigits)
}

function buildSearchWhere(q: string | undefined): Prisma.ConversationWhereInput {
  if (!q) {
    return {}
  }

  return {
    OR: [
      {
        contact: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        messages: {
          some: {
            text: {
              contains: q,
              mode: "insensitive",
            },
          },
        },
      },
      {
        messages: {
          some: {
            providerMessageId: {
              contains: q,
              mode: "insensitive",
            },
          },
        },
      },
      {
        drafts: {
          some: {
            customerName: {
              contains: q,
              mode: "insensitive",
            },
          },
        },
      },
      {
        drafts: {
          some: {
            customerPhone: {
              contains: q,
              mode: "insensitive",
            },
          },
        },
      },
    ],
  }
}

function getConversationLastMessageAt(conversation: ConversationListRecord) {
  return (
    conversation.lastMessageAt ??
    conversation.updatedAt ??
    conversation.createdAt
  )
}

function buildConversationSummary(conversation: ConversationListRecord) {
  const lastMessage = conversation.messages[0] ?? null

  return {
    id: conversation.id,
    customerName: getCustomerName({
      drafts: conversation.drafts,
      messages: conversation.messages,
    }),
    customerPhone: getCustomerPhone({
      contact: conversation.contact,
      drafts: conversation.drafts,
    }),
    state: conversation.state,
    lastMessageAt: getConversationLastMessageAt(conversation).toISOString(),
    lastMessage: lastMessage
      ? {
          body: getMessageBody(lastMessage),
          direction: lastMessage.direction,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : null,
    unreadCount: 0,
  }
}

function conversationMatchesNormalizedQuery(params: {
  conversation: ConversationListRecord
  summary: ReturnType<typeof buildConversationSummary>
  normalizedQuery: string
}) {
  const searchableValues = [
    params.summary.customerName,
    params.summary.customerPhone,
    params.summary.lastMessage?.body,
    params.conversation.contact,
    ...params.conversation.drafts.flatMap((draft) => [
      draft.customerName,
      draft.customerPhone,
    ]),
    ...params.conversation.messages.flatMap((message) => [
      message.text,
      message.providerMessageId,
      getMessageBody(message),
      getCustomerNameFromPayload(message.payload),
    ]),
  ]

  return searchableValues.some((value) =>
    matchesSearchValue(value, params.normalizedQuery)
  )
}

function mergeConversationsById(conversations: ConversationListRecord[]) {
  const byId = new Map<string, ConversationListRecord>()

  for (const conversation of conversations) {
    byId.set(conversation.id, conversation)
  }

  return Array.from(byId.values()).sort(
    (left, right) =>
      getConversationLastMessageAt(right).getTime() -
      getConversationLastMessageAt(left).getTime()
  )
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireStoreMember()
    if (authResult instanceof Response) {
      return authResult
    }

    const parsed = whatsappConversationListQuerySchema.safeParse({
      q: req.nextUrl.searchParams.get("q") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    })

    if (!parsed.success) {
      return validationError(parsed)
    }

    const normalizedQuery = normalizeSearchValue(parsed.data.q)
    const baseWhere: Prisma.ConversationWhereInput = {
      storeId: authResult.storeId,
      channel: "WHATSAPP",
    }
    const recentCandidateLimit = normalizedQuery
      ? Math.max(parsed.data.limit, SEARCH_CANDIDATE_LIMIT)
      : parsed.data.limit

    const [connection, recentConversations, databaseMatchedConversations] =
      await Promise.all([
      prisma.whatsAppConnection.findFirst({
        where: {
          storeId: authResult.storeId,
          provider: "META_WHATSAPP",
          isActive: true,
          status: "CONNECTED",
        },
        select: {
          displayPhoneNumber: true,
          phoneNumberId: true,
          businessAccountId: true,
          status: true,
        },
      }),
      prisma.conversation.findMany({
        where: baseWhere,
        orderBy: conversationOrderBy,
        take: recentCandidateLimit,
        select: conversationListSelect,
      }),
      parsed.data.q
        ? prisma.conversation.findMany({
            where: {
              ...baseWhere,
              ...buildSearchWhere(parsed.data.q),
            },
            orderBy: conversationOrderBy,
            take: parsed.data.limit,
            select: conversationListSelect,
          })
        : Promise.resolve([]),
    ])

    const databaseMatchedConversationIds = new Set(
      databaseMatchedConversations.map((conversation) => conversation.id)
    )
    const conversationSummaries = mergeConversationsById([
      ...recentConversations,
      ...databaseMatchedConversations,
    ]).map((conversation) => ({
      conversation,
      summary: buildConversationSummary(conversation),
    }))
    const filteredConversationSummaries = normalizedQuery
      ? conversationSummaries.filter(({ conversation, summary }) => {
          return (
            databaseMatchedConversationIds.has(conversation.id) ||
            conversationMatchesNormalizedQuery({
              conversation,
              summary,
              normalizedQuery,
            })
          )
        })
      : conversationSummaries

    return ok({
      connection,
      conversations: filteredConversationSummaries
        .slice(0, parsed.data.limit)
        .map(({ summary }) => summary),
    })
  } catch (error) {
    console.error("[GET /api/store/current/whatsapp/conversations]", error)
    return serverError("Nao foi possivel listar conversas WhatsApp.")
  }
}
