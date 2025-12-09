import * as z from "zod"

export const formSchema = z.object({
  category: z.string().min(1, "Selecione uma categoria"),
  value: z.string().min(1, "Digite um valor"),
  observation: z.string().optional(),
})
