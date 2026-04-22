import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma, Prisma } from "@/lib/prisma"
import { badRequest, ok, serverError, unauthorized } from "@/lib/api/response"
import {
  checkAvailabilityForSlot,
  listEligibleStaffForService,
  listNextAvailableSlots,
  resolveEligibleStaffChoice,
  type EligibleStaffMember,
  type SuggestedSlot,
} from "@/lib/appointments/availability"
import { handleIncomingMessage } from "@/lib/bot/flow"
import {
  getDateKeyInTimeZone,
  formatDateTimeForBot,
  getBotTimezone,
  getTimeKeyInTimeZone,
  getWeekdayFromDateKey,
  normalizeBotText,
  parseDateTimeFromText,
  type ParsedDateTimeValue,
} from "@/lib/bot/datetime"
import type { BotConversationContext } from "@/lib/bot/types"
import {
  STORE_PUBLIC_INFO_FALLBACK_TEXT,
  formatStorePublicInfoForWhatsApp,
} from "@/lib/store/public-info"
import {
  parseIncomingWhatsApp,
} from "@/lib/whatsapp/parse"
import {
  findActiveWhatsAppConnectionByVerifyToken,
  findActiveWhatsAppConnectionForInboundMessage,
} from "@/lib/whatsapp/connection"
import {
  sendMetaTextMessage,
  type MetaTextOutboundResult,
} from "@/lib/whatsapp/meta-outbound"

export const runtime = "nodejs"

type DraftWithRelations = Prisma.AppointmentDraftGetPayload<{
  include: {
    service: {
      select: {
        id: true
        name: true
        durationMin: true
      }
    }
    membership: {
      select: {
        id: true
        user: {
          select: {
            name: true
          }
        }
      }
    }
  }
}>

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    service: {
      select: {
        id: true
        name: true
        durationMin: true
      }
    }
    membership: {
      select: {
        id: true
        user: {
          select: {
            name: true
          }
        }
      }
    }
  }
}>

type StoredAppointmentOption = {
  id: string
  label: string
}

const TIME_SUGGESTIONS_LIMIT = 5

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return { error: "non-serializable payload" } as Prisma.InputJsonValue
  }
}

function getJsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }

  return {}
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function toOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null
}

function parseJsonBody(rawBody: string) {
  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    return null
  }
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_META_APP_SECRET?.trim()

  if (!appSecret) {
    return process.env.NODE_ENV !== "production"
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false
  }

  try {
    const expected = Buffer.from(
      createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"),
      "hex"
    )
    const received = Buffer.from(signatureHeader.slice("sha256=".length), "hex")

    return received.length === expected.length && timingSafeEqual(received, expected)
  } catch {
    return false
  }
}

function isProviderMessageUniqueConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false
  }

  const targets = Array.isArray(error.meta?.target)
    ? error.meta.target.map(String)
    : [String(error.meta?.target ?? "")]

  return targets.some((target) => target.includes("providerMessageId"))
}

function hasSuccessfulOutboundDelivery(payload: Record<string, unknown>) {
  const deliveryRequest = payload.deliveryRequest

  return Boolean(
    deliveryRequest &&
      typeof deliveryRequest === "object" &&
      !Array.isArray(deliveryRequest) &&
      (deliveryRequest as { ok?: unknown }).ok === true
  )
}

function buildMetaDeliveryPayload(result: MetaTextOutboundResult) {
  const basePayload = {
    provider: result.provider,
    whatsappConnectionId: result.whatsappConnectionId,
    phoneNumberId: result.phoneNumberId,
    graphMessageId: result.graphMessageId,
    providerMessageId: result.graphMessageId,
    deliveryRequest: {
      ok: result.ok,
      statusCode: result.statusCode,
      attemptedAt: new Date().toISOString(),
    },
    graphResponse: result.graphResponse,
  }

  if (result.ok) {
    return basePayload
  }

  return {
    ...basePayload,
    errorCode: result.errorCode,
    error: result.error,
    graphError: result.graphError,
    responsePreview: result.responsePreview,
  }
}

type MetaStatusCallbackItem = {
  id: string | null
  recipientId: string | null
  status: string | null
  timestamp: string | null
  conversationId: string | null
  expirationTimestamp: string | null
  pricingCategory: string | null
  pricingModel: string | null
  billable: boolean | null
  errors: unknown[] | null
}

function extractMetaStatusItems(payload: unknown): MetaStatusCallbackItem[] {
  if (!isObjectRecord(payload) || payload.object !== "whatsapp_business_account") {
    return []
  }

  const statusItems: MetaStatusCallbackItem[] = []
  const entries = Array.isArray(payload.entry) ? payload.entry : []

  for (const entry of entries) {
    if (!isObjectRecord(entry)) {
      continue
    }

    const changes = Array.isArray(entry.changes) ? entry.changes : []

    for (const change of changes) {
      if (!isObjectRecord(change) || !isObjectRecord(change.value)) {
        continue
      }

      const value = change.value
      const statuses = Array.isArray(value.statuses) ? value.statuses : []

      for (const status of statuses) {
        if (!isObjectRecord(status)) {
          continue
        }

        const conversation = isObjectRecord(status.conversation)
          ? status.conversation
          : null
        const pricing = isObjectRecord(status.pricing) ? status.pricing : null

        statusItems.push({
          id: toOptionalString(status.id),
          recipientId: toOptionalString(status.recipient_id),
          status: toOptionalString(status.status),
          timestamp: toOptionalString(status.timestamp),
          conversationId: conversation
            ? toOptionalString(conversation.id)
            : null,
          expirationTimestamp: conversation
            ? toOptionalString(conversation.expiration_timestamp)
            : null,
          pricingCategory: pricing ? toOptionalString(pricing.category) : null,
          pricingModel: pricing ? toOptionalString(pricing.pricing_model) : null,
          billable: pricing ? toOptionalBoolean(pricing.billable) : null,
          errors: Array.isArray(status.errors) ? status.errors : null,
        })
      }
    }
  }

  return statusItems
}

function isDuplicateMetaStatusEvent(
  existingEvents: Record<string, unknown>[],
  statusItem: MetaStatusCallbackItem
) {
  return existingEvents.some((event) => {
    return (
      toOptionalString(event.id) === statusItem.id &&
      toOptionalString(event.status) === statusItem.status &&
      toOptionalString(event.timestamp) === statusItem.timestamp &&
      toOptionalString(event.recipientId) === statusItem.recipientId
    )
  })
}

async function persistMetaStatusEvent(statusItem: MetaStatusCallbackItem) {
  if (!statusItem.id) {
    return false
  }

  const matchedMessage = await prisma.conversationMessage.findFirst({
    where: {
      direction: "OUT",
      providerMessageId: statusItem.id,
    },
    select: {
      id: true,
      payload: true,
    },
  })

  if (!matchedMessage) {
    console.warn("whatsapp webhook meta status unmatched", {
      providerMessageId: statusItem.id,
      recipientId: statusItem.recipientId,
      status: statusItem.status,
    })

    return false
  }

  const payload = getJsonRecord(matchedMessage.payload)
  const existingStatusEvents = Array.isArray(payload.statusEvents)
    ? payload.statusEvents.filter(isObjectRecord)
    : []

  if (isDuplicateMetaStatusEvent(existingStatusEvents, statusItem)) {
    return true
  }

  await prisma.conversationMessage.update({
    where: { id: matchedMessage.id },
    data: {
      payload: toJsonValue({
        ...payload,
        statusEvents: [
          ...existingStatusEvents,
          {
            ...statusItem,
            receivedAt: new Date().toISOString(),
          },
        ],
      }),
    },
  })

  return true
}

