import { randomUUID } from "node:crypto"
import { z } from "zod"

const DEFAULT_META_GRAPH_API_VERSION = "v25.0"
const META_GRAPH_TIMEOUT_MS = 10_000

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

const metaAccessTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string().optional(),
  })
  .passthrough()

const metaPhoneNumberSchema = z
  .object({
    id: z.string().min(1),
    display_phone_number: z.string().optional(),
    verified_name: z.string().optional(),
    platform_type: z.string().optional(),
    quality_rating: z.string().optional(),
    code_verification_status: z.string().optional(),
    name_status: z.string().optional(),
  })
  .passthrough()

const metaPhoneNumbersResponseSchema = z
  .object({
    data: z.array(metaPhoneNumberSchema),
  })
  .passthrough()

type MetaGraphErrorResponse = z.infer<typeof metaGraphErrorSchema>
type MetaPhoneNumberResponse = z.infer<typeof metaPhoneNumberSchema>

export class MetaEmbeddedSignupError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    options?: {
      status?: number
      details?: Record<string, unknown>
    }
  ) {
    super(message)
    this.name = "MetaEmbeddedSignupError"
    this.code = code
    this.status = options?.status ?? 400
    this.details = options?.details
  }
}

export type MetaEmbeddedSignupConnectionDraft = {
  accessToken: string
  phoneNumberId: string | null
  wabaId: string | null
  businessId: string | null
  displayPhoneNumber: string | null
  verifiedName: string | null
  platformType: string | null
}

type ResolveMetaEmbeddedSignupParams = {
  code: string
  phoneNumberId?: string | null
  wabaId?: string | null
  businessId?: string | null
}

