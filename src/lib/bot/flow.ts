// src/lib/bot/flow.ts
import type { ConversationState } from "@/lib/prisma"
import { normalizeBotText } from "./datetime"
import type { BotAction, BotConversationContext, BotResult } from "./types"

const COMMANDS_FOOTER = "Comandos: voltar | menu | atendente | encerrar"
const WELCOME_MENU_TEXT = `Olá! Como posso te ajudar?

1. Agendar horário
2. Meus agendamentos
3. Preços
4. Informações

${COMMANDS_FOOTER}`
const BOT_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000

const CHATBOT_PAUSE_KEYWORD_REGEX = /\b(?:atendente|humano|chatbot)\b/
const CHATBOT_PAUSE_INTENT_PATTERNS = [
  /\bfalar com (?:a )?loja\b/,
  /\bfalar com (?:um |uma |o |a )?alguem\b/,
  /\b(?:quero|preciso)(?:\s+de)?\s+falar com (?:um |uma |o |a )?(?:alguem|loja)\b/,
  /\b(?:me\s+passa|me\s+passar|me\s+transfere|me\s+transferir|me\s+encaminha|me\s+encaminhar|passa|transfere|encaminha)(?:\s+(?:pra|para))?\s+(?:um |uma |o |a )?(?:atendente|humano|alguem|loja)\b/,
  /\bquero atendimento humano\b/,
]
const END_CONVERSATION_PATTERNS = [
  /^encerrar$/,
  /^encerrar atendimento$/,
  /^finalizar$/,
  /^cancelar atendimento$/,
  /^parar$/,
]
const BACK_TO_MENU_PATTERNS = [
  /^menu$/,
  /^menu inicial$/,
  /^inicio$/,
  /^voltar ao menu$/,
  /^home$/,
]
const BACK_ONE_STEP_PATTERNS = [
  /^voltar$/,
  /^voltar etapa$/,
  /^voltar opcao$/,
  /^voltar uma opcao$/,
]
const TIMEOUT_ELIGIBLE_STATES = new Set<ConversationState>([
  "COLLECTING_CUSTOMER",
  "CHOOSING_SERVICE",
  "CHOOSING_STAFF",
  "CHOOSING_TIME",
  "CONFIRMING",
  "CHOOSING_APPOINTMENT",
  "CHOOSING_APPOINTMENT_ACTION",
  "CONFIRMING_APPOINTMENT_CANCELLATION",
])

