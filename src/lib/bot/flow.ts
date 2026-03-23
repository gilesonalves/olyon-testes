// src/lib/bot/flow.ts
import type { ConversationState } from "../../../generated/prisma/client"
import { normalizeBotText } from "./datetime"
import type { BotAction, BotConversationContext, BotResult } from "./types"

const WELCOME_MENU_TEXT = `Ola! Seja bem-vindo(a).
Como posso te ajudar hoje?

1. Agendar horario
2. Desmarcar ou remarcar
3. Informacoes de atendimento

Pode responder com o numero ou me escrever o que voce precisa.`

const IDLE_FALLBACK_TEXT = `Posso te ajudar com:
1. Agendar horario
2. Desmarcar ou remarcar
3. Informacoes de atendimento

Pode responder com o numero ou me escrever o que voce precisa.`

const APPOINTMENT_ACTION_MENU_TEXT = `O que voce deseja fazer?
1. Desmarcar
2. Remarcar`

function matchesAny(text: string, expressions: string[]) {
  const normalizedText = normalizeBotText(text)

  return expressions.some((expression) => {
    const normalizedExpression = normalizeBotText(expression)
    const escapedExpression = normalizedExpression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(^|\\b)${escapedExpression}(\\b|$)`).test(normalizedText)
  })
}

function matchesMenuOption(text: string, option: "1" | "2" | "3") {
  const normalizedText = normalizeBotText(text)
  return new RegExp(`(^|\\b)${option}(\\b|$)`).test(normalizedText)
}

function isStandaloneNumericChoice(text: string) {
  return /^\d{1,2}$/.test(normalizeBotText(text))
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

function isRescheduleIntent(text: string) {
  return (
    matchesMenuOption(text, "2") ||
    matchesAny(text, [
      "desmarcar",
      "remarcar",
      "reagendar",
      "cancelar agendamento",
      "cancelar horario",
      "alterar horario",
    ])
  )
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
    matchesMenuOption(text, "3") ||
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
        appointmentOptions: null,
        selectedAppointmentId: null,
        selectedAppointmentLabel: null,
        rescheduleAppointmentId: null,
        timeSlotSuggestions: null,
      },
    },
    { type: "ENSURE_DRAFT" },
    { type: "SET_STATE", state: "CHOOSING_SERVICE" },
    {
      type: "REPLY_TEXT",
      text: "Perfeito! Qual servico voce quer agendar? (ex: unha, cabelo e barba)",
    },
  ]
}

function buildAppointmentActionPrompt(label?: string | null) {
  if (!label) {
    return APPOINTMENT_ACTION_MENU_TEXT
  }

  return `Agendamento selecionado:\n${label}\n\n${APPOINTMENT_ACTION_MENU_TEXT}`
}

export function handleIncomingMessage(params: {
  state: ConversationState
  text: string | null
  context?: BotConversationContext | null
}): BotResult {
  const text = (params.text ?? "").trim()
  const mainMenuShown = params.context?.mainMenuShown === true

  if (!text) {
    return {
      actions: [
        {
          type: "REPLY_TEXT",
          text: "Pode me mandar uma mensagem com o que voce precisa?",
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
          {
            type: "REPLY_TEXT",
            text: params.context?.selectedAppointmentLabel
              ? `Tem certeza que deseja desmarcar ${params.context.selectedAppointmentLabel}? Responda SIM para confirmar ou NAO para voltar.`
              : "Tem certeza que deseja desmarcar este agendamento? Responda SIM para confirmar ou NAO para voltar.",
          },
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
      actions: [
        {
          type: "REPLY_TEXT",
          text: buildAppointmentActionPrompt(params.context?.selectedAppointmentLabel),
        },
      ],
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
    if (isStandaloneNumericChoice(text)) {
      return {
        actions: [
          { type: "ENSURE_DRAFT" },
          { type: "SELECT_SUGGESTED_SLOT", text },
          { type: "CHECK_AVAILABILITY_FOR_DRAFT" },
          { type: "SAVE_DRAFT_DATETIME" },
          { type: "SET_STATE", state: "CONFIRMING" },
        ],
      }
    }

    return {
      actions: [
        { type: "ENSURE_DRAFT" },
        { type: "PARSE_DATETIME_FROM_TEXT", text },
        { type: "CHECK_AVAILABILITY_FOR_DRAFT" },
        { type: "SAVE_DRAFT_DATETIME" },
        { type: "SET_STATE", state: "CONFIRMING" },
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
          { type: "SET_STATE", state: "CHOOSING_TIME" },
          { type: "REPLY_TEXT", text: "Sem problema. Vou manter o profissional escolhido." },
          { type: "SUGGEST_TIME_SLOTS" },
        ],
      }
    }

    return {
      actions: [
        {
          type: "REPLY_TEXT",
          text: "Responda SIM para confirmar ou NAO para escolher outro horario.",
        },
      ],
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
          {
            type: "REPLY_TEXT",
            text: buildAppointmentActionPrompt(params.context?.selectedAppointmentLabel),
          },
        ],
      }
    }

    return {
      actions: [
        {
          type: "REPLY_TEXT",
          text: "Responda SIM para confirmar o cancelamento ou NAO para voltar.",
        },
      ],
    }
  }

  if (isSchedulingIntent(text)) {
    return {
      actions: buildStartSchedulingActions(),
    }
  }

  if (isRescheduleIntent(text)) {
    return {
      actions: [
        {
          type: "PATCH_CONTEXT",
          context: {
            mainMenuShown: false,
            appointmentOptions: null,
            selectedAppointmentId: null,
            selectedAppointmentLabel: null,
            rescheduleAppointmentId: null,
            timeSlotSuggestions: null,
          },
        },
        { type: "LIST_FUTURE_APPOINTMENTS" },
      ],
    }
  }

  if (isInfoIntent(text)) {
    return {
      actions: [
        { type: "PATCH_CONTEXT", context: { mainMenuShown: false } },
        { type: "REPLY_STORE_INFO" },
      ],
    }
  }

  if (!mainMenuShown) {
    return {
      actions: [
        { type: "PATCH_CONTEXT", context: { mainMenuShown: true } },
        { type: "REPLY_TEXT", text: WELCOME_MENU_TEXT },
      ],
    }
  }

  if (isGreeting(text)) {
    return {
      actions: [{ type: "REPLY_TEXT", text: IDLE_FALLBACK_TEXT }],
    }
  }

  return {
    actions: [{ type: "REPLY_TEXT", text: IDLE_FALLBACK_TEXT }],
  }
}
