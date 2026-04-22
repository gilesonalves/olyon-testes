import { z } from "zod"

import { isValidCPF } from "@/lib/utils/maskCpf"

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

const OptionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().email("Email inválido").optional()
)

const OptionalCpfSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .refine((value) => isValidCPF(value), { message: "CPF inválido" })
    .optional()
)

const OptionalStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().optional()
)

const GenderSchema = z
  .object({
    _id: z.string(),
    value: z.string(),
  })
  .nullable()
  .optional()

export const ClientCreateApiSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  email: OptionalEmailSchema,
  cpf: OptionalCpfSchema,
  phone: OptionalStringSchema,
  secondaryPhone: OptionalStringSchema,
  gender: GenderSchema,
  birthDate: OptionalStringSchema,
  notes: OptionalStringSchema,
  isActive: z.boolean().default(true),
})

export const ClientUpdateApiSchema = z
  .object({
    name: z.string().trim().min(2, "Nome inválido").optional(),
    email: OptionalEmailSchema,
    cpf: OptionalCpfSchema,
    phone: OptionalStringSchema,
    secondaryPhone: OptionalStringSchema,
    gender: GenderSchema,
    birthDate: OptionalStringSchema,
    notes: OptionalStringSchema,
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nada para atualizar",
  })