function matchesAny(text: string, expressions: string[]) {
  const normalizedText = normalizeBotText(text)

  return expressions.some((expression) => {
    const normalizedExpression = normalizeBotText(expression)
    const escapedExpression = normalizedExpression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(^|\\b)${escapedExpression}(\\b|$)`).test(normalizedText)
  })
}

function matchesMenuOption(text: string, option: "1" | "2" | "3" | "4") {
  const normalizedText = normalizeBotText(text)
  return new RegExp(`(^|\\b)${option}(\\b|$)`).test(normalizedText)
}

function matchesControlPatterns(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text))
}

export function normalizeConversationControlText(input: string) {
  return normalizeBotText(input)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function isPauseChatbotTriggerText(input: string | null | undefined) {
  if (typeof input !== "string") {
    return false
  }

  const normalizedText = normalizeConversationControlText(input)

  if (!normalizedText) {
    return false
  }

  if (CHATBOT_PAUSE_KEYWORD_REGEX.test(normalizedText)) {
    return true
  }

  return CHATBOT_PAUSE_INTENT_PATTERNS.some((pattern) => pattern.test(normalizedText))
}

export function isEndConversationIntent(input: string | null | undefined) {
  if (typeof input !== "string") {
    return false
  }

  const normalizedText = normalizeConversationControlText(input)
  return normalizedText.length > 0 && matchesControlPatterns(normalizedText, END_CONVERSATION_PATTERNS)
}

export function isBackToMenuIntent(input: string | null | undefined) {
  if (typeof input !== "string") {
    return false
  }

  const normalizedText = normalizeConversationControlText(input)
  return normalizedText.length > 0 && matchesControlPatterns(normalizedText, BACK_TO_MENU_PATTERNS)
}

export function isBackOneStepIntent(input: string | null | undefined) {
  if (typeof input !== "string") {
    return false
  }

  const normalizedText = normalizeConversationControlText(input)
  return normalizedText.length > 0 && matchesControlPatterns(normalizedText, BACK_ONE_STEP_PATTERNS)
}

export function getWelcomeMenuText() {
  return WELCOME_MENU_TEXT
}

export function isConversationStateEligibleForTimeout(state: ConversationState) {
  return TIMEOUT_ELIGIBLE_STATES.has(state)
}

export function hasConversationFlowTimedOut(params: {
  state: ConversationState
  lastInteractionAt: Date | null | undefined
  now: Date
}) {
  if (!isConversationStateEligibleForTimeout(params.state) || !params.lastInteractionAt) {
    return false
  }

  return params.now.getTime() - params.lastInteractionAt.getTime() >= BOT_INACTIVITY_TIMEOUT_MS
}

function isSchedulingIntent(text: string) {
  return (
    matchesMenuOption(text, "1") ||
    matchesAny(text, [
      "quero agendar",
      "agendar",
      "agendamento",
      "marcar horario",
      "marcar",
      "reservar horario",
    ])
  )
}

function isAppointmentsIntent(text: string) {
  return (
    matchesMenuOption(text, "2") ||
    matchesAny(text, [
      "meus agendamentos",
      "meu agendamento",
      "agendamentos",
      "agendamento",
      "desmarcar",
      "remarcar",
      "reagendar",
      "cancelar agendamento",
      "cancelar horario",
      "alterar horario",
    ])
  )
}

function isServicePricesIntent(text: string) {
  return (
    matchesMenuOption(text, "3") ||
    matchesAny(text, [
      "preco",
      "precos",
      "valor",
      "valores",
      "preco dos servicos",
      "precos dos servicos",
      "quanto custa",
      "quanto fica",
      "tabela de precos",
    ])
  )
}

function isMoreServicePricesIntent(text: string) {
  return matchesAny(text, [
    "mais",
    "mais opcoes",
    "mais precos",
    "ver mais",
    "proximos precos",
  ])
}

function isCancelAppointmentChoice(text: string) {
  return matchesMenuOption(text, "1") || matchesAny(text, ["desmarcar", "cancelar", "cancelar agendamento"])
}

function isRescheduleAppointmentChoice(text: string) {
  return (
    matchesMenuOption(text, "2") ||
    matchesAny(text, ["remarcar", "reagendar", "alterar horario", "mudar horario"])
  )
}

function isInfoIntent(text: string) {
  return (
    matchesMenuOption(text, "4") ||
    matchesAny(text, [
      "informacao",
      "informacoes",
      "horario de atendimento",
      "horario",
      "horarios",
      "horarios de atendimento",
      "funcionamento",
      "endereco",
      "localizacao",
      "telefone",
      "whatsapp",
      "contato",
      "contatos",
      "onde fica",
      "informacoes de atendimento",
    ])
  )
}

function isGreeting(text: string) {
  return matchesAny(text, [
    "oi",
    "ola",
    "bom dia",
    "boa tarde",
    "boa noite",
    "opa",
    "e ai",
    "tudo bem",
  ])
}

function buildStartSchedulingActions(): BotAction[] {
  return [
    {
      type: "PATCH_CONTEXT",
      context: {
        mainMenuShown: false,
        priceListPage: null,
        appointmentOptions: null,
        selectedAppointmentId: null,
        selectedAppointmentLabel: null,
        rescheduleAppointmentId: null,
        timeSlotSuggestions: null,
        dateOptions: null,
        selectedDateKey: null,
        selectedDateLabel: null,
        timeSelectionStage: null,
        dateOptionPage: null,
        timeSlotPage: null,
      },
    },
    { type: "ENSURE_DRAFT" },
    { type: "SET_STATE", state: "CHOOSING_SERVICE" },
    { type: "SHOW_SERVICE_SELECTION" },
  ]
}

export function handleIncomingMessage(params: {
  state: ConversationState
  text: string | null
  context?: BotConversationContext | null
}): BotResult {
  if (params.state === "PAUSED") {
    return {
      actions: [],
    }
  }

  const text = (params.text ?? "").trim()
  const mainMenuShown = params.context?.mainMenuShown === true

  if (!text) {
    return {
      actions: [
        {
          type: "REPLY_TEXT",
          text: "Pode me mandar uma mensagem com o que você precisa?",
        },
      ],
    }
  }

  if (params.state === "CHOOSING_SERVICE") {
    return {
      actions: [
        { type: "ENSURE_DRAFT" },
        { type: "SELECT_SERVICE_FROM_TEXT", text },
        { type: "RESOLVE_STAFF_FOR_DRAFT" },
      ],
    }
  }

  if (params.state === "CHOOSING_APPOINTMENT") {
    return {
      actions: [{ type: "SELECT_EXISTING_APPOINTMENT", text }],
    }
  }

  if (params.state === "CHOOSING_APPOINTMENT_ACTION") {
    if (isCancelAppointmentChoice(text)) {
      return {
        actions: [
          { type: "SET_STATE", state: "CONFIRMING_APPOINTMENT_CANCELLATION" },
          { type: "SHOW_APPOINTMENT_CANCELLATION_CONFIRMATION" },
        ],
      }
    }

    if (isRescheduleAppointmentChoice(text)) {
      return {
        actions: [
          { type: "ENSURE_DRAFT" },
          { type: "PREPARE_RESCHEDULE_FROM_SELECTED_APPOINTMENT" },
        ],
      }
    }

    return {
      actions: [{ type: "SHOW_APPOINTMENT_ACTION" }],
    }
  }

  if (params.state === "CHOOSING_STAFF") {
    return {
      actions: [
        { type: "ENSURE_DRAFT" },
        { type: "SELECT_STAFF_FROM_TEXT", text },
      ],
    }
  }

  if (params.state === "CHOOSING_TIME") {
    if (params.context?.timeSelectionStage === "DAY") {
      return {
        actions: [
          { type: "ENSURE_DRAFT" },
          { type: "SELECT_DAY_FROM_TEXT", text },
        ],
      }
    }

    return {
      actions: [
        { type: "ENSURE_DRAFT" },
        { type: "SELECT_TIME_INPUT", text },
      ],
    }
  }

  if (params.state === "CONFIRMING") {
    if (matchesAny(text, ["sim", "confirmo", "confirmar", "pode confirmar", "ok"])) {
      return {
        actions: [
          { type: "ENSURE_DRAFT" },
          params.context?.rescheduleAppointmentId
            ? { type: "RESCHEDULE_APPOINTMENT_FROM_DRAFT" }
            : { type: "CREATE_APPOINTMENT_FROM_DRAFT" },
          { type: "SET_STATE", state: "IDLE" },
        ],
      }
    }

    if (matchesAny(text, ["nao", "cancelar", "mudar horario", "outro horario", "escolher outro"])) {
      return {
        actions: [
          { type: "ENSURE_DRAFT" },
          { type: "CLEAR_DRAFT_DATETIME" },
          {
            type: "PATCH_CONTEXT",
            context: {
              timeSelectionStage: "TIME",
              timeSlotPage: 0,
            },
          },
          { type: "SET_STATE", state: "CHOOSING_TIME" },
          { type: "SHOW_TIME_SELECTION" },
        ],
      }
    }

    return {
      actions: [{ type: "SHOW_BOOKING_CONFIRMATION" }],
    }
  }

  if (params.state === "CONFIRMING_APPOINTMENT_CANCELLATION") {
    if (matchesAny(text, ["sim", "confirmo", "confirmar", "pode confirmar", "ok"])) {
      return {
        actions: [
          { type: "CANCEL_SELECTED_APPOINTMENT" },
          { type: "SET_STATE", state: "IDLE" },
        ],
      }
    }

    if (matchesAny(text, ["nao", "voltar", "cancelar"])) {
      return {
        actions: [
          { type: "SET_STATE", state: "CHOOSING_APPOINTMENT_ACTION" },
          { type: "SHOW_APPOINTMENT_ACTION" },
        ],
      }
    }

    return {
      actions: [{ type: "SHOW_APPOINTMENT_CANCELLATION_CONFIRMATION" }],
    }
  }

  if (
    params.state === "IDLE" &&
    typeof params.context?.priceListPage === "number" &&
    isMoreServicePricesIntent(text)
  ) {
    return {
      actions: [{ type: "SHOW_SERVICE_PRICES_PAGE", page: params.context.priceListPage + 1 }],
    }
  }

  if (isSchedulingIntent(text)) {
    return {
      actions: buildStartSchedulingActions(),
    }
  }

  if (isAppointmentsIntent(text)) {
    return {
      actions: [
        {
          type: "PATCH_CONTEXT",
          context: {
            mainMenuShown: false,
            priceListPage: null,
            appointmentOptions: null,
            selectedAppointmentId: null,
            selectedAppointmentLabel: null,
            rescheduleAppointmentId: null,
            timeSlotSuggestions: null,
            dateOptions: null,
            selectedDateKey: null,
            selectedDateLabel: null,
            timeSelectionStage: null,
            dateOptionPage: null,
            timeSlotPage: null,
          },
        },
        { type: "LIST_FUTURE_APPOINTMENTS" },
      ],
    }
  }

  if (isServicePricesIntent(text)) {
    return {
      actions: [
        {
          type: "PATCH_CONTEXT",
          context: {
            mainMenuShown: false,
            priceListPage: 0,
            appointmentOptions: null,
            selectedAppointmentId: null,
            selectedAppointmentLabel: null,
            rescheduleAppointmentId: null,
            timeSlotSuggestions: null,
            dateOptions: null,
            selectedDateKey: null,
            selectedDateLabel: null,
            timeSelectionStage: null,
            dateOptionPage: null,
            timeSlotPage: null,
          },
        },
        { type: "SHOW_SERVICE_PRICES_PAGE", page: 0 },
      ],
    }
  }

  if (isInfoIntent(text)) {
    return {
      actions: [
        { type: "PATCH_CONTEXT", context: { mainMenuShown: false, priceListPage: null } },
        { type: "REPLY_STORE_INFO" },
      ],
    }
  }

  if (!mainMenuShown) {
    return {
      actions: [
        { type: "PATCH_CONTEXT", context: { mainMenuShown: true, priceListPage: null } },
        { type: "SHOW_MAIN_MENU" },
      ],
    }
  }

  if (isGreeting(text)) {
    return {
      actions: [{ type: "SHOW_MAIN_MENU" }],
    }
  }

  return {
    actions: [{ type: "SHOW_MAIN_MENU" }],
  }
}
