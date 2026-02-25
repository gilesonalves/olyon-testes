import { z } from "zod"

export const EventCreateSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  description: z.string().optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
})

export const EventUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    serviceIds: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nada para atualizar",
  })

export type EventCreateInput = z.infer<typeof EventCreateSchema>
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>