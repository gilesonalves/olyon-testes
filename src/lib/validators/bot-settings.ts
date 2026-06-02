import { z } from "zod"
import { DEFAULT_BOT_SETTINGS } from "@/lib/bot/settings"

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined
  }

  return value
}

const optionalMessageSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().max(1000, "A mensagem deve ter no maximo 1000 caracteres.").optional()
)

export const botSettingsSchema = z.object({
  welcomeMessage: optionalMessageSchema.default(DEFAULT_BOT_SETTINGS.welcomeMessage),
  showMenuAfterWelcome: z
    .boolean()
    .default(DEFAULT_BOT_SETTINGS.showMenuAfterWelcome),
  humanHandoffMessage: optionalMessageSchema.default(
    DEFAULT_BOT_SETTINGS.humanHandoffMessage
  ),
  customerRequestedHumanMessage: optionalMessageSchema.default(
    DEFAULT_BOT_SETTINGS.customerRequestedHumanMessage
  ),
  autoResumeEnabled: z.boolean().default(DEFAULT_BOT_SETTINGS.autoResumeEnabled),
  autoResumeAfterMinutes: z.coerce
    .number()
    .int("Informe um numero inteiro de minutos.")
    .min(5, "O retorno automatico deve ser de pelo menos 5 minutos.")
    .max(1440, "O retorno automatico deve ser de no maximo 1440 minutos.")
    .default(DEFAULT_BOT_SETTINGS.autoResumeAfterMinutes),
})

export type BotSettingsFormValues = z.infer<typeof botSettingsSchema>
