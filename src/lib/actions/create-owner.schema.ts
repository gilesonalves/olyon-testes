import { z } from "zod"

export const createOwnerSchema = z
  .object({
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Informe o nome")),
    email: z
      .string()
      .transform((s) => s.trim().toLowerCase())
      .pipe(z.string().email("Informe um email valido")),
    password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao conferem",
  })