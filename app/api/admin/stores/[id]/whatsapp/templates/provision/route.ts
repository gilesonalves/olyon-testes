import { NextResponse } from "next/server"
import { badRequest, ok, serverError } from "@/lib/api/response"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import {
  ensureDefaultWhatsAppTemplatesForStore,
  WhatsAppTemplateProvisioningError,
} from "@/lib/whatsapp/template-provisioning"
import { whatsappTemplateProvisionActionSchema } from "@/lib/validators/whatsapp-template-provisioning"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
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

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const authError = await requireSuperAdminApiAccess()
    if (authError) {
      return authError
    }

    const { id: storeId } = await params
    if (!storeId) {
      return badRequest("Informe o id da loja.")
    }

    const parsed = await parseEmptyBody(req)
    if (!parsed.success) {
      return badRequest(
        "Payload inválido. A loja é resolvida pelo parâmetro da rota e esta ação não recebe campos."
      )
    }

    const result = await ensureDefaultWhatsAppTemplatesForStore(storeId)
    return ok(result.templates)
  } catch (error) {
    if (error instanceof WhatsAppTemplateProvisioningError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      )
    }

    console.error(
      "[POST /api/admin/stores/[id]/whatsapp/templates/provision]",
      error
    )
    return serverError("Não foi possível provisionar os templates WhatsApp.")
  }
}
