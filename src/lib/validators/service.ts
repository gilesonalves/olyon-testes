import { z } from "zod"

const ServicePriceValueSchema = z.coerce
  .number({
    error: "Informe um preço válido",
  })
  .refine((value) => Number.isFinite(value), {
    message: "Informe um preço válido",
  })
  .positive("Informe um preço maior que zero")
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
    message: "Informe um preço com no máximo 2 casas decimais",
  })

const ServicePriceSchema = z.preprocess((value) => {
  if (value === "" || value === null) {
    return undefined
  }

  return value
}, ServicePriceValueSchema)

const ServiceBaseFields = {
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  durationMin: z.coerce.number().int().min(5).max(1440),
  active: z.boolean().default(true).optional(),
} satisfies Record<string, z.ZodType>

export const ServiceCreateSchema = z.object({
  ...ServiceBaseFields,
  price: ServicePriceSchema,
})

export const ServiceUpdateSchema = z
  .object({
    name: ServiceBaseFields.name.optional(),
    description: ServiceBaseFields.description.optional(),
    durationMin: ServiceBaseFields.durationMin.optional(),
    price: ServicePriceSchema.optional(),
    active: ServiceBaseFields.active.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar",
  })
