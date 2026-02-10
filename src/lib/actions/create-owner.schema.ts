import { z } from "zod"

export const createOwnerSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Informe o nome")),
  email: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.string().email("Informe um email valido")),
})
