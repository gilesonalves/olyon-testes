"use client"

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useEffect, useMemo, useState } from "react"

type Horario = {
  horaInicial: string
  horaFinal: string
}

const ROW_LAYOUT =
  "flex flex-col gap-3 sm:grid sm:grid-cols-[40px_96px_96px_16px_96px_28px] sm:items-center"

export type HorariosDayValue = {
  enabled: boolean
  horarios: Horario[]
}

type HorariosProps = {
  title: string
  value: HorariosDayValue
  onChange: (next: HorariosDayValue) => void

  disabledByBlock?: boolean
  blockedIntervals?: Array<{ startTime: string; endTime: string; date?: string }>
}

export default function Horarios({
  title,
  value,
  onChange,
  disabledByBlock = false,
  blockedIntervals,
}: HorariosProps) {
  const [horaInicial, setHoraInicial] = useState("")
  const [horaFinal, setHoraFinal] = useState("")

  const blockedIntervalsCount = blockedIntervals?.length ?? 0
  const switchId = useMemo(
    () => `habilitar-${title}`.replace(/\s+/g, "-").toLowerCase(),
    [title]
  )

  // se o dia está bloqueado "allDay", força disabled no weekly
  useEffect(() => {
    if (disabledByBlock && value.enabled) {
      onChange({ ...value, enabled: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledByBlock])

  function addHorario() {
    if (!value.enabled) {
      toast.error("Ative o dia para adicionar horários")
      return
    }

    if (!horaInicial || !horaFinal) {
      toast.error("Selecione horário inicial e final")
      return
    }

    if (horaInicial >= horaFinal) {
      toast.error("O horário final deve ser maior que o inicial")
      return
    }

    onChange({
      ...value,
      horarios: [...value.horarios, { horaInicial, horaFinal }],
    })

    setHoraInicial("")
    setHoraFinal("")
  }

  function handleChangeHorario(index: number, field: keyof Horario, nextValue: string) {
    onChange({
      ...value,
      horarios: value.horarios.map((h, i) => (i === index ? { ...h, [field]: nextValue } : h)),
    })
  }

  function handleRemoveHorario(index: number) {
    onChange({
      ...value,
      horarios: value.horarios.filter((_, i) => i !== index),
    })
  }

  const inputsDisabled = disabledByBlock || !value.enabled

  return (
    <div className="space-y-3" data-blocked-intervals={blockedIntervalsCount}>
      {/* Linha principal */}
      <div className={ROW_LAYOUT}>
        <div className="flex items-center gap-3 sm:contents">
          <Switch
            id={switchId}
            checked={value.enabled}
            onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
            disabled={disabledByBlock}
          />
          <span className="text-sm sm:hidden">{title}</span>
        </div>

        <span className="hidden text-sm sm:block">{title}</span>

        <div className="flex items-center gap-2 sm:contents">
          <Input
            type="time"
            step={1800}
            value={horaInicial}
            onChange={(e) => setHoraInicial(e.target.value)}
            disabled={inputsDisabled}
            className="h-9 flex-1 sm:w-24"
          />

          <span className="w-3 text-center sm:w-auto">-</span>

          <Input
            type="time"
            step={1800}
            value={horaFinal}
            onChange={(e) => setHoraFinal(e.target.value)}
            disabled={inputsDisabled}
            className="h-9 flex-1 sm:w-24"
          />

          <button
            type="button"
            onClick={addHorario}
            disabled={inputsDisabled}
            className="flex h-9 w-10 shrink-0 items-center justify-center rounded border hover:bg-gray-100 disabled:opacity-40 sm:h-auto sm:w-auto sm:border-0 sm:p-1"
          >
            +
          </button>
        </div>
      </div>

      {/* Horários adicionados */}
      {value.horarios.map((horario, index) => (
        <div key={index} className={ROW_LAYOUT}>
          <div className="hidden sm:block" />
          <div className="hidden sm:block" />

          <div className="flex items-center gap-2 sm:contents">
            <Input
              disabled={inputsDisabled}
              type="time"
              step={1800}
              value={horario.horaInicial}
              onChange={(e) => handleChangeHorario(index, "horaInicial", e.target.value)}
              className="h-9 flex-1 sm:w-24"
            />

            <span className="w-3 text-center sm:w-auto">-</span>

            <Input
              disabled={inputsDisabled}
              type="time"
              step={1800}
              value={horario.horaFinal}
              onChange={(e) => handleChangeHorario(index, "horaFinal", e.target.value)}
              className="h-9 flex-1 sm:w-24"
            />

            <button
              type="button"
              onClick={() => handleRemoveHorario(index)}
              disabled={inputsDisabled}
              className="flex h-9 w-10 shrink-0 items-center justify-center rounded border hover:bg-gray-100 disabled:opacity-40 sm:h-auto sm:w-auto sm:border-0 sm:p-1"
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}