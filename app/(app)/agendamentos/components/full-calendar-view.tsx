"use client"

import { useMemo } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import ptBrLocale from "@fullcalendar/core/locales/pt-br"
import type { EventClickArg, EventContentArg } from "@fullcalendar/core"
import {
  getAppointmentSourceLabel,
  getAppointmentStatusLabel,
} from "@/lib/appointments/presentation"

export type FullCalendarDesktopView = "day" | "3days" | "week" | "month"

export type FullCalendarAppointment = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  startAt: string
  endAt: string
  status: string
  source: string
  notes: string | null
  metadata?: unknown
  service: {
    id: string
    name: string
    durationMin: number
  } | null
  staff: {
    membershipId: string
    name: string
  } | null
}

type FullCalendarEventProps = {
  customerName: string
  service: FullCalendarAppointment["service"]
  serviceName: string
  staff: FullCalendarAppointment["staff"]
  staffName: string
  status: string
  statusLabel: string
  source: string
  sourceLabel: string
  phone: string | null
  email: string | null
  notes: string | null
  metadata?: unknown
}

export type FullCalendarViewProps = {
  appointments: FullCalendarAppointment[]
  selectedDate: string
  view: FullCalendarDesktopView
  dayBoundaries: {
    start: string
    end: string
  }
  onAppointmentClick: (appointmentId: string) => void
}

function getStatusClassName(status: string) {
  return status.toLowerCase().replace(/_/g, "-")
}

