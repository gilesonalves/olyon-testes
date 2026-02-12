import { z } from "zod"

export const createStoreSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Informe o nome da loja")),
})