function buildStaffOptionsText(staffMembers: EligibleStaffMember[]) {
  return staffMembers.map((staff, index) => `${index + 1}. ${staff.name}`).join("\n")
}

function buildStaffChoiceMessage(serviceName: string, staffMembers: EligibleStaffMember[]) {
  return `Perfeito! Qual profissional voce prefere para ${serviceName}?\n${buildStaffOptionsText(staffMembers)}\nResponda com o numero ou com o nome.`
}

function buildAppointmentLabel(appointment: AppointmentWithRelations, timeZone: string) {
  const serviceName = appointment.service?.name ?? "Agendamento"
  const staffName = appointment.membership?.user.name ?? "Sem profissional"

  return `${serviceName} - ${staffName} - ${formatDateTimeForBot(appointment.startAt, timeZone)}`
}

function buildAppointmentOptionsText(options: StoredAppointmentOption[]) {
  return options.map((option, index) => `${index + 1}. ${option.label}`).join("\n")
}

function buildFutureAppointmentsMessage(options: StoredAppointmentOption[]) {
  return `Encontrei estes agendamentos futuros:\n${buildAppointmentOptionsText(options)}\n\nResponda com o numero do agendamento que deseja alterar.`
}

function buildAppointmentActionMessage(label: string) {
  return `Agendamento selecionado:\n${label}\n\nO que voce deseja fazer?\n1. Desmarcar\n2. Remarcar`
}

function buildSuggestedSlotsText(suggestions: SuggestedSlot[]) {
  return suggestions.map((slot, index) => `${index + 1}. ${slot.label}`).join("\n")
}

function buildTimeSuggestionsMessage(params: {
  intro?: string
  suggestions: SuggestedSlot[]
}) {
  if (!params.suggestions.length) {
    return `${params.intro ? `${params.intro}\n` : ""}Nao encontrei horarios proximos disponiveis agora. Pode me dizer outro dia ou periodo para eu buscar disponibilidade.`
  }

  return `${params.intro ? `${params.intro}\n` : ""}Aqui estao alguns horarios disponiveis:\n${buildSuggestedSlotsText(params.suggestions)}\n\nPode responder com o numero da opcao ou me dizer outro dia e horario.`
}

function buildUnavailableTimeMessage(params: {
  message: string
  suggestions: SuggestedSlot[]
}) {
  if (!params.suggestions.length) {
    return `${params.message} Pode me dizer outro dia ou periodo para eu buscar disponibilidade.`
  }

  return `${params.message}\nSugestoes proximas:\n${buildSuggestedSlotsText(params.suggestions)}\n\nPode responder com o numero da opcao ou me dizer outro dia e horario.`
}

function serializeSuggestedSlots(suggestions: SuggestedSlot[]) {
  return suggestions.map((slot) => ({
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    label: slot.label,
  }))
}

function serializeAppointmentOptions(options: StoredAppointmentOption[]) {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
  }))
}

function getStoredSuggestedSlots(context: Record<string, unknown>) {
  const raw = context.timeSlotSuggestions
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return []
    }

    const startAt = typeof entry.startAt === "string" ? entry.startAt : null
    const endAt = typeof entry.endAt === "string" ? entry.endAt : null
    const label = typeof entry.label === "string" ? entry.label : null

    if (!startAt || !endAt || !label) {
      return []
    }

    const parsedStartAt = new Date(startAt)
    const parsedEndAt = new Date(endAt)

    if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
      return []
    }

    return [
      {
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        label,
      } satisfies SuggestedSlot,
    ]
  })
}

function getStoredAppointmentOptions(context: Record<string, unknown>) {
  const raw = context.appointmentOptions
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return []
    }

    const id = typeof entry.id === "string" ? entry.id : null
    const label = typeof entry.label === "string" ? entry.label : null

    if (!id || !label) {
      return []
    }

    return [{ id, label } satisfies StoredAppointmentOption]
  })
}

function resolveSuggestedSlotChoice(text: string, suggestions: SuggestedSlot[]) {
  const match = normalizeBotText(text).match(/^(\d{1,2})$/)
  if (!match) {
    return null
  }

  return suggestions[Number(match[1]) - 1] ?? null
}

function resolveStoredAppointmentChoice(text: string, options: StoredAppointmentOption[]) {
  const match = normalizeBotText(text).match(/^(\d{1,2})$/)
  if (!match) {
    return null
  }

  return options[Number(match[1]) - 1] ?? null
}

function toParsedDateTimeValue(startAt: Date, timeZone: string): ParsedDateTimeValue {
  const dateKey = getDateKeyInTimeZone(startAt, timeZone)
  const timeKey = getTimeKeyInTimeZone(startAt, timeZone)

  return {
    startAt,
    dateKey,
    timeKey,
    weekday: getWeekdayFromDateKey(dateKey),
    label: formatDateTimeForBot(startAt, timeZone),
  }
}

