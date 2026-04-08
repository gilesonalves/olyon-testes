"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Globe, PencilLine } from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { maskPhone } from "@/lib/utils/maskPhone"

type StorePublicInfo = {
  id: string
  name: string
  slug: string
  phone: string | null
  whatsappPhone: string | null
  address: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipcode: string | null
  businessHoursSummary: string | null
  serviceObservations: string | null
}

type CurrentStorePayload = {
  store: StorePublicInfo | null
  membership: { id: string; role: string } | null
  source: "admin_session" | "nextauth"
  publicAgendaUrl: string | null
}

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  message?: string
}

type FormState = {
  phone: string
  whatsappPhone: string
  address: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zipcode: string
  businessHoursSummary: string
  serviceObservations: string
}

const EMPTY_FORM: FormState = {
  phone: "",
  whatsappPhone: "",
  address: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipcode: "",
  businessHoursSummary: "",
  serviceObservations: "",
}

function toFormState(store: StorePublicInfo | null): FormState {
  if (!store) {
    return EMPTY_FORM
  }

  return {
    phone: store.phone ? maskPhone(store.phone) : "",
    whatsappPhone: store.whatsappPhone ? maskPhone(store.whatsappPhone) : "",
    address: store.address ?? "",
    complement: store.complement ?? "",
    neighborhood: store.neighborhood ?? "",
    city: store.city ?? "",
    state: store.state ?? "",
    zipcode: store.zipcode ?? "",
    businessHoursSummary: store.businessHoursSummary ?? "",
    serviceObservations: store.serviceObservations ?? "",
  }
}

export default function AgendaOnlinePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [store, setStore] = useState<StorePublicInfo | null>(null)
  const [publicAgendaUrl, setPublicAgendaUrl] = useState<string | null>(null)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const canEdit = membershipRole === "OWNER" || membershipRole === "ADMIN"

  const publicAgendaHref = useMemo(() => {
    if (!publicAgendaUrl) {
      return null
    }

    return publicAgendaUrl
  }, [publicAgendaUrl])

  useEffect(() => {
    let alive = true

    async function loadCurrentStore() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/store/current", { cache: "no-store" })
        const json = (await response.json()) as
          | ApiSuccess<CurrentStorePayload>
          | ApiError

        if (!response.ok || !json.ok) {
          throw new Error(
            json.ok
              ? "Nao foi possivel carregar os dados da agenda online."
              : (json.message ?? "Nao foi possivel carregar os dados da agenda online.")
          )
        }

        if (!alive) {
          return
        }

        setStore(json.data.store)
        setPublicAgendaUrl(json.data.publicAgendaUrl)
        setMembershipRole(json.data.membership?.role ?? null)
        setForm(toFormState(json.data.store))
      } catch (loadError) {
        if (!alive) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar os dados da agenda online."
        )
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    void loadCurrentStore()

    return () => {
      alive = false
    }
  }, [])

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canEdit) {
      toast.error("Seu perfil atual nao pode editar os dados publicos da agenda.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/store/current", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const json = (await response.json()) as
        | ApiSuccess<{ store: StorePublicInfo; publicAgendaUrl: string | null }>
        | ApiError

      if (!response.ok || !json.ok) {
        throw new Error(
          json.ok
            ? "Nao foi possivel salvar os dados publicos da agenda."
            : (json.message ?? "Nao foi possivel salvar os dados publicos da agenda.")
        )
      }

      setStore(json.data.store)
      setPublicAgendaUrl(json.data.publicAgendaUrl)
      setForm(toFormState(json.data.store))
      toast.success("Dados publicos da agenda salvos com sucesso.")
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Nao foi possivel salvar os dados publicos da agenda."
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">
            Dados publicos da agenda
          </span>
        </div>
      </HeaderPage>

      <div className="w-full max-w-5xl bg-white px-4 py-6 sm:px-6 sm:py-7">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-600">
            Carregando dados publicos da agenda...
          </div>
        ) : !store ? (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 px-5 py-10 text-center text-sm text-amber-800">
            Nenhuma loja selecionada. Escolha uma loja para editar o link de agendamento.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <Globe className="size-3.5" />
                    Agenda online
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {store.name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {publicAgendaUrl ?? `/agenda/${store.slug}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="outline">
                    <Link href="/horarios-de-atendimento">
                      <PencilLine className="size-4" />
                      Gerenciar horarios semanais
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={publicAgendaHref ?? `/agenda/${store.slug}`} target="_blank">
                      <ExternalLink className="size-4" />
                      Abrir agenda online
                    </Link>
                  </Button>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Esses dados alimentam o bloco institucional do link publico de agendamento. O resumo de horario abaixo e texto livre; os horarios operacionais continuam sendo configurados em{" "}
                <Link href="/horarios-de-atendimento" className="font-medium text-slate-900 underline underline-offset-4">
                  Horarios de atendimento
                </Link>
                .
              </p>
            </section>

            {!canEdit ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Seu perfil atual pode visualizar essas informacoes, mas nao pode edita-las. Use um usuario com perfil `ADMIN` ou `OWNER`.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Telefone</label>
                    <Input
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", maskPhone(event.target.value))
                      }
                      placeholder="(xx) xxxxx-xxxx"
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">WhatsApp</label>
                    <Input
                      value={form.whatsappPhone}
                      onChange={(event) =>
                        updateField("whatsappPhone", maskPhone(event.target.value))
                      }
                      placeholder="(xx) xxxxx-xxxx"
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Endereco</label>
                    <Input
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      placeholder="Rua, avenida ou ponto comercial"
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Complemento</label>
                    <Input
                      value={form.complement}
                      onChange={(event) => updateField("complement", event.target.value)}
                      placeholder="Sala, numero ou referencia"
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Bairro</label>
                    <Input
                      value={form.neighborhood}
                      onChange={(event) =>
                        updateField("neighborhood", event.target.value)
                      }
                      placeholder="Bairro"
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Cidade</label>
                    <Input
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      placeholder="Cidade"
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[120px_1fr] md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-slate-700">Estado</label>
                      <Input
                        value={form.state}
                        onChange={(event) => updateField("state", event.target.value)}
                        placeholder="UF"
                        disabled={!canEdit || saving}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-slate-700">CEP</label>
                      <Input
                        value={form.zipcode}
                        onChange={(event) => updateField("zipcode", event.target.value)}
                        placeholder="CEP"
                        disabled={!canEdit || saving}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Horario de atendimento exibido no link
                    </label>
                    <Textarea
                      value={form.businessHoursSummary}
                      onChange={(event) =>
                        updateField("businessHoursSummary", event.target.value)
                      }
                      placeholder="Ex.: Segunda a sexta, das 08:00 as 18:00. Sabado, das 08:00 as 13:00."
                      disabled={!canEdit || saving}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Observacoes exibidas na agenda online
                    </label>
                    <Textarea
                      value={form.serviceObservations}
                      onChange={(event) =>
                        updateField("serviceObservations", event.target.value)
                      }
                      placeholder="Ex.: Atendimento somente com horario marcado."
                      disabled={!canEdit || saving}
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <Button type="submit" disabled={!canEdit || saving}>
                  {saving ? "Salvando..." : "Salvar dados publicos"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
