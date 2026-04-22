"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { EventClickArg, EventContentArg } from "@fullcalendar/core"
import ptBrLocale from "@fullcalendar/core/locales/pt-br"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { Button } from "@/components/ui/button"

type CalendarLabView = "day" | "week"
type CalendarRenderMode = "simple" | "enhanced"

type MockTemplate = {
  id: string
  customerName: string
  serviceName: string
  statusLabel: string
  offsetDays: number
  startTime: string
  endTime: string
}

type ClickedEventSummary = {
  id: string
  customerName: string
  serviceName: string
  statusLabel: string
  timeText: string
}

const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "lab-1",
    customerName: "Mariana Costa",
    serviceName: "Corte feminino",
    statusLabel: "Agendado",
    offsetDays: 0,
    startTime: "09:00",
    endTime: "09:45",
  },
  {
    id: "lab-2",
    customerName: "Rafael Gomes",
    serviceName: "Barba premium",
    statusLabel: "Confirmado",
    offsetDays: 0,
    startTime: "10:30",
    endTime: "11:00",
  },
  {
    id: "lab-3",
    customerName: "Juliana Alves",
    serviceName: "Coloracao",
    statusLabel: "Agendado",
    offsetDays: 1,
    startTime: "13:30",
    endTime: "15:00",
  },
  {
    id: "lab-4",
    customerName: "Bruno Lima",
    serviceName: "Limpeza de pele",
    statusLabel: "Concluido",
    offsetDays: 2,
    startTime: "08:30",
    endTime: "09:30",
  },
  {
    id: "lab-5",
    customerName: "Patricia Rocha",
    serviceName: "Escova",
    statusLabel: "Nao compareceu",
    offsetDays: 3,
    startTime: "16:00",
    endTime: "16:45",
  },
  {
    id: "lab-6",
    customerName: "Thiago Martins",
    serviceName: "Corte + barba",
    statusLabel: "Cancelado",
    offsetDays: 4,
    startTime: "11:15",
    endTime: "12:00",
  },
]

function getTodayDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
}

function getLocalDateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-")
}

function addDaysToDateKey(dateKey: string, amount: number) {
  const next = parseDateKey(dateKey)
  next.setDate(next.getDate() + amount)
  return getLocalDateKey(next)
}

function getWeekStartDateKey(dateKey: string) {
  const current = parseDateKey(dateKey)
  const day = current.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + mondayOffset)
  return getLocalDateKey(current)
}

function combineDateAndTime(dateKey: string, time: string) {
  return `${dateKey}T${time}:00`
}

function formatPeriodHeadline(selectedDate: string, view: CalendarLabView) {
  if (view === "day") {
    return parseDateKey(selectedDate).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const weekStartKey = getWeekStartDateKey(selectedDate)
  const weekEndKey = addDaysToDateKey(weekStartKey, 6)
  const weekStart = parseDateKey(weekStartKey)
  const weekEnd = parseDateKey(weekEndKey)

  return `Semana de ${weekStart.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })} a ${weekEnd.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })}`
}

function renderEnhancedEventContent(arg: EventContentArg) {
  const serviceName = String(arg.event.extendedProps.serviceName ?? "")
  const statusLabel = String(arg.event.extendedProps.statusLabel ?? "")

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden rounded-xl px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
          {arg.timeText || "--:--"}
        </span>
        <span className="inline-flex min-w-0 rounded-full bg-slate-900/8 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">
          <span className="truncate">{statusLabel}</span>
        </span>
      </div>
      <div className="min-h-0 space-y-1 overflow-hidden">
        <p className="truncate text-[12px] font-semibold leading-tight text-slate-950">
          {arg.event.title}
        </p>
        <p className="truncate text-[11px] text-slate-700">{serviceName}</p>
      </div>
    </div>
  )
}

