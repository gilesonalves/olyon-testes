"use client"
import { useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ServiceOption = {
  id: string
  name: string
  durationMin: number
}

type SelectedService = {
  serviceId: string
  name: string
  durationMin: number
}

const ALL_SERVICES: ServiceOption[] = [
  { id: "corte-10", name: "Corte de cabelo", durationMin: 10 },
  { id: "corte-30", name: "Corte de cabelo", durationMin: 30 },
  { id: "barba-40", name: "Barba", durationMin: 40 },
]

export default function Servicos({ title }: { title: string }) {

  const [pickerValue, setPickerValue] = useState<string>("")


  const [services, setServices] = useState<SelectedService[]>([])

  const serviceMap = useMemo(() => {
    const m = new Map<string, ServiceOption>()
    ALL_SERVICES.forEach((s) => m.set(s.id, s))
    return m
  }, [])

  function addServiceById(id: string) {
    const svc = serviceMap.get(id)
    if (!svc) return

    setServices((prev) => {
      if (prev.some((p) => p.serviceId === svc.id)) return prev
      return [...prev, { serviceId: svc.id, name: svc.name, durationMin: svc.durationMin }]
    })


    setPickerValue("")
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-900">{title}</label>

      <Select
        value={pickerValue}
        onValueChange={(value) => addServiceById(value)}
      >
        <SelectTrigger className="h-10 w-full justify-between rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
          <SelectValue placeholder="Selecione um serviço" />
        </SelectTrigger>

        <SelectContent position="popper" className="max-h-72">
          {ALL_SERVICES.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} - {s.durationMin}min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-hidden rounded-lg border bg-white">
        {services.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">Nenhum serviço adicionado.</div>
        ) : (
          <div className="divide-y">
            {services.map((s, index) => (
              <div key={`${s.serviceId}-${index}`} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">{s.name}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {s.durationMin}min
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="cursor-pointer"
                  aria-label="Remover"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66406 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.33594 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12.6693 4V13.3333C12.6693 13.687 12.5288 14.0261 12.2787 14.2761C12.0287 14.5262 11.6896 14.6667 11.3359 14.6667H4.66927C4.31565 14.6667 3.97651 14.5262 3.72646 14.2761C3.47641 14.0261 3.33594 13.687 3.33594 13.3333V4" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 4H14" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.33594 4.0026V2.66927C5.33594 2.31565 5.47641 1.97651 5.72646 1.72646C5.97651 1.47641 6.31565 1.33594 6.66927 1.33594H9.33594C9.68956 1.33594 10.0287 1.47641 10.2787 1.72646C10.5288 1.97651 10.6693 2.31565 10.6693 2.66927V4.0026" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
