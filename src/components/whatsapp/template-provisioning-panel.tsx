"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type TemplateProvisionStatus =
  | "NOT_CREATED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "UNKNOWN"
  | "ERROR"

type TemplateProvision = {
  kind:
    | "APPOINTMENT_REMINDER_ONE_HOUR"
    | "APPOINTMENT_REMINDER_FIFTEEN_MINUTES"
  templateName: string
  language: string
  category: string
  status: TemplateProvisionStatus
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  error: string | null
  lastSyncedAt: string | null
}

type ApiSuccess = {
  ok: true
  data: TemplateProvision[]
}

type ApiError = {
  ok: false
  error?: string
}

const STATUS_LABELS: Record<TemplateProvisionStatus, string> = {
  NOT_CREATED: "Não criado",
  PENDING: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
  PAUSED: "Pausado",
  DISABLED: "Desabilitado",
  UNKNOWN: "Status desconhecido",
  ERROR: "Erro",
}

const STATUS_STYLES: Record<TemplateProvisionStatus, string> = {
  NOT_CREATED: "border-slate-200 bg-slate-100 text-slate-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  PAUSED: "border-orange-200 bg-orange-50 text-orange-800",
  DISABLED: "border-slate-300 bg-slate-100 text-slate-700",
  UNKNOWN: "border-slate-200 bg-slate-50 text-slate-600",
  ERROR: "border-red-200 bg-red-50 text-red-700",
}

function getTemplateTitle(kind: TemplateProvision["kind"]) {
  return kind === "APPOINTMENT_REMINDER_ONE_HOUR"
    ? "Lembrete 1h"
    : "Lembrete 15min"
}

function getStatusMessage(status: TemplateProvisionStatus) {
  switch (status) {
    case "APPROVED":
      return "Pronto para envio."
    case "PENDING":
      return "Em análise pela Meta."
    case "REJECTED":
      return "Reprovado pela Meta. Revise o texto ou tente novamente."
    case "PAUSED":
      return "Pausado pela Meta. Sincronize novamente após regularizar."
    case "ERROR":
      return "O Olyon não conseguiu concluir esta operação."
    default:
      return "Provisionamento ainda não concluído."
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Ainda não sincronizado"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function WhatsAppTemplateProvisioningPanel({
  refreshKey,
}: {
  refreshKey: string
}) {
  const [templates, setTemplates] = useState<TemplateProvision[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"provision" | "sync" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/store/current/whatsapp/templates", {
        cache: "no-store",
      })
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        throw new Error(
          json && !json.ok
            ? json.error ?? "Não foi possível carregar os templates."
            : "Não foi possível carregar os templates."
        )
      }

      setTemplates(json.data)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os templates."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates, refreshKey])

  async function runAction(nextAction: "provision" | "sync") {
    setAction(nextAction)
    setError(null)

    try {
      const response = await fetch(
        `/api/store/current/whatsapp/templates/${nextAction}`,
        { method: "POST" }
      )
      const json = (await response.json().catch(() => null)) as
        | ApiSuccess
        | ApiError
        | null

      if (!response.ok || !json?.ok) {
        throw new Error(
          json && !json.ok
            ? json.error ?? "Não foi possível atualizar os templates."
            : "Não foi possível atualizar os templates."
        )
      }

      setTemplates(json.data)

      if (json.data.some((template) => template.status === "ERROR")) {
        toast.error(
          "A operação terminou com pendências. Consulte o erro nos cards."
        )
      } else {
        toast.success(
          nextAction === "provision"
            ? "Provisionamento solicitado com sucesso."
            : "Status sincronizado com a Meta."
        )
      }
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível atualizar os templates."

      setError(message)
      toast.error(message)
    } finally {
      setAction(null)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <FileCheck2 className="size-3.5" />
            Templates WhatsApp
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">
            Templates WhatsApp
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Esses modelos são necessários para enviar lembretes fora da janela
            de atendimento de 24 horas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void runAction("provision")}
            disabled={loading || action !== null}
          >
            <FileCheck2 className="size-4" />
            {action === "provision"
              ? "Provisionando..."
              : "Provisionar templates"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runAction("sync")}
            disabled={loading || action !== null}
          >
            <RefreshCw
              className={
                action === "sync" ? "size-4 animate-spin" : "size-4"
              }
            />
            {action === "sync" ? "Sincronizando..." : "Sincronizar status"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Carregando status dos templates...
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <article
              key={`${template.kind}:${template.language}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-950">
                    {getTemplateTitle(template.kind)}
                  </h4>
                  <p className="mt-1 break-all text-sm text-slate-600">
                    {template.templateName}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[template.status]}`}
                >
                  {STATUS_LABELS[template.status]}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    Idioma
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {template.language}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    Última sincronização
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDateTime(template.lastSyncedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                {template.status === "APPROVED" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : template.status === "PENDING" ? (
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-700" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-slate-500" />
                )}
                <p>{getStatusMessage(template.status)}</p>
              </div>

              {template.rejectionReason ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Motivo da reprovação: {template.rejectionReason}
                </div>
              ) : null}

              {template.error ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {template.error}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
