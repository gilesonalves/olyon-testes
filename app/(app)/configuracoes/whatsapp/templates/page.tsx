"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  RefreshCw,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MetaWhatsAppTemplate } from "@/lib/meta/meta-templates"

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error?: string
  details?: {
    metaStatusCode?: number | null
    graphError?: {
      message?: string | null
      fbtraceId?: string | null
    } | null
    graphResponse?: unknown
    responsePreview?: string | null
  }
}

type TemplateSendResult = {
  graphResponse: unknown
  graphMessageId: string | null
  requestSummary: {
    to: string
    templateName: string
    languageCode: string
    bodyParameterCount: number
    namedBodyParameterCount: number
    componentsCount: number
    phoneNumberId: string
  }
}

type SendResultState =
  | {
      ok: true
      data: TemplateSendResult
    }
  | {
      ok: false
      error: string
      details?: ApiError["details"]
  }
  | null

type BodyPlaceholder = {
  inputKey: string
  label: string
  kind: "numeric" | "named"
  parameterName?: string
  example?: string
}

function stringifyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return "Valor nao serializavel"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function getComponentType(component: Record<string, unknown>) {
  return typeof component.type === "string" ? component.type.toUpperCase() : ""
}

function getBodyComponent(template: MetaWhatsAppTemplate | null) {
  return (
    template?.components.find(
      (component) => getComponentType(component) === "BODY"
    ) ?? null
  )
}

function getBodyText(template: MetaWhatsAppTemplate | null) {
  const bodyComponent = getBodyComponent(template)
  const text = bodyComponent?.text

  return typeof text === "string" ? text : ""
}

function toOptionalText(value: unknown) {
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return null
}

function getNamedBodyExamples(template: MetaWhatsAppTemplate | null) {
  const bodyComponent = getBodyComponent(template)
  const example = isRecord(bodyComponent?.example)
    ? bodyComponent.example
    : null
  const namedParams = Array.isArray(example?.body_text_named_params)
    ? example.body_text_named_params
    : []
  const examples: Record<string, string> = {}

  for (const param of namedParams) {
    if (!isRecord(param)) {
      continue
    }

    const paramName = toOptionalText(param.param_name)?.trim()
    const exampleValue = toOptionalText(param.example)

    if (paramName && exampleValue != null) {
      examples[paramName] = exampleValue
    }
  }

  return examples
}

function extractBodyPlaceholders(
  text: string,
  namedExamples: Record<string, string>
) {
  const placeholders: BodyPlaceholder[] = []
  const seen = new Set<string>()
  const placeholderRegex = /{{\s*([A-Za-z_][A-Za-z0-9_]*|\d+)\s*}}/g

  for (const match of text.matchAll(placeholderRegex)) {
    const placeholderName = match[1]
    const kind = /^\d+$/.test(placeholderName) ? "numeric" : "named"
    const inputKey = `${kind}:${placeholderName}`

    if (seen.has(inputKey)) {
      continue
    }

    seen.add(inputKey)
    placeholders.push({
      inputKey,
      kind,
      label: kind === "named" ? placeholderName : `{{${placeholderName}}}`,
      parameterName: kind === "named" ? placeholderName : undefined,
      example: kind === "named" ? namedExamples[placeholderName] : undefined,
    })
  }

  return placeholders
}

function getFallbackNamedPlaceholders(template: MetaWhatsAppTemplate | null) {
  const bodyComponent = getBodyComponent(template)
  const example = isRecord(bodyComponent?.example)
    ? bodyComponent.example
    : null
  const namedParams = Array.isArray(example?.body_text_named_params)
    ? example.body_text_named_params
    : []
  const placeholders: BodyPlaceholder[] = []

  for (const param of namedParams) {
    if (!isRecord(param)) {
      continue
    }

    const paramName = toOptionalText(param.param_name)?.trim()

    if (!paramName) {
      continue
    }

    placeholders.push({
      inputKey: `named:${paramName}`,
      kind: "named",
      label: paramName,
      parameterName: paramName,
      example: toOptionalText(param.example) ?? undefined,
    })
  }

  return placeholders
}

function getBodyPlaceholders(template: MetaWhatsAppTemplate | null) {
  const bodyText = getBodyText(template)
  const namedExamples = getNamedBodyExamples(template)
  const placeholders = extractBodyPlaceholders(bodyText, namedExamples)

  if (placeholders.length > 0) {
    return placeholders
  }

  return getFallbackNamedPlaceholders(template)
}

