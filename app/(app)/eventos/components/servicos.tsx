"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type ServiceItem = { id: string; name: string; durationMin?: number; active?: boolean }

export default function Servicos({
  title,
  value,
  onChange,
}: {
  title: string
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState("")

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/services")
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.ok) {
          toast.error(json?.error ?? "Erro ao carregar serviços")
          setServices([])
          return
        }
        setServices((json.data ?? []) as ServiceItem[])
      } catch {
        toast.error("Erro ao carregar serviços")
        setServices([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])
  const selectedItems = value.map((id) => byId.get(id)).filter(Boolean) as ServiceItem[]

  function addSelected() {
    if (!selected) return
    if (value.includes(selected)) return
    onChange([...value, selected])
    setSelected("")
  }

  function remove(id: string) {
    onChange(value.filter((x) => x !== id))
  }

  return (
    <div className="space-y-3">
      

      <div className="flex gap-2">
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? "Carregando..." : "Selecione um serviço"}</option>
          {services
            .filter((s) => s.active !== false)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>

        <Button type="button" variant="secondary" onClick={addSelected} disabled={!selected}>
          Adicionar
        </Button>
      </div>

      <div className="rounded-md border">
        {selectedItems.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">Nenhum serviço selecionado.</div>
        ) : (
          <ul className="divide-y">
            {selectedItems.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>{s.name}</span>
                  {typeof s.durationMin === "number" ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{s.durationMin}min</span>
                  ) : null}
                </div>

                <button type="button" onClick={() => remove(s.id)} aria-label="Remover">
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}