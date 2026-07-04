"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  Hash,
  Inbox,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error?: string
}

type WhatsAppConnectionSummary = {
  displayPhoneNumber: string
  phoneNumberId: string
  businessAccountId: string
  status: string
}

type ConversationSummary = {
  id: string
  customerName: string | null
  customerPhone: string | null
  state: string
  lastMessageAt: string | null
  lastMessage: {
    body: string | null
    direction: "IN" | "OUT"
    createdAt: string
  } | null
  unreadCount: number
}

type ConversationMessage = {
  id: string
  direction: "IN" | "OUT"
  body: string | null
  type: string | null
  status: string | null
  externalId: string | null
  createdAt: string
  sentAt: string | null
}

type ConversationDetails = {
  id: string
  state: string
  lastMessageAt: string | null
  customerName: string | null
  customerPhone: string | null
}

type ConversationsResponse = {
  connection: WhatsAppConnectionSummary | null
  conversations: ConversationSummary[]
}

type MessagesResponse = {
  conversation: ConversationDetails
  messages: ConversationMessage[]
}

type ConversationStatePatch = {
  id: string
  state: string
  lastMessageAt?: string | null
}

type SendManualMessageResponse = {
  message: ConversationMessage
  handoffMessage: ConversationMessage | null
  handoffError: {
    error: string
    errorCode?: string
    metaStatusCode?: number | null
  } | null
  conversation: ConversationStatePatch
  graphMessageId: string | null
}

type ResumeConversationResponse = {
  id: string
  state: string
}

const IS_DEVELOPMENT = process.env.NODE_ENV === "development"

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
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

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getConversationTitle(
  conversation: ConversationSummary | ConversationDetails | null | undefined
) {
  return (
    conversation?.customerName?.trim() ||
    conversation?.customerPhone?.trim() ||
    "Cliente WhatsApp"
  )
}

function getStateClassName(state: string | null | undefined) {
  switch (state) {
    case "PAUSED":
    case "HUMAN":
    case "HUMANO":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "CLOSED":
    case "DONE":
      return "border-slate-200 bg-slate-100 text-slate-700"
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
}

function getStateLabel(state: string | null | undefined) {
  switch (state) {
    case "PAUSED":
    case "HUMAN":
    case "HUMANO":
      return "Atendimento humano"
    case "CLOSED":
    case "DONE":
      return "Encerrado"
    case null:
    case undefined:
      return "-"
    default:
      return "Bot ativo"
  }
}

function getConversationPreview(conversation: ConversationSummary) {
  if (!conversation.lastMessage) {
    return "Sem mensagens"
  }

  const body = conversation.lastMessage.body?.trim()
  if (body && body.toLowerCase() !== "[mensagem sem texto]") {
    return body
  }

  return conversation.lastMessage.direction === "IN"
    ? "Interação recebida"
    : "Interação enviada"
}

function getMessageStatusLabel(message: ConversationMessage) {
  if (message.direction !== "OUT" || !message.status) {
    return null
  }

  switch (message.status.toUpperCase()) {
    case "SENT":
    case "ACCEPTED":
      return "Enviado"
    case "DELIVERED":
      return "Entregue"
    case "READ":
      return "Lido"
    case "FAILED":
      return "Falhou"
    default:
      return null
  }
}

function getMessagePresentation(message: ConversationMessage) {
  const body = message.body?.trim()
  if (body && body.toLowerCase() !== "[mensagem sem texto]") {
    return { text: body, technicalFallback: false }
  }

  const type = message.type?.trim().toUpperCase() ?? ""
  const inbound = message.direction === "IN"

  if (
    type.includes("INTERACTIVE") ||
    type.includes("BUTTON") ||
    type.includes("LIST")
  ) {
    return {
      text: inbound
        ? "Cliente selecionou uma opção"
        : "Opção interativa enviada",
      technicalFallback: false,
    }
  }

  if (type.includes("LOCATION")) {
    return {
      text: inbound ? "Localização recebida" : "Localização enviada",
      technicalFallback: false,
    }
  }

  if (type.includes("CONTACT")) {
    return {
      text: inbound ? "Contato recebido" : "Contato enviado",
      technicalFallback: false,
    }
  }

  if (type.includes("REACTION")) {
    return {
      text: inbound ? "Cliente reagiu a uma mensagem" : "Reação enviada",
      technicalFallback: false,
    }
  }

  if (
    ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "STICKER", "MEDIA"].some(
      (mediaType) => type.includes(mediaType)
    )
  ) {
    return {
      text: inbound ? "Mídia recebida" : "Mídia enviada",
      technicalFallback: false,
    }
  }

  if (IS_DEVELOPMENT) {
    return {
      text: "Interação sem conteúdo textual",
      technicalFallback: true,
    }
  }

  return null
}

