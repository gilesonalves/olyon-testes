"use client"

import { getAppointmentStatusLabel } from "@/lib/appointments/presentation"

export type AppointmentCardItem = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  date: string
  startTime: string
  endTime: string
  startAt: string
  endAt: string
  status: string
  service: {
    id: string
    name: string
    durationMin: number
  } | null
}

type AppointmentCardProps = {
  appointment: AppointmentCardItem
  rowStart: number
  rowSpan: number
  onClick: (appointmentId: string) => void
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} - ${endTime}`
}

function getAppointmentTone(status: string) {
  if (status === "CONFIRMED") {
    return {
      card: "border-sky-300 bg-sky-500 text-white shadow-[0_18px_36px_rgba(14,165,233,0.22)]",
      accent: "bg-sky-200",
      muted: "text-sky-50/85",
      pill: "border-white/20 bg-white/16 text-white",
    }
  }

  if (status === "CANCELED") {
    return {
      card: "border-rose-300 bg-rose-500 text-white shadow-[0_18px_36px_rgba(244,63,94,0.22)]",
      accent: "bg-rose-200",
      muted: "text-rose-50/85",
      pill: "border-white/20 bg-white/16 text-white",
    }
  }

  if (status === "DONE") {
    return {
      card: "border-slate-400 bg-slate-600 text-white shadow-[0_18px_36px_rgba(100,116,139,0.20)]",
      accent: "bg-slate-200",
      muted: "text-slate-100/85",
      pill: "border-white/20 bg-white/16 text-white",
    }
  }

  if (status === "NO_SHOW") {
    return {
      card: "border-amber-300 bg-amber-500 text-white shadow-[0_18px_36px_rgba(245,158,11,0.22)]",
      accent: "bg-amber-200",
      muted: "text-amber-50/85",
      pill: "border-white/20 bg-white/16 text-white",
    }
  }

  return {
    card: "border-violet-300 bg-violet-500 text-white shadow-[0_18px_36px_rgba(139,92,246,0.22)]",
    accent: "bg-violet-200",
    muted: "text-violet-50/85",
    pill: "border-white/20 bg-white/16 text-white",
  }
}

export default function AppointmentCard({
  appointment,
  rowStart,
  rowSpan,
  onClick,
}: AppointmentCardProps) {
  const tone = getAppointmentTone(appointment.status)
  const isCompact = rowSpan <= 2
  const isUltraCompact = rowSpan === 1

  return (
    <button
      type="button"
      onClick={() => onClick(appointment.id)}
      className={`pointer-events-auto relative z-10 col-start-1 mx-1.5 my-0.5 overflow-hidden rounded-xl border text-left shadow-sm transition hover:border-slate-300 ${isUltraCompact ? "px-2.5 py-1.5" : isCompact ? "px-2.5 py-2" : "px-3 py-2.5"} ${tone.card}`}
      style={{ gridRow: `${rowStart} / span ${rowSpan}` }}
    >
      <span className={`absolute inset-y-2 left-0 w-1.5 rounded-full ${tone.accent}`} />

      <div className="flex h-full flex-col pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`truncate text-[11px] font-semibold uppercase tracking-wide ${tone.muted}`}>
              {formatTimeRange(appointment.startTime, appointment.endTime)}
            </p>
            {!isUltraCompact ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {appointment.service?.name ? (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.pill}`}>
                    {appointment.service.name}
                  </span>
                ) : null}
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.pill}`}>
                  {getAppointmentStatusLabel(appointment.status)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={isUltraCompact ? "mt-1 flex-1" : "mt-2 flex-1"}>
          <p
            className={`text-[13px] font-extrabold uppercase tracking-[0.02em] text-white ${isUltraCompact ? "truncate leading-4" : isCompact ? "line-clamp-2 leading-4" : "line-clamp-4 leading-4"}`}
          >
            {appointment.customerName}
          </p>

          {!isCompact && (appointment.customerPhone || appointment.customerEmail) ? (
            <p className={`mt-2 truncate text-[11px] ${tone.muted}`}>
              {appointment.customerPhone ?? appointment.customerEmail}
            </p>
          ) : null}
        </div>

        {isUltraCompact ? (
          <div className="mt-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.pill}`}>
              {getAppointmentStatusLabel(appointment.status)}
            </span>
          </div>
        ) : null}
      </div>
    </button>
  )
}
