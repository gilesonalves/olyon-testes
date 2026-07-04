import { serializeStoreBilling } from "@/lib/billing/store-billing"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const guard = await requireMembershipRole("STAFF", {
      allowSuspended: true,
    })

    if (!guard.ok) {
      return Response.json(
        { ok: false, error: guard.error },
        { status: guard.status }
      )
    }

    const billing = await prisma.storeBilling.findUnique({
      where: { storeId: guard.storeId },
    })

    return Response.json({
      ok: true,
      data: serializeStoreBilling(billing),
    })
  } catch {
    console.error("current store billing read failed")
    return Response.json(
      { ok: false, error: "Nao foi possivel carregar a assinatura da loja." },
      { status: 500 }
    )
  }
}
