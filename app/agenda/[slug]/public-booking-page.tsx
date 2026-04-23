"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Store,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatPhone, maskPhone, normalizePhone } from "@/lib/utils/maskPhone"
import type { PublicBookingPageData } from "@/lib/public-booking"

type AvailabilitySlot = {
  startAt: string
  endAt: string
  date: string
  time: string
  endTime: string
  label: string
}

type CreatedAppointment = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  date: string
  startTime: string
  endTime: string
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

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error: string
}

type BookingSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type CalendarDay = {
  date: Date
  inMonth: boolean
}

const EMPTY_SERVICE_VALUE = "__empty_service__"
const EMPTY_PROFESSIONAL_VALUE = "__empty_professional__"
const MONTHS_PT_BR = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
]
const WEEKDAYS_PT_BR = ["D", "S", "T", "Q", "Q", "S", "S"]

function pad(value: number) {
  return value.toString().padStart(2, "0")
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`
}

function parseDateKeyToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function isDateBefore(leftDateKey: string, rightDateKey: string) {
  return parseDateKeyToLocalDate(leftDateKey).getTime() < parseDateKeyToLocalDate(rightDateKey).getTime()
}

function buildCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const startWeekday = firstDayOfMonth.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate()

  const days: CalendarDay[] = []

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startWeekday + 1

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

function buildAddressLabel(data: PublicBookingPageData["store"]) {
  const parts = [
    data.address,
    data.complement,
    data.neighborhood,
    [data.city, data.state].filter(Boolean).join(" - ") || null,
    data.zipcode,
  ].filter((item): item is string => Boolean(item?.trim()))

  return parts.length > 0 ? parts.join(", ") : null
}

function hasMinimumAddressForMap(data: PublicBookingPageData["store"]) {
  return Boolean(
    data.address?.trim() &&
      data.city?.trim() &&
      data.state?.trim()
  )
}

function buildMapHref(data: PublicBookingPageData["store"]) {
  if (!hasMinimumAddressForMap(data)) {
    return null
  }

  const query = buildAddressLabel(data)

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null
}

function buildWhatsAppLink(phone: string | null | undefined) {
  const digits = normalizePhone(phone ?? "")

  if (!digits) {
    return null
  }

  if (digits.length === 10 || digits.length === 11) {
    return `https://wa.me/55${digits}`
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return `https://wa.me/${digits}`
  }

  return null
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-")
  return `${day}/${month}/${year}`
}

