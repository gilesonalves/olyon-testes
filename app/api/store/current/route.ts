import { NextRequest, NextResponse } from "next/server"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma } from "@/lib/prisma"
import { getCurrentStoreContext } from "@/lib/store/current-store"
import {
  storePublicInfoSchema,
  toStorePublicInfoUpdateData,
} from "@/lib/store/public-info"

async function getCurrentStorePublicInfo(storeId: string) {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      whatsappPhone: true,
      address: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      zipcode: true,
      businessHoursSummary: true,
      serviceObservations: true,
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const context = await getCurrentStoreContext(req)

    const store = context.store?.id
      ? await getCurrentStorePublicInfo(context.store.id)
      : null

    return NextResponse.json({
      ok: true,
      data: {
        store,
        membership: context.membership,
        source: context.source,
        publicAgendaUrl: store ? `/agenda/${store.slug}` : null,
        publicInfoSource: "STORE",
        storeSettingsUrl: "/configuracoes/loja",
      },
    })
  } catch (error: unknown) {
    const message = (error as Error)?.message ?? "Erro ao obter loja atual"
    const status = message === "Unauthorized" ? 401 : 400
    return NextResponse.json({ ok: false, message }, { status })
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, message: guard.error },
      { status: guard.status }
    )
  }

  try {
    const parsed = storePublicInfoSchema.safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Dados publicos da loja invalidos.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const updatedStore = await prisma.store.update({
      where: { id: guard.storeId },
      data: toStorePublicInfoUpdateData(parsed.data),
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        whatsappPhone: true,
        address: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        zipcode: true,
        businessHoursSummary: true,
        serviceObservations: true,
      },
    })

    return NextResponse.json({
      ok: true,
      data: {
        store: updatedStore,
        publicAgendaUrl: `/agenda/${updatedStore.slug}`,
      },
    })
  } catch (error: unknown) {
    const message =
      (error as Error)?.message ?? "Erro ao atualizar dados publicos da loja."

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
