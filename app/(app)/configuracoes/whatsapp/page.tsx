"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckCircle2,
  CircleAlert,
  FileText,
  KeyRound,
  MessageSquareShare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button"
import { WhatsAppTemplateProvisioningPanel } from "@/components/whatsapp/template-provisioning-panel"
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
import { Switch } from "@/components/ui/switch"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import {
  WHATSAPP_CONNECTION_STATUS_LABELS,
  WHATSAPP_CONNECTION_STATUS_OPTIONS,
  WHATSAPP_PROVIDER_LABELS,
  WHATSAPP_PROVIDER_OPTIONS,
  whatsAppConnectionSchema,
  type WhatsAppConnectionEditableRecord,
  type WhatsAppConnectionFormValues,
  type WhatsAppConnectionState,
} from "@/lib/whatsapp/admin-connection"
import {
  evaluateWhatsAppConnectionOperationalStatus,
  type WhatsAppConnectionOperationalAssessment,
  type WhatsAppConnectionOperationalCheck,
  type WhatsAppConnectionOperationalState,
} from "@/lib/whatsapp/operational-status"
import type {
  MetaConnectionCheckStatus,
  WhatsAppConnectionRealCheckResult,
} from "@/lib/whatsapp/meta-connection-check"

type StoreScopedWhatsAppConnectionData = {
  connection: WhatsAppConnectionEditableRecord | null
  state: WhatsAppConnectionState
  stateLabel: string
  formValues: WhatsAppConnectionFormValues
  operational: WhatsAppConnectionOperationalAssessment
}

type ApiSuccess<T> = {
  ok: true
  data: T
}

type FieldErrorsMap = Partial<Record<keyof WhatsAppConnectionFormValues, string[]>>

type ApiError = {
  ok: false
  error?: string
  details?: {
    fieldErrors?: FieldErrorsMap
  }
}

type FeedbackState =
  | { tone: "success" | "error"; message: string }
  | null

type EmbeddedSignupStatusTone = "connected" | "pending" | "disconnected" | "error"

const EMPTY_DATA: StoreScopedWhatsAppConnectionData = {
  connection: null,
  state: "missing",
  stateLabel: "Sem conexão",
  formValues: {
    provider: "META_WHATSAPP",
    phoneNumberId: "",
    businessAccountId: "",
    displayPhoneNumber: "",
    verifyToken: "",
    accessToken: "",
    status: "PENDING",
    isActive: true,
  },
  operational: evaluateWhatsAppConnectionOperationalStatus(null),
}

const OPERATIONAL_STATE_STYLES: Record<WhatsAppConnectionOperationalState, string> = {
  missing: "border-slate-200 bg-slate-100 text-slate-700",
  incomplete: "border-orange-200 bg-orange-100 text-orange-800",
  inactive: "border-amber-200 bg-amber-100 text-amber-800",
  ready: "border-emerald-200 bg-emerald-100 text-emerald-700",
}

const REAL_CHECK_STATUS_LABELS: Record<MetaConnectionCheckStatus, string> = {
  success: "Sucesso tecnico",
  failed: "Falha tecnica",
  blocked: "Teste bloqueado",
}

const REAL_CHECK_STATUS_STYLES: Record<MetaConnectionCheckStatus, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  blocked: "border-orange-200 bg-orange-50 text-orange-800",
}

function getEmbeddedSignupStatus(data: StoreScopedWhatsAppConnectionData) {
  if (!data.connection?.id || data.connection.isActive === false) {
    return {
      label: "Não conectado",
      tone: "disconnected" as EmbeddedSignupStatusTone,
    }
  }

  if (data.connection.status === "CONNECTED" && data.operational.isReady) {
    return {
      label: "Conectado",
      tone: "connected" as EmbeddedSignupStatusTone,
    }
  }

  if (data.connection.status === "ERROR") {
    return {
      label: "Erro na conexão",
      tone: "error" as EmbeddedSignupStatusTone,
    }
  }

  return {
    label: "Pendente",
    tone: "pending" as EmbeddedSignupStatusTone,
  }
}

const EMBEDDED_SIGNUP_STATUS_STYLES: Record<EmbeddedSignupStatusTone, string> = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disconnected: "border-slate-200 bg-slate-100 text-slate-700",
  pending: "border-orange-200 bg-orange-50 text-orange-800",
  error: "border-red-200 bg-red-50 text-red-700",
}

