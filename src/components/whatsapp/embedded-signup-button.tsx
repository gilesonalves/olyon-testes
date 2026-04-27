"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Link2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const META_SDK_SCRIPT_ID = "meta-facebook-jssdk"
const NEXT_PUBLIC_META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID?.trim() || ""
const NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID =
  process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || ""
const META_GRAPH_API_VERSION = "v25.0"

type EmbeddedSignupStatusTone = "connected" | "pending" | "disconnected" | "error"

type EmbeddedSignupButtonProps = {
  disabled?: boolean
  statusLabel: string
  statusTone: EmbeddedSignupStatusTone
  onConnectionUpdated?: () => Promise<void> | void
}

type EmbeddedSignupApiSuccess = {
  ok: true
  data: {
    connectionId: string
    status: "CONNECTED" | "PENDING"
    phoneNumberId: string
    wabaId: string
    displayPhoneNumber: string
  }
}

type EmbeddedSignupApiError = {
  ok: false
  error?: {
    message?: string
    code?: string
    details?: Record<string, unknown>
  }
}

type MetaLoginResponse = {
  status?: string
  authResponse?: {
    code?: string
    state?: string
  } | null
}

type FacebookSdk = {
  init: (params: {
    appId: string
    autoLogAppEvents?: boolean
    xfbml?: boolean
    version: string
  }) => void
  login: (
    callback: (response: MetaLoginResponse) => void,
    options: Record<string, unknown>
  ) => void
}

type EmbeddedSignupWindowMessage = {
  type?: string
  event?: string
  data?: {
    phone_number_id?: string
    waba_id?: string
    business_id?: string
  }
}

type PendingSessionMetadata = {
  state?: string
  phoneNumberId?: string
  wabaId?: string
  businessId?: string
}

declare global {
  interface Window {
    FB?: FacebookSdk
    fbAsyncInit?: () => void
  }
}

function isMetaOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin)
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com")
  } catch {
    return false
  }
}

function parseMessagePayload(payload: unknown): EmbeddedSignupWindowMessage | null {
  if (typeof payload === "string") {
    try {
      return parseMessagePayload(JSON.parse(payload) as unknown)
    } catch {
      return null
    }
  }

  if (!payload || typeof payload !== "object") {
    return null
  }

  return payload as EmbeddedSignupWindowMessage
}

function getStatusStyles(statusTone: EmbeddedSignupStatusTone) {
  switch (statusTone) {
    case "connected":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "error":
      return "border-red-200 bg-red-50 text-red-700"
    case "pending":
      return "border-orange-200 bg-orange-50 text-orange-800"
    default:
      return "border-slate-200 bg-slate-100 text-slate-700"
  }
}

function getFriendlyEmbeddedSignupErrorMessage(
  error?: EmbeddedSignupApiError["error"]
) {
  switch (error?.code) {
    case "AUTH_REQUIRED":
      return "Sua sessao expirou. Entre novamente para continuar."
    case "FORBIDDEN":
      return "A loja atual nao tem permissao para alterar esta conexao."
    case "STORE_NOT_FOUND":
      return "Nao foi possivel localizar a loja atual."
    case "WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED":
      return "A conexao com a Meta nao esta disponivel neste ambiente."
    case "WHATSAPP_EMBEDDED_SIGNUP_CONFLICT":
      return "Este numero do WhatsApp ja esta conectado a outra loja ou em uso."
    case "WHATSAPP_EMBEDDED_SIGNUP_INVALID_PAYLOAD":
      return "Nao foi possivel concluir a conexao. Tente novamente."
    case "WHATSAPP_EMBEDDED_SIGNUP_FAILED":
      return "A Meta nao concluiu a conexao da sua loja. Tente novamente ou fale com o suporte."
    default:
      return error?.message ?? "Nao foi possivel concluir a conexao com a Meta."
  }
}

