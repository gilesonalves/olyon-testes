import * as z from "zod"

import { isValidCPF } from "@/lib/utils/maskCpf"

export const clientFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Digite um email válido",
    }),
  cpf: z
    .string()
    .optional()
    .refine((value) => !value || isValidCPF(value), {
      message: "CPF inválido",
    }),
  phone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  gender: z
    .object({
      _id: z.string(),
      value: z.string(),
    })
    .nullable(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type ClientFormValues = z.input<typeof clientFormSchema>