function getNamedBodyParameters(
  placeholders: BodyPlaceholder[],
  values: Record<string, string>
) {
  const namedEntries = placeholders
    .filter(
      (placeholder) =>
        placeholder.kind === "named" && Boolean(placeholder.parameterName)
    )
    .map((placeholder) => [
      placeholder.parameterName!,
      values[placeholder.inputKey] ?? "",
    ])

  if (!namedEntries.length) {
    return undefined
  }

  return Object.fromEntries(namedEntries)
}

function getNumericBodyParameters(
  placeholders: BodyPlaceholder[],
  values: Record<string, string>
) {
  return placeholders
    .filter((placeholder) => placeholder.kind === "numeric")
    .map((placeholder) => values[placeholder.inputKey] ?? "")
}

function hasNamedPlaceholders(placeholders: BodyPlaceholder[]) {
  return placeholders.some((placeholder) => placeholder.kind === "named")
}

function hasNumericPlaceholders(placeholders: BodyPlaceholder[]) {
  return placeholders.some((placeholder) => placeholder.kind === "numeric")
}

function getPlaceholderDescription(placeholders: BodyPlaceholder[]) {
  if (hasNamedPlaceholders(placeholders) && hasNumericPlaceholders(placeholders)) {
    return "Placeholders nomeados e numericos detectados no BODY."
  }

  if (hasNamedPlaceholders(placeholders)) {
    return "Placeholders nomeados detectados no BODY."
  }

  if (hasNumericPlaceholders(placeholders)) {
    return "Placeholders numericos detectados no BODY."
  }

  return "Nenhum placeholder encontrado no BODY."
}

function getGraphErrorFbtraceId(result: SendResultState) {
  if (!result || result.ok) {
    return null
  }

  return result.details?.graphError?.fbtraceId ?? null
}

function getTemplateLabel(template: MetaWhatsAppTemplate) {
  return `${template.name} (${template.language})`
}

