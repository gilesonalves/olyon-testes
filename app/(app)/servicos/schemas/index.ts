import * as z from "zod"

export const formSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório"),
  durationMin: z.coerce.number().int().min(1, "A duração é obrigatória"),
  description: z.string().trim().optional().nullable(),
})

export type FormValues = z.infer<typeof formSchema>
