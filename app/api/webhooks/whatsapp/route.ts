import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest } from "next/server"
import { prisma, Prisma, type ConversationState } from "@/lib/prisma"
import { badRequest, ok, serverError, unauthorized } from "@/lib/api/response"
import {
  checkAvailabilityForSlot,
  listAvailableSlotsForDate,
  listEligibleStaffForService,
  listNextAvailableDates,
  resolveEligibleStaffChoice,
  type AvailableDateOption,
  type EligibleStaffMember,
  type SuggestedSlot,
} from "@/lib/appointments/availability"
import {
  buildBotFlowResetContext,
  hasConversationFlowTimedOut,
  handleIncomingMessage,
  isBackOneStepIntent,
  isBackToMenuIntent,
  isEndConversationIntent,
  isPauseChatbotTriggerText,
  isResumeChatbotTriggerText,
} from "@/lib/bot/flow"
import {
  getBotSettingsForStore,
  type CompleteBotSettings,
} from "@/lib/bot/settings"
import {
  combineDateKeyAndTime,
  formatDateKeyForBot,
  getDateKeyInTimeZone,
  formatDateTimeForBot,
  getBotTimezone,
  getTimeKeyInTimeZone,
  getWeekdayFromDateKey,
  normalizeBotText,
  parseDateFromText,
  parseDateTimeFromText,
  parseTimeFromText,
  type ParsedDateTimeValue,
} from "@/lib/bot/datetime"
import type { BotConversationContext } from "@/lib/bot/types"
import {
  STORE_PUBLIC_INFO_FALLBACK_TEXT,
  formatStorePublicInfoForWhatsApp,
} from "@/lib/store/public-info"
import {
  parseIncomingWhatsApp,
  type ParsedSmbMessageEcho,
} from "@/lib/whatsapp/parse"
import {
  findActiveWhatsAppConnectionByPhoneNumberId,
  findActiveWhatsAppConnectionForInboundMessage,
} from "@/lib/whatsapp/connection"
import {
  pauseWhatsAppConversationForHumanAttendance,
  sendWhatsAppHumanHandoffNotice,
} from "@/lib/whatsapp/human-attendance"
import {
  sendMetaOutboundMessage,
  type MetaOutboundResult,
  type WhatsAppOutboundMessage,
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

type StoredDateOption = {
  dateKey: string
  label: string
  firstStartAt: string
}

type BotOutboundMessage = {
  textPreview: string
  outbound: WhatsAppOutboundMessage
}

const TIME_SUGGESTIONS_LIMIT = 5
const DAY_OPTIONS_LIMIT = 18
const DAY_OPTIONS_SEARCH_DAYS = 45
const DAY_OPTIONS_PAGE_SIZE = 6
const TIME_OPTIONS_PAGE_SIZE = 7
const SERVICE_PRICES_PAGE_SIZE = 8
const COMMANDS_FOOTER_TEXT = "Comandos: voltar | menu | atendente | encerrar"
const MAIN_MENU_SCHEDULE_OPTION_ID = "menu:schedule"
const MAIN_MENU_APPOINTMENTS_OPTION_ID = "menu:appointments"
const MAIN_MENU_PRICES_OPTION_ID = "menu:prices"
const MAIN_MENU_INFO_OPTION_ID = "menu:info"
const NAV_BACK_OPTION_ID = "nav:back"
const NAV_END_OPTION_ID = "nav:end"
const NAV_MENU_OPTION_ID = "nav:menu"
const MORE_DATES_OPTION_ID = "date:more"
const MORE_TIMES_OPTION_ID = "time:more"
const MORE_PRICES_OPTION_ID = "prices:more"
const SERVICE_OPTION_ID_PREFIX = "service:"
const STAFF_OPTION_ID_PREFIX = "staff:"
const DATE_OPTION_ID_PREFIX = "date:"
const TIME_OPTION_ID_PREFIX = "time:"
const APPOINTMENT_OPTION_ID_PREFIX = "appointment:"
const BOOKING_CONFIRM_OPTION_ID = "booking:confirm"
const BOOKING_BACK_OPTION_ID = NAV_BACK_OPTION_ID
const BOOKING_END_OPTION_ID = NAV_END_OPTION_ID
const APPOINTMENT_CANCEL_OPTION_ID = "appointment-action:cancel"
const APPOINTMENT_RESCHEDULE_OPTION_ID = "appointment-action:reschedule"
const CANCEL_CONFIRM_OPTION_ID = "appointment-cancel:confirm"
const CHATBOT_TIMEOUT_MESSAGE =
  "Encerramos este atendimento por falta de intera\u00e7\u00e3o. Quando quiser agendar novamente, \u00e9 s\u00f3 me chamar."
const CHATBOT_CLOSED_MESSAGE =
  "Atendimento encerrado. Quando quiser agendar novamente, \u00e9 s\u00f3 me chamar."
const brlCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

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

function buildMetaDeliveryPayload(result: MetaOutboundResult) {
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

function createTextBotMessage(text: string): BotOutboundMessage {
  const trimmedText = text.trim()

  return {
    textPreview: trimmedText,
    outbound: {
      kind: "text",
      text: trimmedText,
    },
  }
}

function buildNumberedOptionsText(
  options: Array<{
    title: string
    description?: string | null
  }>
) {
  return options
    .map((option, index) =>
      option.description?.trim()
        ? `${index + 1}. ${option.title} - ${option.description.trim()}`
        : `${index + 1}. ${option.title}`
    )
    .join("\n")
}

function buildButtonsBotMessage(params: {
  bodyText: string
  footerText?: string
  buttons: Array<{
    id: string
    title: string
  }>
}) {
  const footerText = params.footerText?.trim() || COMMANDS_FOOTER_TEXT
  const fallbackText = `${params.bodyText.trim()}\n\n${params.buttons
    .map((button, index) => `${index + 1}. ${button.title}`)
    .join("\n")}\n\n${footerText}`

  return {
    textPreview: fallbackText,
    outbound: {
      kind: "interactive_buttons",
      bodyText: params.bodyText.trim(),
      footerText,
      buttons: params.buttons,
    },
  } satisfies BotOutboundMessage
}

function buildListBotMessage(params: {
  bodyText: string
  buttonText: string
  options: Array<{
    id: string
    title: string
    description?: string | null
  }>
  headerText?: string
  footerText?: string
  extraInteractiveRows?: Array<{
    id: string
    title: string
    description?: string | null
  }>
}) {
  const footerText = params.footerText?.trim() || COMMANDS_FOOTER_TEXT
  const textPreview = `${params.bodyText.trim()}\n\n${buildNumberedOptionsText(
    params.options
  )}\n\n${footerText}`
  const rows = [...params.options, ...(params.extraInteractiveRows ?? [])]

  if (rows.length === 0 || rows.length > 10) {
    return createTextBotMessage(textPreview)
  }

  return {
    textPreview,
    outbound: {
      kind: "interactive_list",
      headerText: params.headerText?.trim() || null,
      bodyText: params.bodyText.trim(),
      footerText,
      buttonText: params.buttonText.trim(),
      sections: [
        {
          rows,
        },
      ],
    },
  } satisfies BotOutboundMessage
}

function getServiceOptionId(serviceId: string) {
  return `${SERVICE_OPTION_ID_PREFIX}${serviceId}`
}

function getStaffOptionId(membershipId: string) {
  return `${STAFF_OPTION_ID_PREFIX}${membershipId}`
}

function getDateOptionId(dateKey: string) {
  return `${DATE_OPTION_ID_PREFIX}${dateKey}`
}

function getTimeOptionId(startAt: Date) {
  return `${TIME_OPTION_ID_PREFIX}${startAt.toISOString()}`
}

function getAppointmentOptionId(appointmentId: string) {
  return `${APPOINTMENT_OPTION_ID_PREFIX}${appointmentId}`
}

function getValueFromOptionId(selectedId: string | null | undefined, prefix: string) {
  if (!selectedId?.startsWith(prefix)) {
    return null
  }

  return selectedId.slice(prefix.length)
}

function getNumericChoice(text: string) {
  const match = normalizeBotText(text).match(/^(\d{1,2})$/)

  if (!match) {
    return null
  }

  return Number(match[1]) - 1
}

function slicePage<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(0, page)
  const start = safePage * pageSize
  return items.slice(start, start + pageSize)
}

function getEffectiveInboundText(text: string | null, selectedOptionId: string | null) {
  switch (selectedOptionId) {
    case MAIN_MENU_SCHEDULE_OPTION_ID:
      return "agendar"
    case MAIN_MENU_APPOINTMENTS_OPTION_ID:
      return "meus agendamentos"
    case MAIN_MENU_PRICES_OPTION_ID:
      return "precos"
    case MAIN_MENU_INFO_OPTION_ID:
      return "informacoes"
    case NAV_MENU_OPTION_ID:
      return "menu"
    case NAV_BACK_OPTION_ID:
      return "voltar"
    case NAV_END_OPTION_ID:
      return "encerrar"
    case MORE_PRICES_OPTION_ID:
      return "mais precos"
    case BOOKING_CONFIRM_OPTION_ID:
    case CANCEL_CONFIRM_OPTION_ID:
      return "confirmar"
    case APPOINTMENT_CANCEL_OPTION_ID:
      return "desmarcar"
    case APPOINTMENT_RESCHEDULE_OPTION_ID:
      return "remarcar"
    default:
      return text?.trim() || null
  }
}

function formatPriceForWhatsApp(price: Prisma.Decimal) {
  return brlCurrencyFormatter.format(Number(price.toFixed(2)))
}

function buildServicePricesText(
  services: Array<{
    name: string
    price: Prisma.Decimal
  }>
) {
  return `Confira os preços dos serviços:\n\n${services
    .map((service) => `${service.name} - ${formatPriceForWhatsApp(service.price)}`)
    .join("\n")}\n\n${COMMANDS_FOOTER_TEXT}`
}

function buildServicePricesNavigationMessage(hasMorePrices: boolean) {
  return buildButtonsBotMessage({
    bodyText: hasMorePrices
      ? "Quer ver mais preços ou agendar?"
      : "Se quiser, posso te ajudar a agendar.",
    buttons: [
      ...(hasMorePrices
        ? [{ id: MORE_PRICES_OPTION_ID, title: "Mais preços" }]
        : []),
      { id: MAIN_MENU_SCHEDULE_OPTION_ID, title: "Agendar horário" },
      { id: NAV_MENU_OPTION_ID, title: "Menu" },
    ],
  })
}

function buildMainMenuMessage(botSettings: CompleteBotSettings) {
  if (!botSettings.showMenuAfterWelcome) {
    return createTextBotMessage(botSettings.welcomeMessage)
  }

  return buildListBotMessage({
    bodyText: botSettings.welcomeMessage,
    buttonText: "Ver opções",
    options: [
      { id: MAIN_MENU_SCHEDULE_OPTION_ID, title: "Agendar horário" },
      { id: MAIN_MENU_APPOINTMENTS_OPTION_ID, title: "Meus agendamentos" },
      { id: MAIN_MENU_PRICES_OPTION_ID, title: "Preços" },
      { id: MAIN_MENU_INFO_OPTION_ID, title: "Informações" },
    ],
  })
}

function buildStaffChoiceMessage(serviceName: string, staffMembers: EligibleStaffMember[]) {
  const options = staffMembers.map((staff) => ({
    id: getStaffOptionId(staff.membershipId),
    title: staff.name,
  }))

  if (staffMembers.length <= 9) {
    return buildListBotMessage({
      bodyText: `Escolha um profissional para ${serviceName}:`,
      buttonText: "Ver profissionais",
      options,
      extraInteractiveRows: [{ id: NAV_BACK_OPTION_ID, title: "Voltar" }],
    })
  }

  return createTextBotMessage(
    `Escolha um profissional para ${serviceName}:\n\n${buildStaffOptionsText(
      staffMembers
    )}\n\n${COMMANDS_FOOTER_TEXT}`
  )
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
  return `Escolha um agendamento:\n\n${buildAppointmentOptionsText(options)}\n\n${COMMANDS_FOOTER_TEXT}`
}

function buildServiceChoicePrompt(services: Array<{ id: string; name: string; durationMin: number }>) {
  if (!services.length) {
    return createTextBotMessage(
      "Ainda não há serviços ativos cadastrados. Peça para a loja revisar o cadastro."
    )
  }

  const options = services.map((service) => ({
    id: getServiceOptionId(service.id),
    title: service.name,
    description: `${service.durationMin} min`,
  }))

  if (services.length <= 9) {
    return buildListBotMessage({
      bodyText: "Escolha um serviço:",
      buttonText: "Ver serviços",
      options,
      extraInteractiveRows: [{ id: NAV_BACK_OPTION_ID, title: "Voltar" }],
    })
  }

  return createTextBotMessage(
    `Escolha um serviço:\n\n${buildNumberedOptionsText(options)}\n\n${COMMANDS_FOOTER_TEXT}`
  )
}
function buildBookingConfirmationMessage(params: {
  serviceName: string
  staffName: string
  dateLabel: string
  timeLabel: string
}) {
  return buildButtonsBotMessage({
    bodyText: `Confira os dados do agendamento:\n\nServiço: ${params.serviceName}\nProfissional: ${params.staffName}\nDia: ${params.dateLabel}\nHorário: ${params.timeLabel}`,
    buttons: [
      { id: BOOKING_CONFIRM_OPTION_ID, title: "Confirmar" },
      { id: BOOKING_BACK_OPTION_ID, title: "Voltar" },
      { id: BOOKING_END_OPTION_ID, title: "Encerrar" },
    ],
  })
}

function buildAppointmentActionPrompt(label: string) {
  return buildButtonsBotMessage({
    bodyText: `Agendamento selecionado:\n${label}\n\nO que você deseja fazer?`,
    buttons: [
      { id: APPOINTMENT_CANCEL_OPTION_ID, title: "Desmarcar" },
      { id: APPOINTMENT_RESCHEDULE_OPTION_ID, title: "Remarcar" },
      { id: NAV_BACK_OPTION_ID, title: "Voltar" },
    ],
  })
}

function buildAppointmentCancellationPrompt(label: string) {
  return buildButtonsBotMessage({
    bodyText: `Confirma o cancelamento deste agendamento?\n\n${label}`,
    buttons: [
      { id: CANCEL_CONFIRM_OPTION_ID, title: "Confirmar" },
      { id: NAV_BACK_OPTION_ID, title: "Voltar" },
    ],
  })
}

function serializeSuggestedSlots(suggestions: SuggestedSlot[]) {
  return suggestions.map((slot) => ({
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    label: slot.label,
  }))
}

function serializeDateOptions(options: AvailableDateOption[]) {
  return options.map((option) => ({
    dateKey: option.dateKey,
    label: formatDateKeyForBot(option.dateKey),
    firstStartAt: option.firstStartAt.toISOString(),
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

function getStoredDateOptions(context: Record<string, unknown>) {
  const raw = context.dateOptions

  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return []
    }

    const dateKey = typeof entry.dateKey === "string" ? entry.dateKey : null
    const label = typeof entry.label === "string" ? entry.label : null
    const firstStartAt =
      typeof entry.firstStartAt === "string" ? entry.firstStartAt : null

    if (!dateKey || !label || !firstStartAt) {
      return []
    }

    return [{ dateKey, label, firstStartAt } satisfies StoredDateOption]
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
  const index = getNumericChoice(text)

  if (index === null) {
    return null
  }

  return suggestions[index] ?? null
}

function resolveStoredAppointmentChoice(text: string, options: StoredAppointmentOption[]) {
  const index = getNumericChoice(text)

  if (index === null) {
    return null
  }

  return options[index] ?? null
}

function getStoredDateOptionChoice(text: string, options: StoredDateOption[]) {
  const index = getNumericChoice(text)

  if (index === null) {
    return null
  }

  return options[index] ?? null
}

function getStoredNumberValue(
  context: Record<string, unknown>,
  key: "dateOptionPage" | "timeSlotPage"
) {
  const value = context[key]
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0
}

function getTimeSelectionStage(context: Record<string, unknown>) {
  return context.timeSelectionStage === "DAY" || context.timeSelectionStage === "TIME"
    ? context.timeSelectionStage
    : null
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
    priceListPage:
      typeof record.priceListPage === "number" &&
      Number.isInteger(record.priceListPage) &&
      record.priceListPage >= 0
        ? record.priceListPage
        : null,
    appointmentOptions: serializeAppointmentOptions(getStoredAppointmentOptions(record)),
    dateOptions: getStoredDateOptions(record),
    selectedDateKey:
      typeof record.selectedDateKey === "string" ? record.selectedDateKey : null,
    selectedDateLabel:
      typeof record.selectedDateLabel === "string" ? record.selectedDateLabel : null,
    selectedAppointmentId:
      typeof record.selectedAppointmentId === "string" ? record.selectedAppointmentId : null,
    selectedAppointmentLabel:
      typeof record.selectedAppointmentLabel === "string" ? record.selectedAppointmentLabel : null,
    rescheduleAppointmentId:
      typeof record.rescheduleAppointmentId === "string" ? record.rescheduleAppointmentId : null,
    timeSlotSuggestions: serializeSuggestedSlots(getStoredSuggestedSlots(record)),
    timeSelectionStage: getTimeSelectionStage(record),
    dateOptionPage: getStoredNumberValue(record, "dateOptionPage"),
    timeSlotPage: getStoredNumberValue(record, "timeSlotPage"),
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

type ProcessIncomingMessageParams = {
  currentStoreId: string
  shouldAttemptOutboundDelivery: boolean
  incomingMessage: {
    providerMessageId: string
    from: string
    text: string | null
    selectedOptionId: string | null
    raw: unknown
  }
}

type ProcessIncomingMessageResult = {
  conversationId: string
  messageId: string
  nextState: ConversationState | null
  draftId: string | null
  appointmentId: string | null
  replies: string[]
  replayed: boolean
}

type PersistedOutboundMessage = {
  id: string
  text: string
  payload: Record<string, unknown>
  outbound: WhatsAppOutboundMessage
}

type ExistingInboundMessage = {
  id: string
  conversationId: string
  conversation: {
    state: ConversationState
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

type ProcessSmbMessageEchoResult = {
  status: "ignored" | "paused"
  reason: string | null
  storeId: string | null
  phoneNumberId: string | null
  conversationId: string | null
  messageId: string | null
  providerMessageId: string | null
  alreadyPaused: boolean | null
  handoffNoticeSent: boolean
}

function getSmbEchoContactCandidates(contact: string) {
  const trimmedContact = contact.trim()
  const digitsOnlyContact = trimmedContact.replace(/\D/g, "")

  return Array.from(
    new Set(
      [trimmedContact, digitsOnlyContact].filter(
        (value) => value.length > 0
      )
    )
  )
}

function getExistingSmbEchoReason(
  message: {
    direction: "IN" | "OUT"
    payload: Prisma.JsonValue | null
  }
) {
  if (message.direction !== "OUT") {
    return "PROVIDER_MESSAGE_ID_ALREADY_EXISTS"
  }

  const payload = getJsonRecord(message.payload)

  return payload.source === "manual_external"
    ? "SMB_MESSAGE_ECHO_ALREADY_PROCESSED"
    : "OLYON_OUTBOUND_ECHO"
}

async function processSmbMessageEcho(
  echo: ParsedSmbMessageEcho
): Promise<ProcessSmbMessageEchoResult> {
  if (!echo.phoneNumberId) {
    console.info("whatsapp smb_message_echo received", {
      storeId: null,
      phoneNumberId: null,
      businessAccountId: echo.businessAccountId,
      conversationId: null,
      providerMessageId: echo.providerMessageId,
    })

    return {
      status: "ignored",
      reason: "MISSING_PHONE_NUMBER_ID",
      storeId: null,
      phoneNumberId: null,
      conversationId: null,
      messageId: null,
      providerMessageId: echo.providerMessageId,
      alreadyPaused: null,
      handoffNoticeSent: false,
    }
  }

  const connection = await findActiveWhatsAppConnectionByPhoneNumberId(
    echo.phoneNumberId
  )

  if (!connection) {
    console.info("whatsapp smb_message_echo received", {
      storeId: null,
      phoneNumberId: echo.phoneNumberId,
      businessAccountId: echo.businessAccountId,
      conversationId: null,
      providerMessageId: echo.providerMessageId,
    })

    return {
      status: "ignored",
      reason: "WHATSAPP_CONNECTION_NOT_FOUND",
      storeId: null,
      phoneNumberId: echo.phoneNumberId,
      conversationId: null,
      messageId: null,
      providerMessageId: echo.providerMessageId,
      alreadyPaused: null,
      handoffNoticeSent: false,
    }
  }

  const existingMessage = echo.providerMessageId
    ? await prisma.conversationMessage.findUnique({
        where: {
          storeId_providerMessageId: {
            storeId: connection.storeId,
            providerMessageId: echo.providerMessageId,
          },
        },
        select: {
          id: true,
          conversationId: true,
          direction: true,
          payload: true,
        },
      })
    : null

  if (existingMessage) {
    console.info("whatsapp smb_message_echo received", {
      storeId: connection.storeId,
      phoneNumberId: echo.phoneNumberId,
      businessAccountId: echo.businessAccountId,
      conversationId: existingMessage.conversationId,
      providerMessageId: echo.providerMessageId,
    })

    return {
      status: "ignored",
      reason: getExistingSmbEchoReason(existingMessage),
      storeId: connection.storeId,
      phoneNumberId: echo.phoneNumberId,
      conversationId: existingMessage.conversationId,
      messageId: existingMessage.id,
      providerMessageId: echo.providerMessageId,
      alreadyPaused: null,
      handoffNoticeSent: false,
    }
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      storeId: connection.storeId,
      channel: "WHATSAPP",
      contact: {
        in: getSmbEchoContactCandidates(echo.to),
      },
    },
    select: {
      id: true,
    },
  })

  console.info("whatsapp smb_message_echo received", {
    storeId: connection.storeId,
    phoneNumberId: echo.phoneNumberId,
    businessAccountId: echo.businessAccountId,
    conversationId: conversation?.id ?? null,
    providerMessageId: echo.providerMessageId,
  })

  if (!conversation) {
    return {
      status: "ignored",
      reason: "WHATSAPP_CONVERSATION_NOT_FOUND",
      storeId: connection.storeId,
      phoneNumberId: echo.phoneNumberId,
      conversationId: null,
      messageId: null,
      providerMessageId: echo.providerMessageId,
      alreadyPaused: null,
      handoffNoticeSent: false,
    }
  }

  let persisted:
    | {
        status: "persisted"
        messageId: string
        alreadyPaused: boolean
      }
    | {
        status: "existing"
        messageId: string
        reason: string
      }

  try {
    persisted = await prisma.$transaction(async (tx) => {
      await lockConversationForInboundProcessing(tx, conversation.id)

      if (echo.providerMessageId) {
        const concurrentExistingMessage =
          await tx.conversationMessage.findUnique({
            where: {
              storeId_providerMessageId: {
                storeId: connection.storeId,
                providerMessageId: echo.providerMessageId,
              },
            },
            select: {
              id: true,
              direction: true,
              payload: true,
            },
          })

        if (concurrentExistingMessage) {
          return {
            status: "existing" as const,
            messageId: concurrentExistingMessage.id,
            reason: getExistingSmbEchoReason(concurrentExistingMessage),
          }
        }
      }

      const lockedConversation = await tx.conversation.findFirst({
        where: {
          id: conversation.id,
          storeId: connection.storeId,
          channel: "WHATSAPP",
        },
        select: {
          id: true,
          state: true,
        },
      })

      if (!lockedConversation) {
        throw new Error(
          "Conversation scope mismatch while processing smb_message_echo."
        )
      }

      const createdMessage = await tx.conversationMessage.create({
        data: {
          storeId: connection.storeId,
          conversationId: lockedConversation.id,
          direction: "OUT",
          providerMessageId: echo.providerMessageId ?? undefined,
          text: echo.text ?? undefined,
          payload: toJsonValue({
            source: "manual_external",
            human: true,
            manual: true,
            origin: "smb_message_echoes",
            provider: "META_WHATSAPP",
            whatsappConnectionId: connection.id,
            phoneNumberId: echo.phoneNumberId,
            displayPhoneNumber: echo.displayPhoneNumber,
            businessAccountId: echo.businessAccountId,
            timestamp: echo.timestamp,
            messageType: echo.messageType,
            raw: echo.raw,
          }),
        },
        select: {
          id: true,
          createdAt: true,
        },
      })

      await pauseWhatsAppConversationForHumanAttendance({
        db: tx,
        storeId: connection.storeId,
        conversationId: lockedConversation.id,
        lastMessageAt: createdMessage.createdAt,
      })

      return {
        status: "persisted" as const,
        messageId: createdMessage.id,
        alreadyPaused: lockedConversation.state === "PAUSED",
      }
    })
  } catch (error) {
    if (
      echo.providerMessageId &&
      isProviderMessageUniqueConflict(error)
    ) {
      const duplicateMessage =
        await prisma.conversationMessage.findUnique({
          where: {
            storeId_providerMessageId: {
              storeId: connection.storeId,
              providerMessageId: echo.providerMessageId,
            },
          },
          select: {
            id: true,
            direction: true,
            payload: true,
          },
        })

      if (duplicateMessage) {
        persisted = {
          status: "existing",
          messageId: duplicateMessage.id,
          reason: getExistingSmbEchoReason(duplicateMessage),
        }
      } else {
        throw error
      }
    } else {
      throw error
    }
  }

  if (persisted.status === "existing") {
    return {
      status: "ignored",
      reason: persisted.reason,
      storeId: connection.storeId,
      phoneNumberId: echo.phoneNumberId,
      conversationId: conversation.id,
      messageId: persisted.messageId,
      providerMessageId: echo.providerMessageId,
      alreadyPaused: null,
      handoffNoticeSent: false,
    }
  }

  console.info(
    "whatsapp manual external message detected, pausing bot",
    {
      storeId: connection.storeId,
      phoneNumberId: echo.phoneNumberId,
      businessAccountId: echo.businessAccountId,
      conversationId: conversation.id,
      providerMessageId: echo.providerMessageId,
      alreadyPaused: persisted.alreadyPaused,
    }
  )

  let handoffNoticeSent = false

  if (!persisted.alreadyPaused) {
    const handoffResult = await sendWhatsAppHumanHandoffNotice({
      storeId: connection.storeId,
      conversationId: conversation.id,
      to: echo.to,
      trigger: "smb_message_echoes",
    })

    if (handoffResult.ok) {
      handoffNoticeSent = true
    } else {
      console.error("whatsapp smb_message_echo handoff notice failed", {
        storeId: connection.storeId,
        phoneNumberId: echo.phoneNumberId,
        businessAccountId: echo.businessAccountId,
        conversationId: conversation.id,
        providerMessageId: echo.providerMessageId,
        statusCode: handoffResult.sendResult.statusCode,
        errorCode: handoffResult.sendResult.errorCode,
        error: handoffResult.sendResult.error,
      })
    }
  }

  return {
    status: "paused",
    reason: null,
    storeId: connection.storeId,
    phoneNumberId: echo.phoneNumberId,
    conversationId: conversation.id,
    messageId: persisted.messageId,
    providerMessageId: echo.providerMessageId,
    alreadyPaused: persisted.alreadyPaused,
    handoffNoticeSent,
  }
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
      const deliveryResult = await sendMetaOutboundMessage({
        storeId: params.storeId,
        to: params.to,
        message: message.outbound,
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
  const botSettings = await getBotSettingsForStore(currentStoreId)
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
      const effectiveIncomingText = getEffectiveInboundText(
        incomingMessage.text,
        incomingMessage.selectedOptionId
      )

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

      const previousInteraction = await tx.conversationMessage.findFirst({
        where: {
          conversationId: conversation.id,
          id: { not: savedIn.id },
        },
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
        },
      })

      let nextState: ConversationState | null = null
      let ensuredDraftId: string | null = null
      let createdAppointmentId: string | null = null
      let parsedDateTime: ParsedDateTimeValue | null = null
      let draftCache: DraftWithRelations | null = null
      let shouldStop = false

      console.info("whatsapp bot inbound routing", {
        storeId: currentStoreId,
        conversationId: conversation.id,
        state: conversation.state,
        text: incomingMessage.text,
        effectiveText: effectiveIncomingText,
        selectedOptionId: incomingMessage.selectedOptionId,
        mainMenuShown: conversationContext.mainMenuShown === true,
        priceListPage:
          typeof conversationContext.priceListPage === "number"
            ? conversationContext.priceListPage
            : null,
        appointmentOptionsCount: Array.isArray(conversationContext.appointmentOptions)
          ? conversationContext.appointmentOptions.length
          : 0,
        timeSelectionStage:
          conversationContext.timeSelectionStage === "DAY" ||
          conversationContext.timeSelectionStage === "TIME"
            ? conversationContext.timeSelectionStage
            : null,
      })

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

      async function appendBotReply(
        message: string | BotOutboundMessage,
        extraPayload?: Record<string, unknown>
      ) {
        const preparedMessage =
          typeof message === "string" ? createTextBotMessage(message) : message

        outMessages.push(preparedMessage.textPreview)

        const createdMessage = await tx.conversationMessage.create({
          data: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            direction: "OUT",
            text: preparedMessage.textPreview,
            payload: toJsonValue({
              source: "bot",
              text: preparedMessage.textPreview,
              outbound: preparedMessage.outbound,
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
          text: createdMessage.text ?? preparedMessage.textPreview,
          payload: getJsonRecord(createdMessage.payload),
          outbound: preparedMessage.outbound,
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

      function buildFlowResetContext(mainMenuShown: boolean) {
        return buildBotFlowResetContext(mainMenuShown)
      }

      async function abandonActiveDraft() {
        await tx.appointmentDraft.updateMany({
          where: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            status: "DRAFT",
          },
          data: {
            status: "ABANDONED",
          },
        })

        ensuredDraftId = null
        draftCache = null
        parsedDateTime = null
      }

      async function resetConversationFlow(params: {
        mainMenuShown: boolean
        abandonDraft?: boolean
      }) {
        if (params.abandonDraft) {
          await abandonActiveDraft()
        }

        await persistConversationContext(buildFlowResetContext(params.mainMenuShown))
        await updateState("IDLE")
      }

      async function closeConversation(text: string, reason: string) {
        await resetConversationFlow({
          mainMenuShown: false,
          abandonDraft: true,
        })
        await appendBotReply(text, { reason })
      }

      async function returnToMainMenu() {
        await resetConversationFlow({
          mainMenuShown: true,
          abandonDraft: true,
        })
        await appendBotReply(buildMainMenuMessage(botSettings), {
          reason: "RETURN_TO_MAIN_MENU",
        })
      }

      async function setSuggestedTimeSlots(suggestions: SuggestedSlot[], page = 0) {
        await persistConversationContext({
          timeSlotSuggestions: suggestions.length ? serializeSuggestedSlots(suggestions) : null,
          timeSlotPage: suggestions.length ? page : null,
        })
      }

      async function setTimeSlotPage(page: number) {
        await persistConversationContext({
          timeSlotPage: Math.max(0, page),
        })
      }

      async function setDateOptions(options: AvailableDateOption[], page = 0) {
        await persistConversationContext({
          dateOptions: options.length ? serializeDateOptions(options) : null,
          dateOptionPage: options.length ? page : null,
        })
      }

      async function setDateOptionPage(page: number) {
        await persistConversationContext({
          dateOptionPage: Math.max(0, page),
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

      async function clearSchedulingSelectionContext() {
        await persistConversationContext({
          dateOptions: null,
          selectedDateKey: null,
          selectedDateLabel: null,
          timeSelectionStage: null,
          dateOptionPage: null,
          timeSlotPage: null,
        })
        await setSuggestedTimeSlots([])
      }

      async function listActiveServices() {
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
          orderBy: {
            name: "asc",
          },
        })

        return services
      }

      async function sendServiceSelectionPrompt(reason: string) {
        await appendBotReply(buildServiceChoicePrompt(await listActiveServices()), {
          reason,
        })
      }

      async function listPricedServices() {
        const services = await tx.service.findMany({
          where: {
            storeId: currentStoreId,
            active: true,
            price: {
              not: null,
            },
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
          orderBy: {
            name: "asc",
          },
        })

        return services.flatMap((service) =>
          service.price
            ? [
                {
                  ...service,
                  price: service.price,
                },
              ]
            : []
        )
      }

      async function sendServicePricesPrompt(params: {
        reason: string
        page?: number
      }) {
        const pricedServices = await listPricedServices()

        if (!pricedServices.length) {
          await persistConversationContext({
            priceListPage: null,
          })
          await appendBotReply(
            "Ainda não encontrei serviços com preço disponível no momento.",
            {
              reason: params.reason,
            }
          )
          return
        }

        const maxPage = Math.max(
          0,
          Math.ceil(pricedServices.length / SERVICE_PRICES_PAGE_SIZE) - 1
        )
        const requestedPage = Math.max(0, params.page ?? 0)

        if (requestedPage > maxPage) {
          await persistConversationContext({
            priceListPage: maxPage,
          })
          await appendBotReply("Esses são todos os preços disponíveis no momento.", {
            reason: `${params.reason}_END`,
          })
          await appendBotReply(buildServicePricesNavigationMessage(false), {
            reason: `${params.reason}_NAV`,
            page: maxPage,
          })
          return
        }

        const page = Math.min(requestedPage, maxPage)
        const pageServices = slicePage(pricedServices, page, SERVICE_PRICES_PAGE_SIZE)
        const hasMorePrices = (page + 1) * SERVICE_PRICES_PAGE_SIZE < pricedServices.length

        await persistConversationContext({
          priceListPage: page,
        })
        await appendBotReply(buildServicePricesText(pageServices), {
          reason: params.reason,
          page,
          totalServices: pricedServices.length,
        })
        await appendBotReply(buildServicePricesNavigationMessage(hasMorePrices), {
          reason: `${params.reason}_NAV`,
          page,
          totalServices: pricedServices.length,
        })
      }

      async function sendAppointmentSelectionPrompt(params: {
        options: StoredAppointmentOption[]
        reason: string
      }) {
        const interactiveOptions = params.options.map((option) => ({
          id: getAppointmentOptionId(option.id),
          title: option.label,
        }))

        const message =
          interactiveOptions.length <= 9
            ? buildListBotMessage({
                bodyText: "Escolha um agendamento:",
                buttonText: "Ver agendamentos",
                options: interactiveOptions,
                extraInteractiveRows: [{ id: NAV_BACK_OPTION_ID, title: "Voltar" }],
              })
            : createTextBotMessage(buildFutureAppointmentsMessage(params.options))

        await appendBotReply(message, {
          reason: params.reason,
          appointmentOptions: serializeAppointmentOptions(params.options),
        })
      }

      async function sendAppointmentActionPrompt(reason: string) {
        const selectedLabel =
          typeof conversationContext.selectedAppointmentLabel === "string"
            ? conversationContext.selectedAppointmentLabel
            : null

        if (!selectedLabel) {
          await reopenAppointmentSelection()
          return
        }

        await appendBotReply(buildAppointmentActionPrompt(selectedLabel), {
          reason,
        })
      }

      async function sendAppointmentCancellationPrompt(reason: string) {
        const selectedLabel =
          typeof conversationContext.selectedAppointmentLabel === "string"
            ? conversationContext.selectedAppointmentLabel
            : null

        if (!selectedLabel) {
          await reopenAppointmentAction()
          return
        }

        await appendBotReply(buildAppointmentCancellationPrompt(selectedLabel), {
          reason,
        })
      }

      async function sendStaffSelectionPrompt(params: {
        draft: DraftWithRelations
        staffMembers: EligibleStaffMember[]
        reason: string
      }) {
        await appendBotReply(
          buildStaffChoiceMessage(params.draft.service!.name, params.staffMembers),
          {
            reason: params.reason,
            serviceId: params.draft.service!.id,
          }
        )
      }

      async function loadAvailableDateOptionsForDraft(draft: DraftWithRelations) {
        if (!draft.service || !draft.staffMembershipId) {
          return []
        }

        const ignoreAppointmentId =
          typeof conversationContext.rescheduleAppointmentId === "string"
            ? conversationContext.rescheduleAppointmentId
            : null

        return listNextAvailableDates({
          db: tx,
          storeId: currentStoreId,
          durationMin: draft.service.durationMin,
          timeZone,
          staffMembershipId: draft.staffMembershipId,
          ignoreAppointmentId,
          searchStartAt: new Date(),
          limit: DAY_OPTIONS_LIMIT,
          searchDays: DAY_OPTIONS_SEARCH_DAYS,
        })
      }

      async function sendDaySelectionPrompt(params: {
        draft: DraftWithRelations
        reason: string
        page?: number
      }) {
        const availableDates = await loadAvailableDateOptionsForDraft(params.draft)
        const maxPage =
          availableDates.length > 0
            ? Math.max(0, Math.ceil(availableDates.length / DAY_OPTIONS_PAGE_SIZE) - 1)
            : 0
        const page = Math.min(Math.max(0, params.page ?? 0), maxPage)
        const pageOptions = slicePage(availableDates, page, DAY_OPTIONS_PAGE_SIZE)
        const hasNextPage = (page + 1) * DAY_OPTIONS_PAGE_SIZE < availableDates.length

        await persistConversationContext({
          timeSelectionStage: "DAY",
          selectedDateKey: null,
          selectedDateLabel: null,
        })
        await setSuggestedTimeSlots([])
        await setDateOptions(availableDates, page)

        if (!pageOptions.length) {
          await appendBotReply(
            "Não encontrei dias disponíveis nas próximas semanas. Se preferir, fale com um atendente.",
            {
              reason: params.reason,
              serviceId: params.draft.service?.id,
              staffMembershipId: params.draft.staffMembershipId,
            }
          )
          shouldStop = true
          return
        }

        const interactiveOptions = pageOptions.map((option) => ({
          id: getDateOptionId(option.dateKey),
          title: formatDateKeyForBot(option.dateKey),
        }))

        await appendBotReply(
          buildListBotMessage({
            bodyText: "Escolha um dia:",
            buttonText: "Ver dias",
            options: interactiveOptions,
            extraInteractiveRows: [
              ...(hasNextPage
                ? [{ id: MORE_DATES_OPTION_ID, title: "Mais opções" }]
                : []),
              { id: NAV_BACK_OPTION_ID, title: "Voltar" },
            ],
          }),
          {
            reason: params.reason,
            dateOptions: serializeDateOptions(availableDates),
            page,
          }
        )
      }

      async function sendTimeSelectionPrompt(params: {
        draft: DraftWithRelations
        reason: string
        page?: number
      }) {
        const selectedDateKey =
          typeof conversationContext.selectedDateKey === "string"
            ? conversationContext.selectedDateKey
            : null
        const selectedDateLabel =
          typeof conversationContext.selectedDateLabel === "string"
            ? conversationContext.selectedDateLabel
            : null

        if (!selectedDateKey || !selectedDateLabel || !params.draft.service || !params.draft.staffMembershipId) {
          await sendDaySelectionPrompt({
            draft: params.draft,
            reason: "TIME_SELECTION_DATE_REQUIRED",
          })
          return
        }

        const ignoreAppointmentId =
          typeof conversationContext.rescheduleAppointmentId === "string"
            ? conversationContext.rescheduleAppointmentId
            : null
        const todayDateKey = getDateKeyInTimeZone(new Date(), timeZone)
        const suggestions = await listAvailableSlotsForDate({
          db: tx,
          storeId: currentStoreId,
          dateKey: selectedDateKey,
          durationMin: params.draft.service.durationMin,
          timeZone,
          staffMembershipId: params.draft.staffMembershipId,
          ignoreAppointmentId,
          notBefore: selectedDateKey === todayDateKey ? new Date() : null,
        })

        if (!suggestions.length) {
          await persistConversationContext({
            selectedDateKey: null,
            selectedDateLabel: null,
            timeSelectionStage: "DAY",
          })
          await appendBotReply(
            `Não encontrei horários livres em ${selectedDateLabel}. Vamos escolher outro dia.`,
            {
              reason: `${params.reason}_NO_SLOTS`,
            }
          )
          await sendDaySelectionPrompt({
            draft: params.draft,
            reason: "TIME_SELECTION_NO_SLOTS",
          })
          return
        }

        const maxPage =
          suggestions.length > 0
            ? Math.max(0, Math.ceil(suggestions.length / TIME_OPTIONS_PAGE_SIZE) - 1)
            : 0
        const page = Math.min(Math.max(0, params.page ?? 0), maxPage)
        const pageOptions = slicePage(suggestions, page, TIME_OPTIONS_PAGE_SIZE)
        const hasNextPage = (page + 1) * TIME_OPTIONS_PAGE_SIZE < suggestions.length

        await persistConversationContext({
          timeSelectionStage: "TIME",
        })
        await setSuggestedTimeSlots(suggestions, page)

        const interactiveOptions = pageOptions.map((slot) => ({
          id: getTimeOptionId(slot.startAt),
          title: getTimeKeyInTimeZone(slot.startAt, timeZone),
        }))

        await appendBotReply(
          buildListBotMessage({
            bodyText: `Escolha um horário para ${selectedDateLabel}:`,
            buttonText: "Ver horários",
            options: interactiveOptions,
            extraInteractiveRows: [
              ...(hasNextPage
                ? [{ id: MORE_TIMES_OPTION_ID, title: "Mais horários" }]
                : []),
              { id: NAV_BACK_OPTION_ID, title: "Voltar" },
            ],
          }),
          {
            reason: params.reason,
            page,
            selectedDateKey,
            suggestions: serializeSuggestedSlots(suggestions),
          }
        )
      }

      async function sendBookingConfirmationPrompt(reason: string) {
        const draft = await ensureResolvedStaffForDraft()

        if (!draft?.service || !draft.startAt || !draft.membership) {
          await updateState("CHOOSING_TIME")
          await appendBotReply(
            "Ainda não tenho um horário pronto para confirmar. Escolha um horário para continuar.",
            {
              reason: "BOOKING_CONFIRMATION_DRAFT_REQUIRED",
            }
          )
          shouldStop = true
          return
        }

        await appendBotReply(
          buildBookingConfirmationMessage({
            serviceName: draft.service.name,
            staffName: draft.membership.user.name,
            dateLabel: formatDateKeyForBot(getDateKeyInTimeZone(draft.startAt, timeZone)),
            timeLabel: getTimeKeyInTimeZone(draft.startAt, timeZone),
          }),
          {
            reason,
            serviceId: draft.service.id,
            staffMembershipId: draft.membership.id,
            startAt: draft.startAt.toISOString(),
            endAt: draft.endAt?.toISOString() ?? null,
          }
        )
      }

      async function reopenServiceSelection() {
        await abandonActiveDraft()
        await persistConversationContext(buildFlowResetContext(false))
        await updateState("CHOOSING_SERVICE")
        await sendServiceSelectionPrompt("BACK_ONE_STEP_TO_SERVICE")
      }

      async function reopenAppointmentSelection() {
        const options = await getStoredOrFreshAppointmentOptions()

        if (!options.length) {
          await resetConversationFlow({
            mainMenuShown: false,
            abandonDraft: true,
          })
          await appendBotReply("Não encontrei agendamentos futuros vinculados a este número.", {
            reason: "NO_FUTURE_APPOINTMENTS",
          })
          return
        }

        await clearSchedulingSelectionContext()
        await persistConversationContext({
          appointmentOptions: serializeAppointmentOptions(options),
          selectedAppointmentId: null,
          selectedAppointmentLabel: null,
          rescheduleAppointmentId: null,
        })
        await updateState("CHOOSING_APPOINTMENT")
        await sendAppointmentSelectionPrompt({
          options,
          reason: "BACK_ONE_STEP_TO_APPOINTMENT_SELECTION",
        })
      }

      async function reopenAppointmentAction() {
        await updateState("CHOOSING_APPOINTMENT_ACTION")
        await sendAppointmentActionPrompt("BACK_ONE_STEP_TO_APPOINTMENT_ACTION")
      }

      async function reopenStaffSelection() {
        const draft = await getDraft(true)

        if (!draft?.service) {
          await reopenServiceSelection()
          return
        }

        const eligibleStaff = await listEligibleStaffForService({
          db: tx,
          storeId: currentStoreId,
          serviceId: draft.service.id,
        })

        if (eligibleStaff.length <= 1) {
          const isRescheduleFlow =
            typeof conversationContext.rescheduleAppointmentId === "string"

          if (isRescheduleFlow) {
            await reopenAppointmentAction()
            return
          }

          await reopenServiceSelection()
          return
        }

        await setDraftSelection({
          staffMembershipId: null,
          startAt: null,
          endAt: null,
        })
        await updateState("CHOOSING_STAFF")
        await clearSchedulingSelectionContext()
        await sendStaffSelectionPrompt({
          draft,
          staffMembers: eligibleStaff,
          reason: "BACK_ONE_STEP_TO_STAFF_SELECTION",
        })
      }

      async function reopenTimeSelection() {
        const draft = await getDraft(true)

        if (!draft?.service) {
          const isRescheduleFlow =
            typeof conversationContext.rescheduleAppointmentId === "string"

          if (isRescheduleFlow) {
            await reopenAppointmentAction()
            return
          }

          await reopenServiceSelection()
          return
        }

        const eligibleStaff = await listEligibleStaffForService({
          db: tx,
          storeId: currentStoreId,
          serviceId: draft.service.id,
        })

        if (eligibleStaff.length > 1 && (!draft.staffMembershipId || !draft.membership)) {
          await reopenStaffSelection()
          return
        }

        if (!draft.staffMembershipId || !draft.membership) {
          const isRescheduleFlow =
            typeof conversationContext.rescheduleAppointmentId === "string"

          if (isRescheduleFlow) {
            await reopenAppointmentAction()
            return
          }

          await reopenServiceSelection()
          return
        }

        await clearDraftDateTime()
        await updateState("CHOOSING_TIME")
        const refreshedDraft = await getDraft(true)

        if (getTimeSelectionStage(conversationContext) === "TIME") {
          await sendTimeSelectionPrompt({
            draft: refreshedDraft!,
            reason: "BACK_ONE_STEP_TO_TIME_SELECTION",
          })
          return
        }

        await sendDaySelectionPrompt({
          draft: refreshedDraft!,
          reason: "BACK_ONE_STEP_TO_DAY_SELECTION",
        })
      }

      async function handleBackOneStep() {
        if (conversation.state === "IDLE" || conversation.state === "CHOOSING_SERVICE") {
          await returnToMainMenu()
          return
        }

        if (conversation.state === "CHOOSING_STAFF") {
          const isRescheduleFlow =
            typeof conversationContext.rescheduleAppointmentId === "string"

          if (isRescheduleFlow) {
            await reopenAppointmentAction()
            return
          }

          await reopenServiceSelection()
          return
        }

        if (conversation.state === "CHOOSING_TIME") {
          if (getTimeSelectionStage(conversationContext) === "TIME") {
            await persistConversationContext({
              selectedDateKey: null,
              selectedDateLabel: null,
              timeSelectionStage: "DAY",
              timeSlotPage: null,
            })
            await setSuggestedTimeSlots([])
            await reopenTimeSelection()
            return
          }

          const draft = await getDraft(true)

          if (!draft?.service) {
            const isRescheduleFlow =
              typeof conversationContext.rescheduleAppointmentId === "string"

            if (isRescheduleFlow) {
              await reopenAppointmentAction()
              return
            }

            await reopenServiceSelection()
            return
          }

          const eligibleStaff = await listEligibleStaffForService({
            db: tx,
            storeId: currentStoreId,
            serviceId: draft.service.id,
          })

          if (eligibleStaff.length > 1) {
            await reopenStaffSelection()
            return
          }

          const isRescheduleFlow =
            typeof conversationContext.rescheduleAppointmentId === "string"

          if (isRescheduleFlow) {
            await reopenAppointmentAction()
            return
          }

          await reopenServiceSelection()
          return
        }

        if (conversation.state === "CONFIRMING") {
          await persistConversationContext({
            timeSelectionStage: "TIME",
          })
          await reopenTimeSelection()
          return
        }

        if (conversation.state === "CHOOSING_APPOINTMENT") {
          await returnToMainMenu()
          return
        }

        if (conversation.state === "CHOOSING_APPOINTMENT_ACTION") {
          await reopenAppointmentSelection()
          return
        }

        if (conversation.state === "CONFIRMING_APPOINTMENT_CANCELLATION") {
          await reopenAppointmentAction()
          return
        }

        await returnToMainMenu()
      }

      async function pauseConversation() {
        nextState = "PAUSED"

        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            state: "PAUSED",
            lastMessageAt: new Date(),
          },
        })

        await appendBotReply(botSettings.customerRequestedHumanMessage, {
          reason: "CHATBOT_PAUSED_BY_CUSTOMER",
          pausedByMessageId: savedIn.id,
        })
      }

      if (conversation.state === "PAUSED") {
        if (isResumeChatbotTriggerText(effectiveIncomingText)) {
          console.info("whatsapp bot paused conversation resumed by customer", {
            storeId: currentStoreId,
            conversationId: conversation.id,
            providerMessageId: incomingMessage.providerMessageId,
            from: incomingMessage.from,
            text: incomingMessage.text,
            effectiveText: effectiveIncomingText,
          })

          await resetConversationFlow({
            mainMenuShown: true,
            abandonDraft: true,
          })
          await appendBotReply(
            "Atendimento automático retomado.",
            {
              reason: "CHATBOT_RESUMED_BY_CUSTOMER",
              resumedByMessageId: savedIn.id,
            }
          )
          await appendBotReply(buildMainMenuMessage(botSettings), {
            reason: "CHATBOT_RESUMED_BY_CUSTOMER_MENU",
            resumedByMessageId: savedIn.id,
          })

          return {
            conversationId: conversation.id,
            messageId: savedIn.id,
            nextState: "IDLE",
            draftId: null,
            appointmentId: null,
            replies: outMessages,
            replayed: false,
          }
        }

        return {
          conversationId: conversation.id,
          messageId: savedIn.id,
          nextState: "PAUSED",
          draftId: null,
          appointmentId: null,
          replies: outMessages,
          replayed: false,
        }
      }

      if (isPauseChatbotTriggerText(effectiveIncomingText)) {
        await pauseConversation()

        return {
          conversationId: conversation.id,
          messageId: savedIn.id,
          nextState: "PAUSED",
          draftId: null,
          appointmentId: null,
          replies: outMessages,
          replayed: false,
        }
      }

      if (
        hasConversationFlowTimedOut({
          state: conversation.state,
          lastInteractionAt: previousInteraction?.createdAt,
          now: savedIn.createdAt,
        })
      ) {
        await closeConversation(CHATBOT_TIMEOUT_MESSAGE, "CHATBOT_TIMEOUT")

        return {
          conversationId: conversation.id,
          messageId: savedIn.id,
          nextState: nextState ?? "IDLE",
          draftId: ensuredDraftId,
          appointmentId: createdAppointmentId,
          replies: outMessages,
          replayed: false,
        }
      }

      if (isEndConversationIntent(effectiveIncomingText)) {
        await closeConversation(CHATBOT_CLOSED_MESSAGE, "CHATBOT_CLOSED_BY_CUSTOMER")

        return {
          conversationId: conversation.id,
          messageId: savedIn.id,
          nextState: nextState ?? "IDLE",
          draftId: ensuredDraftId,
          appointmentId: createdAppointmentId,
          replies: outMessages,
          replayed: false,
        }
      }

      if (isBackToMenuIntent(effectiveIncomingText)) {
        await returnToMainMenu()

        return {
          conversationId: conversation.id,
          messageId: savedIn.id,
          nextState: nextState ?? "IDLE",
          draftId: ensuredDraftId,
          appointmentId: createdAppointmentId,
          replies: outMessages,
          replayed: false,
        }
      }

      if (isBackOneStepIntent(effectiveIncomingText)) {
        await handleBackOneStep()

        return {
          conversationId: conversation.id,
          messageId: savedIn.id,
          nextState: nextState ?? "IDLE",
          draftId: ensuredDraftId,
          appointmentId: createdAppointmentId,
          replies: outMessages,
          replayed: false,
        }
      }

      const bot = handleIncomingMessage({
        state: conversation.state,
        text: effectiveIncomingText,
        context: buildBotContext(conversation.context),
      })

      console.info("whatsapp bot actions resolved", {
        storeId: currentStoreId,
        conversationId: conversation.id,
        state: conversation.state,
        text: incomingMessage.text,
        effectiveText: effectiveIncomingText,
        selectedOptionId: incomingMessage.selectedOptionId,
        actionTypes: bot.actions.map((action) => action.type),
        actionsCount: bot.actions.length,
      })

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

      async function ensureResolvedStaffForDraft() {
        const draft = await getDraft(true)

        if (!draft?.service) {
          await updateState("CHOOSING_SERVICE")
          await sendServiceSelectionPrompt("SERVICE_REQUIRED")
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
          await clearSchedulingSelectionContext()
          await updateState("CHOOSING_SERVICE")
          await appendBotReply(`Não há profissional disponível para ${draft.service.name} no momento.`, {
            reason: "NO_ELIGIBLE_STAFF",
            serviceId: draft.service.id,
          })
          await sendServiceSelectionPrompt("NO_ELIGIBLE_STAFF")
          shouldStop = true
          return null
        }

        if (eligibleStaff.length === 1) {
          await setDraftSelection({
            staffMembershipId: eligibleStaff[0].membershipId,
            startAt: null,
            endAt: null,
          })
          await clearSchedulingSelectionContext()
          return getDraft(true)
        }

        await updateState("CHOOSING_STAFF")
        await clearSchedulingSelectionContext()
        await sendStaffSelectionPrompt({
          draft,
          staffMembers: eligibleStaff,
          reason: "STAFF_SELECTION_REQUIRED",
        })
        shouldStop = true
        return null
      }

      for (const action of bot.actions) {
        if (shouldStop) {
          break
        }

        console.info("whatsapp bot action execute", {
          storeId: currentStoreId,
          conversationId: conversation.id,
          actionType: action.type,
          state: nextState ?? conversation.state,
          repliesCount: outMessages.length,
          persistedOutboundMessagesCount: persistedOutboundMessages.length,
        })

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

        if (action.type === "SHOW_MAIN_MENU") {
          await appendBotReply(buildMainMenuMessage(botSettings), {
            reason: "MAIN_MENU_SHOWN",
          })
          continue
        }

        if (action.type === "SHOW_SERVICE_PRICES_PAGE") {
          await updateState("IDLE")
          await sendServicePricesPrompt({
            reason: "SERVICE_PRICES_PROMPT",
            page: action.page,
          })
          continue
        }

        if (action.type === "SHOW_SERVICE_SELECTION") {
          await sendServiceSelectionPrompt("SERVICE_SELECTION_PROMPT")
          continue
        }

        if (action.type === "SHOW_STAFF_SELECTION") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service) {
            continue
          }

          const eligibleStaff = await listEligibleStaffForService({
            db: tx,
            storeId: currentStoreId,
            serviceId: draft.service.id,
          })

          if (eligibleStaff.length <= 1) {
            continue
          }

          await updateState("CHOOSING_STAFF")
          await sendStaffSelectionPrompt({
            draft,
            staffMembers: eligibleStaff,
            reason: "STAFF_SELECTION_PROMPT",
          })
          continue
        }

        if (action.type === "SHOW_DAY_SELECTION") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.membership) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendDaySelectionPrompt({
            draft,
            reason: "DAY_SELECTION_PROMPT",
          })
          continue
        }

        if (action.type === "SHOW_TIME_SELECTION") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.membership) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendTimeSelectionPrompt({
            draft,
            reason: "TIME_SELECTION_PROMPT",
          })
          continue
        }

        if (action.type === "SHOW_BOOKING_CONFIRMATION") {
          await sendBookingConfirmationPrompt("BOOKING_CONFIRMATION_PROMPT")
          continue
        }

        if (action.type === "SHOW_APPOINTMENT_ACTION") {
          await sendAppointmentActionPrompt("APPOINTMENT_ACTION_PROMPT")
          continue
        }

        if (action.type === "SHOW_APPOINTMENT_CANCELLATION_CONFIRMATION") {
          await sendAppointmentCancellationPrompt("APPOINTMENT_CANCELLATION_PROMPT")
          continue
        }

        if (action.type === "LIST_FUTURE_APPOINTMENTS") {
          const appointments = await listFutureAppointmentsForCustomer()
          const options = appointments.map((appointment) => ({
            id: appointment.id,
            label: buildAppointmentLabel(appointment, timeZone),
          }))

          await clearSchedulingSelectionContext()

          if (!options.length) {
            await clearAppointmentFlowContext()
            await updateState("IDLE")
            await appendBotReply("Não encontrei agendamentos futuros vinculados a este número.", {
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
          await sendAppointmentSelectionPrompt({
            options,
            reason: "FUTURE_APPOINTMENTS_FOUND",
          })
          continue
        }

        if (action.type === "SELECT_EXISTING_APPOINTMENT") {
          const options = await getStoredOrFreshAppointmentOptions()

          if (!options.length) {
            await clearAppointmentFlowContext()
            await clearSchedulingSelectionContext()
            await updateState("IDLE")
            await appendBotReply("Não encontrei agendamentos futuros vinculados a este número.", {
              reason: "NO_FUTURE_APPOINTMENTS",
            })
            shouldStop = true
            continue
          }

          const selectedAppointmentIdFromInteractive = getValueFromOptionId(
            incomingMessage.selectedOptionId,
            APPOINTMENT_OPTION_ID_PREFIX
          )
          const selectedOption =
            options.find((option) => option.id === selectedAppointmentIdFromInteractive) ??
            resolveStoredAppointmentChoice(action.text, options)

          if (!selectedOption) {
            await persistConversationContext({
              appointmentOptions: serializeAppointmentOptions(options),
            })
            await updateState("CHOOSING_APPOINTMENT")
            await appendBotReply("Não entendi qual agendamento você quer alterar.", {
              reason: "APPOINTMENT_SELECTION_INVALID",
            })
            await sendAppointmentSelectionPrompt({
              options,
              reason: "APPOINTMENT_SELECTION_INVALID",
            })
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
              await clearSchedulingSelectionContext()
              await updateState("IDLE")
              await appendBotReply("Não encontrei mais agendamentos futuros vinculados a este número.", {
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
            await appendBotReply("Esse agendamento não está mais disponível para alteração.", {
              reason: "APPOINTMENT_SELECTION_STALE",
            })
            await sendAppointmentSelectionPrompt({
              options: refreshedOptions,
              reason: "APPOINTMENT_SELECTION_STALE",
            })
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
          await clearSchedulingSelectionContext()
          await updateState("CHOOSING_APPOINTMENT_ACTION")
          await sendAppointmentActionPrompt("APPOINTMENT_SELECTED")
          continue
        }

        if (action.type === "CANCEL_SELECTED_APPOINTMENT") {
          const selectedAppointment = await getSelectedAppointment()

          if (!selectedAppointment) {
            await clearAppointmentFlowContext()
            await clearSchedulingSelectionContext()
            await updateState("IDLE")
            await appendBotReply(
              "Não encontrei um agendamento futuro válido para cancelar neste número.",
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
          await clearSchedulingSelectionContext()
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
            await clearSchedulingSelectionContext()
            await updateState("IDLE")
            await appendBotReply(
              "Não encontrei um agendamento futuro válido para remarcar neste número.",
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
              "Esse agendamento não pode ser remarcado automaticamente por aqui porque não tem serviço vinculado. Se quiser, posso ajudar com um novo agendamento.",
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
          await clearSchedulingSelectionContext()

          const preparedDraft = await ensureResolvedStaffForDraft()
          if (!preparedDraft) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendDaySelectionPrompt({
            draft: preparedDraft,
            reason: "RESCHEDULE_DAY_SELECTION",
          })
          continue
        }

        if (action.type === "SELECT_SERVICE_FROM_TEXT") {
          await ensureDraft()

          const query = normalizeBotText(action.text)
          const services = await listActiveServices()
          const selectedServiceIdFromInteractive = getValueFromOptionId(
            incomingMessage.selectedOptionId,
            SERVICE_OPTION_ID_PREFIX
          )

          const matched =
            services.find((service) => service.id === selectedServiceIdFromInteractive) ??
            services.find((service) => normalizeBotText(service.name) === query) ??
            services.find((service) => {
              const normalizedName = normalizeBotText(service.name)
              return normalizedName.includes(query) || query.includes(normalizedName)
            }) ??
            (() => {
              const numericChoice = getNumericChoice(action.text)
              return numericChoice === null ? null : services[numericChoice] ?? null
            })()

          if (!matched) {
            await updateState("CHOOSING_SERVICE")
            await appendBotReply("Não encontrei esse serviço. Escolha uma opção da lista ou digite o nome.", {
              reason: "SERVICE_NOT_FOUND",
            })
            await sendServiceSelectionPrompt("SERVICE_NOT_FOUND")
            shouldStop = true
            continue
          }

          await setDraftSelection({
            serviceId: matched.id,
            staffMembershipId: null,
            startAt: null,
            endAt: null,
          })
          await clearSchedulingSelectionContext()
          continue
        }

        if (action.type === "RESOLVE_STAFF_FOR_DRAFT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendDaySelectionPrompt({
            draft,
            reason: "DAY_SELECTION_AFTER_SERVICE",
          })
          continue
        }

        if (action.type === "SELECT_STAFF_FROM_TEXT") {
          const draft = await getDraft(true)

          if (!draft?.service) {
            await updateState("CHOOSING_SERVICE")
            await sendServiceSelectionPrompt("SERVICE_REQUIRED")
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
            await clearSchedulingSelectionContext()
            await updateState("CHOOSING_SERVICE")
            await appendBotReply(`Não há profissional disponível para ${draft.service.name} no momento.`, {
              reason: "NO_ELIGIBLE_STAFF",
              serviceId: draft.service.id,
            })
            await sendServiceSelectionPrompt("NO_ELIGIBLE_STAFF")
            shouldStop = true
            continue
          }

          if (eligibleStaff.length === 1) {
            await setDraftSelection({
              staffMembershipId: eligibleStaff[0].membershipId,
              startAt: null,
              endAt: null,
            })
            await clearSchedulingSelectionContext()

            const updatedDraft = await getDraft(true)
            await updateState("CHOOSING_TIME")
            await sendDaySelectionPrompt({
              draft: updatedDraft!,
              reason: "DAY_SELECTION_AFTER_STAFF_AUTOSELECT",
            })
            continue
          }

          const selectedStaffMembershipIdFromInteractive = getValueFromOptionId(
            incomingMessage.selectedOptionId,
            STAFF_OPTION_ID_PREFIX
          )
          const selectedStaff =
            selectedStaffMembershipIdFromInteractive
              ? (() => {
                  const matchedStaff = eligibleStaff.find(
                    (staff) => staff.membershipId === selectedStaffMembershipIdFromInteractive
                  )

                  return matchedStaff
                    ? {
                        ok: true as const,
                        staff: matchedStaff,
                      }
                    : {
                        ok: false as const,
                        reason: "INVALID" as const,
                        matches: [],
                      }
                })()
              : resolveEligibleStaffChoice({
                  text: action.text,
                  staffMembers: eligibleStaff,
                })

          if (!selectedStaff.ok) {
            await updateState("CHOOSING_STAFF")
            await appendBotReply(
              selectedStaff.reason === "AMBIGUOUS"
                ? "Encontrei mais de um profissional parecido. Escolha uma opção da lista."
                : "Não entendi qual profissional você quer. Escolha uma opção da lista ou digite o nome.",
              {
              reason:
                selectedStaff.reason === "AMBIGUOUS" ? "STAFF_SELECTION_AMBIGUOUS" : "STAFF_SELECTION_INVALID",
              serviceId: draft.service.id,
            })
            await sendStaffSelectionPrompt({
              draft,
              staffMembers: eligibleStaff,
              reason:
                selectedStaff.reason === "AMBIGUOUS"
                  ? "STAFF_SELECTION_AMBIGUOUS"
                  : "STAFF_SELECTION_INVALID",
            })
            shouldStop = true
            continue
          }

          await setDraftSelection({
            staffMembershipId: selectedStaff.staff.membershipId,
            startAt: null,
            endAt: null,
          })
          await clearSchedulingSelectionContext()

          const updatedDraft = await getDraft(true)
          await updateState("CHOOSING_TIME")
          await sendDaySelectionPrompt({
            draft: updatedDraft!,
            reason: "DAY_SELECTION_AFTER_STAFF",
          })
          continue
        }

        if (action.type === "SELECT_DAY_FROM_TEXT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId || !draft.membership) {
            continue
          }

          const storedDateOptions = getStoredDateOptions(conversationContext)
          const currentPage = getStoredNumberValue(conversationContext, "dateOptionPage")

          if (incomingMessage.selectedOptionId === MORE_DATES_OPTION_ID) {
            const nextPage = currentPage + 1
            await setDateOptionPage(nextPage)
            await sendDaySelectionPrompt({
              draft,
              reason: "DAY_SELECTION_NEXT_PAGE",
              page: nextPage,
            })
            continue
          }

          const currentPageOptions = slicePage(
            storedDateOptions,
            currentPage,
            DAY_OPTIONS_PAGE_SIZE
          )
          const selectedDateKeyFromInteractive = getValueFromOptionId(
            incomingMessage.selectedOptionId,
            DATE_OPTION_ID_PREFIX
          )
          const selectedDateOption =
            currentPageOptions.find((option) => option.dateKey === selectedDateKeyFromInteractive) ??
            getStoredDateOptionChoice(action.text, currentPageOptions)
          const parsedDate =
            selectedDateOption
              ? {
                  ok: true as const,
                  value: {
                    dateKey: selectedDateOption.dateKey,
                    label: selectedDateOption.label,
                  },
                }
              : parseDateFromText({
                  text: action.text,
                  timeZone,
                })

          if (!parsedDate.ok) {
            await updateState("CHOOSING_TIME")
            await appendBotReply(parsedDate.error, {
              reason: "DAY_SELECTION_INVALID",
            })
            await sendDaySelectionPrompt({
              draft,
              reason: "DAY_SELECTION_INVALID",
              page: currentPage,
            })
            shouldStop = true
            continue
          }

          await persistConversationContext({
            selectedDateKey: parsedDate.value.dateKey,
            selectedDateLabel: parsedDate.value.label,
            timeSelectionStage: "TIME",
            timeSlotPage: 0,
          })
          await clearDraftDateTime()
          await updateState("CHOOSING_TIME")
          await sendTimeSelectionPrompt({
            draft,
            reason: "TIME_SELECTION_AFTER_DAY",
          })
          continue
        }

        if (action.type === "SELECT_TIME_INPUT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId || !draft.membership) {
            continue
          }

          const selectedDateKey =
            typeof conversationContext.selectedDateKey === "string"
              ? conversationContext.selectedDateKey
              : null
          const selectedDateLabel =
            typeof conversationContext.selectedDateLabel === "string"
              ? conversationContext.selectedDateLabel
              : null

          if (!selectedDateKey || !selectedDateLabel) {
            await updateState("CHOOSING_TIME")
            await sendDaySelectionPrompt({
              draft,
              reason: "TIME_SELECTION_DATE_REQUIRED",
            })
            shouldStop = true
            continue
          }

          const currentPage = getStoredNumberValue(conversationContext, "timeSlotPage")

          if (incomingMessage.selectedOptionId === MORE_TIMES_OPTION_ID) {
            const nextPage = currentPage + 1
            await setTimeSlotPage(nextPage)
            await sendTimeSelectionPrompt({
              draft,
              reason: "TIME_SELECTION_NEXT_PAGE",
              page: nextPage,
            })
            continue
          }

          const storedSuggestions = getStoredSuggestedSlots(conversationContext)
          const currentPageSuggestions = slicePage(
            storedSuggestions,
            currentPage,
            TIME_OPTIONS_PAGE_SIZE
          )
          const selectedStartAtFromInteractive = getValueFromOptionId(
            incomingMessage.selectedOptionId,
            TIME_OPTION_ID_PREFIX
          )
          const selectedSuggestedSlot =
            currentPageSuggestions.find(
              (slot) => slot.startAt.toISOString() === selectedStartAtFromInteractive
            ) ?? resolveSuggestedSlotChoice(action.text, currentPageSuggestions)

          if (selectedSuggestedSlot) {
            parsedDateTime = toParsedDateTimeValue(selectedSuggestedSlot.startAt, timeZone)
          } else {
            const parsedTime = parseTimeFromText({ text: action.text })

            if (parsedTime.ok) {
              parsedDateTime = toParsedDateTimeValue(
                combineDateKeyAndTime(
                  selectedDateKey,
                  parsedTime.value.timeKey,
                  timeZone
                ),
                timeZone
              )
            } else {
              const parsedFullDateTime = parseDateTimeFromText({
                text: action.text,
                timeZone,
              })

              if (!parsedFullDateTime.ok) {
                parsedDateTime = null
                await updateState("CHOOSING_TIME")
                await appendBotReply(
                  "Não entendi o horário. Escolha uma opção da lista ou escreva algo como 14h ou 14:30.",
                  {
                    reason: "TIME_SELECTION_INVALID",
                  }
                )
                await sendTimeSelectionPrompt({
                  draft,
                  reason: "TIME_SELECTION_INVALID",
                  page: currentPage,
                })
                shouldStop = true
                continue
              }

              parsedDateTime = parsedFullDateTime.value
              await persistConversationContext({
                selectedDateKey: parsedFullDateTime.value.dateKey,
                selectedDateLabel: formatDateKeyForBot(parsedFullDateTime.value.dateKey),
              })
            }
          }

          if (!parsedDateTime) {
            shouldStop = true
            continue
          }

          if (parsedDateTime.startAt.getTime() <= Date.now()) {
            await updateState("CHOOSING_TIME")
            await appendBotReply("Preciso de um horário futuro para continuar.", {
              reason: "TIME_SELECTION_IN_PAST",
            })
            await sendTimeSelectionPrompt({
              draft,
              reason: "TIME_SELECTION_IN_PAST",
              page: currentPage,
            })
            shouldStop = true
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
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              `Esse horário não está mais disponível para ${draft.membership.user.name}.`,
              {
                reason: availability.reason,
                staffMembershipId: draft.staffMembershipId,
              }
            )

            await persistConversationContext({
              selectedDateKey: parsedDateTime.dateKey,
              selectedDateLabel: formatDateKeyForBot(parsedDateTime.dateKey),
              timeSelectionStage: "TIME",
            })
            await sendTimeSelectionPrompt({
              draft,
              reason: "TIME_SELECTION_UNAVAILABLE",
            })
            shouldStop = true
            continue
          }

          const confirmedDateTime = {
            ...parsedDateTime,
            startAt: availability.startAt,
            label: formatDateTimeForBot(availability.startAt, timeZone),
          }
          const endAt = new Date(
            confirmedDateTime.startAt.getTime() + draft.service.durationMin * 60 * 1000
          )

          await setDraftSelection({
            startAt: confirmedDateTime.startAt,
            endAt,
          })
          await persistConversationContext({
            selectedDateKey: confirmedDateTime.dateKey,
            selectedDateLabel: formatDateKeyForBot(confirmedDateTime.dateKey),
            timeSelectionStage: "TIME",
          })
          await setSuggestedTimeSlots([])
          await updateState("CONFIRMING")
          await sendBookingConfirmationPrompt("BOOKING_CONFIRMATION_READY")
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
            await clearSchedulingSelectionContext()
            await updateState("IDLE")
            await appendBotReply(
              "Não encontrei mais o agendamento original para remarcar. Se quiser, posso te ajudar com um novo agendamento.",
              {
                reason: "RESCHEDULE_SOURCE_NOT_FOUND",
              }
            )
            shouldStop = true
            continue
          }

          if (!draft?.service || !draft.startAt || !draft.endAt || !draft.staffMembershipId || !draft.membership) {
            await updateState("CHOOSING_TIME")
            await sendTimeSelectionPrompt({
              draft: (await getDraft(true))!,
              reason: "RESCHEDULE_DATETIME_REQUIRED",
            })
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
            await updateState("CHOOSING_TIME")
            await appendBotReply(`Esse horário não está mais disponível para ${draft.membership.user.name}.`, {
              reason: latestAvailability.reason,
              staffMembershipId: draft.staffMembershipId,
            })
            await sendTimeSelectionPrompt({
              draft,
              reason: "RESCHEDULE_TIME_UNAVAILABLE",
            })
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
          await clearSchedulingSelectionContext()
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
              await sendTimeSelectionPrompt({
                draft: (await getDraft(true))!,
                reason: "DRAFT_DATETIME_REQUIRED",
              })
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
            await updateState("CHOOSING_TIME")
            await appendBotReply(`Esse horário não está mais disponível para ${draft.membership.user.name}.`, {
              reason: latestAvailability.reason,
              staffMembershipId: draft.staffMembershipId,
            })
            await sendTimeSelectionPrompt({
              draft,
              reason: "CREATE_TIME_UNAVAILABLE",
            })
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
          await clearSchedulingSelectionContext()

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
          continue
        }

        console.warn("whatsapp bot action without dispatcher handler", {
          storeId: currentStoreId,
          conversationId: conversation.id,
          actionType: (action as { type: string }).type,
        })
      }

      console.info("whatsapp bot action loop finished", {
        storeId: currentStoreId,
        conversationId: conversation.id,
        state: nextState ?? conversation.state,
        text: incomingMessage.text,
        effectiveText: effectiveIncomingText,
        selectedOptionId: incomingMessage.selectedOptionId,
        actionsCount: bot.actions.length,
        persistedOutboundMessagesCount: persistedOutboundMessages.length,
        repliesCount: outMessages.length,
        shouldStop,
      })

      if (!shouldStop && persistedOutboundMessages.length === 0) {
        console.warn("whatsapp bot no outbound generated after actions", {
          storeId: currentStoreId,
          conversationId: conversation.id,
          state: nextState ?? conversation.state,
          text: incomingMessage.text,
          effectiveText: effectiveIncomingText,
          selectedOptionId: incomingMessage.selectedOptionId,
          actionTypes: bot.actions.map((action) => action.type),
        })

        if ((nextState ?? conversation.state) === "IDLE") {
          await persistConversationContext({
            mainMenuShown: true,
            priceListPage: null,
          })
          await appendBotReply(buildMainMenuMessage(botSettings), {
            reason: "EMPTY_OUTBOUND_FALLBACK_MAIN_MENU",
          })
        } else {
          await appendBotReply(
            "Não consegui continuar por aqui. Me envie 'menu' para recomeçar.",
            {
              reason: "EMPTY_OUTBOUND_FALLBACK_REPLY",
              state: nextState ?? conversation.state,
            }
          )
        }

        console.info("whatsapp bot fallback outbound appended", {
          storeId: currentStoreId,
          conversationId: conversation.id,
          persistedOutboundMessagesCount: persistedOutboundMessages.length,
          repliesCount: outMessages.length,
        })
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
  console.info("whatsapp outbound dispatch decision", {
    storeId: currentStoreId,
    conversationId: transactionResult.conversationId,
    replayed: transactionResult.replayed,
    shouldAttemptOutboundDelivery,
    persistedOutboundMessagesCount: persistedOutboundMessages.length,
    to: incomingMessage.from,
  })

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
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")
  const expectedToken = process.env.WHATSAPP_WEBHOOK_SECRET

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }

  return Response.json(
    { ok: false, error: "Invalid hub.verify_token" },
    { status: 403 }
  )
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
        smbMessageEchoesCount: parsedPayload.messageEchoes.length,
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

      const results: Array<ProcessIncomingMessageResult & { storeId: string; phoneNumberId: string }> = []
      const smbMessageEchoResults: ProcessSmbMessageEchoResult[] = []
      const ignored: Array<Record<string, string | null>> = []

      for (const echo of parsedPayload.messageEchoes) {
        const echoResult = await processSmbMessageEcho(echo)

        if (echoResult.status === "ignored") {
          ignored.push({
            reason: echoResult.reason,
            storeId: echoResult.storeId,
            phoneNumberId: echoResult.phoneNumberId,
            conversationId: echoResult.conversationId,
            providerMessageId: echoResult.providerMessageId,
          })
          continue
        }

        smbMessageEchoResults.push(echoResult)
      }

      if (
        !parsedPayload.messages.length &&
        !parsedPayload.messageEchoes.length
      ) {
        return ok({
          source: "meta",
          processedCount: 0,
          ignoredCount: 1,
          results: [],
          smbMessageEchoResults: [],
          ignored: [
            {
              reason: "NO_INBOUND_MESSAGES",
            },
          ],
        })
      }

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
            reason: "connection not found",
            phoneNumberId: message.phoneNumberId,
            businessAccountId: message.businessAccountId,
            providerMessageId: message.providerMessageId,
            from: message.from,
            hasText: Boolean(message.text),
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
            selectedOptionId: message.interactiveReply?.id ?? null,
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
        processedCount: results.length + smbMessageEchoResults.length,
        ignoredCount: ignored.length,
        results,
        smbMessageEchoResults,
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
        selectedOptionId: incomingMessage.interactiveReply?.id ?? null,
        raw: incomingMessage.raw,
      },
    })

    return ok({
      source: "test",
      ...result,
    })
  } catch (error) {
    console.error("whatsapp webhook error", error)
    return serverError("Não foi possível processar o webhook do WhatsApp")
  }
}