function resolveConversationTimezone(context: Prisma.JsonValue | null | undefined) {
  if (context && typeof context === "object" && !Array.isArray(context)) {
    const value = (context as { timezone?: unknown }).timezone
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  return getBotTimezone()
}

function getConversationContextRecord(context: Prisma.JsonValue | null | undefined) {
  if (context && typeof context === "object" && !Array.isArray(context)) {
    return { ...(context as Record<string, unknown>) }
  }

  return {}
}

function buildBotContext(context: Prisma.JsonValue | null | undefined): BotConversationContext {
  const record = getConversationContextRecord(context)

  return {
    timezone: typeof record.timezone === "string" ? record.timezone : null,
    mainMenuShown: record.mainMenuShown === true,
    appointmentOptions: serializeAppointmentOptions(getStoredAppointmentOptions(record)),
    selectedAppointmentId:
      typeof record.selectedAppointmentId === "string" ? record.selectedAppointmentId : null,
    selectedAppointmentLabel:
      typeof record.selectedAppointmentLabel === "string" ? record.selectedAppointmentLabel : null,
    rescheduleAppointmentId:
      typeof record.rescheduleAppointmentId === "string" ? record.rescheduleAppointmentId : null,
    timeSlotSuggestions: serializeSuggestedSlots(getStoredSuggestedSlots(record)),
  }
}

async function getStorePublicInfoReply(tx: Prisma.TransactionClient, storeId: string) {
  const store = await tx.store.findUnique({
    where: { id: storeId },
    select: {
      name: true,
      phone: true,
      whatsappPhone: true,
      address: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      zipcode: true,
      serviceObservations: true,
      businessHoursSummary: true,
    },
  })

  if (!store) {
    return STORE_PUBLIC_INFO_FALLBACK_TEXT
  }

  return formatStorePublicInfoForWhatsApp(store)
}

const metaWebhookVerificationSchema = z.object({
  mode: z.string().min(1),
  verifyToken: z.string().min(1),
  challenge: z.string().min(1),
})

type ProcessIncomingMessageParams = {
  currentStoreId: string
  shouldAttemptOutboundDelivery: boolean
  incomingMessage: {
    providerMessageId: string
    from: string
    text: string | null
    raw: unknown
  }
}

type ProcessIncomingMessageResult = {
  conversationId: string
  messageId: string
  nextState: string | null
  draftId: string | null
  appointmentId: string | null
  replies: string[]
  replayed: boolean
}

type PersistedOutboundMessage = {
  id: string
  text: string
  payload: Record<string, unknown>
}

type ExistingInboundMessage = {
  id: string
  conversationId: string
  conversation: {
    state: string
  }
}

function buildExistingInboundResult(
  existingInbound: ExistingInboundMessage
): ProcessIncomingMessageResult {
  return {
    conversationId: existingInbound.conversationId,
    messageId: existingInbound.id,
    nextState: existingInbound.conversation.state,
    draftId: null,
    appointmentId: null,
    replies: [],
    replayed: true,
  }
}

async function findExistingInboundResult(params: {
  db: Prisma.TransactionClient
  storeId: string
  providerMessageId: string
}) {
  const existingInbound = await params.db.conversationMessage.findUnique({
    where: {
      storeId_providerMessageId: {
        storeId: params.storeId,
        providerMessageId: params.providerMessageId,
      },
    },
    select: {
      id: true,
      conversationId: true,
      conversation: {
        select: {
          state: true,
        },
      },
    },
  })

  return existingInbound ? buildExistingInboundResult(existingInbound) : null
}

async function findExistingInboundResultAfterUniqueConflict(params: {
  storeId: string
  providerMessageId: string
}) {
  const existingInbound = await prisma.conversationMessage.findUnique({
    where: {
      storeId_providerMessageId: {
        storeId: params.storeId,
        providerMessageId: params.providerMessageId,
      },
    },
    select: {
      id: true,
      conversationId: true,
      conversation: {
        select: {
          state: true,
        },
      },
    },
  })

  return existingInbound ? buildExistingInboundResult(existingInbound) : null
}

async function lockConversationForInboundProcessing(
  tx: Prisma.TransactionClient,
  conversationId: string
) {
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Conversation"
    WHERE id = ${conversationId}
    FOR UPDATE
  `
}

async function deliverPersistedOutboundMessages(params: {
  storeId: string
  conversationId: string
  to: string
  messages: PersistedOutboundMessage[]
}) {
  for (const message of params.messages) {
    if (hasSuccessfulOutboundDelivery(message.payload)) {
      continue
    }

    try {
      const deliveryResult = await sendMetaTextMessage({
        storeId: params.storeId,
        to: params.to,
        text: message.text,
      })

      try {
        await prisma.conversationMessage.update({
          where: { id: message.id },
          data: {
            payload: toJsonValue({
              ...message.payload,
              ...buildMetaDeliveryPayload(deliveryResult),
            }),
            ...(deliveryResult.ok && deliveryResult.graphMessageId
              ? { providerMessageId: deliveryResult.graphMessageId }
              : {}),
          },
        })
      } catch (updateError) {
        console.error("whatsapp outbound payload update error", {
          storeId: params.storeId,
          conversationId: params.conversationId,
          messageId: message.id,
          error:
            updateError instanceof Error
              ? updateError.message
              : String(updateError),
        })
      }

      if (!deliveryResult.ok) {
        console.error("whatsapp outbound send error", {
          storeId: params.storeId,
          conversationId: params.conversationId,
          messageId: message.id,
          to: params.to,
          statusCode: deliveryResult.statusCode,
          errorCode: deliveryResult.errorCode,
          error: deliveryResult.error,
          graphError: deliveryResult.graphError,
          responsePreview: deliveryResult.responsePreview,
          whatsappConnectionId: deliveryResult.whatsappConnectionId,
          phoneNumberId: deliveryResult.phoneNumberId,
        })
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      console.error("whatsapp outbound unexpected error", {
        storeId: params.storeId,
        conversationId: params.conversationId,
        messageId: message.id,
        to: params.to,
        error: errorMessage,
      })

      try {
        await prisma.conversationMessage.update({
          where: { id: message.id },
          data: {
            payload: toJsonValue({
              ...message.payload,
              provider: "meta",
              whatsappConnectionId: null,
              phoneNumberId: null,
              graphMessageId: null,
              providerMessageId: null,
              deliveryRequest: {
                ok: false,
                statusCode: null,
                attemptedAt: new Date().toISOString(),
              },
              errorCode: "UNEXPECTED_RUNTIME_ERROR",
              error: errorMessage,
            }),
          },
        })
      } catch (updateError) {
        console.error("whatsapp outbound payload update error", {
          storeId: params.storeId,
          conversationId: params.conversationId,
          messageId: message.id,
          error:
            updateError instanceof Error
              ? updateError.message
              : String(updateError),
        })
      }
    }
  }
}

async function processIncomingWhatsAppMessage(
  params: ProcessIncomingMessageParams
): Promise<ProcessIncomingMessageResult> {
  const {
    currentStoreId,
    incomingMessage,
    shouldAttemptOutboundDelivery,
  } = params

  const outMessages: string[] = []
  const persistedOutboundMessages: PersistedOutboundMessage[] = []
  let transactionResult: ProcessIncomingMessageResult

  try {
    transactionResult = await prisma.$transaction(async (tx) => {
      const defaultTimezone = getBotTimezone()

      const conversation = await tx.conversation.upsert({
        where: {
          storeId_channel_contact: {
            storeId: currentStoreId,
            channel: "WHATSAPP",
            contact: incomingMessage.from,
          },
        },
        update: {
          lastMessageAt: new Date(),
        },
        create: {
          storeId: currentStoreId,
          channel: "WHATSAPP",
          contact: incomingMessage.from,
          state: "IDLE",
          context: toJsonValue({ timezone: defaultTimezone }),
          lastMessageAt: new Date(),
        },
      })

      await lockConversationForInboundProcessing(tx, conversation.id)

      const existingInbound = await findExistingInboundResult({
        db: tx,
        storeId: currentStoreId,
        providerMessageId: incomingMessage.providerMessageId,
      })

      if (existingInbound) {
        return existingInbound
      }

      const timeZone = resolveConversationTimezone(conversation.context)
      let conversationContext = getConversationContextRecord(conversation.context)

      const savedIn = await tx.conversationMessage.create({
        data: {
          storeId: currentStoreId,
          conversationId: conversation.id,
          direction: "IN",
          providerMessageId: incomingMessage.providerMessageId,
          text: incomingMessage.text ?? undefined,
          payload: toJsonValue(incomingMessage.raw),
        },
      })

      const bot = handleIncomingMessage({
        state: conversation.state,
        text: incomingMessage.text,
        context: buildBotContext(conversation.context),
      })

      let nextState: string | null = null
      let ensuredDraftId: string | null = null
      let createdAppointmentId: string | null = null
      let parsedDateTime: ParsedDateTimeValue | null = null
      let draftCache: DraftWithRelations | null = null
      let shouldStop = false
      async function updateState(
        state:
          | "IDLE"
          | "CHOOSING_APPOINTMENT"
          | "CHOOSING_APPOINTMENT_ACTION"
          | "CHOOSING_SERVICE"
          | "CHOOSING_STAFF"
          | "CHOOSING_TIME"
          | "CONFIRMING"
          | "CONFIRMING_APPOINTMENT_CANCELLATION"
      ) {
        nextState = state
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { state, lastMessageAt: new Date() },
        })
      }

      async function appendBotReply(text: string, extraPayload?: Record<string, unknown>) {
        outMessages.push(text)

        const createdMessage = await tx.conversationMessage.create({
          data: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            direction: "OUT",
            text,
            payload: toJsonValue({
              source: "bot",
              text,
              ...extraPayload,
            }),
          },
          select: {
            id: true,
            text: true,
            payload: true,
          },
        })

        persistedOutboundMessages.push({
          id: createdMessage.id,
          text: createdMessage.text ?? text,
          payload: getJsonRecord(createdMessage.payload),
        })
      }

      async function persistConversationContext(patch: Partial<BotConversationContext>) {
        conversationContext = {
          ...conversationContext,
          ...patch,
        }

        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            context: toJsonValue(conversationContext),
          },
        })
      }

      async function setSuggestedTimeSlots(suggestions: SuggestedSlot[]) {
        await persistConversationContext({
          timeSlotSuggestions: suggestions.length ? serializeSuggestedSlots(suggestions) : null,
        })
      }

      async function clearAppointmentFlowContext() {
        await persistConversationContext({
          appointmentOptions: null,
          selectedAppointmentId: null,
          selectedAppointmentLabel: null,
          rescheduleAppointmentId: null,
        })
      }

      async function ensureDraft() {
        if (ensuredDraftId) {
          return ensuredDraftId
        }

        const draft = await tx.appointmentDraft.findFirst({
          where: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            status: "DRAFT",
          },
          orderBy: { createdAt: "desc" },
        })

        if (draft) {
          ensuredDraftId = draft.id
          return draft.id
        }

        const created = await tx.appointmentDraft.create({
          data: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            status: "DRAFT",
            channel: "WHATSAPP",
            customerPhone: incomingMessage.from,
          },
        })

        ensuredDraftId = created.id
        draftCache = null
        return created.id
      }

      async function getDraft(forceRefresh = false) {
        const draftId = await ensureDraft()

        if (draftCache && draftCache.id === draftId && !forceRefresh) {
          return draftCache
        }

        draftCache = await tx.appointmentDraft.findUnique({
          where: { id: draftId },
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

        return draftCache
      }

      async function clearDraftDateTime() {
        const draftId = await ensureDraft()

        await tx.appointmentDraft.update({
          where: { id: draftId },
          data: {
            startAt: null,
            endAt: null,
          },
        })

        if (draftCache?.id === draftId) {
          draftCache = {
            ...draftCache,
            startAt: null,
            endAt: null,
          }
        }
      }

      async function setDraftSelection(data: {
        serviceId?: string | null
        staffMembershipId?: string | null
        customerName?: string | null
        customerPhone?: string | null
        customerEmail?: string | null
        startAt?: Date | null
        endAt?: Date | null
        notes?: string | null
        appointmentId?: string | null
      }) {
        const draftId = await ensureDraft()

        await tx.appointmentDraft.update({
          where: { id: draftId },
          data,
        })

        draftCache = null
      }

      async function listFutureAppointmentsForCustomer() {
        return tx.appointment.findMany({
          where: {
            storeId: currentStoreId,
            customerPhone: incomingMessage.from,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startAt: { gt: new Date() },
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
          orderBy: { startAt: "asc" },
        })
      }

      async function getStoredOrFreshAppointmentOptions() {
        const storedOptions = getStoredAppointmentOptions(conversationContext)
        if (storedOptions.length) {
          return storedOptions
        }

        const appointments = await listFutureAppointmentsForCustomer()
        return appointments.map((appointment) => ({
          id: appointment.id,
          label: buildAppointmentLabel(appointment, timeZone),
        }))
      }

      async function getSelectedAppointment() {
        const selectedAppointmentId =
          typeof conversationContext.selectedAppointmentId === "string"
            ? conversationContext.selectedAppointmentId
            : null

        if (!selectedAppointmentId) {
          return null
        }

        return tx.appointment.findFirst({
          where: {
            id: selectedAppointmentId,
            storeId: currentStoreId,
            customerPhone: incomingMessage.from,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startAt: { gt: new Date() },
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
      }

      async function getRescheduleSourceAppointment() {
        const rescheduleAppointmentId =
          typeof conversationContext.rescheduleAppointmentId === "string"
            ? conversationContext.rescheduleAppointmentId
            : null

        if (!rescheduleAppointmentId) {
          return null
        }

        return tx.appointment.findFirst({
          where: {
            id: rescheduleAppointmentId,
            storeId: currentStoreId,
            customerPhone: incomingMessage.from,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startAt: { gt: new Date() },
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
      }

      async function loadTimeSuggestionsForDraft(draft: DraftWithRelations, searchStartAt?: Date) {
        if (!draft.service || !draft.staffMembershipId) {
          return []
        }

        const ignoreAppointmentId =
          typeof conversationContext.rescheduleAppointmentId === "string"
            ? conversationContext.rescheduleAppointmentId
            : null

        return listNextAvailableSlots({
          db: tx,
          storeId: currentStoreId,
          durationMin: draft.service.durationMin,
          timeZone,
          staffMembershipId: draft.staffMembershipId,
          ignoreAppointmentId,
          searchStartAt,
          limit: TIME_SUGGESTIONS_LIMIT,
        })
      }

      async function sendTimeSuggestionsForDraft(params: {
        draft: DraftWithRelations
        intro?: string
        searchStartAt?: Date
      }) {
        const suggestions = await loadTimeSuggestionsForDraft(params.draft, params.searchStartAt)
        await setSuggestedTimeSlots(suggestions)

        await appendBotReply(
          buildTimeSuggestionsMessage({
            intro: params.intro,
            suggestions,
          }),
          {
            serviceId: params.draft.service?.id,
            staffMembershipId: params.draft.staffMembershipId,
            suggestions: serializeSuggestedSlots(suggestions),
          }
        )

        return suggestions
      }

      async function ensureResolvedStaffForDraft() {
        const draft = await getDraft(true)

        if (!draft?.service) {
          await updateState("CHOOSING_SERVICE")
          await appendBotReply(
            "Antes de escolher profissional, preciso identificar o servico. Qual servico voce quer agendar?",
            {
              reason: "SERVICE_REQUIRED",
            }
          )
          shouldStop = true
          return null
        }

        if (draft.staffMembershipId && draft.membership) {
          return draft
        }

        const eligibleStaff = await listEligibleStaffForService({
          db: tx,
          storeId: currentStoreId,
          serviceId: draft.service.id,
        })

        if (eligibleStaff.length === 0) {
          await setDraftSelection({
            serviceId: null,
            staffMembershipId: null,
            startAt: null,
            endAt: null,
          })
          await setSuggestedTimeSlots([])
          await updateState("CHOOSING_SERVICE")
          await appendBotReply(
            `Nao ha profissional disponivel para ${draft.service.name} no momento. Escolha outro servico.`,
            {
              reason: "NO_ELIGIBLE_STAFF",
              serviceId: draft.service.id,
            }
          )
          shouldStop = true
          return null
        }

        if (eligibleStaff.length === 1) {
          await setDraftSelection({
            staffMembershipId: eligibleStaff[0].membershipId,
          })
          return getDraft(true)
        }

        await updateState("CHOOSING_STAFF")
        await setSuggestedTimeSlots([])
        await appendBotReply(buildStaffChoiceMessage(draft.service.name, eligibleStaff), {
          reason: "STAFF_SELECTION_REQUIRED",
          serviceId: draft.service.id,
        })
        shouldStop = true
        return null
      }

      for (const action of bot.actions) {
        if (shouldStop) {
          break
        }

        if (action.type === "SET_STATE") {
          await updateState(action.state)
          continue
        }

        if (action.type === "PATCH_CONTEXT") {
          await persistConversationContext(action.context)
          continue
        }

        if (action.type === "ENSURE_DRAFT") {
          await ensureDraft()
          continue
        }

        if (action.type === "REPLY_STORE_INFO") {
          const textOut = await getStorePublicInfoReply(tx, currentStoreId)
          await appendBotReply(textOut, {
            reason: "STORE_PUBLIC_INFO",
          })
          continue
        }

        if (action.type === "LIST_FUTURE_APPOINTMENTS") {
          const appointments = await listFutureAppointmentsForCustomer()
          const options = appointments.map((appointment) => ({
            id: appointment.id,
            label: buildAppointmentLabel(appointment, timeZone),
          }))

          await setSuggestedTimeSlots([])

          if (!options.length) {
            await clearAppointmentFlowContext()
            await updateState("IDLE")
            await appendBotReply("Nao encontrei agendamentos futuros vinculados a este numero.", {
              reason: "NO_FUTURE_APPOINTMENTS",
            })
            shouldStop = true
            continue
          }

          await persistConversationContext({
            appointmentOptions: serializeAppointmentOptions(options),
            selectedAppointmentId: null,
            selectedAppointmentLabel: null,
            rescheduleAppointmentId: null,
          })
          await updateState("CHOOSING_APPOINTMENT")
          await appendBotReply(buildFutureAppointmentsMessage(options), {
            reason: "FUTURE_APPOINTMENTS_FOUND",
            appointmentOptions: serializeAppointmentOptions(options),
          })
          continue
        }

        if (action.type === "SELECT_EXISTING_APPOINTMENT") {
          const options = await getStoredOrFreshAppointmentOptions()

          if (!options.length) {
            await clearAppointmentFlowContext()
            await setSuggestedTimeSlots([])
            await updateState("IDLE")
            await appendBotReply("Nao encontrei agendamentos futuros vinculados a este numero.", {
              reason: "NO_FUTURE_APPOINTMENTS",
            })
            shouldStop = true
            continue
          }

          const selectedOption = resolveStoredAppointmentChoice(action.text, options)

          if (!selectedOption) {
            await persistConversationContext({
              appointmentOptions: serializeAppointmentOptions(options),
            })
            await updateState("CHOOSING_APPOINTMENT")
            await appendBotReply(
              `Nao entendi qual agendamento voce quer alterar.\n${buildFutureAppointmentsMessage(options)}`,
              {
                reason: "APPOINTMENT_SELECTION_INVALID",
                appointmentOptions: serializeAppointmentOptions(options),
              }
            )
            shouldStop = true
            continue
          }

          const selectedAppointment = await tx.appointment.findFirst({
            where: {
              id: selectedOption.id,
              storeId: currentStoreId,
              customerPhone: incomingMessage.from,
              status: { in: ["SCHEDULED", "CONFIRMED"] },
              startAt: { gt: new Date() },
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

          if (!selectedAppointment) {
            const refreshedAppointments = await listFutureAppointmentsForCustomer()
            const refreshedOptions = refreshedAppointments.map((appointment) => ({
              id: appointment.id,
              label: buildAppointmentLabel(appointment, timeZone),
            }))

            if (!refreshedOptions.length) {
              await clearAppointmentFlowContext()
              await setSuggestedTimeSlots([])
              await updateState("IDLE")
              await appendBotReply("Nao encontrei mais agendamentos futuros vinculados a este numero.", {
                reason: "APPOINTMENT_SELECTION_STALE",
              })
              shouldStop = true
              continue
            }

            await persistConversationContext({
              appointmentOptions: serializeAppointmentOptions(refreshedOptions),
              selectedAppointmentId: null,
              selectedAppointmentLabel: null,
              rescheduleAppointmentId: null,
            })
            await updateState("CHOOSING_APPOINTMENT")
            await appendBotReply(
              `Esse agendamento nao esta mais disponivel para alteracao.\n${buildFutureAppointmentsMessage(refreshedOptions)}`,
              {
                reason: "APPOINTMENT_SELECTION_STALE",
                appointmentOptions: serializeAppointmentOptions(refreshedOptions),
              }
            )
            shouldStop = true
            continue
          }

          const selectedLabel = buildAppointmentLabel(selectedAppointment, timeZone)

          await persistConversationContext({
            appointmentOptions: serializeAppointmentOptions(options),
            selectedAppointmentId: selectedAppointment.id,
            selectedAppointmentLabel: selectedLabel,
            rescheduleAppointmentId: null,
          })
          await setSuggestedTimeSlots([])
          await updateState("CHOOSING_APPOINTMENT_ACTION")
          await appendBotReply(buildAppointmentActionMessage(selectedLabel), {
            reason: "APPOINTMENT_SELECTED",
            appointmentId: selectedAppointment.id,
          })
          continue
        }

        if (action.type === "CANCEL_SELECTED_APPOINTMENT") {
          const selectedAppointment = await getSelectedAppointment()

          if (!selectedAppointment) {
            await clearAppointmentFlowContext()
            await setSuggestedTimeSlots([])
            await updateState("IDLE")
            await appendBotReply(
              "Nao encontrei um agendamento futuro valido para cancelar neste numero.",
              {
                reason: "SELECTED_APPOINTMENT_NOT_FOUND",
              }
            )
            shouldStop = true
            continue
          }

          const existingMetadata =
            selectedAppointment.metadata &&
            typeof selectedAppointment.metadata === "object" &&
            !Array.isArray(selectedAppointment.metadata)
              ? { ...(selectedAppointment.metadata as Record<string, unknown>) }
              : {}

          await tx.appointment.update({
            where: { id: selectedAppointment.id },
            data: {
              status: "CANCELED",
              metadata: toJsonValue({
                ...existingMetadata,
                canceledBy: "WHATSAPP",
                canceledFromConversationId: conversation.id,
                canceledFromMessageId: savedIn.id,
                canceledAt: new Date().toISOString(),
              }),
            },
          })

          await clearAppointmentFlowContext()
          await setSuggestedTimeSlots([])
          await appendBotReply(
            `Agendamento desmarcado com sucesso: ${buildAppointmentLabel(selectedAppointment, timeZone)}.`,
            {
              reason: "APPOINTMENT_CANCELED",
              appointmentId: selectedAppointment.id,
            }
          )
          continue
        }

        if (action.type === "PREPARE_RESCHEDULE_FROM_SELECTED_APPOINTMENT") {
          const selectedAppointment = await getSelectedAppointment()

          if (!selectedAppointment) {
            await clearAppointmentFlowContext()
            await setSuggestedTimeSlots([])
            await updateState("IDLE")
            await appendBotReply(
              "Nao encontrei um agendamento futuro valido para remarcar neste numero.",
              {
                reason: "SELECTED_APPOINTMENT_NOT_FOUND",
              }
            )
            shouldStop = true
            continue
          }

          if (!selectedAppointment.serviceId || !selectedAppointment.service) {
            await updateState("CHOOSING_APPOINTMENT_ACTION")
            await appendBotReply(
              "Esse agendamento nao pode ser remarcado automaticamente por aqui porque nao tem servico vinculado. Se quiser, posso ajudar com um novo agendamento.",
              {
                reason: "RESCHEDULE_SERVICE_REQUIRED",
                appointmentId: selectedAppointment.id,
              }
            )
            shouldStop = true
            continue
          }

          await setDraftSelection({
            serviceId: selectedAppointment.serviceId,
            staffMembershipId: selectedAppointment.staffMembershipId,
            customerName: selectedAppointment.customerName,
            customerPhone: selectedAppointment.customerPhone ?? incomingMessage.from,
            customerEmail: selectedAppointment.customerEmail,
            startAt: null,
            endAt: null,
            notes: selectedAppointment.notes ?? null,
            appointmentId: null,
          })

          const selectedLabel = buildAppointmentLabel(selectedAppointment, timeZone)
          await persistConversationContext({
            selectedAppointmentId: selectedAppointment.id,
            selectedAppointmentLabel: selectedLabel,
            rescheduleAppointmentId: selectedAppointment.id,
          })
          await setSuggestedTimeSlots([])

          const preparedDraft = await ensureResolvedStaffForDraft()
          if (!preparedDraft) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({
            draft: preparedDraft,
            intro: `Perfeito! Vamos remarcar ${selectedLabel}.`,
          })
          continue
        }

        if (action.type === "SELECT_SERVICE_FROM_TEXT") {
          await ensureDraft()

          const query = normalizeBotText(action.text)
          const services = await tx.service.findMany({
            where: {
              storeId: currentStoreId,
              active: true,
            },
            select: {
              id: true,
              name: true,
              durationMin: true,
            },
            orderBy: { name: "asc" },
          })

          const matched =
            services.find((service) => normalizeBotText(service.name) === query) ??
            services.find((service) => {
              const normalizedName = normalizeBotText(service.name)
              return normalizedName.includes(query) || query.includes(normalizedName)
            })

          if (!matched) {
            const list = services.map((service, index) => `${index + 1}) ${service.name}`).join("\n")

            const textOut = services.length
              ? `Nao encontrei esse servico. Escolha uma opcao:\n${list}`
              : "Ainda nao ha servicos cadastrados. Peca para o admin cadastrar um servico primeiro."

            await updateState("CHOOSING_SERVICE")
            await appendBotReply(textOut, {
              reason: "SERVICE_NOT_FOUND",
            })
            shouldStop = true
            continue
          }

          await setDraftSelection({
            serviceId: matched.id,
            staffMembershipId: null,
            startAt: null,
            endAt: null,
          })
          await setSuggestedTimeSlots([])
          continue
        }

        if (action.type === "RESOLVE_STAFF_FOR_DRAFT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({
            draft,
            intro: `Show! Servico: ${draft.service!.name}. Profissional: ${draft.membership!.user.name}.`,
          })
          continue
        }

        if (action.type === "SELECT_STAFF_FROM_TEXT") {
          const draft = await getDraft(true)

          if (!draft?.service) {
            await updateState("CHOOSING_SERVICE")
            await appendBotReply(
              "Antes de escolher profissional, preciso identificar o servico. Qual servico voce quer agendar?",
              {
                reason: "SERVICE_REQUIRED",
              }
            )
            shouldStop = true
            continue
          }

          const eligibleStaff = await listEligibleStaffForService({
            db: tx,
            storeId: currentStoreId,
            serviceId: draft.service.id,
          })

          if (eligibleStaff.length === 0) {
            await setDraftSelection({
              serviceId: null,
              staffMembershipId: null,
              startAt: null,
              endAt: null,
            })
            await setSuggestedTimeSlots([])
            await updateState("CHOOSING_SERVICE")
            await appendBotReply(
              `Nao ha profissional disponivel para ${draft.service.name} no momento. Escolha outro servico.`,
              {
                reason: "NO_ELIGIBLE_STAFF",
                serviceId: draft.service.id,
              }
            )
            shouldStop = true
            continue
          }

          if (eligibleStaff.length === 1) {
            await setDraftSelection({
              staffMembershipId: eligibleStaff[0].membershipId,
              startAt: null,
              endAt: null,
            })

            const updatedDraft = await getDraft(true)
            await updateState("CHOOSING_TIME")
            await sendTimeSuggestionsForDraft({
              draft: updatedDraft!,
              intro: `Vou seguir com ${updatedDraft!.membership!.user.name}.`,
            })
            continue
          }

          const selectedStaff = resolveEligibleStaffChoice({
            text: action.text,
            staffMembers: eligibleStaff,
          })

          if (!selectedStaff.ok) {
            await updateState("CHOOSING_STAFF")

            const textOut =
              selectedStaff.reason === "AMBIGUOUS"
                ? `Encontrei mais de um profissional parecido. Escolha pelo numero:\n${buildStaffOptionsText(eligibleStaff)}`
                : `Nao entendi qual profissional voce quer. Escolha pelo numero ou nome:\n${buildStaffOptionsText(eligibleStaff)}`

            await appendBotReply(textOut, {
              reason:
                selectedStaff.reason === "AMBIGUOUS" ? "STAFF_SELECTION_AMBIGUOUS" : "STAFF_SELECTION_INVALID",
              serviceId: draft.service.id,
            })
            shouldStop = true
            continue
          }

          await setDraftSelection({
            staffMembershipId: selectedStaff.staff.membershipId,
            startAt: null,
            endAt: null,
          })

          const updatedDraft = await getDraft(true)
          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({
            draft: updatedDraft!,
            intro: `Perfeito! Vou seguir com ${updatedDraft!.membership!.user.name}.`,
          })
          continue
        }

        if (action.type === "SUGGEST_TIME_SLOTS") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId || !draft.membership) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({ draft })
          continue
        }

        if (action.type === "SELECT_SUGGESTED_SLOT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId) {
            continue
          }

          let suggestions = getStoredSuggestedSlots(conversationContext)
          if (!suggestions.length) {
            suggestions = await loadTimeSuggestionsForDraft(draft)
            await setSuggestedTimeSlots(suggestions)
          }

          const selectedSlot = resolveSuggestedSlotChoice(action.text, suggestions)

          if (!selectedSlot) {
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildTimeSuggestionsMessage({
                intro: "Nao encontrei essa opcao.",
                suggestions,
              }),
              {
                reason: "SUGGESTED_SLOT_INVALID",
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(suggestions),
              }
            )
            shouldStop = true
            continue
          }

          parsedDateTime = toParsedDateTimeValue(selectedSlot.startAt, timeZone)
          continue
        }

        if (action.type === "PARSE_DATETIME_FROM_TEXT") {
          const parsed = parseDateTimeFromText({
            text: action.text,
            timeZone,
          })

          if (!parsed.ok) {
            parsedDateTime = null
            const suggestions = getStoredSuggestedSlots(conversationContext)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              suggestions.length
                ? `${parsed.error}\n${buildSuggestedSlotsText(suggestions)}\n\nPode responder com o numero da opcao ou me dizer outro dia e horario.`
                : parsed.error,
              {
                reason: "DATETIME_PARSE_FAILED",
                suggestions: serializeSuggestedSlots(suggestions),
              }
            )
            shouldStop = true
            continue
          }

          parsedDateTime = parsed.value
          continue
        }

        if (action.type === "CHECK_AVAILABILITY_FOR_DRAFT") {
          if (!parsedDateTime) {
            shouldStop = true
            continue
          }

          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId) {
            continue
          }

          const availability = await checkAvailabilityForSlot({
            db: tx,
            storeId: currentStoreId,
            requestedStartAt: parsedDateTime.startAt,
            durationMin: draft.service.durationMin,
            timeZone,
            staffMembershipId: draft.staffMembershipId,
            ignoreAppointmentId:
              typeof conversationContext.rescheduleAppointmentId === "string"
                ? conversationContext.rescheduleAppointmentId
                : null,
            suggestionsLimit: TIME_SUGGESTIONS_LIMIT,
          })

          if (!availability.available) {
            await clearDraftDateTime()
            await setSuggestedTimeSlots(availability.suggestions)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildUnavailableTimeMessage({
                message: availability.message,
                suggestions: availability.suggestions,
              }),
              {
                reason: availability.reason,
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(availability.suggestions),
              }
            )
            shouldStop = true
            continue
          }

          draftCache = draft
          parsedDateTime = {
            ...parsedDateTime,
            startAt: availability.startAt,
            label: formatDateTimeForBot(availability.startAt, timeZone),
          }
          continue
        }

        if (action.type === "SAVE_DRAFT_DATETIME") {
          if (!parsedDateTime) {
            shouldStop = true
            continue
          }

          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId || !draft.membership) {
            continue
          }

          const endAt = new Date(parsedDateTime.startAt.getTime() + draft.service.durationMin * 60 * 1000)

          await setDraftSelection({
            startAt: parsedDateTime.startAt,
            endAt,
          })
          await setSuggestedTimeSlots([])

          const updatedDraft = await getDraft(true)
          await appendBotReply(
            `Perfeito! Posso confirmar seu agendamento de ${updatedDraft!.service!.name} com ${updatedDraft!.membership!.user.name} para ${formatDateTimeForBot(parsedDateTime.startAt, timeZone)}? Responda SIM para confirmar ou NAO para escolher outro horario.`,
            {
              serviceId: updatedDraft!.service!.id,
              staffMembershipId: updatedDraft!.membership!.id,
              startAt: parsedDateTime.startAt.toISOString(),
              endAt: endAt.toISOString(),
            }
          )
          continue
        }

        if (action.type === "CLEAR_DRAFT_DATETIME") {
          await clearDraftDateTime()
          await setSuggestedTimeSlots([])
          continue
        }

        if (action.type === "RESCHEDULE_APPOINTMENT_FROM_DRAFT") {
          const originalAppointment = await getRescheduleSourceAppointment()
          const draft = await ensureResolvedStaffForDraft()

          if (!originalAppointment) {
            await clearAppointmentFlowContext()
            await setSuggestedTimeSlots([])
            await updateState("IDLE")
            await appendBotReply(
              "Nao encontrei mais o agendamento original para remarcar. Se quiser, posso te ajudar com um novo agendamento.",
              {
                reason: "RESCHEDULE_SOURCE_NOT_FOUND",
              }
            )
            shouldStop = true
            continue
          }

          if (!draft?.service || !draft.startAt || !draft.endAt || !draft.staffMembershipId || !draft.membership) {
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              "Ainda nao tenho um novo horario pronto para remarcar. Escolha um horario disponivel para continuar.",
              {
                reason: "RESCHEDULE_DATETIME_REQUIRED",
                appointmentId: originalAppointment.id,
              }
            )
            shouldStop = true
            continue
          }

          const latestAvailability = await checkAvailabilityForSlot({
            db: tx,
            storeId: currentStoreId,
            requestedStartAt: draft.startAt,
            durationMin: draft.service.durationMin,
            timeZone,
            staffMembershipId: draft.staffMembershipId,
            ignoreAppointmentId: originalAppointment.id,
            suggestionsLimit: TIME_SUGGESTIONS_LIMIT,
          })

          if (!latestAvailability.available) {
            await clearDraftDateTime()
            await setSuggestedTimeSlots(latestAvailability.suggestions)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildUnavailableTimeMessage({
                message: `Esse horario nao esta mais disponivel para ${draft.membership.user.name}.`,
                suggestions: latestAvailability.suggestions,
              }),
              {
                reason: latestAvailability.reason,
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(latestAvailability.suggestions),
              }
            )
            shouldStop = true
            continue
          }

          const originalMetadata =
            originalAppointment.metadata &&
            typeof originalAppointment.metadata === "object" &&
            !Array.isArray(originalAppointment.metadata)
              ? { ...(originalAppointment.metadata as Record<string, unknown>) }
              : {}

          const newAppointment = await tx.appointment.create({
            data: {
              storeId: currentStoreId,
              status: "SCHEDULED",
              serviceId: draft.service.id,
              staffMembershipId: draft.staffMembershipId,
              customerName: draft.customerName?.trim() || originalAppointment.customerName,
              customerPhone: draft.customerPhone ?? originalAppointment.customerPhone ?? incomingMessage.from,
              customerEmail: draft.customerEmail ?? originalAppointment.customerEmail ?? undefined,
              startAt: draft.startAt,
              endAt: draft.endAt,
              notes: draft.notes ?? originalAppointment.notes ?? undefined,
              source: "WHATSAPP",
              externalRef: incomingMessage.providerMessageId,
              metadata: toJsonValue({
                rescheduledFromAppointmentId: originalAppointment.id,
                conversationId: conversation.id,
                draftId: draft.id,
                confirmedByMessageId: savedIn.id,
              }),
            },
          })

          await tx.appointment.update({
            where: { id: originalAppointment.id },
            data: {
              status: "CANCELED",
              metadata: toJsonValue({
                ...originalMetadata,
                rescheduledToAppointmentId: newAppointment.id,
                canceledBy: "WHATSAPP",
                canceledFromConversationId: conversation.id,
                canceledFromMessageId: savedIn.id,
                canceledAt: new Date().toISOString(),
              }),
            },
          })

          await tx.appointmentDraft.update({
            where: { id: draft.id },
            data: {
              status: "CONFIRMED",
              appointmentId: newAppointment.id,
            },
          })

          await clearAppointmentFlowContext()
          await setSuggestedTimeSlots([])
          createdAppointmentId = newAppointment.id
          await appendBotReply(
            `Agendamento remarcado! ${draft.service.name} com ${draft.membership.user.name} em ${formatDateTimeForBot(newAppointment.startAt, timeZone)}.`,
            {
              reason: "APPOINTMENT_RESCHEDULED",
              appointmentId: newAppointment.id,
              originalAppointmentId: originalAppointment.id,
            }
          )
          continue
        }

        if (action.type === "CREATE_APPOINTMENT_FROM_DRAFT") {
          const draft = await ensureResolvedStaffForDraft()

          if (!draft?.service || !draft.startAt || !draft.endAt || !draft.staffMembershipId || !draft.membership) {
            if (!shouldStop) {
              await updateState("CHOOSING_TIME")
              await appendBotReply(
                "Ainda nao tenho um horario pronto para confirmar. Me diga outro dia e horario.",
                {
                  reason: "DRAFT_DATETIME_REQUIRED",
                }
              )
              shouldStop = true
            }
            continue
          }

          const latestAvailability = await checkAvailabilityForSlot({
            db: tx,
            storeId: currentStoreId,
            requestedStartAt: draft.startAt,
            durationMin: draft.service.durationMin,
            timeZone,
            staffMembershipId: draft.staffMembershipId,
            ignoreAppointmentId:
              typeof conversationContext.rescheduleAppointmentId === "string"
                ? conversationContext.rescheduleAppointmentId
                : null,
            suggestionsLimit: TIME_SUGGESTIONS_LIMIT,
          })

          if (!latestAvailability.available) {
            await clearDraftDateTime()
            await setSuggestedTimeSlots(latestAvailability.suggestions)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildUnavailableTimeMessage({
                message: `Esse horario nao esta mais disponivel para ${draft.membership.user.name}.`,
                suggestions: latestAvailability.suggestions,
              }),
              {
                reason: latestAvailability.reason,
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(latestAvailability.suggestions),
              }
            )
            shouldStop = true
            continue
          }

          const appointment = await tx.appointment.create({
            data: {
              storeId: currentStoreId,
              status: "SCHEDULED",
              serviceId: draft.service.id,
              staffMembershipId: draft.staffMembershipId,
              customerName: draft.customerName?.trim() || "Cliente WhatsApp",
              customerPhone: draft.customerPhone ?? incomingMessage.from,
              customerEmail: draft.customerEmail ?? undefined,
              startAt: draft.startAt,
              endAt: draft.endAt,
              notes: draft.notes ?? undefined,
              source: "WHATSAPP",
              externalRef: incomingMessage.providerMessageId,
              metadata: toJsonValue({
                conversationId: conversation.id,
                draftId: draft.id,
                confirmedByMessageId: savedIn.id,
              }),
            },
          })

          await tx.appointmentDraft.update({
            where: { id: draft.id },
            data: {
              status: "CONFIRMED",
              appointmentId: appointment.id,
            },
          })
          await clearAppointmentFlowContext()
          await setSuggestedTimeSlots([])

          createdAppointmentId = appointment.id
          await appendBotReply(
            `Agendamento confirmado! ${draft.service.name} com ${draft.membership.user.name} em ${formatDateTimeForBot(appointment.startAt, timeZone)}.`,
            {
              appointmentId: appointment.id,
              staffMembershipId: draft.staffMembershipId,
            }
          )
          continue
        }

        if (action.type === "REPLY_TEXT") {
          await appendBotReply(action.text)
        }
      }

      return {
        conversationId: conversation.id,
        messageId: savedIn.id,
        nextState,
        draftId: ensuredDraftId,
        appointmentId: createdAppointmentId,
        replies: outMessages,
        replayed: false,
      }
    })
  } catch (error) {
    if (isProviderMessageUniqueConflict(error)) {
      const existingInbound = await findExistingInboundResultAfterUniqueConflict({
        storeId: currentStoreId,
        providerMessageId: incomingMessage.providerMessageId,
      })

      if (existingInbound) {
        return existingInbound
      }
    }

    throw error
  }

  // Outbound real acontece apos o commit para nunca perder a mensagem local se a Meta falhar.
  if (
    !transactionResult.replayed &&
    shouldAttemptOutboundDelivery &&
    persistedOutboundMessages.length
  ) {
    console.info("whatsapp outbound dispatch start", {
      storeId: currentStoreId,
      conversationId: transactionResult.conversationId,
      shouldAttemptOutboundDelivery,
      persistedOutboundMessagesCount: persistedOutboundMessages.length,
      to: incomingMessage.from,
    })

    await deliverPersistedOutboundMessages({
      storeId: currentStoreId,
      conversationId: transactionResult.conversationId,
      to: incomingMessage.from,
      messages: persistedOutboundMessages,
    })

    console.info("whatsapp outbound dispatch finished", {
      storeId: currentStoreId,
      conversationId: transactionResult.conversationId,
      dispatchedMessagesCount: persistedOutboundMessages.length,
      to: incomingMessage.from,
    })
  }

  return transactionResult
}

export async function GET(req: NextRequest) {
  try {
    const parsed = metaWebhookVerificationSchema.safeParse({
      mode: req.nextUrl.searchParams.get("hub.mode"),
      verifyToken: req.nextUrl.searchParams.get("hub.verify_token"),
      challenge: req.nextUrl.searchParams.get("hub.challenge"),
    })

    if (!parsed.success) {
      return badRequest("Parametros obrigatorios do webhook nao informados")
    }

    if (parsed.data.mode !== "subscribe") {
      return badRequest("Unsupported hub.mode")
    }

    const connection = await findActiveWhatsAppConnectionByVerifyToken(parsed.data.verifyToken)
    if (!connection) {
      return unauthorized("Invalid hub.verify_token")
    }

    return new Response(parsed.data.challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  } catch (error) {
    console.error("whatsapp webhook verification error", error)

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Nao foi possivel verificar o webhook do WhatsApp",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const payload = parseJsonBody(rawBody)

    if (!payload) {
      return badRequest("Invalid JSON payload for WhatsApp webhook")
    }

    const parsedPayload = parseIncomingWhatsApp(payload)

    if (!parsedPayload) {
      return badRequest("Unsupported payload format for WhatsApp webhook")
    }

    if (parsedPayload.source === "meta") {
      const signature = req.headers.get("x-hub-signature-256")

      if (!verifyMetaSignature(rawBody, signature)) {
        return unauthorized("Invalid Meta webhook signature")
      }

      const metaStatusItems = extractMetaStatusItems(payload)

      console.info("whatsapp webhook meta payload received", {
        messagesCount: parsedPayload.messages.length,
      })

      console.info("whatsapp webhook meta statuses received", {
        statusesCount: metaStatusItems.length,
      })

      for (const statusItem of metaStatusItems) {
        console.info("whatsapp webhook meta status item", {
          id: statusItem.id,
          recipientId: statusItem.recipientId,
          status: statusItem.status,
          timestamp: statusItem.timestamp,
          conversationId: statusItem.conversationId,
          expirationTimestamp: statusItem.expirationTimestamp,
          pricingCategory: statusItem.pricingCategory,
          pricingModel: statusItem.pricingModel,
          billable: statusItem.billable,
          errors: statusItem.errors,
        })

        try {
          await persistMetaStatusEvent(statusItem)
        } catch (error) {
          console.error("whatsapp webhook meta status persist error", {
            providerMessageId: statusItem.id,
            recipientId: statusItem.recipientId,
            status: statusItem.status,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      if (!parsedPayload.messages.length) {
        return ok({
          source: "meta",
          processedCount: 0,
          ignoredCount: 1,
          results: [],
          ignored: [
            {
              reason: "NO_INBOUND_MESSAGES",
            },
          ],
        })
      }

      const results: Array<ProcessIncomingMessageResult & { storeId: string; phoneNumberId: string }> = []
      const ignored: Array<Record<string, string | null>> = []

      for (const message of parsedPayload.messages) {
        console.info("whatsapp webhook meta inbound message", {
          phoneNumberId: message.phoneNumberId,
          businessAccountId: message.businessAccountId,
          providerMessageId: message.providerMessageId,
          from: message.from,
          hasText: Boolean(message.text),
        })

        if (!message.phoneNumberId) {
          ignored.push({
            reason: "MISSING_PHONE_NUMBER_ID",
            providerMessageId: message.providerMessageId,
            from: message.from,
          })
          continue
        }

        const connection = await findActiveWhatsAppConnectionForInboundMessage(message)
        if (!connection) {
          console.warn("whatsapp webhook connection not found", {
            phoneNumberId: message.phoneNumberId,
            businessAccountId: message.businessAccountId,
            providerMessageId: message.providerMessageId,
          })

          ignored.push({
            reason: "WHATSAPP_CONNECTION_NOT_FOUND",
            phoneNumberId: message.phoneNumberId,
            providerMessageId: message.providerMessageId,
          })
          continue
        }

        const inboundPayload =
          message.raw && typeof message.raw === "object" && !Array.isArray(message.raw)
            ? {
                ...(message.raw as Record<string, unknown>),
                phoneNumberId: message.phoneNumberId,
                displayPhoneNumber: message.displayPhoneNumber,
                businessAccountId: message.businessAccountId,
                timestamp: message.timestamp,
                messageType: message.messageType,
                whatsappConnectionId: connection.id,
              }
            : {
                raw: message.raw,
                phoneNumberId: message.phoneNumberId,
                displayPhoneNumber: message.displayPhoneNumber,
                businessAccountId: message.businessAccountId,
                timestamp: message.timestamp,
                messageType: message.messageType,
                whatsappConnectionId: connection.id,
              }

        const result = await processIncomingWhatsAppMessage({
          currentStoreId: connection.storeId,
          shouldAttemptOutboundDelivery: true,
          incomingMessage: {
            providerMessageId: message.providerMessageId,
            from: message.from,
            text: message.text,
            raw: inboundPayload,
          },
        })

        results.push({
          ...result,
          storeId: connection.storeId,
          phoneNumberId: connection.phoneNumberId,
        })
      }

      return ok({
        source: "meta",
        processedCount: results.length,
        ignoredCount: ignored.length,
        results,
        ignored,
      })
    }

    const storeId = req.headers.get("x-store-id")
    const secret = req.headers.get("x-webhook-secret")

    if (!storeId) {
      return badRequest("Missing x-store-id for test payload")
    }

    const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET
    if (!expectedSecret && process.env.NODE_ENV === "production") {
      return unauthorized("Test webhook payload disabled in production")
    }

    if (expectedSecret && secret !== expectedSecret) {
      return unauthorized("Unauthorized")
    }

    const incomingMessage = parsedPayload.messages[0]
    if (!incomingMessage) {
      return badRequest("Unsupported payload format for WhatsApp webhook")
    }

    const result = await processIncomingWhatsAppMessage({
      currentStoreId: storeId,
      shouldAttemptOutboundDelivery: false,
      incomingMessage: {
        providerMessageId: incomingMessage.providerMessageId,
        from: incomingMessage.from,
        text: incomingMessage.text,
        raw: incomingMessage.raw,
      },
    })

    return ok({
      source: "test",
      ...result,
    })
  } catch (error) {
    console.error("whatsapp webhook error", error)
    return serverError("Nao foi possivel processar o webhook do WhatsApp")
  }
}
