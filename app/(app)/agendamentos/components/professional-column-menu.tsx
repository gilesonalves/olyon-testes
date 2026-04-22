"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarMinus2, EyeOff, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"

type ProfessionalColumnMenuProps = {
  professionalName: string
  onBlockSchedule: () => void
  onHideColumn: () => void
}

export default function ProfessionalColumnMenu({
  professionalName,
  onBlockSchedule,
  onHideColumn,
}: ProfessionalColumnMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Abrir ações da coluna de ${professionalName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="size-4" />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={() => {
              setOpen(false)
              onBlockSchedule()
            }}
          >
            <CalendarMinus2 className="size-4" />
            <span>Bloquear horario</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={() => {
              setOpen(false)
              onHideColumn()
            }}
          >
            <EyeOff className="size-4" />
            <span>Ocultar coluna</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}