export default function CalendarLab() {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayDateValue())
  const [view, setView] = useState<CalendarLabView>("week")
  const [renderMode, setRenderMode] = useState<CalendarRenderMode>("simple")
  const [clickedEvent, setClickedEvent] = useState<ClickedEventSummary | null>(null)

  const currentView = view === "week" ? "timeGridWeek" : "timeGridDay"

  const events = useMemo(() => {
    const weekStartKey = getWeekStartDateKey(selectedDate)

    return MOCK_TEMPLATES.map((template) => {
      const eventDateKey = addDaysToDateKey(weekStartKey, template.offsetDays)

      return {
        id: template.id,
        title: template.customerName,
        start: combineDateAndTime(eventDateKey, template.startTime),
        end: combineDateAndTime(eventDateKey, template.endTime),
        classNames: renderMode === "enhanced" ? ["lab-fc-event"] : [],
        extendedProps: {
          serviceName: template.serviceName,
          statusLabel: template.statusLabel,
        },
      }
    })
  }, [renderMode, selectedDate])

  const headline = useMemo(() => formatPeriodHeadline(selectedDate, view), [selectedDate, view])

  useEffect(() => {
    const api = calendarRef.current?.getApi()

    if (!api) {
      return
    }

    if (api.view.type !== currentView) {
      api.changeView(currentView, selectedDate)
      return
    }

    api.gotoDate(selectedDate)
  }, [currentView, selectedDate])

  function movePeriod(direction: -1 | 1) {
    setSelectedDate((current) => addDaysToDateKey(current, view === "week" ? direction * 7 : direction))
  }

  function handleEventClick(arg: EventClickArg) {
    const summary = {
      id: String(arg.event.id),
      customerName: arg.event.title,
      serviceName: String(arg.event.extendedProps.serviceName ?? "Sem servico"),
      statusLabel: String(arg.event.extendedProps.statusLabel ?? "Sem status"),
      timeText: arg.event.start
        ? `${arg.event.start.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${arg.event.end?.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }) ?? "--:--"}`
        : "--:--",
    }

    setClickedEvent(summary)
    console.log("agendamentos-lab:event-click", summary)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                FullCalendar Lab
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                POC isolada sem integracao real
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Teste visual controlado do calendario</h2>
              <p className="text-sm text-slate-600">
                Use esta tela para comparar a grade nativa do FullCalendar com uma customizacao leve
                de evento, sem encostar na pagina oficial de agendamentos.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => movePeriod(-1)}>
                {view === "week" ? "Semana anterior" : "Dia anterior"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelectedDate(getTodayDateValue())}>
                Hoje
              </Button>
              <Button type="button" variant="outline" onClick={() => movePeriod(1)}>
                {view === "week" ? "Proxima semana" : "Proximo dia"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={view === "day" ? "primary" : "outline"}
                onClick={() => setView("day")}
              >
                Dia
              </Button>
              <Button
                type="button"
                variant={view === "week" ? "primary" : "outline"}
                onClick={() => setView("week")}
              >
                Semana
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={renderMode === "simple" ? "primary" : "outline"}
                onClick={() => setRenderMode("simple")}
              >
                Evento simples
              </Button>
              <Button
                type="button"
                variant={renderMode === "enhanced" ? "primary" : "outline"}
                onClick={() => setRenderMode("enhanced")}
              >
                Evento leve
              </Button>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span>Data base</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-medium text-slate-900">{headline}</p>
            <p>
              Modo atual:{" "}
              <span className="font-medium text-slate-700">
                {view === "week" ? "timeGridWeek" : "timeGridDay"} /{" "}
                {renderMode === "simple" ? "renderizacao nativa" : "renderizacao leve custom"}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            {clickedEvent ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{clickedEvent.customerName}</p>
                <p className="text-slate-600">{clickedEvent.serviceName}</p>
                <p className="text-slate-500">
                  {clickedEvent.timeText} • {clickedEvent.statusLabel}
                </p>
              </div>
            ) : (
              <p className="text-slate-500">Clique em um evento para validar a interacao.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
        <p className="text-sm text-slate-600">
          Esta rota-lab foi pensada para validar o FullCalendar no desktop. Em telas pequenas, use
          um viewport maior para avaliar a grade.
        </p>
      </div>

      <div className="hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-sm lg:block">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin]}
          locale={ptBrLocale}
          timeZone="local"
          initialView={currentView}
          initialDate={selectedDate}
          headerToolbar={false}
          allDaySlot={false}
          editable={false}
          selectable={false}
          weekends
          firstDay={1}
          nowIndicator
          height={820}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          expandRows
          eventMinHeight={36}
          slotEventOverlap={false}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderMode === "enhanced" ? renderEnhancedEventContent : undefined}
          dayHeaderFormat={
            view === "week"
              ? { weekday: "short", day: "2-digit", month: "2-digit" }
              : { weekday: "long", day: "2-digit", month: "long" }
          }
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
        />
      </div>

      <style jsx global>{`
        .fc .fc-toolbar {
          margin-bottom: 0;
        }

        .fc .fc-scrollgrid {
          border-color: #e2e8f0;
        }

        .fc .fc-col-header-cell {
          background: #f8fafc;
        }

        .fc .fc-col-header-cell-cushion {
          padding: 10px 8px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .fc .fc-timegrid-axis,
        .fc .fc-timegrid-slot-label {
          background: #f8fafc;
        }

        .fc .fc-timegrid-slot-label-cushion {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .fc .fc-timegrid-event-harness {
          margin-inline: 4px;
        }

        .fc .lab-fc-event {
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .fc .lab-fc-event .fc-event-main {
          padding: 0;
        }
      `}</style>
    </div>
  )
}