export default function WhatsAppTemplatesTestPage() {
  const [templates, setTemplates] = useState<MetaWhatsAppTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [to, setTo] = useState("")
  const [languageCode, setLanguageCode] = useState("")
  const [bodyValues, setBodyValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SendResultState>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  )
  const bodyText = useMemo(
    () => getBodyText(selectedTemplate),
    [selectedTemplate]
  )
  const placeholders = useMemo(
    () => getBodyPlaceholders(selectedTemplate),
    [selectedTemplate]
  )

  useEffect(() => {
    if (!selectedTemplate) {
      setLanguageCode("")
      setBodyValues({})
      return
    }

    setLanguageCode(selectedTemplate.language)
    setBodyValues(
      Object.fromEntries(
        placeholders.map((placeholder) => [
          placeholder.inputKey,
          placeholder.example ?? "",
        ])
      )
    )
  }, [placeholders, selectedTemplate])

  async function loadTemplates() {
    setLoadingTemplates(true)
    setLoadError(null)
    setResult(null)

    try {
      const response = await fetch("/api/store/current/whatsapp/templates/meta", {
        method: "GET",
        cache: "no-store",
      })
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<MetaWhatsAppTemplate[]>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        const message =
          json && !json.ok && json.error
            ? json.error
            : "Nao foi possivel carregar templates WhatsApp."

        setLoadError(message)
        toast.error(message)
        return
      }

      setTemplates(json.data)
      setSelectedTemplateId((currentId) => {
        if (json.data.some((template) => template.id === currentId)) {
          return currentId
        }

        return json.data[0]?.id ?? ""
      })
      toast.success("Templates WhatsApp carregados.")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar templates WhatsApp."

      setLoadError(message)
      toast.error(message)
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function sendTemplate() {
    if (!selectedTemplate) {
      toast.error("Selecione um template antes de enviar.")
      return
    }

    setSending(true)
    setResult(null)

    try {
      const response = await fetch(
        "/api/store/current/whatsapp/templates/test-send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to,
            templateName: selectedTemplate.name,
            languageCode,
            bodyParameters: hasNamedPlaceholders(placeholders)
              ? []
              : getNumericBodyParameters(placeholders, bodyValues),
            namedBodyParameters: getNamedBodyParameters(placeholders, bodyValues),
          }),
        }
      )
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<TemplateSendResult>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        const message =
          json && !json.ok && json.error
            ? json.error
            : "Nao foi possivel enviar o template WhatsApp."

        setResult({
          ok: false,
          error: message,
          details: json && !json.ok ? json.details : undefined,
        })
        toast.error(message)
        return
      }

      setResult({
        ok: true,
        data: json.data,
      })
      toast.success("Template WhatsApp enviado para a Meta.")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar o template WhatsApp."

      setResult({
        ok: false,
        error: message,
      })
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  const canSend =
    Boolean(selectedTemplate) &&
    to.trim().length > 0 &&
    languageCode.trim().length > 0 &&
    !sending
  const fbtraceId = getGraphErrorFbtraceId(result)

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between gap-3">
          <span className="font-normal text-foreground">
            Templates WhatsApp
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/configuracoes/whatsapp">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </HeaderPage>

      <div className="w-full max-w-6xl bg-white px-4 py-6 sm:px-6 sm:py-7">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  <FileText className="size-3.5" />
                  App Review Meta
                </div>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  Teste de templates WhatsApp
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  Use esta tela para demonstrar selecao de template,
                  preenchimento de placeholders e envio para um destinatario de
                  teste.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadTemplates()}
                disabled={loadingTemplates || sending}
              >
                <RefreshCw
                  className={
                    loadingTemplates ? "size-4 animate-spin" : "size-4"
                  }
                />
                {loadingTemplates ? "Carregando..." : "Carregar templates"}
              </Button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Após enviar, abra o WhatsApp nativo do destinatário e mostre a
              mensagem recebida.
            </div>
          </section>

          {loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-2">
                <Label htmlFor="template">Template aprovado</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  disabled={loadingTemplates || sending || templates.length === 0}
                >
                  <SelectTrigger id="template" className="w-full">
                    <SelectValue placeholder="Carregue e selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {getTemplateLabel(template)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="languageCode">languageCode</Label>
                <Input
                  id="languageCode"
                  value={languageCode}
                  onChange={(event) => setLanguageCode(event.target.value)}
                  placeholder="Ex: pt_BR"
                  disabled={sending}
                />
              </div>
            </div>

            {selectedTemplate ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {selectedTemplate.status}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Categoria
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {selectedTemplate.category}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Idioma
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {selectedTemplate.language}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    BODY e placeholders
                  </h3>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {bodyText || "Template sem componente BODY textual."}
                  </div>

                  {placeholders.length ? (
                    <>
                      <p className="mt-2 text-sm text-slate-500">
                        {getPlaceholderDescription(placeholders)}
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {placeholders.map((placeholder) => (
                          <div className="space-y-2" key={placeholder.inputKey}>
                            <Label htmlFor={`placeholder-${placeholder.inputKey}`}>
                              {placeholder.label}
                            </Label>
                            <Input
                              id={`placeholder-${placeholder.inputKey}`}
                              value={bodyValues[placeholder.inputKey] ?? ""}
                              onChange={(event) =>
                                setBodyValues((currentValues) => ({
                                  ...currentValues,
                                  [placeholder.inputKey]: event.target.value,
                                }))
                              }
                              placeholder={
                                placeholder.example
                                  ? `Ex: ${placeholder.example}`
                                  : "Valor de teste"
                              }
                              disabled={sending}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Nenhum placeholder encontrado no BODY.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Componentes retornados pela Meta
                  </h3>
                  <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-50">
                    {stringifyJson(selectedTemplate.components)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Carregue os templates da WABA conectada para selecionar um item
                aprovado.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="to">Destinatario de teste</Label>
                <Input
                  id="to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  placeholder="Ex: 5511999999999"
                  disabled={sending}
                />
              </div>

              <Button
                type="button"
                onClick={() => void sendTemplate()}
                disabled={!canSend}
              >
                <Send className="size-4" />
                {sending ? "Enviando..." : "Enviar template de teste"}
              </Button>
            </div>
          </section>

          {result ? (
            <section
              className={
                result.ok
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"
                  : "rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"
              }
            >
              <div className="flex items-start gap-3">
                {result.ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                ) : (
                  <CircleAlert className="mt-0.5 size-5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">
                    {result.ok
                      ? "Template enviado para a Meta"
                      : "Falha ao enviar template"}
                  </h3>
                  <p className="mt-1 text-sm">
                    {result.ok
                      ? `Graph message id: ${result.data.graphMessageId ?? "-"}`
                      : result.error}
                  </p>

                  {!result.ok && fbtraceId ? (
                    <p className="mt-1 text-sm">fbtrace_id: {fbtraceId}</p>
                  ) : null}

                  <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-white/80 p-4 text-xs text-slate-800">
                    {result.ok
                      ? stringifyJson(result.data.graphResponse)
                      : stringifyJson(result.details?.graphResponse ?? result.details)}
                  </pre>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  )
}
