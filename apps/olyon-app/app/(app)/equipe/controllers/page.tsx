import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import z from "zod"
import FormSchema from "../schemas/form"
import { toast } from "sonner"

const Controllers = () => {
    const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      services: [],
    },
  })

  function onSubmit() {
  toast("Equipe salva com sucesso!", {
    position: "bottom-right",
  })
}

  return {form, onSubmit}
} 

export default Controllers