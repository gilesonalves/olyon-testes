"use client"

import {
  getAppointmentStatusBadgeProps,
  getAppointmentStatusTone,
} from "@/lib/appointments/presentation"

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

function getCustomerDisplayName(value: string | null | undefined) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : "Cliente sem nome"
}

export default function AppointmentCard({
  appointment,
  rowStart,
  rowSpan,
  onClick,
}: AppointmentCardProps) {
  const customerDisplayName = getCustomerDisplayName(appointment.customerName)
  const tone = getAppointmentStatusTone(appointment.status, {
    endAt: appointment.endAt,
  })
  const statusBadge = getAppointmentStatusBadgeProps(appointment.status, {
    endAt: appointment.endAt,
  })
  const isCompact = rowSpan <= 2
  const isUltraCompact = rowSpan === 1

  return (
    <article
      className="relative z-10 col-start-1 mx-1.5 my-0.5 min-h-0"
      style={{ gridRow: `${rowStart} / span ${rowSpan}` }}
    >
      <button
        type="button"
        onClick={() => onClick(appointment.id)}
        className={`relative block h-full w-full overflow-hidden rounded-xl border text-left shadow-sm transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${isUltraCompact ? "px-2.5 py-1.5" : isCompact ? "px-2.5 py-2" : "px-3 py-2.5"} ${tone.card}`}
      >
        <span className={`absolute inset-y-2 left-0 w-1.5 rounded-full ${tone.accent}`} />

        {isUltraCompact ? (
          <div className="flex h-full min-h-0 flex-col justify-between gap-1 pl-2">
            <div className="flex items-center justify-between gap-2">
              <p className={`truncate text-[11px] font-semibold uppercase tracking-wide ${tone.muted}`}>
                {formatTimeRange(appointment.startTime, appointment.endTime)}
              </p>

              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <p
                className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${tone.final ? "text-current" : "text-white"}`}
                title={customerDisplayName}
              >
                {customerDisplayName}
              </p>

              {appointment.service?.name ? (
                <p
                  className={`max-w-[42%] truncate text-[10px] font-medium ${tone.muted}`}
                  title={appointment.service.name}
                >
                  {appointment.service.name}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col justify-between gap-2 pl-2">
            <p className={`truncate text-[11px] font-semibold uppercase tracking-wide ${tone.muted}`}>
              {formatTimeRange(appointment.startTime, appointment.endTime)}
            </p>

            <div className="min-w-0">
              <p
                className={`truncate text-[13px] font-semibold ${tone.final ? "text-current" : "text-white"}`}
                title={customerDisplayName}
              >
                {customerDisplayName}
              </p>

              {appointment.service?.name ? (
                <p
                  className={`mt-1 truncate text-[11px] font-medium ${tone.muted}`}
                  title={appointment.service.name}
                >
                  {appointment.service.name}
                </p>
              ) : null}

              <div className={appointment.service?.name ? "mt-1" : ""}>
                <span
                  className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}
                >
                  <span className="truncate">{statusBadge.label}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </button>
    </article>
  )
}
