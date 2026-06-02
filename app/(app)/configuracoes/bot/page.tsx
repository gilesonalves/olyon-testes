"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Bot, Loader2, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error?: string
  details?: {
    fieldErrors?: Partial<Record<keyof BotSettingsFormValues, string[]>>
  }
}

type BotSettingsFormValues = {
  welcomeMessage: string
  showMenuAfterWelcome: boolean
  humanHandoffMessage: string
  customerRequestedHumanMessage: string
  autoResumeEnabled: boolean
  autoResumeAfterMinutes: number
}

type BotSettingsResponse = BotSettingsFormValues & {
  id: string | null
  storeId: string
  createdAt: string | null
  updatedAt: string | null
}

const EMPTY_FORM: BotSettingsFormValues = {
  welcomeMessage: "",
  showMenuAfterWelcome: true,
  humanHandoffMessage: "",
  customerRequestedHumanMessage: "",
  autoResumeEnabled: false,
  autoResumeAfterMinutes: 30,
}

function toFormValues(data: BotSettingsResponse): BotSettingsFormValues {
  return {
    welcomeMessage: data.welcomeMessage,
    showMenuAfterWelcome: data.showMenuAfterWelcome,
    humanHandoffMessage: data.humanHandoffMessage,
    customerRequestedHumanMessage: data.customerRequestedHumanMessage,
    autoResumeEnabled: data.autoResumeEnabled,
    autoResumeAfterMinutes: data.autoResumeAfterMinutes,
  }
}

function getApiErrorMessage(json: ApiError | null, fallback: string) {
  return json?.error ?? fallback
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-600">{message}</p>
}

export default function BotSettingsPage() {
  const [formValues, setFormValues] =
    useState<BotSettingsFormValues>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BotSettingsFormValues, string[]>>
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<BotSettingsResponse | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const response = await fetch("/api/store/current/bot-settings", {
        cache: "no-store",
      })
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<BotSettingsResponse>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        throw new Error(
          getApiErrorMessage(
            json && !json.ok ? json : null,
            "Nao foi possivel carregar as configuracoes do bot."
          )
        )
      }

      setSettings(json.data)
      setFormValues(toFormValues(json.data))
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Nao foi possivel carregar as configuracoes do bot."

      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  function updateField<K extends keyof BotSettingsFormValues>(
    field: K,
    value: BotSettingsFormValues[K]
  ) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      const response = await fetch("/api/store/current/bot-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      })
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<BotSettingsResponse>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        if (json && !json.ok) {
          setFieldErrors(json.details?.fieldErrors ?? {})
        }

        throw new Error(
          getApiErrorMessage(
            json && !json.ok ? json : null,
            "Nao foi possivel salvar as configuracoes do bot."
          )
        )
      }

      setSettings(json.data)
      setFormValues(toFormValues(json.data))
      toast.success("Configuracoes do bot salvas com sucesso.")
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Nao foi possivel salvar as configuracoes do bot."

      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">
            Configuracoes do Bot
          </span>
        </div>
      </HeaderPage>

      <div className="w-full max-w-5xl bg-white px-4 py-6 sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              <Bot className="size-3.5" />
              WhatsApp
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">
              Configuracoes do Bot
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadSettings()}
            disabled={disabled}
            className="w-fit"
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Recarregar
          </Button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-600">
            Carregando configuracoes do bot...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">
                    Mensagem de boas-vindas
                  </Label>
                  <Textarea
                    id="welcomeMessage"
                    value={formValues.welcomeMessage}
                    onChange={(event) =>
                      updateField("welcomeMessage", event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    disabled={disabled}
                  />
                  <InlineFieldError
                    message={fieldErrors.welcomeMessage?.[0]}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                  <Label htmlFor="showMenuAfterWelcome">
                    Mostrar menu apos boas-vindas
                  </Label>
                  <Switch
                    id="showMenuAfterWelcome"
                    checked={formValues.showMenuAfterWelcome}
                    onCheckedChange={(checked) =>
                      updateField("showMenuAfterWelcome", checked)
                    }
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="humanHandoffMessage">
                    Mensagem antes de atendimento humano
                  </Label>
                  <Textarea
                    id="humanHandoffMessage"
                    value={formValues.humanHandoffMessage}
                    onChange={(event) =>
                      updateField("humanHandoffMessage", event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    disabled={disabled}
                  />
                  <InlineFieldError
                    message={fieldErrors.humanHandoffMessage?.[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerRequestedHumanMessage">
                    Mensagem quando cliente pede atendente
                  </Label>
                  <Textarea
                    id="customerRequestedHumanMessage"
                    value={formValues.customerRequestedHumanMessage}
                    onChange={(event) =>
                      updateField(
                        "customerRequestedHumanMessage",
                        event.target.value
                      )
                    }
                    maxLength={1000}
                    rows={4}
                    disabled={disabled}
                  />
                  <InlineFieldError
                    message={fieldErrors.customerRequestedHumanMessage?.[0]}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                    <Label htmlFor="autoResumeEnabled">
                      Ativar retorno automatico do bot
                    </Label>
                    <Switch
                      id="autoResumeEnabled"
                      checked={formValues.autoResumeEnabled}
                      onCheckedChange={(checked) =>
                        updateField("autoResumeEnabled", checked)
                      }
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="autoResumeAfterMinutes">
                      Retornar bot apos
                    </Label>
                    <Input
                      id="autoResumeAfterMinutes"
                      type="number"
                      min={5}
                      max={1440}
                      step={1}
                      value={formValues.autoResumeAfterMinutes}
                      onChange={(event) =>
                        updateField(
                          "autoResumeAfterMinutes",
                          Number(event.target.value)
                        )
                      }
                      disabled={disabled}
                    />
                    <InlineFieldError
                      message={fieldErrors.autoResumeAfterMinutes?.[0]}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {settings?.updatedAt
                  ? `Ultima atualizacao: ${new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(settings.updatedAt))}`
                  : "Usando defaults do sistema."}
              </p>

              <Button type="submit" disabled={disabled} className="sm:w-36">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
