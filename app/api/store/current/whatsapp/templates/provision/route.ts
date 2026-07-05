import { NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import {
  ensureDefaultWhatsAppTemplatesForStore,
  WhatsAppTemplateProvisioningError,
} from "@/lib/whatsapp/template-provisioning"
import { whatsappTemplateProvisionActionSchema } from "@/lib/validators/whatsapp-template-provisioning"

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

async function parseEmptyBody(req: Request) {
  const text = await req.text()

  if (!text.trim()) {
    return whatsappTemplateProvisionActionSchema.safeParse({})
  }

  try {
    return whatsappTemplateProvisionActionSchema.safeParse(JSON.parse(text))
  } catch {
    return whatsappTemplateProvisionActionSchema.safeParse(null)
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const parsed = await parseEmptyBody(req)
    if (!parsed.success) {
      return badRequest(
        "Payload inválido. A loja é resolvida pela sessão e esta ação não recebe campos."
      )
    }

    const result = await ensureDefaultWhatsAppTemplatesForStore(
      authResult.storeId
    )

    return ok(result.templates)
  } catch (error) {
    if (error instanceof WhatsAppTemplateProvisioningError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      )
    }

    console.error(
      "[POST /api/store/current/whatsapp/templates/provision]",
      error
    )
    return serverError("Não foi possível provisionar os templates WhatsApp.")
  }
}
