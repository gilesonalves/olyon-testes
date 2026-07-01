import { z } from "zod"

export const updateStoreOwnerSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Informe o nome do proprietário.")),
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().email("Informe um e-mail válido.")),
})

export const resetStoreOwnerPasswordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme a nova senha."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  })

export type UpdateStoreOwnerInput = z.infer<typeof updateStoreOwnerSchema>
export type ResetStoreOwnerPasswordInput = z.infer<
  typeof resetStoreOwnerPasswordSchema
>

export type StoreOwnerData = {
  userId: string
  name: string
  email: string
  role: "OWNER"
}
