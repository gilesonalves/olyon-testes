import { z } from "zod"

export const createStoreSchema = z
  .object({
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Informe o nome da loja")),

    ownerName: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Informe o nome do dono")),

    ownerEmail: z
      .string()
      .transform((s) => s.trim().toLowerCase())
      .pipe(z.string().email("Informe um e-mail válido")),

    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a senha"),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas não conferem",
      })
    }
  })