export function EmbeddedSignupButton({
  disabled,
  statusLabel,
  statusTone,
  onConnectionUpdated,
}: EmbeddedSignupButtonProps) {
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "error">("loading")
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [eventMessage, setEventMessage] = useState<string | null>(null)
  const sessionMetadataRef = useRef<PendingSessionMetadata | null>(null)

  const initializeSdk = useEffectEvent(() => {
    if (!window.FB) {
      setSdkState("error")
      setSdkError("O SDK da Meta nao ficou disponivel no navegador.")
      return
    }

    try {
      window.FB.init({
        appId: NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: false,
        xfbml: false,
        version: META_GRAPH_API_VERSION,
      })

      setSdkState("ready")
      setSdkError(null)
    } catch {
      setSdkState("error")
      setSdkError("Nao foi possivel inicializar o SDK da Meta.")
    }
  })

  useEffect(() => {
    if (!NEXT_PUBLIC_META_APP_ID || !NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID) {
      setSdkState("error")
      setSdkError(
        "A conexao com a Meta nao esta disponivel neste ambiente agora."
      )
      return
    }

    if (window.FB) {
      initializeSdk()
      return
    }

    setSdkState("loading")
    setSdkError(null)

    const existingScript = document.getElementById(
      META_SDK_SCRIPT_ID
    ) as HTMLScriptElement | null
    const script =
      existingScript ??
      Object.assign(document.createElement("script"), {
        id: META_SDK_SCRIPT_ID,
        async: true,
        defer: true,
        crossOrigin: "anonymous",
        src: "https://connect.facebook.net/en_US/sdk.js",
      })

    const handleLoad = () => {
      initializeSdk()
    }

    const handleError = () => {
      setSdkState("error")
      setSdkError("Nao foi possivel carregar o SDK da Meta.")
    }

    window.fbAsyncInit = handleLoad
    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)

    if (!existingScript) {
      document.body.appendChild(script)
    }

    return () => {
      script.removeEventListener("load", handleLoad)
      script.removeEventListener("error", handleError)
    }
  }, [])

  const handleMetaMessage = useEffectEvent((event: MessageEvent) => {
    if (!isMetaOrigin(event.origin)) {
      return
    }

    const payload = parseMessagePayload(event.data)

    if (!payload || payload.type !== "WA_EMBEDDED_SIGNUP") {
      return
    }

    if (payload.event === "FINISH") {
      sessionMetadataRef.current = {
        ...sessionMetadataRef.current,
        phoneNumberId: payload.data?.phone_number_id,
        wabaId: payload.data?.waba_id,
        businessId: payload.data?.business_id,
      }
      setEventMessage(
        "A Meta concluiu o fluxo. O Olyon esta atualizando a conexao da sua loja."
      )
      return
    }

    if (payload.event === "CANCEL") {
      setEventMessage("O popup da Meta foi fechado antes da conclusao da conexao.")
      return
    }

    if (payload.event === "ERROR") {
      setEventMessage("A Meta informou que nao conseguiu concluir a conexao.")
    }
  })

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      handleMetaMessage(event)
    }

    window.addEventListener("message", listener)

    return () => {
      window.removeEventListener("message", listener)
    }
  }, [])

  async function submitSignupCode(response: MetaLoginResponse) {
    const code = response.authResponse?.code?.trim()

    if (!code) {
      setSubmitting(false)
      toast.error("A Meta nao concluiu a conexao da sua loja. Tente novamente.")
      return
    }

    try {
      const requestBody = {
        code,
        state:
          response.authResponse?.state?.trim() ||
          sessionMetadataRef.current?.state ||
          undefined,
        phoneNumberId: sessionMetadataRef.current?.phoneNumberId,
        wabaId: sessionMetadataRef.current?.wabaId,
        businessId: sessionMetadataRef.current?.businessId,
      }

      const responseApi = await fetch("/api/whatsapp/embedded-signup/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const json = (await responseApi.json().catch(() => null)) as
        | EmbeddedSignupApiSuccess
        | EmbeddedSignupApiError
        | null

      if (!responseApi.ok || !json?.ok) {
        throw new Error(
          json && !json.ok
            ? getFriendlyEmbeddedSignupErrorMessage(json.error)
            : "Nao foi possivel concluir a conexao com a Meta."
        )
      }

      setEventMessage(
        `Conexao atualizada para ${json.data.displayPhoneNumber} com status ${json.data.status}.`
      )
      toast.success("Conexao WhatsApp Business atualizada com sucesso.")

      if (onConnectionUpdated) {
        await onConnectionUpdated()
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel concluir o Cadastro Incorporado da Meta."

      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleConnectClick() {
    if (sdkState === "error") {
      toast.error(sdkError ?? "O SDK da Meta nao esta disponivel.")
      return
    }

    if (sdkState !== "ready" || !window.FB) {
      toast.error("O SDK da Meta ainda esta carregando.")
      return
    }

    setSubmitting(true)
    setEventMessage(null)
    sessionMetadataRef.current = {
      state: crypto.randomUUID(),
    }

    window.FB.login(
      (response) => {
        void submitSignupCode(response)
      },
      {
        config_id: NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        state: sessionMetadataRef.current.state,
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: 3,
        },
      }
    )
  }

  const buttonDisabled = disabled || submitting || sdkState === "loading"

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <Link2 className="size-3.5" />
            Cadastro incorporado
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Conectar com WhatsApp Business
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Use o fluxo oficial da Meta para conectar o numero da sua loja ao
              Olyon com seguranca.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-medium ${getStatusStyles(statusTone)}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleConnectClick} disabled={buttonDisabled}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Conectando...
            </>
          ) : sdkState === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Carregando SDK...
            </>
          ) : (
            "Conectar com WhatsApp Business"
          )}
        </Button>

        <p className="text-sm text-slate-500">
          Para conectar, use uma conta que tenha permissao de administrador no
          Gerenciador de Negocios/WhatsApp Business da Meta.
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        A validacao real da coexistencia depende da aprovacao final do app na Meta.
      </p>

      {sdkError ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{sdkError}</p>
        </div>
      ) : null}

      {eventMessage ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{eventMessage}</p>
        </div>
      ) : null}
    </section>
  )
}