function toTimeWithSeconds(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function getEventDurationMinutes(start: Date | null, end: Date | null) {
  if (!start || !end) {
    return 30
  }

  const diffMs = end.getTime() - start.getTime()
  return Math.max(30, Math.round(diffMs / 60000))
}

function renderEventContent(arg: EventContentArg) {
  const extended = arg.event.extendedProps as FullCalendarEventProps
  const durationMinutes = getEventDurationMinutes(arg.event.start, arg.event.end)
  const isCompact = durationMinutes <= 30
  const isNarrowTimeGridView = arg.view.type !== "dayGridMonth" && (arg.view.type === "timeGridWeek" || arg.view.type === "timeGridThreeDay")
  const showService = durationMinutes > 45
  const showStaff = durationMinutes > 30 && !isNarrowTimeGridView

  if (arg.view.type === "dayGridMonth") {
    return (
      <div className="olyon-fc-month-event">
        <span className="olyon-fc-month-event__time">{arg.timeText || "--:--"}</span>
        <span className="olyon-fc-month-event__title">{extended.customerName}</span>
        <span className="olyon-fc-month-event__staff">{extended.staffName}</span>
      </div>
    )
  }

  return (
    <div className={`olyon-fc-card ${isCompact ? "olyon-fc-card--compact" : ""}`}>
      <div className="olyon-fc-card__body">
        <div className="olyon-fc-card__header">
          <span className="olyon-fc-card__time">{arg.timeText || "--:--"}</span>
        </div>

        <div className="olyon-fc-card__content">
          <p className="olyon-fc-card__customer">{extended.customerName}</p>

          {!isCompact && showService ? (
            <p className="olyon-fc-card__service">{extended.serviceName}</p>
          ) : null}

          {!isCompact && showStaff ? <p className="olyon-fc-card__staff">{extended.staffName}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default function FullCalendarView({
  appointments,
  selectedDate,
  view,
  dayBoundaries,
  onAppointmentClick,
}: FullCalendarViewProps) {
  const initialView =
    view === "month"
      ? "dayGridMonth"
      : view === "week"
        ? "timeGridWeek"
        : view === "3days"
          ? "timeGridThreeDay"
          : "timeGridDay"

  const events = useMemo(() => {
    return appointments.map((appointment) => ({
      id: appointment.id,
      title: appointment.customerName,
      start: appointment.startAt,
      end: appointment.endAt,
      classNames: ["olyon-fc-event", `olyon-fc-event--${getStatusClassName(appointment.status)}`],
      extendedProps: {
        customerName: appointment.customerName,
        service: appointment.service,
        serviceName: appointment.service?.name ?? "Servico nao informado",
        staff: appointment.staff,
        staffName: appointment.staff?.name ?? "Sem profissional",
        status: appointment.status,
        statusLabel: getAppointmentStatusLabel(appointment.status),
        source: appointment.source,
        sourceLabel: getAppointmentSourceLabel(appointment.source, appointment.metadata),
        phone: appointment.customerPhone,
        email: appointment.customerEmail,
        notes: appointment.notes,
        metadata: appointment.metadata,
      } satisfies FullCalendarEventProps,
    }))
  }, [appointments])

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault()
    onAppointmentClick(String(arg.event.id))
  }

  return (
    <div className="olyon-fullcalendar overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm">
      {appointments.length === 0 ? (
        <div className="m-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          Nenhum agendamento no periodo atual. A grade continua visivel para avaliar.
        </div>
      ) : null}

      <FullCalendar
        key={`${initialView}-${selectedDate}`}
        plugins={[dayGridPlugin, timeGridPlugin]}
        views={{
          timeGridThreeDay: {
            type: "timeGrid",
            duration: { days: 3 },
            buttonText: "3 dias",
          },
        }}
        locale={ptBrLocale}
        timeZone="local"
        initialView={initialView}
        initialDate={selectedDate}
        headerToolbar={false}
        allDaySlot={view === "month"}
        editable={false}
        selectable={false}
        nowIndicator
        weekends
        firstDay={1}
        height={view === "month" ? 780 : view === "week" ? 820 : view === "3days" ? 800 : 760}
        slotMinTime={toTimeWithSeconds(dayBoundaries.start)}
        slotMaxTime={toTimeWithSeconds(dayBoundaries.end)}
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        dayHeaderFormat={
          view === "month"
            ? { weekday: "short" }
            : view === "week" || view === "3days"
            ? { weekday: "short", day: "2-digit", month: "2-digit" }
            : { weekday: "long", day: "2-digit", month: "long" }
        }
        expandRows
        fixedWeekCount={view === "month"}
        dayMaxEventRows={view === "month" ? 2 : 3}
        eventDisplay={view === "month" ? "auto" : "block"}
        moreLinkText={(count) => `+${count}`}
        eventMinHeight={40}
        eventShortHeight={32}
        slotEventOverlap={false}
        events={events}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
      />

      <style jsx global>{`
        .olyon-fullcalendar .fc {
          --fc-border-color: #e2e8f0;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #f8fafc;
          --fc-neutral-text-color: #64748b;
          --fc-now-indicator-color: #0f766e;
          --fc-today-bg-color: rgba(15, 118, 110, 0.06);
          --fc-event-bg-color: #3788d8;
          --fc-event-border-color: #2f73b8;
        }

        .olyon-fullcalendar .fc-theme-standard .fc-scrollgrid {
          border: 1px solid #e2e8f0;
          border-radius: 0;
          overflow: hidden;
        }

        .olyon-fullcalendar .fc-theme-standard th,
        .olyon-fullcalendar .fc-theme-standard td {
          border-color: #e2e8f0;
        }

        .olyon-fullcalendar .fc-col-header-cell {
          background: rgba(248, 250, 252, 0.92);
        }

        .olyon-fullcalendar .fc-daygrid .fc-col-header-cell {
          background: #ffffff;
        }

        .olyon-fullcalendar .fc-col-header-cell-cushion {
          padding: 8px 6px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .olyon-fullcalendar .fc-daygrid .fc-col-header-cell-cushion {
          padding: 10px 6px;
          font-size: 13px;
          font-weight: 400;
          color: #334155;
          text-transform: none;
        }

        .olyon-fullcalendar .fc-timegrid-axis {
          background: #f8fafc;
        }

        .olyon-fullcalendar .fc-daygrid-day-number {
          padding: 6px 8px 0;
          color: #0f172a;
          font-size: 13px;
          font-weight: 500;
        }

        .olyon-fullcalendar .fc-daygrid-day-frame {
          min-height: 126px;
          height: 126px;
          background: #ffffff;
        }

        .olyon-fullcalendar .fc-daygrid-day-top {
          justify-content: flex-end;
        }

        .olyon-fullcalendar .fc-daygrid-day-events {
          margin-top: 4px;
          margin-bottom: 0;
        }

        .olyon-fullcalendar .fc-daygrid-day.fc-day-today {
          background: rgba(59, 130, 246, 0.04);
        }

        .olyon-fullcalendar .fc-daygrid-event {
          border-radius: 3px;
          margin: 1px 3px;
          padding: 0 2px;
          box-shadow: none;
        }

        .olyon-fullcalendar .fc-daygrid-dot-event {
          margin: 1px 4px;
          padding: 1px 2px;
          border-radius: 2px;
        }

        .olyon-fullcalendar .fc-daygrid-event .fc-event-title,
        .olyon-fullcalendar .fc-daygrid-dot-event .fc-event-title {
          font-size: 12px;
          font-weight: 600;
        }

        .olyon-fullcalendar .fc-daygrid-event .fc-event-time,
        .olyon-fullcalendar .fc-daygrid-dot-event .fc-event-time {
          font-size: 12px;
          font-weight: 500;
        }

        .olyon-fullcalendar .fc-daygrid-dot-event .fc-event-dot {
          border-color: currentColor;
        }

        .olyon-fullcalendar .fc-daygrid-more-link {
          margin: 2px 4px 0;
          color: #2563eb;
          font-size: 11px;
          font-weight: 600;
        }

        .olyon-fullcalendar .fc-timegrid-slot-label-cushion {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .olyon-fullcalendar .fc-timegrid-event-harness {
          margin-inline: 2px;
          margin-block: 1px;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event {
          border-width: 1px;
          border-style: solid;
          border-radius: 4px;
          box-shadow: none;
          cursor: pointer;
          overflow: hidden;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event .fc-event-main {
          padding: 0;
          height: 100%;
        }

        .olyon-fullcalendar .olyon-fc-month-event {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 4px;
          overflow: hidden;
          padding: 2px 0;
        }

        .olyon-fullcalendar .olyon-fc-month-event__time,
        .olyon-fullcalendar .olyon-fc-month-event__title,
        .olyon-fullcalendar .olyon-fc-month-event__staff {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .olyon-fullcalendar .olyon-fc-month-event__time {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        .olyon-fullcalendar .olyon-fc-month-event__title {
          min-width: 0;
          font-size: 13px;
          font-weight: 800;
          color: #334155;
        }

        .olyon-fullcalendar .olyon-fc-month-event__staff {
          min-width: 0;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event--scheduled {
          border-color: #93c5fd;
          background: rgba(219, 234, 254, 0.78);
          color: #0f172a;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event--confirmed {
          border-color: #7dd3fc;
          background: rgba(224, 242, 254, 0.78);
          color: #0f172a;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event--canceled {
          border-color: #cbd5e1;
          background: rgba(226, 232, 240, 0.82);
          color: #0f172a;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event--done {
          border-color: #bfdbfe;
          background: rgba(239, 246, 255, 0.8);
          color: #0f172a;
        }

        .olyon-fullcalendar .fc-event.olyon-fc-event--no-show {
          border-color: #fcd34d;
          background: rgba(254, 243, 199, 0.82);
          color: #0f172a;
        }

        .olyon-fullcalendar .olyon-fc-card {
          height: 100%;
          min-height: 0;
          overflow: hidden;
          padding: 2px 4px;
        }

        .olyon-fullcalendar .olyon-fc-card__body {
          display: flex;
          min-width: 0;
          min-height: 0;
          flex-direction: column;
          gap: 1px;
        }

        .olyon-fullcalendar .olyon-fc-card__header {
          min-width: 0;
        }

        .olyon-fullcalendar .olyon-fc-card__time {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.1;
          color: #334155;
        }

        .olyon-fullcalendar .olyon-fc-card__content {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .olyon-fullcalendar .olyon-fc-card__customer,
        .olyon-fullcalendar .olyon-fc-card__service {
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .olyon-fullcalendar .olyon-fc-card__customer {
          font-size: 14px;
          font-weight: 800;
          line-height: 1.15;
          color: #334155;
        }

        .olyon-fullcalendar .olyon-fc-card__service {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          color: #475569;
        }

        .olyon-fullcalendar .olyon-fc-card__staff {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.15;
          color: #64748b;
        }

        .olyon-fullcalendar .olyon-fc-card--compact {
          padding-block: 1px;
        }

        .olyon-fullcalendar .olyon-fc-card--compact .olyon-fc-card__body {
          gap: 1px;
        }

        .olyon-fullcalendar .olyon-fc-card--compact .olyon-fc-card__time {
          font-size: 10px;
        }

        .olyon-fullcalendar .olyon-fc-card--compact .olyon-fc-card__customer {
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
