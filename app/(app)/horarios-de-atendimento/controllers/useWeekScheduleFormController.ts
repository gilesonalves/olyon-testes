"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

const weekdayEnum = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"])

const horarioSchema = z.object({
  horaInicial: z.string().min(1),
  horaFinal: z.string().min(1),
})

const diaSchema = z.object({
  weekday: weekdayEnum,
  enabled: z.boolean(),
  horarios: z.array(horarioSchema),
})

const weekSchema = z.object({
  days: z.array(diaSchema).length(7),
})

export type WeekFormValues = z.infer<typeof weekSchema>

type ApiWeekDay = {
  weekday: "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
  enabled: boolean
  intervals: { startTime: string; endTime: string }[]
}

const DEFAULT_VALUES: WeekFormValues = {
  days: [
    { weekday: "SUN", enabled: false, horarios: [] },
    { weekday: "MON", enabled: false, horarios: [] },
    { weekday: "TUE", enabled: false, horarios: [] },
    { weekday: "WED", enabled: false, horarios: [] },
    { weekday: "THU", enabled: false, horarios: [] },
    { weekday: "FRI", enabled: false, horarios: [] },
    { weekday: "SAT", enabled: false, horarios: [] },
  ],
}

function toForm(values: ApiWeekDay[]): WeekFormValues {
  return {
    days: values.map((d) => ({
      weekday: d.weekday,
      enabled: d.enabled,
      horarios: d.intervals.map((i) => ({
        horaInicial: i.startTime,
        horaFinal: i.endTime,
      })),
    })),
  }
}

function toApi(values: WeekFormValues): { days: ApiWeekDay[] } {
  return {
    days: values.days.map((d) => ({
      weekday: d.weekday,
      enabled: d.enabled,
      intervals: d.horarios.map((h) => ({
        startTime: h.horaInicial,
        endTime: h.horaFinal,
      })),
    })),
  }
}

async function fetchWeekly() {
  const res = await fetch("/api/schedule/weekly", { method: "GET" })
  const json = await res.json()
  if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Falha ao carregar horários semanais")
  return json.data.days as ApiWeekDay[]
}

async function saveWeekly(payload: { days: ApiWeekDay[] }) {
  const res = await fetch("/api/schedule/weekly", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Falha ao salvar horários semanais")
}

export function useWeekScheduleFormController() {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Como cookie é httpOnly, usamos store/current para saber se existe loja selecionada.
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeReady, setStoreReady] = useState(false)

  const form = useForm<WeekFormValues>({
    resolver: zodResolver(weekSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    let alive = true

    async function boot() {
      setInitialLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/store/current", { method: "GET" })
        const json = await res.json()

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message ?? "Falha ao obter loja atual")
        }

        const currentStoreId = json?.data?.store?.id ?? null
        if (!alive) return

        setStoreId(currentStoreId)
        setStoreReady(Boolean(currentStoreId))

        if (!currentStoreId) return

        const days = await fetchWeekly()
        if (!alive) return
        form.reset(toForm(days))
      } catch (e: unknown) {
        if (!alive) return
        setError((e as Error)?.message ?? "Erro ao carregar")
        setStoreReady(false)
      } finally {
        if (!alive) return
        setInitialLoading(false)
      }
    }

    boot()

    return () => {
      alive = false
    }
  }, [form])

  async function onSubmit(data: WeekFormValues) {
    if (!storeReady) {
      toast.error("Selecione uma loja antes de salvar.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await saveWeekly(toApi(data))
      toast.success("Horários semanais salvos!")
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? "Erro ao salvar"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return {
    storeId, // agora vem de /api/store/current (não do cookie)
    storeReady,

    form,
    onSubmit,
    loading,
    initialLoading,
    error,
  }
}