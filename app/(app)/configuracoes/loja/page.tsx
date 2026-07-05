"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ExternalLink, Globe2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  storePublicInfoSchema,
  toStorePublicInfoFormValues,
  type StorePublicInfoFormValues,
} from "@/lib/store/public-info"
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
  publicInfoSource: "STORE"
  storeSettingsUrl: string
}

type ApiSuccess<T> = {
  ok: true
  data: T
}

type FieldErrorsMap = Partial<Record<keyof StorePublicInfoFormValues, string[]>>

type ApiError = {
  ok: false
  message?: string
  details?: {
    fieldErrors?: FieldErrorsMap
    formErrors?: string[]
  }
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-600">{message}</p>
}

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [store, setStore] = useState<StorePublicInfo | null>(null)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [publicAgendaUrl, setPublicAgendaUrl] = useState<string | null>(null)

  const form = useForm<StorePublicInfoFormValues>({
    resolver: zodResolver(storePublicInfoSchema),
    defaultValues: toStorePublicInfoFormValues(null),
  })

  const canEdit = membershipRole === "OWNER" || membershipRole === "ADMIN"
  const publicAgendaHref = useMemo(() => {
    if (publicAgendaUrl) {
      return publicAgendaUrl
    }

    if (!store) {
      return null
    }

    return `/agenda/${store.slug}`
  }, [publicAgendaUrl, store])

  function applyFieldErrors(fieldErrors?: FieldErrorsMap) {
    if (!fieldErrors) {
      return
    }

    for (const [fieldName, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0]

      if (!message) {
        continue
      }

      form.setError(fieldName as keyof StorePublicInfoFormValues, { message })
    }
  }

  useEffect(() => {
    let alive = true

    async function loadCurrentStore() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/store/current", { cache: "no-store" })
        const json = (await response.json().catch(() => null)) as
          | ApiSuccess<CurrentStorePayload>
          | ApiError
          | null

        if (!response.ok || !json?.ok) {
          throw new Error(
            json && !json.ok
              ? (json.message ?? "Não foi possível carregar os dados da loja.")
              : "Não foi possível carregar os dados da loja."
          )
        }

        if (!alive) {
          return
        }

        setStore(json.data.store)
        setMembershipRole(json.data.membership?.role ?? null)
        setPublicAgendaUrl(json.data.publicAgendaUrl)
        form.reset(toStorePublicInfoFormValues(json.data.store))
      } catch (loadError) {
        if (!alive) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os dados da loja."
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
  }, [form])

  async function onSubmit(values: StorePublicInfoFormValues) {
    if (!canEdit) {
      toast.error("Seu perfil atual não pode editar os dados da loja.")
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
        body: JSON.stringify(values),
      })

      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<{
            store: StorePublicInfo
            publicAgendaUrl: string | null
          }>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        if (json && !json.ok) {
          applyFieldErrors(json.details?.fieldErrors)
        }

        throw new Error(
          json && !json.ok
            ? (json.message ?? "Não foi possível salvar os dados da loja.")
            : "Não foi possível salvar os dados da loja."
        )
      }

      setStore(json.data.store)
      setPublicAgendaUrl(json.data.publicAgendaUrl)
      form.reset(toStorePublicInfoFormValues(json.data.store))
      toast.success("Dados da loja salvos com sucesso.")
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os dados da loja."

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
          <span className="font-normal text-foreground">Configurações da loja</span>
        </div>
      </HeaderPage>

      <div className="w-full max-w-6xl bg-white px-4 py-6 sm:px-6 sm:py-7">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] px-5 py-10 text-center text-sm text-slate-600">
            Carregando dados da loja...
          </div>
        ) : !store ? (
          <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/80 px-5 py-10 text-center text-sm text-amber-800">
            {error ??
              "Nenhuma loja selecionada. Escolha uma loja para editar os dados públicos."}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <Settings2 className="size-3.5" />
                    Loja pública
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {store.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Esta tela é a fonte principal para editar telefone, endereço e
                      informações institucionais da sua loja.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="outline">
                    <Link href="/agenda-online">
                      <Globe2 className="size-4" />
                      Abrir hub da agenda
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={publicAgendaHref ?? `/agenda/${store.slug}`} target="_blank">
                      <ExternalLink className="size-4" />
                      Abrir agenda pública
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Link público
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-900">
                    {publicAgendaHref ?? `/agenda/${store.slug}`}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Como esses dados são usados
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    A agenda pública e os textos institucionais da loja leem estas
                    informações diretamente da loja.
                  </p>
                </div>
              </div>
            </section>

            {!canEdit ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Seu perfil atual pode visualizar estas informações, mas não pode
                editá-las. Use um usuário com perfil ADMIN ou OWNER.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Contato e localização
                  </h3>
                  <p className="text-sm text-slate-600">
                    Estes campos aparecem no bloco institucional da agenda pública.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Controller
                      control={form.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            id="phone"
                            value={field.value}
                            onChange={(event) =>
                              field.onChange(maskPhone(event.target.value))
                            }
                            placeholder="Ex: (11) 3333-4444"
                            disabled={!canEdit || saving}
                          />
                          <InlineFieldError message={fieldState.error?.message} />
                        </>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsappPhone">WhatsApp</Label>
                    <Controller
                      control={form.control}
                      name="whatsappPhone"
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            id="whatsappPhone"
                            value={field.value}
                            onChange={(event) =>
                              field.onChange(maskPhone(event.target.value))
                            }
                            placeholder="Ex: (11) 99999-8888"
                            disabled={!canEdit || saving}
                          />
                          <InlineFieldError message={fieldState.error?.message} />
                        </>
                      )}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Endereco</Label>
                    <Input
                      id="address"
                      placeholder="Ex: Rua das Flores, 123"
                      disabled={!canEdit || saving}
                      {...form.register("address")}
                    />
                    <InlineFieldError message={form.formState.errors.address?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      placeholder="Ex: Sala 2"
                      disabled={!canEdit || saving}
                      {...form.register("complement")}
                    />
                    <InlineFieldError message={form.formState.errors.complement?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ex: Centro"
                      disabled={!canEdit || saving}
                      {...form.register("neighborhood")}
                    />
                    <InlineFieldError message={form.formState.errors.neighborhood?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Ex: Sao Paulo"
                      disabled={!canEdit || saving}
                      {...form.register("city")}
                    />
                    <InlineFieldError message={form.formState.errors.city?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      placeholder="Ex: SP"
                      disabled={!canEdit || saving}
                      {...form.register("state")}
                    />
                    <InlineFieldError message={form.formState.errors.state?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipcode">CEP</Label>
                    <Input
                      id="zipcode"
                      placeholder="Ex: 01000-000"
                      disabled={!canEdit || saving}
                      {...form.register("zipcode")}
                    />
                    <InlineFieldError message={form.formState.errors.zipcode?.message} />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Texto institucional
                  </h3>
                  <p className="text-sm text-slate-600">
                    Mantenha aqui o resumo de horario e as observacoes exibidas ao
                    publico.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessHoursSummary">
                      Resumo do horario de funcionamento
                    </Label>
                    <Textarea
                      id="businessHoursSummary"
                      rows={3}
                      placeholder="Ex: Segunda a sexta, das 9h as 18h. Sabado, das 9h as 13h."
                      disabled={!canEdit || saving}
                      {...form.register("businessHoursSummary")}
                    />
                    <InlineFieldError
                      message={form.formState.errors.businessHoursSummary?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceObservations">
                      Observacoes de atendimento
                    </Label>
                    <Textarea
                      id="serviceObservations"
                      rows={4}
                      placeholder="Ex: Atendimento somente com horario marcado."
                      disabled={!canEdit || saving}
                      {...form.register("serviceObservations")}
                    />
                    <InlineFieldError
                      message={form.formState.errors.serviceObservations?.message}
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <Button type="submit" disabled={!canEdit || saving}>
                  {saving ? "Salvando..." : "Salvar dados da loja"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
