import { z } from "zod"

function optionalMetaIdentifier(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} invalido`)
    .max(120, `${label} deve ter no maximo 120 caracteres`)
    .optional()
}

export const whatsAppEmbeddedSignupCallbackSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Informe o code retornado pela Meta.")
      .max(2000, "O code retornado pela Meta e muito longo."),
    state: z
      .string()
      .trim()
      .min(1, "state invalido")
      .max(255, "state deve ter no maximo 255 caracteres")
      .optional(),
    phoneNumberId: optionalMetaIdentifier("phoneNumberId"),
    wabaId: optionalMetaIdentifier("wabaId"),
    businessId: optionalMetaIdentifier("businessId"),
  })
  .strict()

export type WhatsAppEmbeddedSignupCallbackInput = z.infer<
  typeof whatsAppEmbeddedSignupCallbackSchema
>
