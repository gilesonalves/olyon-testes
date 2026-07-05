import { z } from "zod"

const DEFAULT_META_GRAPH_API_VERSION = "v25.0"
const META_GRAPH_TIMEOUT_MS = 10_000
const RESPONSE_PREVIEW_MAX_LENGTH = 500
const MAX_TEMPLATE_LIST_PAGES = 20

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

const metaTemplateComponentSchema = z
  .object({
    type: z.string().optional(),
  })
  .passthrough()

const metaTemplateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1),
    category: z.string().min(1),
    language: z.string().min(1),
    rejected_reason: z.string().nullable().optional(),
    components: z.array(metaTemplateComponentSchema).default([]),
  })
  .passthrough()

const metaTemplatesResponseSchema = z
  .object({
    data: z.array(metaTemplateSchema),
    paging: z
      .object({
        cursors: z
          .object({
            after: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough()

const metaTemplateCreationResponseSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough()

const metaSendSuccessSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            id: z.string().optional(),
            message_status: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough()

export type MetaWhatsAppTemplate = z.infer<typeof metaTemplateSchema>
export type MetaWhatsAppTemplateComponent = z.infer<
  typeof metaTemplateComponentSchema
>

export type MetaGraphErrorSummary = {
  message: string | null
  type: string | null
  code: number | null
  subcode: number | null
  fbtraceId: string | null
}

export type MetaWhatsAppTemplateTextParameter = {
  type: "text"
  text: string
  parameter_name?: string
}

export type MetaWhatsAppTemplateSendComponent = {
  type: "header" | "body" | "button" | string
  sub_type?: string
  index?: string
  parameters?: MetaWhatsAppTemplateTextParameter[]
}

export type MetaWhatsAppTemplateNamedParameterExample = {
  param_name: string
  example: string
}

export type MetaWhatsAppTemplateCreationComponent = {
  type: "BODY"
  text: string
  example: {
    body_text_named_params: MetaWhatsAppTemplateNamedParameterExample[]
  }
}

export type ListMetaWhatsAppTemplatesParams = {
  wabaId: string
  accessToken: string
}

export type CreateMetaWhatsAppTemplateParams = {
  wabaId: string
  accessToken: string
  name: string
  language: string
  category: "UTILITY"
  components: MetaWhatsAppTemplateCreationComponent[]
}

export type SendMetaWhatsAppTemplateParams = {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  languageCode: string
  components: MetaWhatsAppTemplateSendComponent[]
}

export type MetaWhatsAppTemplateSendResult = {
  ok: boolean
  statusCode: number
  graphResponse: unknown
  graphMessageId: string | null
  graphError: MetaGraphErrorSummary | null
  responsePreview: string | null
}

export type MetaWhatsAppTemplateCreationResult = {
  id: string | null
  status: string | null
  category: string | null
  graphResponse: unknown
}

export class MetaWhatsAppTemplatesError extends Error {
  statusCode: number
  metaStatusCode: number | null
  graphError: MetaGraphErrorSummary | null
  responsePreview: string | null

  constructor(
    message: string,
    options?: {
      statusCode?: number
      metaStatusCode?: number | null
      graphError?: MetaGraphErrorSummary | null
      responsePreview?: string | null
    }
  ) {
    super(message)
    this.name = "MetaWhatsAppTemplatesError"
    this.statusCode = options?.statusCode ?? 502
    this.metaStatusCode = options?.metaStatusCode ?? null
    this.graphError = options?.graphError ?? null
    this.responsePreview = options?.responsePreview ?? null
  }
}

function truncateText(value: string) {
  if (value.length <= RESPONSE_PREVIEW_MAX_LENGTH) {
    return value
  }

  return `${value.slice(0, RESPONSE_PREVIEW_MAX_LENGTH - 3)}...`
}

function buildGraphUrl(
  path: string,
  query?: Record<string, string | null | undefined>
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION?.trim() ||
    DEFAULT_META_GRAPH_API_VERSION
  const url = new URL(
    `https://graph.facebook.com/${graphApiVersion}${normalizedPath}`
  )

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      const trimmedValue = value?.trim()

      if (!trimmedValue) {
        continue
      }

      url.searchParams.set(key, trimmedValue)
    }
  }

  return url
}

function summarizeGraphError(response: unknown): MetaGraphErrorSummary | null {
  const parsed = metaGraphErrorSchema.safeParse(response)

  if (!parsed.success) {
    return null
  }

  return {
    message: parsed.data.error.message ?? null,
    type: parsed.data.error.type ?? null,
    code: parsed.data.error.code ?? null,
    subcode: parsed.data.error.error_subcode ?? null,
    fbtraceId: parsed.data.error.fbtrace_id ?? null,
  }
}

async function parseGraphResponse(response: Response) {
  const responseText = await response.text()
  const responsePreview = responseText ? truncateText(responseText) : null

  if (!responseText) {
    return {
      responseJson: null as unknown,
      responsePreview,
    }
  }

  try {
    return {
      responseJson: JSON.parse(responseText) as unknown,
      responsePreview,
    }
  } catch {
    return {
      responseJson: null as unknown,
      responsePreview,
    }
  }
}

async function fetchMetaGraph(
  url: URL,
  options: RequestInit,
  timeoutMessage: string
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), META_GRAPH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    })
    const parsed = await parseGraphResponse(response)

    return {
      response,
      ...parsed,
    }
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError"

    throw new MetaWhatsAppTemplatesError(
      isAbortError
        ? timeoutMessage
        : "Falha de rede ao comunicar com a Meta Graph API.",
      { statusCode: isAbortError ? 504 : 502 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

function getGraphErrorMessage(
  graphError: MetaGraphErrorSummary | null,
  fallback: string
) {
  return graphError?.message ?? fallback
}

export async function listMetaWhatsAppTemplates(
  params: ListMetaWhatsAppTemplatesParams
): Promise<MetaWhatsAppTemplate[]> {
  const wabaId = params.wabaId.trim()
  const accessToken = params.accessToken.trim()

  if (!wabaId) {
    throw new MetaWhatsAppTemplatesError("WABA ID nao informado.", {
      statusCode: 400,
    })
  }

  if (!accessToken) {
    throw new MetaWhatsAppTemplatesError("Access token nao informado.", {
      statusCode: 400,
    })
  }

  const templates: MetaWhatsAppTemplate[] = []
  let after: string | null = null

  for (let page = 0; page < MAX_TEMPLATE_LIST_PAGES; page += 1) {
    const url = buildGraphUrl(`/${encodeURIComponent(wabaId)}/message_templates`, {
      fields:
        "id,name,status,category,language,rejected_reason,components",
      limit: "100",
      after,
    })
    const { response, responseJson, responsePreview } = await fetchMetaGraph(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "Timeout ao listar templates WhatsApp na Meta Graph API."
    )
    const graphError = summarizeGraphError(responseJson)

    if (!response.ok) {
      throw new MetaWhatsAppTemplatesError(
        getGraphErrorMessage(
          graphError,
          `A Meta retornou status ${response.status} ao listar templates WhatsApp.`
        ),
        {
          statusCode: 502,
          metaStatusCode: response.status,
          graphError,
          responsePreview,
        }
      )
    }

    const parsed = metaTemplatesResponseSchema.safeParse(responseJson)

    if (!parsed.success) {
      throw new MetaWhatsAppTemplatesError(
        "A Meta respondeu a lista de templates em formato inesperado.",
        {
          statusCode: 502,
          metaStatusCode: response.status,
          graphError,
          responsePreview,
        }
      )
    }

    templates.push(...parsed.data.data)
    after = parsed.data.paging?.cursors?.after ?? null

    if (!after) {
      return templates
    }
  }

  throw new MetaWhatsAppTemplatesError(
    "A listagem de templates da Meta excedeu o limite seguro de paginacao.",
    { statusCode: 502 }
  )
}

export async function createMetaWhatsAppTemplate(
  params: CreateMetaWhatsAppTemplateParams
): Promise<MetaWhatsAppTemplateCreationResult> {
  const wabaId = params.wabaId.trim()
  const accessToken = params.accessToken.trim()
  const name = params.name.trim()
  const language = params.language.trim()

  if (!wabaId) {
    throw new MetaWhatsAppTemplatesError("WABA ID nao informado.", {
      statusCode: 400,
    })
  }

  if (!accessToken) {
    throw new MetaWhatsAppTemplatesError("Access token nao informado.", {
      statusCode: 400,
    })
  }

  if (!name || !language) {
    throw new MetaWhatsAppTemplatesError(
      "Nome e idioma do template sao obrigatorios.",
      { statusCode: 400 }
    )
  }

  const url = buildGraphUrl(`/${encodeURIComponent(wabaId)}/message_templates`)
  const { response, responseJson, responsePreview } = await fetchMetaGraph(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        language,
        category: params.category,
        parameter_format: "NAMED",
        components: params.components,
      }),
    },
    "Timeout ao criar template WhatsApp na Meta Graph API."
  )
  const graphError = summarizeGraphError(responseJson)

  if (!response.ok) {
    throw new MetaWhatsAppTemplatesError(
      getGraphErrorMessage(
        graphError,
        `A Meta retornou status ${response.status} ao criar o template WhatsApp.`
      ),
      {
        statusCode: 502,
        metaStatusCode: response.status,
        graphError,
        responsePreview,
      }
    )
  }

  const parsed = metaTemplateCreationResponseSchema.safeParse(responseJson)

  if (!parsed.success) {
    throw new MetaWhatsAppTemplatesError(
      "A Meta respondeu a criacao do template em formato inesperado.",
      {
        statusCode: 502,
        metaStatusCode: response.status,
        graphError,
        responsePreview,
      }
    )
  }

  return {
    id: parsed.data.id ?? null,
    status: parsed.data.status ?? null,
    category: parsed.data.category ?? null,
    graphResponse: responseJson,
  }
}

export async function sendMetaWhatsAppTemplate(
  params: SendMetaWhatsAppTemplateParams
): Promise<MetaWhatsAppTemplateSendResult> {
  const phoneNumberId = params.phoneNumberId.trim()
  const accessToken = params.accessToken.trim()
  const to = params.to.trim()
  const templateName = params.templateName.trim()
  const languageCode = params.languageCode.trim()

  if (!phoneNumberId) {
    throw new MetaWhatsAppTemplatesError("phoneNumberId nao informado.", {
      statusCode: 400,
    })
  }

  if (!accessToken) {
    throw new MetaWhatsAppTemplatesError("Access token nao informado.", {
      statusCode: 400,
    })
  }

  const url = buildGraphUrl(`/${encodeURIComponent(phoneNumberId)}/messages`)
  const { response, responseJson, responsePreview } = await fetchMetaGraph(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: params.components,
        },
      }),
    },
    "Timeout ao enviar template WhatsApp na Meta Graph API."
  )
  const graphError = summarizeGraphError(responseJson)
  const parsedSuccess = metaSendSuccessSchema.safeParse(responseJson)

  return {
    ok: response.ok,
    statusCode: response.status,
    graphResponse: responseJson,
    graphMessageId: parsedSuccess.success
      ? parsedSuccess.data.messages?.[0]?.id ?? null
      : null,
    graphError,
    responsePreview,
  }
}
