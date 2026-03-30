"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getAppointmentSourceLabel,
  getAppointmentStatusLabel,
} from "@/lib/appointments/presentation"
import { formatPhone, maskPhone, normalizePhone } from "@/lib/utils/maskPhone"

type ServiceItem = {
  id: string
  name: string
  durationMin: number
  active: boolean
}

type TeamItem = {
  membershipId: string
  name: string
  serviceIds: string[]
}

type AppointmentItem = {
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

type AvailabilitySlot = {
  startAt: string
  endAt: string
  label: string
}

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error: string
}

function getTodayDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [team, setTeam] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [serviceId, setServiceId] = useState("")
  const [staffMembershipId, setStaffMembershipId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [notes, setNotes] = useState("")

  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [slotSearchDate, setSlotSearchDate] = useState(getTodayDateValue)

  const eligibleTeam = useMemo(() => {
    if (!serviceId) return []
    return team.filter((member) => member.serviceIds.includes(serviceId))
  }, [serviceId, team])

  async function loadAll() {
    setLoading(true)
    setError(null)

    try {
      const [appointmentsRes, servicesRes, teamRes] = await Promise.all([
        fetch("/api/appointments", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/team", { cache: "no-store" }),
      ])

      const appointmentsJson = (await appointmentsRes.json()) as ApiSuccess<AppointmentItem[]> | ApiError
      const servicesJson = (await servicesRes.json()) as ApiSuccess<ServiceItem[]> | ApiError
      const teamJson = (await teamRes.json()) as ApiSuccess<TeamItem[]> | ApiError

      if (!appointmentsRes.ok || !appointmentsJson.ok) {
        throw new Error(appointmentsJson.ok ? "Erro ao carregar agendamentos." : appointmentsJson.error)
      }

      if (!servicesRes.ok || !servicesJson.ok) {
        throw new Error(servicesJson.ok ? "Erro ao carregar servicos." : servicesJson.error)
      }

      if (!teamRes.ok || !teamJson.ok) {
        throw new Error(teamJson.ok ? "Erro ao carregar equipe." : teamJson.error)
      }

      setAppointments(appointmentsJson.data)
      setServices(servicesJson.data)
      setTeam(teamJson.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!serviceId) {
      if (staffMembershipId) {
        setStaffMembershipId("")
      }
      return
    }

    if (
      staffMembershipId &&
      !eligibleTeam.some((member) => member.membershipId === staffMembershipId)
    ) {
      setStaffMembershipId("")
    }
  }, [serviceId, staffMembershipId, eligibleTeam])

  useEffect(() => {
    setSelectedSlot(null)
  }, [serviceId, staffMembershipId])

  function resetForm() {
    setServiceId("")
    setStaffMembershipId("")
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setSelectedSlot(null)
    setNotes("")
    setAvailabilityOpen(false)
    setAvailabilityError(null)
    setAvailabilitySlots([])
    setSlotSearchDate(getTodayDateValue())
  }

  function handleServiceChange(nextServiceId: string) {
    setServiceId(nextServiceId)
  }

  function handleStaffChange(nextStaffMembershipId: string) {
    setStaffMembershipId(nextStaffMembershipId)
  }

  const resolveAvailabilityStaff = useCallback(() => {
    if (!serviceId) {
      return {
        ok: false as const,
        error: "Selecione um servico antes de escolher o horario.",
      }
    }

    if (eligibleTeam.length === 0) {
      return {
        ok: false as const,
        error: "Nao ha profissional elegivel para este servico.",
      }
    }

    if (staffMembershipId) {
      return {
        ok: true as const,
        staffMembershipId,
        autoSelected: false,
      }
    }

    if (eligibleTeam.length === 1) {
      return {
        ok: true as const,
        staffMembershipId: eligibleTeam[0].membershipId,
        autoSelected: true,
      }
    }

    return {
      ok: false as const,
      error: "Selecione um profissional para consultar horarios disponiveis.",
    }
  }, [serviceId, staffMembershipId, eligibleTeam])

  const fetchAvailability = useCallback(async (params: {
    serviceId: string
    staffMembershipId: string
    searchDate: string
  }) => {
    setAvailabilityLoading(true)
    setAvailabilityError(null)

    try {
      if (!params.searchDate) {
        throw new Error("Informe uma data valida para buscar horarios.")
      }

      const query = new URLSearchParams({
        serviceId: params.serviceId,
        staffMembershipId: params.staffMembershipId,
        searchDate: params.searchDate,
      })

      const response = await fetch(`/api/appointments/availability?${query.toString()}`, {
        cache: "no-store",
      })

      const json = (await response.json()) as ApiSuccess<AvailabilitySlot[]> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel carregar os horarios." : json.error)
      }

      setAvailabilitySlots(json.data)
    } catch (e) {
      setAvailabilitySlots([])
      setAvailabilityError(e instanceof Error ? e.message : "Erro ao consultar disponibilidade.")
    } finally {
      setAvailabilityLoading(false)
    }
  }, [])

  async function openAvailabilityModal() {
    setError(null)
    const resolvedStaff = resolveAvailabilityStaff()

    if (!resolvedStaff.ok) {
      setError(resolvedStaff.error)
      return
    }

    if (resolvedStaff.autoSelected) {
      setStaffMembershipId(resolvedStaff.staffMembershipId)
    }

    setAvailabilitySlots([])
    setAvailabilityError(null)
    setAvailabilityOpen(true)
  }

  async function handleAvailabilitySearch() {
    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setAvailabilityError(resolvedStaff.error)
      return
    }

    if (resolvedStaff.autoSelected) {
      setStaffMembershipId(resolvedStaff.staffMembershipId)
    }

    await fetchAvailability({
      serviceId,
      staffMembershipId: resolvedStaff.staffMembershipId,
      searchDate: slotSearchDate,
    })
  }

  useEffect(() => {
    if (!availabilityOpen) {
      return
    }

    const resolvedStaff = resolveAvailabilityStaff()
    if (!resolvedStaff.ok) {
      setAvailabilitySlots([])
      setAvailabilityError(resolvedStaff.error)
      return
    }

    void fetchAvailability({
      serviceId,
      staffMembershipId: resolvedStaff.staffMembershipId,
      searchDate: slotSearchDate,
    })
  }, [availabilityOpen, slotSearchDate, serviceId, fetchAvailability, resolveAvailabilityStaff])

  async function handleCreateAppointment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!serviceId) {
        throw new Error("Selecione um servico.")
      }

      if (!customerName.trim()) {
        throw new Error("Informe o nome do cliente.")
      }

      if (!selectedSlot) {
        throw new Error("Selecione um horario disponivel.")
      }

      const phoneDigits = normalizePhone(customerPhone)
      if (customerPhone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
        throw new Error("Telefone invalido. Informe DDD + numero.")
      }

      const payload = {
        serviceId,
        staffMembershipId: staffMembershipId.trim() ? staffMembershipId.trim() : undefined,
        customerName: customerName.trim(),
        customerPhone: phoneDigits ? phoneDigits : undefined,
        customerEmail: customerEmail.trim() ? customerEmail.trim() : undefined,
        startAt: selectedSlot.startAt,
        notes: notes.trim() ? notes.trim() : undefined,
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const json = (await response.json()) as ApiSuccess<AppointmentItem> | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Nao foi possivel criar o agendamento." : json.error)
      }

      setAppointments((current) =>
        [...current, json.data].sort((a, b) => a.startAt.localeCompare(b.startAt))
      )

      resetForm()
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar agendamento.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">Agendamentos</span>
          <Button
            type="button"
            variant="primary"
            className="cursor-pointer"
            onClick={() => {
              setError(null)
              setShowForm((value) => !value)
            }}
          >
            {showForm ? "Fechar" : "Novo agendamento"}
          </Button>
        </div>
      </HeaderPage>

      <div className="space-y-6 bg-white px-6 py-7">
        {showForm ? (
          <form
            onSubmit={handleCreateAppointment}
            className="grid gap-4 rounded-lg border border-gray-200 p-4"
          >
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Servico</label>
              <select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2"
                required
              >
                <option value="">Selecione</option>
                {services
                  .filter((service) => service.active)
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.durationMin} min)
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Profissional</label>
              <select
                value={staffMembershipId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2"
                disabled={!serviceId}
              >
                <option value="">Sem preferencia</option>
                {eligibleTeam.map((member) => (
                  <option key={member.membershipId} value={member.membershipId}>
                    {member.name}
                  </option>
                ))}
              </select>
              {!serviceId ? (
                <p className="text-xs text-slate-500">Selecione um servico para liberar a equipe.</p>
              ) : eligibleTeam.length === 0 ? (
                <p className="text-xs text-amber-700">
                  Nenhum profissional elegivel foi encontrado para este servico.
                </p>
              ) : !staffMembershipId ? (
                <p className="text-xs text-slate-500">
                  A busca de horarios segue a mesma regra do WhatsApp. Se houver mais de um
                  profissional elegivel, selecione um antes de abrir o modal.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Cliente</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2"
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Telefone</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                  className="rounded-md border border-slate-300 px-3 py-2"
                  placeholder="(27) 99999-9999"
                  inputMode="tel"
                  maxLength={15}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-700">Horario</label>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">
                  {selectedSlot ? selectedSlot.label : "Nenhum horario selecionado."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  O modal consulta a disponibilidade real da agenda. A confirmacao final continua
                  acontecendo ao salvar o agendamento.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={openAvailabilityModal}>
                    {selectedSlot ? "Trocar horario" : "Escolher horario"}
                  </Button>
                  {selectedSlot ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedSlot(null)}
                    >
                      Limpar horario
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Observacoes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-25 rounded-md border border-slate-300 px-3 py-2"
                placeholder="Observacoes do agendamento"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" className="cursor-pointer" disabled={saving}>
                {saving ? "Salvando..." : "Salvar agendamento"}
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-slate-600">
            Carregando agendamentos...
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-sm text-slate-600">
            Nenhum agendamento encontrado para a loja atual.
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const formattedPhone = formatPhone(appointment.customerPhone)

              return (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {appointment.customerName} - {appointment.staff?.name ?? "Sem profissional"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {appointment.service?.name ?? "Servico nao informado"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(appointment.startAt).toLocaleString("pt-BR")}
                    </p>
                    {formattedPhone ? (
                      <p className="text-sm text-slate-500">Telefone: {formattedPhone}</p>
                    ) : null}
                    <p className="text-xs text-slate-400">
                      Status: {getAppointmentStatusLabel(appointment.status)} | Origem:{" "}
                      {getAppointmentSourceLabel(appointment.source, appointment.metadata)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-segundary" disabled>
                      Editar
                    </button>
                    <button type="button" className="btn-delete" disabled>
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Horarios disponiveis</DialogTitle>
            <DialogDescription>
              Esta consulta usa a mesma engine de disponibilidade do fluxo de WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-2">
                <label className="text-sm font-medium text-slate-700">Data de busca</label>
                <input
                  type="date"
                  value={slotSearchDate}
                  min={getTodayDateValue()}
                  onChange={(e) => setSlotSearchDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAvailabilitySearch}
                disabled={availabilityLoading}
              >
                {availabilityLoading ? "Buscando..." : "Buscar horarios"}
              </Button>
            </div>

            {availabilityError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {availabilityError}
              </div>
            ) : null}

            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {availabilityLoading ? (
                <div className="rounded-md border border-slate-200 px-4 py-6 text-sm text-slate-600">
                  Consultando disponibilidade...
                </div>
              ) : availabilitySlots.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">
                  Nenhum horario disponivel encontrado para a busca atual.
                </div>
              ) : (
                availabilitySlots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot)
                      setAvailabilityOpen(false)
                    }}
                    className="w-full rounded-md border border-slate-200 px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="block text-sm font-medium text-slate-800">{slot.label}</span>
                    <span className="block text-xs text-slate-500">
                      Inicio: {new Date(slot.startAt).toLocaleString("pt-BR")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
