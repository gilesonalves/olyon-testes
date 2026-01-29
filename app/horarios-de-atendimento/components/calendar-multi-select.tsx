"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const MONTHS_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const WEEKDAYS_PT_BR = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"]

type CalendarDay = {
  date: Date
  inMonth: boolean
}

type CalendarMultiSelectProps = {
  selectedDates: string[]
  onChange: (dates: string[]) => void
  multiple?: boolean
}

function pad(value: number) {
  return value.toString().padStart(2, "0")
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`
}


function buildCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const startWeekday = firstDayOfMonth.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate()

  const days: CalendarDay[] = []

  for (let i = 0; i < 42; i++) {
    const dayNumber = i - startWeekday + 1

    if (dayNumber <= 0) {
      days.push({
        date: new Date(year, monthIndex - 1, daysInPrevMonth + dayNumber),
        inMonth: false,
      })
      continue
    }

    if (dayNumber > daysInMonth) {
      days.push({
        date: new Date(year, monthIndex + 1, dayNumber - daysInMonth),
        inMonth: false,
      })
      continue
    }

    days.push({
      date: new Date(year, monthIndex, dayNumber),
      inMonth: true,
    })
  }

  return days
}

export default function CalendarMultiSelect({
  selectedDates,
  onChange,
  multiple = true,
}: CalendarMultiSelectProps) {
  const [month, setMonth] = React.useState(() => new Date())

  const days = React.useMemo(() => buildCalendarDays(month), [month])
  const todayKey = toDateKey(new Date())
  const monthLabel = `${MONTHS_PT_BR[month.getMonth()]} ${month.getFullYear()}`

  function toggleDate(date: Date, inMonth: boolean) {
    if (!inMonth) return

    const key = toDateKey(date)

    if (!multiple) {
      onChange(selectedDates.includes(key) ? [] : [key])
      return
    }

    const next = selectedDates.includes(key)
      ? selectedDates.filter((d) => d !== key)
      : [...selectedDates, key]

    onChange(Array.from(new Set(next)).sort())
  }

  function removeDate(key: string) {
    onChange(selectedDates.filter((d) => d !== key))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{monthLabel}</span>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1)
                )
              }
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1)
                )
              }
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 text-[10px] text-gray-400">
          {WEEKDAYS_PT_BR.map((day) => (
            <span key={day} className="text-center">
              {day}
            </span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const key = toDateKey(day.date)
            const selected = selectedDates.includes(key)

            return (
              <button
                key={`${key}-${index}`}
                type="button"
                disabled={!day.inMonth}
                onClick={() => toggleDate(day.date, day.inMonth)}
                className={[
                  "h-8 rounded text-xs flex items-center justify-center",
                  day.inMonth ? "hover:bg-gray-100" : "text-gray-300",
                  selected && "bg-gray-900 text-white",
                  !selected && key === todayKey && "border",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {day.date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedDates.length === 0 ? (
          <span className="text-xs text-gray-500">
            Nenhuma data selecionada.
          </span>
        ) : (
          selectedDates.map((date) => (
            <span
              key={date}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs"
            >
              {date}
              <button type="button" onClick={() => removeDate(date)}>
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
