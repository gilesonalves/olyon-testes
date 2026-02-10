import { z } from "zod"

const FormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  services: z
    .array(z.string())
    .min(1, "Selecione pelo menos um serviço"),
})

export default FormSchema