function getFriendlyStatusSummary(statusTone: EmbeddedSignupStatusTone) {
  switch (statusTone) {
    case "connected":
      return "A loja já possui uma conexão pronta para uso com o WhatsApp Business."
    case "error":
      return "A loja precisa revisar ou refazer a conexão com a Meta para voltar a operar."
    case "pending":
      return "A conexão foi iniciada, mas ainda não foi concluída ou validada por completo."
    default:
      return "A loja ainda não concluiu a conexão do WhatsApp Business com o Olyon."
  }
}

function formatCheckFlag(value: boolean | null) {
  if (value === true) {
    return "Sim"
  }

  if (value === false) {
    return "Não"
  }

  return "Não verificado"
}

function formatAccessTokenRead(
  value: WhatsAppConnectionRealCheckResult["details"]["accessTokenRead"]
) {
  if (!value.present) {
    return "Não lido"
  }

  return `Sim (${value.trimmedLength} chars, sha256 ${value.sha256Prefix ?? "-"})`
}

function formatCheckedAt(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date)
}

function createRequestFailureCheckResult(
  data: StoreScopedWhatsAppConnectionData,
  message: string
): WhatsAppConnectionRealCheckResult {
  return {
    ok: false,
    status: "failed",
    message,
    checkedAt: new Date().toISOString(),
    details: {
      storeId: null,
      whatsappConnectionId: data.connection?.id ?? null,
      provider: data.connection?.provider ?? null,
      operationalState: data.operational.state,
      operationalStateLabel: data.operational.stateLabel,
      operationalBlockingIssues: data.operational.blockingIssues,
      phoneNumberId: data.connection?.phoneNumberId ?? null,
      businessAccountId: data.connection?.businessAccountId ?? null,
      expectedDisplayPhoneNumber: data.connection?.displayPhoneNumber ?? null,
      accessTokenRead: {
        source: "WhatsAppConnection.accessToken",
        present: false,
        trimmedLength: 0,
        sha256Prefix: null,
      },
      metaGraphApiVersion: "v25.0",
      metaRequestPath: null,
      metaStatusCode: null,
      checks: {
        tokenAuthenticated: null,
        phoneNumberAccessible: null,
        displayPhoneNumberMatches: null,
      },
      returnedPhoneNumber: null,
      graphError: null,
      responsePreview: null,
    },
  }
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-600">{message}</p>
}

function ConnectionSummaryItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm text-slate-900">{value}</p>
    </div>
  )
}

function OperationalCheckItem({
  check,
}: {
  check: WhatsAppConnectionOperationalCheck
}) {
  return (
    <div
      className={
        check.ok
          ? "rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3"
          : "rounded-2xl border border-orange-200 bg-orange-50/80 px-4 py-3"
      }
    >
      <div className="flex items-start gap-3">
        {check.ok ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        ) : (
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-orange-700" />
        )}

        <div>
          <p className="text-sm font-medium text-slate-950">{check.label}</p>
          <p className="mt-1 text-sm text-slate-600">{check.message}</p>
        </div>
      </div>
    </div>
  )
}

