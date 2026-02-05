import { isValidCPF } from "@/lib/utils/maskCpf"
import * as z from "zod"

export const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Digite um email válido"),
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
  contacts: z.array(
    z.object({
      name: z.string().min(1, "Nome do contato é obrigatório"),
      phone: z.string().min(1, "Telefone do contato é obrigatório"),
      relationship: z.string().min(1, "Relação é obrigatória"),
    })
  ),
})
