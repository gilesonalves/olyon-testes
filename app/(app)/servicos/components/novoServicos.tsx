"use client"
import { FieldError } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DURATION_OPTIONS = [15, 30, 45, 60] as const

type NovoServicosProps = {
  title: string
  value: number | null | undefined
  onChange: (value: number) => void
  error?: string
}

export default function NovoServicos({
  title,
  value,
  onChange,
  error,
}: NovoServicosProps) {
  const selectValue = value ? String(value) : ""

  function handleValueChange(nextValue: string) {
    const parsed = Number(nextValue)
    if (Number.isNaN(parsed)) return
    onChange(parsed)
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-900">{title}</label>

      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger
          className="h-10 w-full justify-between rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          aria-invalid={!!error}
        >
          <SelectValue placeholder="Selecione a duração" />
        </SelectTrigger>

        <SelectContent position="popper" className="max-h-72">
          {DURATION_OPTIONS.map((duration) => (
            <SelectItem key={duration} value={String(duration)}>
              {duration}min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <FieldError errors={error ? [{ message: error }] : undefined} />
    </div>
  )
}
