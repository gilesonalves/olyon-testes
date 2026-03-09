// src/lib/bot/types.ts

export type BotAction =
  | { type: "REPLY_TEXT"; text: string }
  | { type: "SET_STATE"; state: "IDLE" | "CHOOSING_SERVICE" | "CHOOSING_TIME" | "CONFIRMING" }
  | { type: "ENSURE_DRAFT" }
  | { type: "SELECT_SERVICE_FROM_TEXT"; text: string };

export type BotResult = {
  actions: BotAction[];
};