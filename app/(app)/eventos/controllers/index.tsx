"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { EventCreateSchema as formSchema } from "../schemas"

type ControllerParams = {
  onCreated?: () => void
}

export const Controller = ({ onCreated }: ControllerParams = {}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", serviceIds: [] },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
  const t = toast.loading("Salvando evento...")

  try {
    // debug rápido (remova depois)
    console.log("[events] submit payload", data)

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.ok) {
      const details =
        json?.error ??
        (json?.issues ? JSON.stringify(json.issues) : null) ??
        `HTTP ${res.status}`

      toast.error(`Falha ao salvar: ${details}`, { id: t })
      return
    }

    toast.success("Evento criado com sucesso", { id: t })
    form.reset({ name: "", description: "", serviceIds: [] })
    onCreated?.()
  } catch (e) {
    toast.error("Erro ao criar evento", { id: t })
  }
}

  return { form, onSubmit }
}