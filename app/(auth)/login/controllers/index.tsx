import { formSchema } from "../schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { signIn } from "next-auth/react"
export const Controller = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirect: true,
    callbackUrl: "/",
  })
}

  return { form, onSubmit }
}
