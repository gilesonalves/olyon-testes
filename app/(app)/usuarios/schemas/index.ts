import { isValidCPF } from "@/lib/utils/maskCpf"
import * as z from "zod"

/**
 * Campos comuns (válidos tanto pra create quanto pra edit)
 */
export const userFormBaseSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "STAFF"]).default("STAFF"),

  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().min(1, "Email é obrigatório").email("Digite um email válido"),

  gender: z
    .object({
      _id: z.string(),
      value: z.string(),
    })
    .nullable(),

  birthDate: z.string().min(1, "Informe a data de nascimento"),

  cpf: z
    .string()
    .optional()
    .refine((value) => !value || isValidCPF(value), {
      message: "CPF inválido",
    }),

  phone: z.string().min(1, "Informe o telefone"),
  secondaryPhone: z.string().optional(),

  zipcode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),

  contacts: z
    .array(
      z.object({
        name: z.string().min(1, "Nome do contato é obrigatório"),
        phone: z.string().min(1, "Telefone do contato é obrigatório"),
        relationship: z.string().min(1, "Relação é obrigatória"),
      })
    )
    .default([]),
})

/**
 * CREATE: senha obrigatória
 */
export const userFormCreateSchema = userFormBaseSchema.extend({
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
})

/**
 * EDIT: senha opcional (aceita string vazia)
 */
export const userFormEditSchema = userFormBaseSchema.extend({
  password: z.string().optional().or(z.literal("")),
})

export type UserCreateFormValues = z.input<typeof userFormCreateSchema>
export type UserEditFormValues = z.input<typeof userFormEditSchema>
export type UserFormValues = UserCreateFormValues | UserEditFormValues