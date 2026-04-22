import { createHash } from "node:crypto"
import { z } from "zod"
import type { WhatsAppConnectionEditableRecord } from "@/lib/whatsapp/admin-connection"
import type {
  WhatsAppConnectionOperationalAssessment,
  WhatsAppConnectionOperationalState,
} from "@/lib/whatsapp/operational-status"

export const META_GRAPH_API_VERSION = "v25.0"
const META_GRAPH_TIMEOUT_MS = 10_000
const RESPONSE_PREVIEW_MAX_LENGTH = 500

const metaPhoneNumberResponseSchema = z
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

type MetaPhoneNumberResponse = z.infer<typeof metaPhoneNumberResponseSchema>
type MetaGraphErrorResponse = z.infer<typeof metaGraphErrorSchema>

export type MetaConnectionCheckStatus = "success" | "failed" | "blocked"

export type MetaConnectionCheckFlags = {
  tokenAuthenticated: boolean | null
  phoneNumberAccessible: boolean | null
  displayPhoneNumberMatches: boolean | null
}

export type MetaGraphErrorSummary = {
  message: string | null
  type: string | null
  code: number | null
  subcode: number | null
  fbtraceId: string | null
}

export type MetaAccessTokenReadSummary = {
  source: "WhatsAppConnection.accessToken"
  present: boolean
  trimmedLength: number
  sha256Prefix: string | null
}

export type MetaPhoneNumberSummary = {
  id: string | null
  displayPhoneNumber: string | null
  verifiedName: string | null
  platformType: string | null
  qualityRating: string | null
  codeVerificationStatus: string | null
  nameStatus: string | null
}

export type WhatsAppConnectionRealCheckDetails = {
  storeId: string | null
  whatsappConnectionId: string | null
  provider: string | null
  operationalState: WhatsAppConnectionOperationalState
  operationalStateLabel: string
  operationalBlockingIssues: string[]
  phoneNumberId: string | null
  businessAccountId: string | null
  expectedDisplayPhoneNumber: string | null
  accessTokenRead: MetaAccessTokenReadSummary
  metaGraphApiVersion: string
  metaRequestPath: string | null
  metaStatusCode: number | null
  checks: MetaConnectionCheckFlags
  returnedPhoneNumber: MetaPhoneNumberSummary | null
  graphError: MetaGraphErrorSummary | null
  responsePreview: string | null
}

export type WhatsAppConnectionRealCheckResult = {
  ok: boolean
  status: MetaConnectionCheckStatus
  message: string
  checkedAt: string
  details: WhatsAppConnectionRealCheckDetails
}

type RunWhatsAppConnectionRealCheckParams = {
  storeId: string
  connection?: WhatsAppConnectionEditableRecord | null
  operational: WhatsAppConnectionOperationalAssessment
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0
}

function truncateText(value: string) {
  if (value.length <= RESPONSE_PREVIEW_MAX_LENGTH) {
    return value
  }

  return `${value.slice(0, RESPONSE_PREVIEW_MAX_LENGTH - 3)}...`
}

function normalizePhoneForComparison(value: string) {
  return value.replace(/\D/g, "")
}

function hasCompatiblePhoneDigits(leftDigits: string, rightDigits: string) {
  if (!leftDigits || !rightDigits) {
    return false
  }

  if (leftDigits === rightDigits) {
    return true
  }

  const shorterValue =
    leftDigits.length < rightDigits.length ? leftDigits : rightDigits
  const longerValue =
    leftDigits.length < rightDigits.length ? rightDigits : leftDigits

  return shorterValue.length >= 10 && longerValue.endsWith(shorterValue)
}

