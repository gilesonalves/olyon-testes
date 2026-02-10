import * as z from "zod"

export const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  durationMin: z.number().int().min(1, "A duração é obrigatória"),
  description: z.string(),
})
