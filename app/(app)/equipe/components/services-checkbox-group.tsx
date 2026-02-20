"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type ServicesCheckboxGroupProps = {
  value: string[]
  onChange: (value: string[]) => void
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

type ServiceRow = {
  id: string
  name: string
  durationMin: number
  active: boolean
}

export function ServicesCheckboxGroup({ value, onChange }: ServicesCheckboxGroupProps) {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)

  const toggleService = (serviceId: string) => {
    if (value.includes(serviceId)) {
      onChange(value.filter((item) => item !== serviceId))
    } else {
      onChange([...value, serviceId])
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/services", { cache: "no-store" })
        const json = (await res.json()) as ApiResponse<ServiceRow[]>

        if (!res.ok || !json.ok) {
          toast.error(json.ok ? "Falha ao carregar serviços." : json.error)
          if (!cancelled) setServices([])
          return
        }

        const data = (json.data ?? []).filter((s) => s.active !== false)
        if (!cancelled) setServices(data)
      } catch {
        toast.error("Erro ao carregar serviços.")
        if (!cancelled) setServices([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="mt-6">Carregando serviços...</div>
  }

  if (services.length === 0) {
    return <div className="mt-6">Nenhum serviço ativo encontrado.</div>
  }

  return (
    <div className="flex flex-wrap gap-6 mt-6">
      {services.map((service) => (
        <div key={service.id} className="flex items-center gap-3">
          <Checkbox
            id={service.id}
            checked={value.includes(service.id)}
            onCheckedChange={() => toggleService(service.id)}
          />
          <Label htmlFor={service.id}>
            {service.name} <span className="text-xs text-muted-foreground">({service.durationMin}min)</span>
          </Label>
        </div>
      ))}
    </div>
  )
}