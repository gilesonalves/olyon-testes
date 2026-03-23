import { z } from "zod"
import { findActiveWhatsAppConnectionByStoreId } from "@/lib/whatsapp/connection"

const META_GRAPH_API_VERSION = "v22.0"
const META_GRAPH_TIMEOUT_MS = 10_000
const RESPONSE_PREVIEW_MAX_LENGTH = 500

const metaGraphSuccessSchema = z
  .object({
    messaging_product: z.string().optional(),
    contacts: z
      .array(
        z.object({
          input: z.string().optional(),
          wa_id: z.string().optional(),
        })
      )
      .optional(),
    messages: z
      .array(
        z.object({
          id: z.string().optional(),
          message_status: z.string().optional(),
        })
      )
      .optional(),
  })
  .passthrough()

const metaGraphErrorSchema = z
  .object({
    error: z
      .object({
        message: z.string().optional(),
        type: z.string().optional(),
        code: z.number().optional(),
        error_subcode: z.number().optional(),
        fbtrace_id: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough()

type MetaGraphSuccessResponse = z.infer<typeof metaGraphSuccessSchema>
type MetaGraphErrorResponse = z.infer<typeof metaGraphErrorSchema>

export type MetaTextOutboundParams = {
  storeId: string
  to: string
  text: string
}

export type MetaTextOutboundErrorCode =
  | "CONNECTION_NOT_FOUND"
  | "INVALID_PROVIDER"
  | "CONNECTION_INACTIVE"
  | "CONNECTION_NOT_CONNECTED"
  | "MISSING_ACCESS_TOKEN"
  | "MISSING_PHONE_NUMBER_ID"
  | "MISSING_DESTINATION"
  | "MISSING_TEXT"
  | "HTTP_ERROR"
  | "UNEXPECTED_RESPONSE"
  | "TIMEOUT"
  | "FETCH_ERROR"

export type MetaGraphResponseSummary = {
  messagingProduct: string | null
  contacts: Array<{
    input: string | null
    waId: string | null
  }>
  messages: Array<{
    id: string | null
    status: string | null
  }>
}

export type MetaGraphErrorSummary = {
  message: string | null
  type: string | null
  code: number | null
  subcode: number | null
  fbtraceId: string | null
}

type MetaTextOutboundResultBase = {
  provider: "meta"
  statusCode: number | null
  whatsappConnectionId: string | null
  phoneNumberId: string | null
  graphMessageId: string | null
  graphResponse: MetaGraphResponseSummary | null
  graphError: MetaGraphErrorSummary | null
  responsePreview: string | null
}

export type MetaTextOutboundSuccessResult = MetaTextOutboundResultBase & {
  ok: true
}

export type MetaTextOutboundErrorResult = MetaTextOutboundResultBase & {
  ok: false
  errorCode: MetaTextOutboundErrorCode
  error: string
}

export type MetaTextOutboundResult =
  | MetaTextOutboundSuccessResult
  | MetaTextOutboundErrorResult

function truncateText(value: string) {
  if (value.length <= RESPONSE_PREVIEW_MAX_LENGTH) {
    return value
  }

  return `${value.slice(0, RESPONSE_PREVIEW_MAX_LENGTH - 3)}...`
}

function buildGraphEndpoint(phoneNumberId: string) {
  return `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`
}

function summarizeGraphSuccessResponse(
  response: MetaGraphSuccessResponse
): MetaGraphResponseSummary {
  return {
    messagingProduct: response.messaging_product ?? null,
    contacts: (response.contacts ?? []).map((contact) => ({
      input: contact.input ?? null,
      waId: contact.wa_id ?? null,
    })),
    messages: (response.messages ?? []).map((message) => ({
      id: message.id ?? null,
      status: message.message_status ?? null,
    })),
  }
}

function summarizeGraphErrorResponse(
  response: MetaGraphErrorResponse
): MetaGraphErrorSummary {
  return {
    message: response.error.message ?? null,
    type: response.error.type ?? null,
    code: response.error.code ?? null,
    subcode: response.error.error_subcode ?? null,
    fbtraceId: response.error.fbtrace_id ?? null,
  }
}

async function parseGraphResponse(response: Response) {
  const responseText = await response.text()
  const responsePreview = responseText ? truncateText(responseText) : null

  if (!responseText) {
    return {
      responsePreview,
      responseJson: null as unknown,
    }
  }

  try {
    return {
      responsePreview,
      responseJson: JSON.parse(responseText) as unknown,
    }
  } catch {
    return {
      responsePreview,
      responseJson: null as unknown,
    }
  }
}

function buildValidationErrorResult(params: {
  errorCode: MetaTextOutboundErrorCode
  error: string
  whatsappConnectionId?: string | null
  phoneNumberId?: string | null
}): MetaTextOutboundErrorResult {
  return {
    ok: false,
    provider: "meta",
    statusCode: null,
    whatsappConnectionId: params.whatsappConnectionId ?? null,
    phoneNumberId: params.phoneNumberId ?? null,
    graphMessageId: null,
    graphResponse: null,
    graphError: null,
    responsePreview: null,
    errorCode: params.errorCode,
    error: params.error,
  }
}

export async function sendMetaTextMessage(
  params: MetaTextOutboundParams
): Promise<MetaTextOutboundResult> {
  const connection = await findActiveWhatsAppConnectionByStoreId(params.storeId)

  if (!connection) {
    return buildValidationErrorResult({
      errorCode: "CONNECTION_NOT_FOUND",
      error: "Conexao WhatsApp ativa da loja nao encontrada",
    })
  }

  if (connection.provider !== "META_WHATSAPP") {
    return buildValidationErrorResult({
      errorCode: "INVALID_PROVIDER",
      error: "Conexao WhatsApp da loja nao utiliza o provider Meta",
      whatsappConnectionId: connection.id,
      phoneNumberId: connection.phoneNumberId,
    })
  }

  if (!connection.isActive) {
    return buildValidationErrorResult({
      errorCode: "CONNECTION_INACTIVE",
      error: "Conexao WhatsApp da loja esta inativa",
      whatsappConnectionId: connection.id,
      phoneNumberId: connection.phoneNumberId,
    })
  }

  if (connection.status !== "CONNECTED") {
    return buildValidationErrorResult({
      errorCode: "CONNECTION_NOT_CONNECTED",
      error: "Conexao WhatsApp da loja nao esta com status CONNECTED",
      whatsappConnectionId: connection.id,
      phoneNumberId: connection.phoneNumberId,
    })
  }

  const accessToken = connection.accessToken.trim()
  const phoneNumberId = connection.phoneNumberId.trim()
  const to = params.to.trim()
  const text = params.text.trim()

  if (!accessToken) {
    return buildValidationErrorResult({
      errorCode: "MISSING_ACCESS_TOKEN",
      error: "Conexao WhatsApp ativa sem accessToken",
      whatsappConnectionId: connection.id,
      phoneNumberId,
    })
  }

  if (!phoneNumberId) {
    return buildValidationErrorResult({
      errorCode: "MISSING_PHONE_NUMBER_ID",
      error: "Conexao WhatsApp ativa sem phoneNumberId",
      whatsappConnectionId: connection.id,
    })
  }

  if (!to) {
    return buildValidationErrorResult({
      errorCode: "MISSING_DESTINATION",
      error: "Numero de destino nao informado para envio outbound",
      whatsappConnectionId: connection.id,
      phoneNumberId,
    })
  }

  if (!text) {
    return buildValidationErrorResult({
      errorCode: "MISSING_TEXT",
      error: "Texto da mensagem outbound nao informado",
      whatsappConnectionId: connection.id,
      phoneNumberId,
    })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), META_GRAPH_TIMEOUT_MS)
  const endpoint = buildGraphEndpoint(phoneNumberId)

  try {
    console.info("meta outbound request start", {
      storeId: params.storeId,
      whatsappConnectionId: connection.id,
      phoneNumberId,
      to,
      endpoint,
      textLength: text.length,
    })

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: text,
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    })

    const { responseJson, responsePreview } = await parseGraphResponse(response)

    console.info("meta outbound response", {
      storeId: params.storeId,
      whatsappConnectionId: connection.id,
      phoneNumberId,
      to,
      status: response.status,
      ok: response.ok,
      responsePreview,
    })

    const parsedSuccess = metaGraphSuccessSchema.safeParse(responseJson)
    const parsedError = metaGraphErrorSchema.safeParse(responseJson)

    if (!response.ok) {
      const graphError = parsedError.success
        ? summarizeGraphErrorResponse(parsedError.data)
        : null

      return {
        ok: false,
        provider: "meta",
        statusCode: response.status,
        whatsappConnectionId: connection.id,
        phoneNumberId,
        graphMessageId: null,
        graphResponse: parsedSuccess.success
          ? summarizeGraphSuccessResponse(parsedSuccess.data)
          : null,
        graphError,
        responsePreview,
        errorCode: "HTTP_ERROR",
        error:
          graphError?.message ??
          `Meta Graph API retornou status ${response.status} ao enviar mensagem`,
      }
    }

    if (!parsedSuccess.success) {
      return {
        ok: false,
        provider: "meta",
        statusCode: response.status,
        whatsappConnectionId: connection.id,
        phoneNumberId,
        graphMessageId: null,
        graphResponse: null,
        graphError: parsedError.success
          ? summarizeGraphErrorResponse(parsedError.data)
          : null,
        responsePreview,
        errorCode: "UNEXPECTED_RESPONSE",
        error: "Resposta inesperada da Meta Graph API no envio outbound",
      }
    }

    const graphResponse = summarizeGraphSuccessResponse(parsedSuccess.data)

    return {
      ok: true,
      provider: "meta",
      statusCode: response.status,
      whatsappConnectionId: connection.id,
      phoneNumberId,
      graphMessageId: graphResponse.messages[0]?.id ?? null,
      graphResponse,
      graphError: null,
      responsePreview,
    }
  } catch (error) {
    const isAbortError =
      error instanceof Error && error.name === "AbortError"

    console.error("meta outbound fetch failure", {
      storeId: params.storeId,
      whatsappConnectionId: connection.id,
      phoneNumberId,
      to,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      ok: false,
      provider: "meta",
      statusCode: null,
      whatsappConnectionId: connection.id,
      phoneNumberId,
      graphMessageId: null,
      graphResponse: null,
      graphError: null,
      responsePreview: null,
      errorCode: isAbortError ? "TIMEOUT" : "FETCH_ERROR",
      error: isAbortError
        ? `Timeout ao enviar mensagem para ${to} via Meta Graph API`
        : `Falha de rede ao enviar mensagem para ${to} via Meta Graph API`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
