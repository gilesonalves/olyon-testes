import {
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { getDefaultWhatsAppTemplateProvisionsForStore } from "@/lib/whatsapp/template-provisioning"

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

export async function GET() {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const templates = await getDefaultWhatsAppTemplateProvisionsForStore(
      authResult.storeId
    )

    return ok(templates)
  } catch (error) {
    console.error("[GET /api/store/current/whatsapp/templates]", error)
    return serverError(
      "Não foi possível carregar o status dos templates WhatsApp."
    )
  }
}
