import {
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma } from "@/lib/prisma"
import { whatsAppConnectionEditableSelect } from "@/lib/whatsapp/admin-connection"
import { runWhatsAppConnectionRealCheck } from "@/lib/whatsapp/meta-connection-check"
import { evaluateWhatsAppConnectionOperationalStatus } from "@/lib/whatsapp/operational-status"

export const runtime = "nodejs"

async function requireStoreAdmin() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(`Sessao do Olyon invalida: ${guard.error}`)
      : forbidden(guard.error)
  }

  return guard
}

export async function POST() {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const store = await prisma.store.findUnique({
      where: { id: authResult.storeId },
      select: {
        id: true,
        WhatsAppConnection: {
          select: whatsAppConnectionEditableSelect,
        },
      },
    })

    if (!store) {
      return notFound("Store nao encontrada")
    }

    const operational = evaluateWhatsAppConnectionOperationalStatus(
      store.WhatsAppConnection
    )
    const result = await runWhatsAppConnectionRealCheck({
      storeId: store.id,
      connection: store.WhatsAppConnection,
      operational,
    })

    return ok(result)
  } catch (error) {
    console.error("[POST /api/store/current/whatsapp-connection/check]", error)
    return serverError(
      "Nao foi possivel executar a verificacao real da conexao Meta/WhatsApp."
    )
  }
}
