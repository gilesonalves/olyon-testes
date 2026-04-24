"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import {
  createServiceFormSchema,
  type CreateServiceFormValues,
} from "../schemas"

type Service = {
  id: string
  name: string
  description: string | null
  durationMin: number
  price: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

type ServiceUpdatePayload = {
  name?: string
  durationMin?: number
  description?: string | null
  price?: number
  active?: boolean
}

type ApiOk<T> = { ok: true; data: T }
type ApiErr = { ok: false; error: string }
type ApiResp<T> = ApiOk<T> | ApiErr

export const Controller = () => {
  const form = useForm<CreateServiceFormValues>({
    resolver:
      zodResolver(createServiceFormSchema) as unknown as Resolver<CreateServiceFormValues>,
    defaultValues: {
      name: "",
      durationMin: 30,
      price: undefined,
      description: null,
    },
  })

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const loadServices = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/services")
      const json = (await res.json()) as ApiResp<Service[]>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao carregar serviços." : json.error)
        setServices([])
        return
      }

      setServices(json.data)
    } catch {
      toast.error("Falha ao carregar serviços.")
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadServices()
  }, [])

  const onSubmit: SubmitHandler<CreateServiceFormValues> = async (data) => {
    try {
      const payload = {
        name: data.name,
        durationMin: Number(data.durationMin),
        price: Number(data.price),
        description: data.description ?? null,
      }

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = (await res.json()) as ApiResp<Service>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao criar serviço." : json.error)
        return
      }

      toast.success("Serviço criado com sucesso!", { position: "bottom-right" })
      form.reset({ name: "", durationMin: 30, price: undefined, description: null })
      await loadServices()
    } catch {
      toast.error("Falha ao criar serviço.")
    }
  }

  const updateService = async (id: string, data: ServiceUpdatePayload) => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = (await res.json()) as ApiResp<Service>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao atualizar serviço." : json.error)
        return false
      }

      toast.success("Serviço atualizado!")
      await loadServices()
      return true
    } catch {
      toast.error("Falha ao atualizar serviço.")
      return false
    }
  }

  const deleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" })
      const json = (await res.json()) as ApiResp<{ id: string }>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao excluir serviço." : json.error)
        return false
      }

      toast.success("Serviço excluído!")
      await loadServices()
      return true
    } catch {
      toast.error("Falha ao excluir serviço.")
      return false
    }
  }

  const state = useMemo(
    () => ({ services, loading, reload: loadServices }),
    [services, loading]
  )

  return { form, onSubmit, state, updateService, deleteService }
}
