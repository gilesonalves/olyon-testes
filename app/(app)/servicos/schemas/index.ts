import * as z from "zod"

const servicePriceValueSchema = z.coerce
  .number({
    error: "O preço é obrigatório",
  })
  .refine((value) => Number.isFinite(value), {
    message: "Informe um preço válido",
  })
  .positive("Informe um preço maior que zero")
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
    message: "Informe um preço com no máximo 2 casas decimais",
  })

const requiredPriceInputSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }

  return value
}, servicePriceValueSchema)

const optionalPriceInputSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }

  return value
}, servicePriceValueSchema.optional())

const baseServiceFormFields = {
  name: z.string().trim().min(1, "O nome é obrigatório"),
  durationMin: z.coerce.number().int().min(1, "A duração é obrigatória"),
  description: z.string().trim().optional().nullable(),
} satisfies Record<string, z.ZodType>

export const createServiceFormSchema = z.object({
  ...baseServiceFormFields,
  price: requiredPriceInputSchema,
})

export const updateServiceFormSchema = z.object({
  ...baseServiceFormFields,
  price: optionalPriceInputSchema,
})

export type CreateServiceFormValues = z.infer<typeof createServiceFormSchema>
export type UpdateServiceFormValues = z.infer<typeof updateServiceFormSchema>
