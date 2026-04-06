"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
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

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-")
  return `${day}/${month}/${year}`
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
  const whatsappHref = useMemo(() => {
    const digits = normalizePhone(data.store.whatsappPhone ?? data.store.phone ?? "")
    return digits ? `https://wa.me/55${digits}` : null
  }, [data.store.phone, data.store.whatsappPhone])

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

              {data.store.whatsappPhone ? (
                <a
                  href={whatsappHref ?? undefined}
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
                  <select
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                    className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {data.services.length === 0 ? (
                      <option value="">Nenhum servico disponivel</option>
                    ) : (
                      <option value="">Selecione um servico</option>
                    )}
                    {data.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · {service.durationMin} min
                      </option>
                    ))}
                  </select>
                  {selectedService?.description ? (
                    <p className="text-xs text-slate-500">{selectedService.description}</p>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Profissional</label>
                    <select
                      value={staffMembershipId}
                      onChange={(event) => setStaffMembershipId(event.target.value)}
                      disabled={!serviceId || eligibleProfessionals.length === 0}
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">
                        {eligibleProfessionals.length === 0
                          ? "Nenhum profissional elegivel"
                          : "Selecione um profissional"}
                      </option>
                      {eligibleProfessionals.map((professional) => (
                        <option
                          key={professional.membershipId}
                          value={professional.membershipId}
                        >
                          {professional.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Data</label>
                    <Input
                      type="date"
                      value={searchDate}
                      min={data.todayDate}
                      onChange={(event) => setSearchDate(event.target.value)}
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
