import { NextRequest, NextResponse } from "next/server"
import { getCurrentStoreContext } from "@/lib/store/current-store"

export async function GET(req: NextRequest) {
  try {
    const context = await getCurrentStoreContext(req)

    return NextResponse.json({
      ok: true,
      data: {
        store: context.store,
        membership: context.membership,
        source: context.source,
      },
    })
  } catch (error: unknown) {
    const message = (error as Error)?.message ?? "Erro ao obter loja atual"
    const status = message === "Unauthorized" ? 401 : 400
    return NextResponse.json({ ok: false, message }, { status })
  }
}