export default function StoreWhatsAppSettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(false)
  const [ready, setReady] = useState(false)
  const [showAccessToken, setShowAccessToken] = useState(false)
  const [data, setData] = useState<StoreScopedWhatsAppConnectionData>(EMPTY_DATA)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [checkResult, setCheckResult] = useState<WhatsAppConnectionRealCheckResult | null>(
    null
  )

  const form = useForm<WhatsAppConnectionFormValues>({
    resolver: zodResolver(whatsAppConnectionSchema),
    defaultValues: EMPTY_DATA.formValues,
  })
  const embeddedSignupStatus = getEmbeddedSignupStatus(data)
  const canSeeTechnicalDiagnostics =
    session?.user.globalRole === SUPER_ADMIN_ROLE

  function applyFieldErrors(fieldErrors?: FieldErrorsMap) {
    if (!fieldErrors) {
      return
    }

    for (const [fieldName, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0]
      if (!message) {
        continue
      }

      form.setError(fieldName as keyof WhatsAppConnectionFormValues, {
        message,
      })
    }
  }

  const loadConnection = useCallback(async () => {
    setLoading(true)
    setFeedback(null)
    setCheckResult(null)

    try {
      const response = await fetch("/api/store/current/whatsapp-connection", {
        cache: "no-store",
      })
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<StoreScopedWhatsAppConnectionData>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        throw new Error(
          json && !json.ok
            ? (json.error ?? "Não foi possível carregar a conexão do WhatsApp da loja.")
            : "Não foi possível carregar a conexão do WhatsApp da loja."
        )
      }

      setData(json.data)
      setReady(true)
      form.reset(json.data.formValues)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a conexão do WhatsApp da loja."

      setReady(false)
      setFeedback({ tone: "error", message })
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    void loadConnection()
  }, [loadConnection])

  async function onSubmit(values: WhatsAppConnectionFormValues) {
    setSaving(true)
    setFeedback(null)

    try {
      const response = await fetch("/api/store/current/whatsapp-connection", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<StoreScopedWhatsAppConnectionData>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        if (json && !json.ok) {
          applyFieldErrors(json.details?.fieldErrors)
        }

        throw new Error(
          json && !json.ok
            ? (json.error ?? "Não foi possível salvar a conexão do WhatsApp da loja.")
            : "Não foi possível salvar a conexão do WhatsApp da loja."
        )
      }

      const createdNow = !data.connection?.id

      setData(json.data)
      setCheckResult(null)
      setReady(true)
      form.reset(json.data.formValues)
      setFeedback({
        tone: "success",
        message: createdNow
          ? "Conexão do WhatsApp criada com sucesso."
          : "Conexão do WhatsApp atualizada com sucesso.",
      })
      toast.success(
        createdNow
          ? "Conexão do WhatsApp criada com sucesso."
          : "Conexão do WhatsApp atualizada com sucesso."
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a conexão do WhatsApp da loja."

      setFeedback({ tone: "error", message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function runRealConnectionCheck() {
    setCheckingConnection(true)
    setCheckResult(null)

    try {
      const response = await fetch("/api/store/current/whatsapp-connection/check", {
        method: "POST",
      })

      const json = (await response.json().catch(() => null)) as
        | ApiSuccess<WhatsAppConnectionRealCheckResult>
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        throw new Error(
          json && !json.ok
            ? (json.error ??
              "Não foi possível executar a verificação real da conexão Meta.")
            : "Não foi possível executar a verificação real da conexão Meta."
        )
      }

      setCheckResult(json.data)

      if (json.data.ok) {
        toast.success(json.data.message)
      } else {
        toast.error(json.data.message)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível executar a verificação real da conexão Meta."

      setCheckResult(createRequestFailureCheckResult(data, message))
      toast.error(message)
    } finally {
      setCheckingConnection(false)
    }
  }

  const inputsDisabled = saving || checkingConnection || !ready

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">WhatsApp Business</span>
        </div>
      </HeaderPage>

      <div className="w-full max-w-6xl bg-white px-4 py-6 sm:px-6 sm:py-7">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_40%,#eef6ff_100%)] px-5 py-10 text-center text-sm text-slate-600">
            Carregando conexão do WhatsApp...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <MessageSquareShare className="size-3.5" />
                    Canal da loja
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">
                      WhatsApp Business
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">
                      Conecte o WhatsApp Business da sua loja para receber e
                      responder agendamentos pelo Olyon.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${EMBEDDED_SIGNUP_STATUS_STYLES[embeddedSignupStatus.tone]}`}
                  >
                    {embeddedSignupStatus.label}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadConnection()}
                    disabled={loading || saving || checkingConnection}
                  >
                    <RefreshCw className="size-4" />
                    Recarregar
                  </Button>

                  <Button asChild variant="outline">
                    <Link href="/configuracoes/whatsapp/templates">
                      <FileText className="size-4" />
                      Testar templates WhatsApp
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Status atual
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {getFriendlyStatusSummary(embeddedSignupStatus.tone)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <KeyRound className="size-4 text-sky-700" />
                    Permissão Meta
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Para conectar, use uma conta que tenha permissão de
                    administrador no Gerenciador de Negócios/WhatsApp Business da
                    Meta.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <CircleAlert className="size-4 text-amber-700" />
                    Validação Meta
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    O fluxo não pré-seleciona um portfólio empresarial. A Meta
                    define quais portfólios e contas estão elegíveis para
                    compartilhamento com o app.
                  </p>
                </div>
              </div>

              {canSeeTechnicalDiagnostics ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                  Diagnóstico técnico habilitado para a conexão WhatsApp da loja
                  atual da sessão. Esta visualização continua restrita à loja e
                  nunca representa uma conexão global do sistema.
                </div>
              ) : null}
            </section>

            {feedback ? (
              <div
                className={
                  feedback.tone === "success"
                    ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                    : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                }
              >
                {feedback.message}
              </div>
            ) : null}

            <EmbeddedSignupButton
              disabled={loading || saving || checkingConnection || !ready}
              statusLabel={embeddedSignupStatus.label}
              statusTone={embeddedSignupStatus.tone}
              onConnectionUpdated={loadConnection}
            />

            <WhatsAppTemplateProvisioningPanel
              refreshKey={[
                data.connection?.id ?? "missing",
                data.connection?.businessAccountId ?? "",
                data.connection?.status ?? "",
              ].join(":")}
            />

            {canSeeTechnicalDiagnostics ? (
              <>
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        <MessageSquareShare className="size-3.5" />
                        Diagnóstico técnico
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">
                          Conexão WhatsApp da loja atual
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm text-slate-600">
                          Os dados abaixo diagnosticam apenas a conexão vinculada à
                          loja da sessão atual. Nada aqui representa uma conexão
                          global única do sistema.
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${OPERATIONAL_STATE_STYLES[data.operational.state]}`}
                    >
                      {data.operational.stateLabel}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <ShieldCheck className="size-4 text-emerald-600" />
                        Estado operacional
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {data.operational.summary}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <KeyRound className="size-4 text-sky-700" />
                        Auditoria mínima
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {data.operational.completedChecks}/{data.operational.totalChecks} checks
                        operacionais concluídos para a loja atual.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-sm font-medium text-slate-900">
                        Prontidão atual
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {data.operational.isReady
                          ? "A conexão desta loja está pronta para uso operacional com a configuração mínima atual."
                          : `${data.operational.blockingIssues.length} pendência(s) ainda impedem o uso operacional confiável desta loja.`}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        Teste real com Meta
                      </h3>
                      <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        Este teste faz uma chamada real na Graph API usando a
                        conexão salva da loja atual. O resultado abaixo é
                        separado da auditoria operacional local.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={
                          checkResult
                            ? `inline-flex rounded-full border px-3 py-1 text-sm font-medium ${REAL_CHECK_STATUS_STYLES[checkResult.status]}`
                            : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
                        }
                      >
                        {checkResult
                          ? REAL_CHECK_STATUS_LABELS[checkResult.status]
                          : "Nenhum teste executado"}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void runRealConnectionCheck()}
                        disabled={loading || saving || checkingConnection || !ready}
                      >
                        <RefreshCw
                          className={checkingConnection ? "size-4 animate-spin" : "size-4"}
                        />
                        {checkingConnection ? "Verificando..." : "Verificar conexão real"}
                      </Button>
                    </div>
                  </div>

                  {checkingConnection ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-sky-300 bg-sky-50/80 px-4 py-4 text-sm text-sky-800">
                      Consultando a Meta Graph API com a conexão salva para esta
                      loja...
                    </div>
                  ) : null}

                  {checkResult ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-4 ${REAL_CHECK_STATUS_STYLES[checkResult.status]}`}
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{checkResult.message}</p>
                          <p className="mt-1 text-xs opacity-80">
                            Última execução: {formatCheckedAt(checkResult.checkedAt)}
                          </p>
                        </div>

                        <span className="text-xs font-medium uppercase tracking-[0.18em] opacity-80">
                          {REAL_CHECK_STATUS_LABELS[checkResult.status]}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <ConnectionSummaryItem
                          label="Token autenticado"
                          value={formatCheckFlag(checkResult.details.checks.tokenAuthenticated)}
                        />
                        <ConnectionSummaryItem
                          label="Token lido no backend"
                          value={formatAccessTokenRead(checkResult.details.accessTokenRead)}
                        />
                        <ConnectionSummaryItem
                          label="phoneNumberId acessível"
                          value={formatCheckFlag(checkResult.details.checks.phoneNumberAccessible)}
                        />
                        <ConnectionSummaryItem
                          label="Número confere"
                          value={formatCheckFlag(
                            checkResult.details.checks.displayPhoneNumberMatches
                          )}
                        />
                        <ConnectionSummaryItem
                          label="HTTP Meta"
                          value={
                            checkResult.details.metaStatusCode != null
                              ? String(checkResult.details.metaStatusCode)
                              : "-"
                          }
                        />
                        <ConnectionSummaryItem
                          label="Número retornado"
                          value={
                            checkResult.details.returnedPhoneNumber?.displayPhoneNumber ??
                            "-"
                          }
                        />
                        <ConnectionSummaryItem
                          label="verifiedName"
                          value={
                            checkResult.details.returnedPhoneNumber?.verifiedName ?? "-"
                          }
                        />
                        <ConnectionSummaryItem
                          label="platform_type"
                          value={
                            checkResult.details.returnedPhoneNumber?.platformType ?? "-"
                          }
                        />
                      </div>

                      {checkResult.status === "blocked" &&
                      checkResult.details.operationalBlockingIssues.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-orange-200 bg-white/70 px-4 py-3 text-sm text-orange-900">
                          <p className="font-medium">Motivos do bloqueio</p>
                          <ul className="mt-2 ml-5 list-disc space-y-1">
                            {checkResult.details.operationalBlockingIssues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {checkResult.details.graphError ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">
                            Erro retornado pela Meta
                          </p>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <p>
                              <span className="font-medium">Mensagem:</span>{" "}
                              {checkResult.details.graphError.message ?? "-"}
                            </p>
                            <p>
                              <span className="font-medium">Tipo:</span>{" "}
                              {checkResult.details.graphError.type ?? "-"}
                            </p>
                            <p>
                              <span className="font-medium">Code:</span>{" "}
                              {checkResult.details.graphError.code ?? "-"}
                            </p>
                            <p>
                              <span className="font-medium">fbtrace_id:</span>{" "}
                              {checkResult.details.graphError.fbtraceId ?? "-"}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {checkResult.details.responsePreview ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">
                            Preview controlado da resposta
                          </p>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-600">
                            {checkResult.details.responsePreview}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                      Nenhum teste real foi executado ainda para a conexão atual
                      desta loja.
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        Checklist operacional
                      </h3>
                      <p className="text-sm text-slate-600">
                        Validação mínima da configuração salva para a conexão da
                        loja atual.
                      </p>
                    </div>

                    <span
                      className={
                        data.operational.isReady
                          ? "inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                          : "inline-flex w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
                      }
                    >
                      {data.operational.completedChecks}/{data.operational.totalChecks} checks ok
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {data.operational.checks.map((check) => (
                      <OperationalCheckItem key={check.field} check={check} />
                    ))}
                  </div>

                  {data.operational.blockingIssues.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                      <p className="font-medium">Pendências atuais</p>
                      <ul className="mt-2 ml-5 list-disc space-y-1">
                        {data.operational.blockingIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        Conexão atual
                      </h3>
                      <p className="text-sm text-slate-600">
                        Resumo técnico da conexão do WhatsApp salva para esta
                        loja.
                      </p>
                    </div>

                    {form.formState.isDirty ? (
                      <span className="text-sm font-medium text-amber-700">
                        Existem alterações pendentes de salvamento.
                      </span>
                    ) : null}
                  </div>

                  {data.connection ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <ConnectionSummaryItem
                        label="Estado estrutural"
                        value={data.stateLabel}
                      />
                      <ConnectionSummaryItem
                        label="Estado operacional"
                        value={data.operational.stateLabel}
                      />
                      <ConnectionSummaryItem
                        label="Provider"
                        value={
                          WHATSAPP_PROVIDER_LABELS[
                            data.connection.provider ?? "META_WHATSAPP"
                          ]
                        }
                      />
                      <ConnectionSummaryItem
                        label="Status técnico"
                        value={
                          WHATSAPP_CONNECTION_STATUS_LABELS[
                            data.connection.status ?? "PENDING"
                          ]
                        }
                      />
                      <ConnectionSummaryItem
                        label="Conexão ativa"
                        value={data.connection.isActive ? "Sim" : "Não"}
                      />
                      <ConnectionSummaryItem
                        label="businessAccountId"
                        value={data.connection.businessAccountId ?? "-"}
                      />
                      <ConnectionSummaryItem
                        label="phoneNumberId"
                        value={data.connection.phoneNumberId ?? "-"}
                      />
                      <ConnectionSummaryItem
                        label="displayPhoneNumber"
                        value={data.connection.displayPhoneNumber ?? "-"}
                      />
                      <ConnectionSummaryItem
                        label="verifyToken"
                        value={data.connection.verifyToken ?? "-"}
                      />
                      <ConnectionSummaryItem
                        label="accessToken"
                        value={
                          data.operational.checks.find((check) => check.field === "accessToken")
                            ?.ok
                            ? "Token salvo no servidor"
                            : "Token ausente"
                        }
                      />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
                      Nenhuma conexão técnica cadastrada ainda. Preencha o
                      formulário abaixo para criar a configuração Meta desta
                      loja.
                    </div>
                  )}
                </section>

                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-950">
                        Configuração técnica
                      </h3>
                      <p className="text-sm text-slate-600">
                        Os campos abaixo são salvos na conexão WhatsApp da loja
                        atual.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Controller
                          control={form.control}
                          name="provider"
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={inputsDisabled}
                            >
                              <SelectTrigger className="w-full" id="provider">
                                <SelectValue placeholder="Selecione o provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {WHATSAPP_PROVIDER_OPTIONS.map((provider) => (
                                  <SelectItem key={provider} value={provider}>
                                    {WHATSAPP_PROVIDER_LABELS[provider]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <InlineFieldError message={form.formState.errors.provider?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status técnico</Label>
                        <Controller
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={inputsDisabled}
                            >
                              <SelectTrigger className="w-full" id="status">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                              <SelectContent>
                                {WHATSAPP_CONNECTION_STATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {WHATSAPP_CONNECTION_STATUS_LABELS[status]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <InlineFieldError message={form.formState.errors.status?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessAccountId">businessAccountId</Label>
                        <Input
                          id="businessAccountId"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Ex: 987654321098765"
                          disabled={inputsDisabled}
                          {...form.register("businessAccountId")}
                        />
                        <InlineFieldError message={form.formState.errors.businessAccountId?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumberId">phoneNumberId</Label>
                        <Input
                          id="phoneNumberId"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Ex: 123456789012345"
                          disabled={inputsDisabled}
                          {...form.register("phoneNumberId")}
                        />
                        <InlineFieldError message={form.formState.errors.phoneNumberId?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="displayPhoneNumber">displayPhoneNumber</Label>
                        <Input
                          id="displayPhoneNumber"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Ex: +55 11 99999-8888"
                          disabled={inputsDisabled}
                          {...form.register("displayPhoneNumber")}
                        />
                        <InlineFieldError message={form.formState.errors.displayPhoneNumber?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="verifyToken">verifyToken</Label>
                        <Input
                          id="verifyToken"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Ex: token-verificacao-loja"
                          disabled={inputsDisabled}
                          {...form.register("verifyToken")}
                        />
                        <InlineFieldError message={form.formState.errors.verifyToken?.message} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <Label htmlFor="accessToken">accessToken</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAccessToken((current) => !current)}
                            disabled={inputsDisabled}
                          >
                            {showAccessToken ? "Ocultar token" : "Mostrar token"}
                          </Button>
                        </div>
                        <Input
                          id="accessToken"
                          type={showAccessToken ? "text" : "password"}
                          autoCapitalize="off"
                          autoCorrect="off"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="Ex: EAA..."
                          disabled={inputsDisabled}
                          {...form.register("accessToken")}
                        />
                        <p className="text-sm text-slate-500">
                          O token permanece vinculado apenas a esta loja e não é
                          retornado pelo GET restrito à loja no client.
                        </p>
                        <InlineFieldError message={form.formState.errors.accessToken?.message} />
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                        <Controller
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <Label htmlFor="isActive">Conexão ativa</Label>
                                <p className="text-sm text-slate-600">
                                  Quando desligada, a conexão fica salva mas deixa
                                  de ser usada operacionalmente.
                                </p>
                              </div>

                              <Switch
                                id="isActive"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={inputsDisabled}
                              />
                            </div>
                          )}
                        />
                        <InlineFieldError message={form.formState.errors.isActive?.message} />
                      </div>
                    </div>
                  </section>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving || checkingConnection || loading || !ready}
                    >
                      {saving
                        ? "Salvando..."
                        : data.connection?.id
                          ? "Salvar configuração"
                          : "Criar configuração"}
                    </Button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}