function getApiErrorMessage(
  response: Response,
  json: ApiError | null,
  fallback: string
) {
  if (json?.error) {
    return json.error
  }

  if (response.status === 401) {
    return "Sessao expirada ou loja nao selecionada."
  }

  if (response.status === 403) {
    return "Sem permissao para executar esta acao."
  }

  return fallback
}

async function readApiJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiError
    | null
}

function ConnectionValue({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 break-all text-sm text-slate-950">{value}</p>
    </div>
  )
}

export default function AttendancePage() {
  const [query, setQuery] = useState("")
  const [connection, setConnection] = useState<WhatsAppConnectionSummary | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetails | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [messageText, setMessageText] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldStickToBottomRef = useRef(true)
  const previousConversationIdRef = useRef<string | null>(null)

  const selectedConversationSummary = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ??
      null,
    [conversations, selectedConversationId]
  )
  const displayedMessages = useMemo(
    () =>
      messages.flatMap((message) => {
        const presentation = getMessagePresentation(message)

        return presentation ? [{ message, presentation }] : []
      }),
    [messages]
  )

  const activeConversation = selectedConversation ?? selectedConversationSummary
  const activeState = activeConversation?.state ?? null
  const trimmedMessage = messageText.trim()
  const canSend = Boolean(
    connection &&
      selectedConversationId &&
      trimmedMessage.length > 0 &&
      trimmedMessage.length <= 1000 &&
      !sending
  )

  function isNearBottom(element: HTMLDivElement, threshold = 120) {
    return (
      element.scrollHeight - element.scrollTop - element.clientHeight < threshold
    )
  }

  const scrollMessagesToBottom = useCallback(() => {
    const element = messagesContainerRef.current
    if (!element) {
      return
    }

    window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
  }, [])

  function handleMessagesScroll() {
    const element = messagesContainerRef.current
    if (!element) {
      return
    }

    shouldStickToBottomRef.current = isNearBottom(element)
  }

  const loadConversations = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) {
        setLoadingConversations(true)
      }

      try {
        const params = new URLSearchParams({ limit: "30" })
        if (query.trim()) {
          params.set("q", query.trim())
        }

        const response = await fetch(
          `/api/store/current/whatsapp/conversations?${params.toString()}`,
          { cache: "no-store" }
        )
        const json = await readApiJson<ConversationsResponse>(response)

        if (!response.ok || !json?.ok) {
          throw new Error(
            getApiErrorMessage(
              response,
              json && !json.ok ? json : null,
              "Nao foi possivel carregar as conversas."
            )
          )
        }

        setConnection(json.data.connection)
        setConversations(json.data.conversations)
        setPageError(null)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar as conversas."

        setPageError(message)
        if (!options.silent) {
          toast.error(message)
        }
      } finally {
        if (!options.silent) {
          setLoadingConversations(false)
        }
      }
    },
    [query]
  )

  const loadMessages = useCallback(
    async (
      conversationId: string,
      options: { silent?: boolean } = {}
    ) => {
      if (!options.silent) {
        setLoadingMessages(true)
      }

      try {
        const response = await fetch(
          `/api/store/current/whatsapp/conversations/${conversationId}/messages?limit=100`,
          { cache: "no-store" }
        )
        const json = await readApiJson<MessagesResponse>(response)

        if (!response.ok || !json?.ok) {
          throw new Error(
            getApiErrorMessage(
              response,
              json && !json.ok ? json : null,
              "Nao foi possivel carregar o historico."
            )
          )
        }

        setSelectedConversation(json.data.conversation)
        setMessages(json.data.messages)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o historico."

        if (!options.silent) {
          toast.error(message)
        }
      } finally {
        if (!options.silent) {
          setLoadingMessages(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadConversations({ silent: true })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null)
      setMessages([])
      return
    }

    void loadMessages(selectedConversationId)
  }, [loadMessages, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      return
    }

    const interval = window.setInterval(() => {
      void loadMessages(selectedConversationId, { silent: true })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [loadMessages, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      previousConversationIdRef.current = null
      shouldStickToBottomRef.current = true
      return
    }

    const conversationChanged =
      previousConversationIdRef.current !== selectedConversationId

    if (conversationChanged) {
      previousConversationIdRef.current = selectedConversationId
      shouldStickToBottomRef.current = true
      scrollMessagesToBottom()
      return
    }

    if (shouldStickToBottomRef.current) {
      scrollMessagesToBottom()
    }
  }, [selectedConversationId, messages, scrollMessagesToBottom])

  async function refreshCurrentView() {
    await loadConversations({ silent: false })
    if (selectedConversationId) {
      await loadMessages(selectedConversationId, { silent: false })
    }
  }

  function applyConversationState(patch: ConversationStatePatch) {
    setSelectedConversation((conversation) => {
      if (!conversation || conversation.id !== patch.id) {
        return conversation
      }

      return {
        ...conversation,
        state: patch.state,
        lastMessageAt: patch.lastMessageAt ?? conversation.lastMessageAt,
      }
    })

    setConversations((currentConversations) =>
      currentConversations.map((conversation) => {
        if (conversation.id !== patch.id) {
          return conversation
        }

        return {
          ...conversation,
          state: patch.state,
          lastMessageAt: patch.lastMessageAt ?? conversation.lastMessageAt,
        }
      })
    )
  }

  function applyManualSendResult(
    conversationId: string,
    data: SendManualMessageResponse
  ) {
    const returnedMessages = [data.handoffMessage, data.message].filter(
      (message): message is ConversationMessage => Boolean(message)
    )
    const lastReturnedMessage =
      returnedMessages.at(-1) ?? data.message
    const lastMessageAt =
      data.conversation.lastMessageAt ?? lastReturnedMessage.createdAt

    setSelectedConversation((conversation) => {
      if (!conversation || conversation.id !== conversationId) {
        return conversation
      }

      return {
        ...conversation,
        state: data.conversation.state,
        lastMessageAt,
      }
    })

    setConversations((currentConversations) =>
      currentConversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation
        }

        return {
          ...conversation,
          state: data.conversation.state,
          lastMessageAt,
          lastMessage: {
            body: lastReturnedMessage.body,
            direction: lastReturnedMessage.direction,
            createdAt: lastReturnedMessage.createdAt,
          },
        }
      })
    )

    setMessages((currentMessages) => {
      const existingMessageIds = new Set(
        currentMessages.map((message) => message.id)
      )
      const newMessages = returnedMessages.filter(
        (message) => !existingMessageIds.has(message.id)
      )

      return [...currentMessages, ...newMessages]
    })
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedConversationId || !canSend) {
      return
    }

    setSending(true)

    try {
      const response = await fetch(
        `/api/store/current/whatsapp/conversations/${selectedConversationId}/messages/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: trimmedMessage }),
        }
      )
      const json = await readApiJson<SendManualMessageResponse>(response)

      if (!response.ok || !json?.ok) {
        throw new Error(
          getApiErrorMessage(
            response,
            json && !json.ok ? json : null,
            "Nao foi possivel enviar a mensagem."
          )
        )
      }

      setMessageText("")
      shouldStickToBottomRef.current = true
      applyManualSendResult(selectedConversationId, json.data)
      if (json.data.handoffError) {
        toast.warning(
          `Mensagem enviada, mas o aviso automatico falhou: ${json.data.handoffError.error}`
        )
      } else {
        toast.success("Mensagem enviada.")
      }
      await Promise.all([
        loadMessages(selectedConversationId, { silent: true }),
        loadConversations({ silent: true }),
      ])
      scrollMessagesToBottom()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a mensagem."
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  async function handleResumeConversation() {
    if (!selectedConversationId) {
      return
    }

    setResuming(true)

    try {
      const response = await fetch(
        `/api/store/current/whatsapp/conversations/${selectedConversationId}/resume`,
        { method: "POST" }
      )
      const json = await readApiJson<ResumeConversationResponse>(response)

      if (!response.ok || !json?.ok) {
        throw new Error(
          getApiErrorMessage(
            response,
            json && !json.ok ? json : null,
            "Nao foi possivel retomar o bot."
          )
        )
      }

      applyConversationState({
        id: json.data.id,
        state: json.data.state,
      })
      toast.success("Bot retomado.")
      await Promise.all([
        loadMessages(selectedConversationId, { silent: true }),
        loadConversations({ silent: true }),
      ])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel retomar o bot."
      toast.error(message)
    } finally {
      setResuming(false)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">Atendimento</span>
        </div>
      </HeaderPage>

      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-5 sm:px-6 lg:px-7">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Atendimento</h1>
            <p className="mt-1 text-sm text-slate-600">
              Converse com clientes pelo WhatsApp conectado a loja.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshCurrentView()}
            disabled={loadingConversations || loadingMessages}
            className="w-fit"
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loadingConversations || loadingMessages) && "animate-spin"
              )}
            />
            Atualizar
          </Button>
        </div>

        <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageCircle className="size-5 text-emerald-700" />
                <h2 className="text-base font-semibold text-slate-950">
                  {connection ? "WhatsApp conectado" : "WhatsApp desconectado"}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {connection
                  ? "Canal disponível para atendimento aos clientes."
                  : "Conecte o WhatsApp da loja para iniciar atendimentos."}
              </p>
            </div>

            {connection ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="size-4" />
                Conexão ativa
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                <AlertTriangle className="size-4" />
                Sem conexão ativa
              </span>
            )}
          </div>

          {connection ? (
            <>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <Phone className="size-4 text-slate-500" />
                <span className="font-medium">Número conectado:</span>
                <span>{connection.displayPhoneNumber}</span>
              </div>

              {IS_DEVELOPMENT ? (
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer select-none">
                    Detalhes técnicos
                  </summary>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <ConnectionValue
                      icon={Hash}
                      label="phoneNumberId"
                      value={connection.phoneNumberId}
                    />
                    <ConnectionValue
                      icon={Building2}
                      label="businessAccountId"
                      value={connection.businessAccountId}
                    />
                  </div>
                </details>
              ) : null}
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Nenhuma conexão ativa do WhatsApp foi encontrada para esta loja.
            </div>
          )}
        </section>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Mensagens livres pelo WhatsApp so podem ser enviadas dentro da janela
          de atendimento de 24h. Fora dela, use templates aprovados.
        </div>

        {pageError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="flex min-h-[560px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Conversas
                  </h2>
                  <p className="text-sm text-slate-500">
                    {conversations.length} encontradas
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void loadConversations({ silent: false })}
                  disabled={loadingConversations}
                  aria-label="Atualizar conversas"
                >
                  <RefreshCw
                    className={cn("size-4", loadingConversations && "animate-spin")}
                  />
                </Button>
              </div>

              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void loadConversations({ silent: false })
                }}
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar nome ou telefone"
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="outline" disabled={loadingConversations}>
                  Buscar
                </Button>
              </form>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loadingConversations ? (
                <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando conversas...
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-5 text-center text-sm text-slate-500">
                  <Inbox className="mb-3 size-8 text-slate-400" />
                  Nenhuma conversa WhatsApp encontrada.
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => {
                    const selected = conversation.id === selectedConversationId

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          selected
                            ? "border-sky-300 bg-sky-50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-950">
                              {getConversationTitle(conversation)}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {conversation.customerPhone ?? "-"}
                            </p>
                          </div>

                          <span
                            className={cn(
                              "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
                              getStateClassName(conversation.state)
                            )}
                          >
                            {getStateLabel(conversation.state)}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {getConversationPreview(conversation)}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                          <span>
                            {conversation.lastMessage?.direction === "OUT"
                              ? "Olyon"
                              : "Cliente"}
                          </span>
                          <span>{formatDateTime(conversation.lastMessageAt)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-[560px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            {!activeConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="mb-3 size-10 text-slate-400" />
                <p className="text-base font-medium text-slate-950">
                  Selecione uma conversa para iniciar o atendimento.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {getConversationTitle(activeConversation)}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {activeConversation.customerPhone ?? "-"}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "inline-flex w-fit rounded-md border px-3 py-1 text-sm font-medium",
                        getStateClassName(activeState)
                      )}
                    >
                      {getStateLabel(activeState)}
                    </span>
                  </div>

                  {activeState === "PAUSED" ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2">
                        <Bot className="mt-0.5 size-4 shrink-0" />
                        <span>
                          Atendimento humano ativo. O bot está pausado nesta
                          conversa.
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleResumeConversation()}
                        disabled={resuming}
                        className="w-fit bg-white"
                      >
                        {resuming ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Bot className="size-4" />
                        )}
                        Retomar bot
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="min-h-[360px] flex-1 overflow-y-auto bg-slate-50 px-4 py-4"
                >
                  {loadingMessages ? (
                    <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 className="size-4 animate-spin" />
                      Carregando historico...
                    </div>
                  ) : displayedMessages.length === 0 ? (
                    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                      Nenhuma mensagem nesta conversa.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedMessages.map(({ message, presentation }) => {
                        const outbound = message.direction === "OUT"
                        const friendlyStatus = getMessageStatusLabel(message)
                        const messageFooter = [
                          formatTime(message.createdAt),
                          friendlyStatus,
                        ]
                          .filter(Boolean)
                          .join(" · ")

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              outbound ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[min(78%,720px)] rounded-lg border px-3 py-2 shadow-sm",
                                presentation.technicalFallback
                                  ? "border-dashed border-slate-300 bg-slate-100 text-slate-500"
                                  : outbound
                                    ? "border-sky-200 bg-sky-600 text-white"
                                    : "border-slate-200 bg-white text-slate-900"
                              )}
                              title={
                                IS_DEVELOPMENT
                                  ? [
                                      message.externalId,
                                      message.type,
                                      message.status,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || undefined
                                  : undefined
                              }
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {presentation.text}
                              </p>

                              <div
                                className={cn(
                                  "mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]",
                                  presentation.technicalFallback
                                    ? "text-slate-400"
                                    : outbound
                                      ? "text-sky-100"
                                      : "text-slate-500"
                                )}
                              >
                                <span>{messageFooter}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <form
                  className="border-t border-slate-200 p-4"
                  onSubmit={(event) => void handleSend(event)}
                >
                  {!connection ? (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      Envio desabilitado enquanto nao houver WhatsApp conectado.
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <Textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      maxLength={1000}
                      placeholder="Digite uma mensagem livre"
                      disabled={!connection || sending}
                      className="min-h-20 max-h-40 resize-none bg-white"
                    />
                    <Button
                      type="submit"
                      disabled={!canSend}
                      className="lg:w-32"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Enviar
                    </Button>
                  </div>

                  <div className="mt-2 text-right text-xs text-slate-400">
                    {trimmedMessage.length}/1000
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
