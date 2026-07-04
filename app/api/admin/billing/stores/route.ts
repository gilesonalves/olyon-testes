import { listAdminStoreBilling } from "@/lib/admin/store-billing"
import { requireSuperAdminApiAccess } from "@/lib/admin/require-super-admin"
import { getBillingTimeZone } from "@/lib/billing/due-date"

export async function GET() {
  const authError = await requireSuperAdminApiAccess()
  if (authError) {
    return authError
  }

  try {
    return Response.json({
      ok: true,
      data: await listAdminStoreBilling(),
      meta: {
        timeZone: getBillingTimeZone(),
      },
    })
  } catch {
    console.error("admin billing store list failed")
    return Response.json(
      { ok: false, error: "Nao foi possivel carregar o financeiro das lojas." },
      { status: 500 }
    )
  }
}
