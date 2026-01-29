"use client"

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useEffect, useState } from "react"

type Horario = {
    horaInicial: string
    horaFinal: string
}


const ROW_GRID =
    "grid grid-cols-[40px_96px_96px_16px_96px_28px] items-center gap-3"

type HorariosProps = {
    title: string
    disabledByBlock?: boolean
    blockedIntervals?: Array<{ startTime: string; endTime: string; date?: string }>
}

export default function Horarios({
    title,
    disabledByBlock = false,
    blockedIntervals,
}: HorariosProps) {
    const [horaInicial, setHoraInicial] = useState("")
    const [horaFinal, setHoraFinal] = useState("")
    const [horarios, setHorarios] = useState<Horario[]>([])
    const [enabled, setEnabled] = useState(false)
    const blockedIntervalsCount = blockedIntervals?.length ?? 0
    const switchId = `habilitar-${title}`.replace(/\s+/g, "-").toLowerCase()

    useEffect(() => {
        if (disabledByBlock) {
            setEnabled(false)
        }
    }, [disabledByBlock])

  
    function addHorario() {
        if (!enabled) {
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

        setHorarios((prev) => [...prev, { horaInicial, horaFinal }])
        setHoraInicial("")
        setHoraFinal("")
    }


    function handleChangeHorario(
        index: number,
        field: keyof Horario,
        value: string
    ) {
        setHorarios((prev) =>
            prev.map((h, i) =>
                i === index ? { ...h, [field]: value } : h
            )
        )
    }

    function handleRemoveHorario(index: number) {
        setHorarios((prev) => prev.filter((_, i) => i !== index))
    }

    const inputsDisabled = disabledByBlock || !enabled

    return (
        
        <div className="space-y-3" data-blocked-intervals={blockedIntervalsCount}>
            {/* Linha principal */}
            <div className={ROW_GRID}>
                <Switch
                    id={switchId}
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    disabled={disabledByBlock}
                />
                <span className="text-sm">{title}</span>
                <Input
                    type="time"
                    step={1800}
                    value={horaInicial}
                    onChange={(e) => setHoraInicial(e.target.value)}
                    disabled={inputsDisabled}
                    className="h-9 w-24"
                />

                <span className="text-center">-</span>

                <Input
                    type="time"
                    step={1800}
                    value={horaFinal}
                    onChange={(e) => setHoraFinal(e.target.value)}
                    disabled={inputsDisabled}
                    className="h-9 w-24"
                />

                <button
                    type="button"
                    onClick={addHorario}
                    disabled={inputsDisabled}
                    className="flex items-center justify-center rounded p-1
             hover:bg-gray-100 disabled:opacity-40"
                >
                    +
                </button>
            </div>

            {/* Horários adicionados */}
            {horarios.map((horario, index) => (
                <div key={index} className={ROW_GRID}>
                    <div />
                    <div />

                    <Input
                        disabled={inputsDisabled}
                        type="time"
                        step={1800}
                        value={horario.horaInicial}
                        onChange={(e) =>
                            handleChangeHorario(index, "horaInicial", e.target.value)
                        }
                        className="h-9 w-24"
                    />

                    <span className="text-center">-</span>

                    <Input
                        disabled={inputsDisabled}
                        type="time"
                        step={1800}
                        value={horario.horaFinal}
                        onChange={(e) =>
                            handleChangeHorario(index, "horaFinal", e.target.value)
                        }
                        className="h-9 w-24"
                    />

                    <button
                        type="button"
                        onClick={() => handleRemoveHorario(index)}
                        disabled={inputsDisabled}
                        className="flex items-center justify-center rounded p-1 hover:bg-gray-100 disabled:opacity-40"
                    >
                        🗑
                    </button>
                </div>
            ))}
        </div>
    )
}
