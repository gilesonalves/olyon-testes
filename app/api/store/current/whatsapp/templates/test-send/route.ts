import { NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import {
  MetaWhatsAppTemplatesError,
  sendMetaWhatsAppTemplate,
  type MetaWhatsAppTemplateSendComponent,
} from "@/lib/meta/meta-templates"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { whatsappTemplateTestSendSchema } from "@/lib/validators/whatsapp-template"
import { findActiveWhatsAppConnectionByStoreId } from "@/lib/whatsapp/connection"

export const runtime = "nodejs"

async function requireStoreAdmin() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(guard.error)
      : forbidden(guard.error)
  }

  return guard
}

function validationError(
  details: ReturnType<typeof whatsappTemplateTestSendSchema.safeParse>
) {
  if (details.success) {
    return badRequest("Payload invalido")
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Payload invalido",
      details: details.error.flatten(),
    },
    { status: 400 }
  )
}

function metaErrorResponse(error: MetaWhatsAppTemplatesError) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message,
      details: {
        metaStatusCode: error.metaStatusCode,
        graphError: error.graphError,
        responsePreview: error.responsePreview,
      },
    },
    { status: error.statusCode }
  )
}

function textParameters(values: string[]) {
  return values.map((text) => ({
    type: "text" as const,
    text,
  }))
}

function namedTextParameters(values: Record<string, string>) {
  return Object.entries(values).map(([parameterName, text]) => ({
    type: "text" as const,
    parameter_name: parameterName,
    text,
  }))
}

function buildTemplateComponents(params: {
  bodyParameters: string[]
  namedBodyParameters?: Record<string, string>
  headerParameters?: string[]
  buttonParameters?: string[]
}) {
  const components: MetaWhatsAppTemplateSendComponent[] = []
  const namedBodyParameters = params.namedBodyParameters ?? {}
  const namedBodyParameterCount = Object.keys(namedBodyParameters).length

  if (params.headerParameters?.length) {
    components.push({
      type: "header",
      parameters: textParameters(params.headerParameters),
    })
  }

  if (namedBodyParameterCount > 0) {
    components.push({
      type: "body",
      parameters: namedTextParameters(namedBodyParameters),
    })
  } else if (params.bodyParameters.length) {
    components.push({
      type: "body",
      parameters: textParameters(params.bodyParameters),
    })
  }

  params.buttonParameters?.forEach((text, index) => {
    components.push({
      type: "button",
      sub_type: "url",
      index: String(index),
      parameters: textParameters([text]),
    })
  })

  return components
}

function metaSendErrorResponse(
  result: Awaited<ReturnType<typeof sendMetaWhatsAppTemplate>>
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        result.graphError?.message ??
        `A Meta retornou status ${result.statusCode} ao enviar o template WhatsApp.`,
      details: {
        metaStatusCode: result.statusCode,
        graphError: result.graphError,
        graphResponse: result.graphResponse,
        responsePreview: result.responsePreview,
      },
    },
    { status: 502 }
  )
}

export async function POST(req: Request) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Body JSON invalido.")
    }

    if ("storeId" in body) {
      return badRequest(
        "O storeId nao pode ser enviado. A loja atual e resolvida pela sessao."
      )
    }

    const parsed = whatsappTemplateTestSendSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(parsed)
    }

    const connection = await findActiveWhatsAppConnectionByStoreId(
      authResult.storeId
    )

    if (!connection) {
      return badRequest(
        "Conexao WhatsApp ativa da loja atual nao encontrada. Conecte a loja antes de enviar templates."
      )
    }

    const components = buildTemplateComponents({
      bodyParameters: parsed.data.bodyParameters,
      namedBodyParameters: parsed.data.namedBodyParameters,
      headerParameters: parsed.data.headerParameters,
      buttonParameters: parsed.data.buttonParameters,
    })
    const sendResult = await sendMetaWhatsAppTemplate({
      phoneNumberId: connection.phoneNumberId,
      accessToken: connection.accessToken,
      to: parsed.data.to,
      templateName: parsed.data.templateName,
      languageCode: parsed.data.languageCode,
      components,
    })

    if (!sendResult.ok) {
      return metaSendErrorResponse(sendResult)
    }

    return ok({
      graphResponse: sendResult.graphResponse,
      graphMessageId: sendResult.graphMessageId,
      requestSummary: {
        to: parsed.data.to,
        templateName: parsed.data.templateName,
        languageCode: parsed.data.languageCode,
        bodyParameterCount: parsed.data.bodyParameters.length,
        namedBodyParameterCount: Object.keys(
          parsed.data.namedBodyParameters ?? {}
        ).length,
        headerParameterCount: parsed.data.headerParameters?.length ?? 0,
        buttonParameterCount: parsed.data.buttonParameters?.length ?? 0,
        componentsCount: components.length,
        phoneNumberId: connection.phoneNumberId,
      },
    })
  } catch (error) {
    if (error instanceof MetaWhatsAppTemplatesError) {
      return metaErrorResponse(error)
    }

    console.error("[POST /api/store/current/whatsapp/templates/test-send]", error)
    return serverError("Nao foi possivel enviar o template WhatsApp.")
  }
}
