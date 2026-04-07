"use client"

import { useEffect, useRef, useState } from "react"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getAppointmentStatusLabel,
  type AppointmentStatusValue,
} from "@/lib/appointments/presentation"

const QUICK_STATUS_ACTIONS: Array<{
  status: AppointmentStatusValue
  label: string
}> = [
  { status: "CONFIRMED", label: "Marcar como confirmado" },
  { status: "DONE", label: "Marcar como atendido" },
  { status: "CANCELED", label: "Marcar como cancelado" },
  { status: "NO_SHOW", label: "Marcar como n\u00e3o compareceu" },
]

type AppointmentStatusMenuProps = {
  currentStatus: string
  onStatusChange: (status: AppointmentStatusValue) => Promise<void>
  disabled?: boolean
  align?: "left" | "right"
  buttonLabel?: string
  buttonClassName?: string
}

export default function AppointmentStatusMenu({
  currentStatus,
  onStatusChange,
  disabled = false,
  align = "right",
  buttonLabel,
  buttonClassName,
}: AppointmentStatusMenuProps) {
  const [open, setOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatusValue | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  async function handleSelect(status: AppointmentStatusValue) {
    setError(null)
    setPendingStatus(status)

    try {
      await onStatusChange(status)
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao atualizar status.")
    } finally {
      setPendingStatus(null)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size={buttonLabel ? "sm" : "icon-sm"}
        disabled={disabled || pendingStatus !== null}
        className={cn(
          "rounded-full border shadow-xs",
          buttonLabel
            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            : "border-slate-200 bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900",
          buttonClassName
        )}
        aria-label="Abrir acoes rapidas de status"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setError(null)
          setOpen((current) => !current)
        }}
      >
        <MoreHorizontal className="size-4" />
        {buttonLabel ? <span>{buttonLabel}</span> : null}
      </Button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]",
            align === "left" ? "left-0" : "right-0"
          )}
        >
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          {QUICK_STATUS_ACTIONS.map((action) => {
            const isCurrent = currentStatus === action.status
            const isPending = pendingStatus === action.status

            return (
              <button
                key={action.status}
                type="button"
                role="menuitem"
                disabled={disabled || pendingStatus !== null || isCurrent}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleSelect(action.status)}
              >
                <span>{action.label}</span>
                <span className="text-xs text-slate-500">
                  {isPending
                    ? "Salvando..."
                    : isCurrent
                      ? "Atual"
                      : getAppointmentStatusLabel(action.status)}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