function compareDisplayPhoneNumbers(
  expectedDisplayPhoneNumber: string | null,
  returnedDisplayPhoneNumber: string | null
) {
  const expectedValue = expectedDisplayPhoneNumber ?? ""
  const returnedValue = returnedDisplayPhoneNumber ?? ""

  if (!hasText(expectedValue) || !hasText(returnedValue)) {
    return null
  }

  const trimmedExpectedValue = expectedValue.trim()
  const trimmedReturnedValue = returnedValue.trim()
  const expectedDigits = normalizePhoneForComparison(trimmedExpectedValue)
  const returnedDigits = normalizePhoneForComparison(trimmedReturnedValue)

  if (hasCompatiblePhoneDigits(expectedDigits, returnedDigits)) {
    return true
  }

  if (expectedDigits || returnedDigits) {
    return false
  }

  return trimmedExpectedValue === trimmedReturnedValue
}

function buildPhoneNumberEndpoint(phoneNumberId: string) {
  return `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}`
}

function summarizeAccessTokenRead(
  accessToken: string | null | undefined
): MetaAccessTokenReadSummary {
  const trimmedAccessToken = accessToken?.trim() ?? ""

  return {
    source: "WhatsAppConnection.accessToken",
    present: trimmedAccessToken.length > 0,
    trimmedLength: trimmedAccessToken.length,
    sha256Prefix: trimmedAccessToken
      ? createHash("sha256").update(trimmedAccessToken).digest("hex").slice(0, 12)
      : null,
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

function summarizePhoneNumberResponse(
  response: MetaPhoneNumberResponse
): MetaPhoneNumberSummary {
  return {
    id: response.id ?? null,
    displayPhoneNumber: response.display_phone_number ?? null,
    verifiedName: response.verified_name ?? null,
    platformType: response.platform_type ?? null,
    qualityRating: response.quality_rating ?? null,
    codeVerificationStatus: response.code_verification_status ?? null,
    nameStatus: response.name_status ?? null,
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

function buildDetails(params: {
  storeId: string | null
  connection?: WhatsAppConnectionEditableRecord | null
  operational: WhatsAppConnectionOperationalAssessment
  metaRequestPath?: string | null
  metaStatusCode?: number | null
  checks?: Partial<MetaConnectionCheckFlags>
  returnedPhoneNumber?: MetaPhoneNumberSummary | null
  graphError?: MetaGraphErrorSummary | null
  responsePreview?: string | null
}): WhatsAppConnectionRealCheckDetails {
  return {
    storeId: params.storeId,
    whatsappConnectionId: params.connection?.id ?? null,
    provider: params.connection?.provider ?? null,
    operationalState: params.operational.state,
    operationalStateLabel: params.operational.stateLabel,
    operationalBlockingIssues: params.operational.blockingIssues,
    phoneNumberId: params.connection?.phoneNumberId?.trim() || null,
    businessAccountId: params.connection?.businessAccountId?.trim() || null,
    expectedDisplayPhoneNumber: params.connection?.displayPhoneNumber?.trim() || null,
    accessTokenRead: summarizeAccessTokenRead(params.connection?.accessToken),
    metaGraphApiVersion: META_GRAPH_API_VERSION,
    metaRequestPath: params.metaRequestPath ?? null,
    metaStatusCode: params.metaStatusCode ?? null,
    checks: {
      tokenAuthenticated: params.checks?.tokenAuthenticated ?? null,
      phoneNumberAccessible: params.checks?.phoneNumberAccessible ?? null,
      displayPhoneNumberMatches: params.checks?.displayPhoneNumberMatches ?? null,
    },
    returnedPhoneNumber: params.returnedPhoneNumber ?? null,
    graphError: params.graphError ?? null,
    responsePreview: params.responsePreview ?? null,
  }
}

function createResult(params: {
  ok: boolean
  status: MetaConnectionCheckStatus
  message: string
  details: WhatsAppConnectionRealCheckDetails
}) {
  return {
    ok: params.ok,
    status: params.status,
    message: params.message,
    checkedAt: new Date().toISOString(),
    details: params.details,
  } satisfies WhatsAppConnectionRealCheckResult
}

function inferTokenAuthenticated(params: {
  statusCode: number
  graphError: MetaGraphErrorSummary | null
}) {
  if (params.statusCode === 401 || params.graphError?.code === 190) {
    return false
  }

  if (params.statusCode === 403 || params.statusCode === 404) {
    return true
  }

  if (params.statusCode >= 500) {
    return null
  }

  return true
}

function getBlockedMessage(
  state: WhatsAppConnectionOperationalState,
  blockingIssues: string[]
) {
  if (state === "missing") {
    return "Cadastre a conexao Meta/WhatsApp da loja antes de executar o teste real."
  }

  if (state === "incomplete") {
    return "Conclua a configuracao minima da conexao antes de executar o teste real com a Meta."
  }

  if (blockingIssues.length > 0) {
    return blockingIssues[0]
  }

  return "A conexao salva ainda nao possui os dados minimos para executar o teste real."
}

function getHttpFailureMessage(params: {
  tokenAuthenticated: boolean | null
  graphError: MetaGraphErrorSummary | null
  statusCode: number
}) {
  if (params.tokenAuthenticated === false) {
    return "A Meta recusou o accessToken salvo para esta loja."
  }

  if (params.statusCode === 403 || params.statusCode === 404) {
    return "A Meta nao permitiu acessar o phoneNumberId salvo com o token atual."
  }

  if (params.statusCode >= 500) {
    return "A Meta respondeu com erro interno durante a verificacao da conexao."
  }

  return (
    params.graphError?.message ??
    `A Meta retornou status ${params.statusCode} ao validar o phoneNumberId salvo.`
  )
}

export async function runWhatsAppConnectionRealCheck(
  params: RunWhatsAppConnectionRealCheckParams
): Promise<WhatsAppConnectionRealCheckResult> {
  const connection = params.connection ?? null

  if (
    params.operational.state === "missing" ||
    params.operational.state === "incomplete"
  ) {
    return createResult({
      ok: false,
      status: "blocked",
      message: getBlockedMessage(
        params.operational.state,
        params.operational.blockingIssues
      ),
      details: buildDetails({
        storeId: params.storeId,
        connection,
        operational: params.operational,
      }),
    })
  }

  const accessToken = connection?.accessToken?.trim() ?? ""
  const phoneNumberId = connection?.phoneNumberId?.trim() ?? ""

  if (connection?.provider !== "META_WHATSAPP") {
    return createResult({
      ok: false,
      status: "blocked",
      message: "A conexao salva nao utiliza o provider Meta WhatsApp.",
      details: buildDetails({
        storeId: params.storeId,
        connection,
        operational: params.operational,
      }),
    })
  }

  if (!accessToken || !phoneNumberId) {
    return createResult({
      ok: false,
      status: "blocked",
      message:
        "A conexao salva nao possui accessToken e phoneNumberId suficientes para o teste real.",
      details: buildDetails({
        storeId: params.storeId,
        connection,
        operational: params.operational,
      }),
    })
  }

  const endpoint = buildPhoneNumberEndpoint(phoneNumberId)
  const metaRequestPath = `/${phoneNumberId}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), META_GRAPH_TIMEOUT_MS)

  try {
    console.info("[whatsapp-connection-check] Meta request", {
      storeId: params.storeId,
      whatsappConnectionId: connection?.id ?? null,
      phoneNumberId,
      endpoint,
      accessTokenRead: summarizeAccessTokenRead(accessToken),
    })

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: controller.signal,
    })

    const { responseJson, responsePreview } = await parseGraphResponse(response)
    const parsedError = metaGraphErrorSchema.safeParse(responseJson)

    console.info("[whatsapp-connection-check] Meta response", {
      storeId: params.storeId,
      whatsappConnectionId: connection?.id ?? null,
      phoneNumberId,
      status: response.status,
      ok: response.ok,
      responsePreview,
    })

    if (!response.ok) {
      const graphError = parsedError.success
        ? summarizeGraphErrorResponse(parsedError.data)
        : null
      const tokenAuthenticated = inferTokenAuthenticated({
        statusCode: response.status,
        graphError,
      })

      return createResult({
        ok: false,
        status: "failed",
        message: getHttpFailureMessage({
          tokenAuthenticated,
          graphError,
          statusCode: response.status,
        }),
        details: buildDetails({
          storeId: params.storeId,
          connection,
          operational: params.operational,
          metaRequestPath,
          metaStatusCode: response.status,
          checks: {
            tokenAuthenticated,
            phoneNumberAccessible: false,
            displayPhoneNumberMatches: null,
          },
          graphError,
          responsePreview,
        }),
      })
    }

    const parsedSuccess = metaPhoneNumberResponseSchema.safeParse(responseJson)

    if (!parsedSuccess.success) {
      return createResult({
        ok: false,
        status: "failed",
        message:
          "A Meta respondeu ao teste, mas o payload retornado foi inesperado para validar a conexao.",
        details: buildDetails({
          storeId: params.storeId,
          connection,
          operational: params.operational,
          metaRequestPath,
          metaStatusCode: response.status,
          checks: {
            tokenAuthenticated: true,
            phoneNumberAccessible: true,
            displayPhoneNumberMatches: null,
          },
          graphError: parsedError.success
            ? summarizeGraphErrorResponse(parsedError.data)
            : null,
          responsePreview,
        }),
      })
    }

    const returnedPhoneNumber = summarizePhoneNumberResponse(parsedSuccess.data)
    const displayPhoneNumberMatches = compareDisplayPhoneNumbers(
      connection?.displayPhoneNumber?.trim() || null,
      returnedPhoneNumber.displayPhoneNumber
    )
    const returnedPhoneNumberId = returnedPhoneNumber.id?.trim() || null

    if (returnedPhoneNumberId && returnedPhoneNumberId !== phoneNumberId) {
      return createResult({
        ok: false,
        status: "failed",
        message:
          "A Meta respondeu ao teste, mas o recurso retornado nao corresponde ao phoneNumberId salvo.",
        details: buildDetails({
          storeId: params.storeId,
          connection,
          operational: params.operational,
          metaRequestPath,
          metaStatusCode: response.status,
          checks: {
            tokenAuthenticated: true,
            phoneNumberAccessible: true,
            displayPhoneNumberMatches,
          },
          returnedPhoneNumber,
          responsePreview,
        }),
      })
    }

    if (displayPhoneNumberMatches === false) {
      return createResult({
        ok: false,
        status: "failed",
        message:
          "A Meta respondeu ao phoneNumberId, mas o numero retornado nao confere com o displayPhoneNumber salvo.",
        details: buildDetails({
          storeId: params.storeId,
          connection,
          operational: params.operational,
          metaRequestPath,
          metaStatusCode: response.status,
          checks: {
            tokenAuthenticated: true,
            phoneNumberAccessible: true,
            displayPhoneNumberMatches,
          },
          returnedPhoneNumber,
          responsePreview,
        }),
      })
    }

    return createResult({
      ok: true,
      status: "success",
      message:
        params.operational.state === "inactive"
          ? "Conexao Meta validada com sucesso, mas a conexao segue inativa localmente."
          : "Conexao Meta validada com sucesso. O token autenticou e o phoneNumberId respondeu na Graph API.",
      details: buildDetails({
        storeId: params.storeId,
        connection,
        operational: params.operational,
        metaRequestPath,
        metaStatusCode: response.status,
        checks: {
          tokenAuthenticated: true,
          phoneNumberAccessible: true,
          displayPhoneNumberMatches,
        },
        returnedPhoneNumber,
        responsePreview,
      }),
    })
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError"

    return createResult({
      ok: false,
      status: "failed",
      message: isAbortError
        ? "Timeout ao consultar a Meta Graph API para validar a conexao."
        : "Falha de rede ao consultar a Meta Graph API para validar a conexao.",
      details: buildDetails({
        storeId: params.storeId,
        connection,
        operational: params.operational,
        metaRequestPath,
      }),
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
