import { z } from "zod"

const FormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  
})

export default FormSchema