type MetaServerConfig = {
  appId: string
  appSecret: string
  graphApiVersion: string
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function toMetaServerConfig(): MetaServerConfig {
  const appId =
    process.env.META_APP_ID?.trim() || process.env.NEXT_PUBLIC_META_APP_ID?.trim() || ""
  const appSecret =
    process.env.META_APP_SECRET?.trim() ||
    process.env.WHATSAPP_META_APP_SECRET?.trim() ||
    ""
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_META_GRAPH_API_VERSION

  if (!appId) {
    throw new MetaEmbeddedSignupError(
      "META_EMBEDDED_SIGNUP_NOT_CONFIGURED",
      "META_APP_ID nao foi configurado para trocar o code da Meta.",
      { status: 500 }
    )
  }

  if (!appSecret) {
    throw new MetaEmbeddedSignupError(
      "META_EMBEDDED_SIGNUP_NOT_CONFIGURED",
      "META_APP_SECRET nao foi configurado para trocar o code da Meta.",
      { status: 500 }
    )
  }

  return {
    appId,
    appSecret,
    graphApiVersion,
  }
}

function buildGraphUrl(
  graphApiVersion: string,
  path: string,
  query?: Record<string, string | null | undefined>
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`https://graph.facebook.com/${graphApiVersion}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== "string" || value.trim().length === 0) {
        continue
      }

      url.searchParams.set(key, value.trim())
    }
  }

  return url
}

function summarizeMetaError(error: MetaGraphErrorResponse | null) {
  return {
    message: error?.error.message ?? null,
    type: error?.error.type ?? null,
    code: error?.error.code ?? null,
    subcode: error?.error.error_subcode ?? null,
    fbtraceId: error?.error.fbtrace_id ?? null,
  }
}

async function parseMetaResponse(response: Response) {
  const text = await response.text()

  if (!text) {
    return null as unknown
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null as unknown
  }
}

async function fetchMetaJson(
  url: URL,
  options: RequestInit,
  failureMessage: string
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), META_GRAPH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    })
    const responseJson = await parseMetaResponse(response)
    const parsedError = metaGraphErrorSchema.safeParse(responseJson)

    if (!response.ok) {
      throw new MetaEmbeddedSignupError(
        "META_GRAPH_REQUEST_FAILED",
        parsedError.success && parsedError.data.error.message
          ? parsedError.data.error.message
          : failureMessage,
        {
          status: 502,
          details: {
            metaStatusCode: response.status,
            graphError: summarizeMetaError(parsedError.success ? parsedError.data : null),
          },
        }
      )
    }

    return responseJson
  } catch (error) {
    if (error instanceof MetaEmbeddedSignupError) {
      throw error
    }

    const isAbortError = error instanceof Error && error.name === "AbortError"

    throw new MetaEmbeddedSignupError(
      "META_GRAPH_REQUEST_FAILED",
      isAbortError
        ? "Timeout ao comunicar com a Meta durante o embedded signup."
        : "Falha de rede ao comunicar com a Meta durante o embedded signup.",
      { status: 502 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

async function exchangeCodeForAccessToken(params: {
  graphApiVersion: string
  appId: string
  appSecret: string
  code: string
}) {
  const url = buildGraphUrl(params.graphApiVersion, "/oauth/access_token", {
    client_id: params.appId,
    client_secret: params.appSecret,
    code: params.code,
  })

  const responseJson = await fetchMetaJson(
    url,
    { method: "GET" },
    "A Meta recusou a troca do code do embedded signup."
  )
  const parsed = metaAccessTokenResponseSchema.safeParse(responseJson)

  if (!parsed.success) {
    throw new MetaEmbeddedSignupError(
      "META_GRAPH_REQUEST_FAILED",
      "A Meta respondeu a troca do code, mas sem um access_token utilizavel.",
      { status: 502 }
    )
  }

  return parsed.data.access_token.trim()
}

async function fetchPhoneNumberById(params: {
  graphApiVersion: string
  accessToken: string
  phoneNumberId: string
}) {
  const url = buildGraphUrl(params.graphApiVersion, `/${params.phoneNumberId}`)
  const responseJson = await fetchMetaJson(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    },
    "A Meta nao retornou detalhes do phoneNumberId informado."
  )
  const parsed = metaPhoneNumberSchema.safeParse(responseJson)

  if (!parsed.success) {
    throw new MetaEmbeddedSignupError(
      "META_GRAPH_REQUEST_FAILED",
      "A Meta respondeu o phoneNumberId, mas o payload retornado foi inesperado.",
      { status: 502 }
    )
  }

  return parsed.data
}

async function fetchPhoneNumbersByWabaId(params: {
  graphApiVersion: string
  accessToken: string
  wabaId: string
}) {
  const url = buildGraphUrl(params.graphApiVersion, `/${params.wabaId}/phone_numbers`, {
    fields:
      "id,display_phone_number,verified_name,platform_type,quality_rating,code_verification_status,name_status",
  })
  const responseJson = await fetchMetaJson(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    },
    "A Meta nao retornou a lista de phone numbers da WABA."
  )
  const parsed = metaPhoneNumbersResponseSchema.safeParse(responseJson)

  if (!parsed.success) {
    throw new MetaEmbeddedSignupError(
      "META_GRAPH_REQUEST_FAILED",
      "A Meta respondeu a lista de phone numbers da WABA em formato inesperado.",
      { status: 502 }
    )
  }

  return parsed.data.data
}

function toConnectionDraft(params: {
  accessToken: string
  phoneNumber: MetaPhoneNumberResponse | null
  phoneNumberId: string | null
  wabaId: string | null
  businessId: string | null
}) {
  return {
    accessToken: params.accessToken,
    phoneNumberId: params.phoneNumber?.id?.trim() || params.phoneNumberId,
    wabaId: params.wabaId,
    businessId: params.businessId,
    displayPhoneNumber: params.phoneNumber?.display_phone_number?.trim() || null,
    verifiedName: params.phoneNumber?.verified_name?.trim() || null,
    platformType: params.phoneNumber?.platform_type?.trim() || null,
  } satisfies MetaEmbeddedSignupConnectionDraft
}

export function createWhatsAppVerifyToken() {
  return `wa_verify_${randomUUID().replace(/-/g, "")}`
}

export function getMetaEmbeddedSignupPublicConfig() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID?.trim() || "",
    configId: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || "",
    graphApiVersion:
      process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_META_GRAPH_API_VERSION,
  }
}

export async function resolveMetaEmbeddedSignupConnection(
  params: ResolveMetaEmbeddedSignupParams
) {
  const config = toMetaServerConfig()
  const accessToken = await exchangeCodeForAccessToken({
    graphApiVersion: config.graphApiVersion,
    appId: config.appId,
    appSecret: config.appSecret,
    code: params.code.trim(),
  })

  const hintedPhoneNumberId = normalizeText(params.phoneNumberId)
  const hintedWabaId = normalizeText(params.wabaId)
  const hintedBusinessId = normalizeText(params.businessId)

  if (!hintedPhoneNumberId && !hintedWabaId) {
    throw new MetaEmbeddedSignupError(
      "META_EMBEDDED_SIGNUP_INCOMPLETE",
      "A Meta autenticou o cadastro, mas o fluxo nao retornou phoneNumberId ou wabaId suficientes para concluir a conexao.",
      { status: 422 }
    )
  }

  if (hintedPhoneNumberId) {
    const phoneNumber = await fetchPhoneNumberById({
      graphApiVersion: config.graphApiVersion,
      accessToken,
      phoneNumberId: hintedPhoneNumberId,
    })

    return toConnectionDraft({
      accessToken,
      phoneNumber,
      phoneNumberId: hintedPhoneNumberId,
      wabaId: hintedWabaId,
      businessId: hintedBusinessId,
    })
  }

  const phoneNumbers = await fetchPhoneNumbersByWabaId({
    graphApiVersion: config.graphApiVersion,
    accessToken,
    wabaId: hintedWabaId!,
  })
  const firstPhoneNumber = phoneNumbers[0] ?? null

  if (!firstPhoneNumber) {
    throw new MetaEmbeddedSignupError(
      "META_EMBEDDED_SIGNUP_INCOMPLETE",
      "A Meta autenticou o cadastro, mas nao retornou nenhum phone number para a WABA conectada.",
      { status: 422 }
    )
  }

  return toConnectionDraft({
    accessToken,
    phoneNumber: firstPhoneNumber,
    phoneNumberId: firstPhoneNumber.id.trim(),
    wabaId: hintedWabaId,
    businessId: hintedBusinessId,
  })
}
