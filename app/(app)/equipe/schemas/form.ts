import { z } from "zod"

const FormSchema = z.object({
  userId: z.string().min(1, "Selecione um usuário"),
  serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
})

export default FormSchema