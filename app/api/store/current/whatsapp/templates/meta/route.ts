import { NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import {
  listMetaWhatsAppTemplates,
  MetaWhatsAppTemplatesError,
} from "@/lib/meta/meta-templates"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
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

export async function GET() {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const connection = await findActiveWhatsAppConnectionByStoreId(
      authResult.storeId
    )

    if (!connection) {
      return badRequest(
        "Conexão WhatsApp ativa da loja atual não encontrada. Conecte a loja antes de listar templates."
      )
    }

    const templates = await listMetaWhatsAppTemplates({
      wabaId: connection.businessAccountId,
      accessToken: connection.accessToken,
    })

    return ok(templates)
  } catch (error) {
    if (error instanceof MetaWhatsAppTemplatesError) {
      return metaErrorResponse(error)
    }

    console.error("[GET /api/store/current/whatsapp/templates/meta]", error)
    return serverError("Não foi possível listar templates WhatsApp.")
  }
}
