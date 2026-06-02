import { z } from "zod"

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined
  }

  return value
}

export const whatsappConversationListQuerySchema = z.object({
  q: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .trim()
      .max(120, "A busca deve ter no maximo 120 caracteres.")
      .optional()
  ),
  limit: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(100).default(30)
  ),
})

export const whatsappConversationMessagesQuerySchema = z.object({
  limit: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(200).default(100)
  ),
})

export const whatsappSendManualMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Digite uma mensagem.")
    .max(1000, "A mensagem deve ter no maximo 1000 caracteres."),
})

