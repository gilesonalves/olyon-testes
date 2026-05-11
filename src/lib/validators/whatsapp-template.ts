import { z } from "zod"

const templateTextValue = z
  .string()
  .trim()
  .min(1, "Informe o valor do placeholder")
  .max(1024, "O valor do placeholder deve ter no maximo 1024 caracteres")

const templateParameterName = z
  .string()
  .trim()
  .min(1, "Informe o nome do placeholder")
  .max(128, "O nome do placeholder deve ter no maximo 128 caracteres")

export const whatsappTemplateTestSendSchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, "Informe o destinatario de teste")
    .max(32, "O destinatario deve ter no maximo 32 caracteres"),
  templateName: z
    .string()
    .trim()
    .min(1, "Informe o nome do template")
    .max(512, "O nome do template deve ter no maximo 512 caracteres"),
  languageCode: z
    .string()
    .trim()
    .min(1, "Informe o codigo de idioma")
    .max(20, "O codigo de idioma deve ter no maximo 20 caracteres"),
  bodyParameters: z.array(templateTextValue).default([]),
  namedBodyParameters: z.record(templateParameterName, templateTextValue).optional(),
  headerParameters: z.array(templateTextValue).optional(),
  buttonParameters: z.array(templateTextValue).optional(),
})

export type WhatsAppTemplateTestSendInput = z.infer<
  typeof whatsappTemplateTestSendSchema
>
