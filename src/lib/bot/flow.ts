// src/lib/bot/flow.ts
import type { ConversationState } from "../../../generated/prisma/client";
import type { BotResult } from "./types";

function includesAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
}

export function handleIncomingMessage(params: {
  state: ConversationState;
  text: string | null;
}): BotResult {
  const text = (params.text ?? "").trim();

  if (!text) {
    return {
      actions: [
        {
          type: "REPLY_TEXT",
          text: "Pode me mandar uma mensagem com o que você precisa? 🙂",
        },
      ],
    };
  }

  // Se já estamos esperando o serviço, a próxima msg vira tentativa de serviço
  if (params.state === "CHOOSING_SERVICE") {
    return {
      actions: [
        { type: "ENSURE_DRAFT" },
        { type: "SELECT_SERVICE_FROM_TEXT", text },
      ],
    };
  }

  // Gatilho para iniciar fluxo de agendamento
  if (includesAny(text, ["agendar", "marcar", "agenda"])) {
    return {
      actions: [
        { type: "ENSURE_DRAFT" },
        { type: "SET_STATE", state: "CHOOSING_SERVICE" },
        {
          type: "REPLY_TEXT",
          text: "Perfeito! Qual serviço você quer agendar? (ex: unha, cabelo e barba)",
        },
      ],
    };
  }

  // fallback
  return {
    actions: [
      { type: "REPLY_TEXT", text: "Para agendar, diga: “quero agendar” 🙂" },
    ],
  };
}