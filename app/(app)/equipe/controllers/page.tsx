"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import FormSchema from "../schemas/form"

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

const Controllers = () => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: "",
      serviceIds: [],
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setSubmitting(true)

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          serviceIds: data.serviceIds,
          extraTypes: [], // opcional no futuro
        }),
      })

      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao salvar profissional." : json.error)
        return
      }

      toast.success("Profissional adicionado à equipe!")
      router.push("/equipe")
      router.refresh()
    } catch {
      toast.error("Erro ao salvar profissional.")
    } finally {
      setSubmitting(false)
    }
  }

  return { form, onSubmit, submitting }
}

export default Controllers