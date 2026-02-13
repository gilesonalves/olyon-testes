import { z } from "zod"

export const ServiceCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  durationMin: z.coerce.number().int().min(5).max(1440),
  active: z.boolean().default(true).optional(),
})

export const ServiceUpdateSchema = ServiceCreateSchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  {
    message: "Informe ao menos um campo para atualizar",
  }
)