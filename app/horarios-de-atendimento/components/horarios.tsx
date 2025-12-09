import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,

} from "@/components/ui/select";

export default function Horarios({ title }: { title: string }) {
    const [horaInicial, setHoraInicial] = useState("")
    const [horaFinal, setHoraFinal] = useState("")
    const [horarios, setHorarios] = useState<{ horaInicial: string, horaFinal: string }[]>([])

    function addHorario() {
        setHorarios([...horarios, { horaInicial, horaFinal }])
    }

    function handleChangeHorario(
        index: number,
        field: "horaInicial" | "horaFinal",
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

    return <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
                <Switch id="habilitar" />
            </div>
            <span className="w-24">{title}</span>
            <div className="flex items-center gap-3">
                <Select value={horaInicial} onValueChange={setHoraInicial}>
                    <SelectTrigger className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                        <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={"06:00"}>6:00</SelectItem>
                        <SelectItem value={"07:00"}>7:00</SelectItem>
                        <SelectItem value={"08:00"}>8:00</SelectItem>
                    </SelectContent>
                </Select>
                <span>-</span>
                <Select value={horaFinal} onValueChange={setHoraFinal}>
                    <SelectTrigger className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                        <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={"06:00"}>6:00</SelectItem>
                        <SelectItem value={"07:00"}>7:00</SelectItem>
                        <SelectItem value={"08:00"}>8:00</SelectItem>
                    </SelectContent>
                </Select>
                <button type="button" onClick={addHorario} className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
                    +
                </button>
            </div>
        </div>
        {horarios.map((horario, index) => (
            <div key={index}>
                <div className="flex justify-end items-center gap-3">

                    <Select
                        value={horario.horaInicial || undefined}
                        onValueChange={(value) =>
                            handleChangeHorario(index, "horaInicial", value)
                        }
                    >
                        <SelectTrigger className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                            <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="06:00">6:00</SelectItem>
                            <SelectItem value="07:00">7:00</SelectItem>
                            <SelectItem value="08:00">8:00</SelectItem>
                        </SelectContent>
                    </Select>
                    <span>-</span>
                    <Select
                        value={horario.horaFinal || undefined}
                        onValueChange={(value) =>
                            handleChangeHorario(index, "horaFinal", value)
                        }
                    >
                        <SelectTrigger className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                            <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="06:00">6:00</SelectItem>
                            <SelectItem value="07:00">7:00</SelectItem>
                            <SelectItem value="08:00">8:00</SelectItem>
                        </SelectContent>
                    </Select>
                    <button
                        type="button"
                        onClick={() => handleRemoveHorario(index)}
                        className="cursor-pointer"
                    >
                        <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.66406 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9.33594 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12.6693 4V13.3333C12.6693 13.687 12.5288 14.0261 12.2787 14.2761C12.0287 14.5262 11.6896 14.6667 11.3359 14.6667H4.66927C4.31565 14.6667 3.97651 14.5262 3.72646 14.2761C3.47641 14.0261 3.33594 13.687 3.33594 13.3333V4" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 4H14" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5.33594 4.0026V2.66927C5.33594 2.31565 5.47641 1.97651 5.72646 1.72646C5.97651 1.47641 6.31565 1.33594 6.66927 1.33594H9.33594C9.68956 1.33594 10.0287 1.47641 10.2787 1.72646C10.5288 1.97651 10.6693 2.31565 10.6693 2.66927V4.0026" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
        ))}







    </div>
} 