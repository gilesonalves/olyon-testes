import * as z from "zod"

export const formSchema = z.object({
  email: z.string().email("Digite um e-mail válido"),
  password: z.string("Digite a senha").min(6, "A senha deve ter pelo menos 6 caracteres"),
})