function BookingSelectField({
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  options: BookingSelectOption[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        sideOffset={6}
        className="max-h-72 rounded-2xl border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="rounded-xl px-3 py-2.5 text-sm text-slate-700 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function BookingDateField({
  value,
  minDate,
  onChange,
}: {
  value: string
  minDate: string
  onChange: (value: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => parseDateKeyToLocalDate(value))
  const todayDateKey = minDate
  const days = useMemo(() => buildCalendarDays(month), [month])
  const monthLabel = `${MONTHS_PT_BR[month.getMonth()]} de ${month.getFullYear()}`

  useEffect(() => {
    setMonth(parseDateKeyToLocalDate(value))
  }, [value])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
      >
        <span>{formatDateLabel(value)}</span>
        <CalendarDays className="size-4 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1, 12, 0, 0)
                )
              }
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold capitalize text-slate-900">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1, 12, 0, 0)
                )
              }
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {WEEKDAYS_PT_BR.map((weekday) => (
              <span key={weekday} className="py-1">
                {weekday}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dateKey = toDateKey(day.date)
              const isDisabled =
                !day.inMonth || isDateBefore(dateKey, todayDateKey)
              const isSelected = dateKey === value
              const isToday = dateKey === todayDateKey

              return (
                <button
                  key={`${dateKey}-${index}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(dateKey)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl text-sm transition",
                    isDisabled
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-700 hover:bg-slate-100",
                    isToday && !isSelected ? "border border-slate-200" : "",
                    isSelected ? "bg-slate-900 text-white shadow-sm" : ""
                  )}
                >
                  {day.date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange(todayDateKey)
                setMonth(parseDateKeyToLocalDate(todayDateKey))
                setOpen(false)
              }}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Hoje
            </button>
            <p className="text-xs text-slate-400">
              Selecione uma data futura
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function PublicBookingPage({
  data,
}: {
  data: PublicBookingPageData
}) {
  const [serviceId, setServiceId] = useState(data.services.length === 1 ? data.services[0].id : "")
  const [staffMembershipId, setStaffMembershipId] = useState("")
  const [searchDate, setSearchDate] = useState(data.todayDate)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confirmedAppointment, setConfirmedAppointment] = useState<CreatedAppointment | null>(null)

  const selectedService = useMemo(
    () => data.services.find((service) => service.id === serviceId) ?? null,
    [data.services, serviceId]
  )

  const eligibleProfessionals = useMemo(
    () =>
      serviceId
        ? data.professionals.filter((professional) => professional.serviceIds.includes(serviceId))
        : [],
    [data.professionals, serviceId]
  )

  const selectedProfessional = useMemo(
    () =>
      eligibleProfessionals.find(
        (professional) => professional.membershipId === staffMembershipId
      ) ?? null,
    [eligibleProfessionals, staffMembershipId]
  )

  const selectedSlot = useMemo(
    () => availabilitySlots.find((slot) => slot.startAt === selectedSlotId) ?? null,
    [availabilitySlots, selectedSlotId]
  )

  const addressLabel = useMemo(() => buildAddressLabel(data.store), [data.store])
  const whatsappHref = useMemo(
    () => buildWhatsAppLink(data.store.whatsappPhone),
    [data.store.whatsappPhone]
  )
  const confirmationMapHref = useMemo(() => buildMapHref(data.store), [data.store])
  const confirmationWhatsAppHref = useMemo(
    () => buildWhatsAppLink(data.store.whatsappPhone ?? data.store.phone),
    [data.store.phone, data.store.whatsappPhone]
  )

  useEffect(() => {
    if (!serviceId) {
      setStaffMembershipId("")
      setAvailabilitySlots([])
      setSelectedSlotId(null)
      return
    }

    if (eligibleProfessionals.length === 1) {
      setStaffMembershipId(eligibleProfessionals[0].membershipId)
      return
    }

    if (!eligibleProfessionals.some((professional) => professional.membershipId === staffMembershipId)) {
      setStaffMembershipId("")
    }
  }, [eligibleProfessionals, serviceId, staffMembershipId])

  useEffect(() => {
    let active = true

    async function fetchAvailability() {
      if (!serviceId || !staffMembershipId || !searchDate) {
        if (!active) return
        setAvailabilitySlots([])
        setAvailabilityError(null)
        setSelectedSlotId(null)
        return
      }

      setAvailabilityLoading(true)
      setAvailabilityError(null)
      setSelectedSlotId(null)

      try {
        const query = new URLSearchParams({
          serviceId,
          staffMembershipId,
          searchDate,
        })

        const response = await fetch(`/api/public/agenda/${encodeURIComponent(data.store.slug)}/availability?${query.toString()}`, {
          cache: "no-store",
        })
        const json = (await response.json()) as ApiSuccess<AvailabilitySlot[]> | ApiError

        if (!response.ok || !json.ok) {
          throw new Error(json.ok ? "Nao foi possivel carregar horarios." : json.error)
        }

        if (!active) {
          return
        }

        setAvailabilitySlots(json.data)
      } catch (error) {
        if (!active) {
          return
        }

        setAvailabilitySlots([])
        setAvailabilityError(
          error instanceof Error ? error.message : "Nao foi possivel carregar horarios."
        )
      } finally {
        if (active) {
          setAvailabilityLoading(false)
        }
      }
    }

    void fetchAvailability()

    return () => {
      active = false
    }
  }, [data.store.slug, searchDate, serviceId, staffMembershipId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!serviceId || !selectedService) {
      toast.error("Selecione um servico para continuar.")
      return
    }

    if (!staffMembershipId || !selectedProfessional) {
      toast.error("Selecione um profissional para continuar.")
      return
    }

    if (!selectedSlot) {
      toast.error("Selecione um horario disponivel para continuar.")
      return
    }

    const phoneDigits = normalizePhone(customerPhone)
    if (!customerName.trim()) {
      toast.error("Informe seu nome.")
      return
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error("Informe um telefone com DDD valido.")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/public/agenda/${encodeURIComponent(data.store.slug)}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId,
          staffMembershipId,
          customerName: customerName.trim(),
          customerPhone: phoneDigits,
          customerEmail: customerEmail.trim() ? customerEmail.trim() : undefined,
          date: selectedSlot.date,
          time: selectedSlot.time,
        }),
      })

      const json = (await response.json()) as ApiSuccess<CreatedAppointment> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel confirmar o agendamento." : json.error)
      }

      setConfirmedAppointment(json.data)
      setAvailabilitySlots((current) =>
        current.filter(
          (slot) => !(slot.date === json.data.date && slot.time === json.data.startTime)
        )
      )
      toast.success("Agendamento confirmado com sucesso.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel confirmar o agendamento."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4fb_45%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <Store className="size-3.5" />
              Agenda online
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {data.store.name}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                Escolha o servico, selecione um profissional e confirme seu horario com disponibilidade real da agenda da loja.
              </p>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              {formatPhone(data.store.phone) ? (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <Phone className="mt-0.5 size-4 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-900">Telefone</p>
                    <p>{formatPhone(data.store.phone)}</p>
                  </div>
                </div>
              ) : null}

              {data.store.whatsappPhone && whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <MessageCircle className="mt-0.5 size-4 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-900">WhatsApp</p>
                    <p>{formatPhone(data.store.whatsappPhone)}</p>
                  </div>
                </a>
              ) : null}

              {addressLabel ? (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <MapPin className="mt-0.5 size-4 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-900">Endereco</p>
                    <p>{addressLabel}</p>
                  </div>
                </div>
              ) : null}

              {data.store.businessHoursSummary ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-slate-500" />
                    <p className="font-medium text-slate-900">Horario de atendimento</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.store.businessHoursSummary}
                  </p>
                </div>
              ) : null}

              {data.store.serviceObservations ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Scissors className="size-4 text-slate-500" />
                    <p className="font-medium text-slate-900">Observacoes</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.store.serviceObservations}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          {confirmedAppointment ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-600">
                  Agendamento confirmado
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Seu horario esta reservado
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Guarde os dados abaixo. Se precisar alterar, entre em contato com a loja.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-900">
                    {confirmedAppointment.service?.name ?? "Servico"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    {formatDateLabel(confirmedAppointment.date)} das {confirmedAppointment.startTime} as{" "}
                    {confirmedAppointment.endTime}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Cliente:</span>{" "}
                    {confirmedAppointment.customerName}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Profissional:</span>{" "}
                    {confirmedAppointment.staff?.name ?? "Nao informado"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Telefone:</span>{" "}
                    {formatPhone(confirmedAppointment.customerPhone) ?? "Nao informado"}
                  </p>
                  {confirmedAppointment.customerEmail ? (
                    <p>
                      <span className="font-medium text-slate-900">E-mail:</span>{" "}
                      {confirmedAppointment.customerEmail}
                    </p>
                  ) : null}
                </div>
              </div>

              {confirmationMapHref || confirmationWhatsAppHref ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">
                    Acoes complementares
                  </p>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    {confirmationMapHref ? (
                      <Button asChild variant="outline" className="h-11 justify-center rounded-xl">
                        <a href={confirmationMapHref} target="_blank" rel="noreferrer">
                          <MapPin className="size-4" />
                          Ver no mapa
                        </a>
                      </Button>
                    ) : null}

                    {confirmationWhatsAppHref ? (
                      <Button asChild variant="outline" className="h-11 justify-center rounded-xl">
                        <a href={confirmationWhatsAppHref} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4" />
                          Falar no WhatsApp
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmedAppointment(null)
                  setSelectedSlotId(null)
                }}
              >
                Fazer outro agendamento
              </Button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Agendar
                </p>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Escolha seu horario
                </h2>
                <p className="text-sm text-slate-600">
                  Os horarios abaixo sao calculados em tempo real com base no expediente, bloqueios e agendamentos atuais.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Servico</label>
                  <BookingSelectField
                    value={serviceId || EMPTY_SERVICE_VALUE}
                    onValueChange={(value) =>
                      setServiceId(value === EMPTY_SERVICE_VALUE ? "" : value)
                    }
                    placeholder="Selecione um servico"
                    options={[
                      {
                        value: EMPTY_SERVICE_VALUE,
                        label:
                          data.services.length === 0
                            ? "Nenhum servico disponivel"
                            : "Selecione um servico",
                        disabled: data.services.length === 0,
                      },
                      ...data.services.map((service) => ({
                        value: service.id,
                        label: `${service.name} · ${service.durationMin} min`,
                      })),
                    ]}
                    disabled={data.services.length === 0}
                  />
                  {selectedService?.description ? (
                    <p className="text-xs text-slate-500">{selectedService.description}</p>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Profissional</label>
                    <BookingSelectField
                      value={staffMembershipId || EMPTY_PROFESSIONAL_VALUE}
                      onValueChange={(value) =>
                        setStaffMembershipId(
                          value === EMPTY_PROFESSIONAL_VALUE ? "" : value
                        )
                      }
                      placeholder="Selecione um profissional"
                      disabled={!serviceId || eligibleProfessionals.length === 0}
                      options={[
                        {
                          value: EMPTY_PROFESSIONAL_VALUE,
                          label:
                            eligibleProfessionals.length === 0
                              ? "Nenhum profissional elegivel"
                              : "Selecione um profissional",
                          disabled: eligibleProfessionals.length === 0,
                        },
                        ...eligibleProfessionals.map((professional) => ({
                          value: professional.membershipId,
                          label: professional.name,
                        })),
                      ]}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Data</label>
                    <BookingDateField
                      value={searchDate}
                      minDate={data.todayDate}
                      onChange={setSearchDate}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-900">Horarios disponiveis</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedProfessional
                    ? `Mostrando horarios reais para ${selectedProfessional.name} em ${formatDateLabel(searchDate)}.`
                    : "Selecione servico, profissional e data para ver a disponibilidade."}
                </p>

                {availabilityError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {availabilityError}
                  </div>
                ) : null}

                {!serviceId || !staffMembershipId ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Selecione servico, profissional e data para ver os horarios disponiveis.
                  </div>
                ) : availabilityLoading ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Carregando horarios...
                  </div>
                ) : availabilitySlots.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    Nenhum horario disponivel para a data selecionada.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {availabilitySlots.map((slot) => {
                      const isSelected = selectedSlotId === slot.startAt

                      return (
                        <button
                          key={slot.startAt}
                          type="button"
                          onClick={() => setSelectedSlotId(slot.startAt)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-sm font-semibold">{slot.time}</p>
                          <p className={`mt-1 text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                            ate {slot.endTime}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Nome</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="pl-10"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Telefone</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(maskPhone(event.target.value))}
                        className="pl-10"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">E-mail</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        className="pl-10"
                        placeholder="voce@exemplo.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                {selectedService && selectedProfessional && selectedSlot ? (
                  <p>
                    {selectedService.name} com {selectedProfessional.name} em{" "}
                    {formatDateLabel(selectedSlot.date)} as {selectedSlot.time}.
                  </p>
                ) : (
                  <p>Selecione servico, profissional e horario para revisar seu agendamento.</p>
                )}
              </div>

              <Button type="submit" size="lg" disabled={submitting || !selectedSlot}>
                {submitting ? "Confirmando..." : "Confirmar agendamento"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
