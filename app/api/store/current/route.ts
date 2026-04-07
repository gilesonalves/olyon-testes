import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma } from "@/lib/prisma"
import { getCurrentStoreContext } from "@/lib/store/current-store"
import { normalizePhone } from "@/lib/utils/maskPhone"

const StorePublicInfoSchema = z.object({
  phone: z.string().max(32).optional().nullable(),
  whatsappPhone: z.string().max(32).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  complement: z.string().max(255).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  zipcode: z.string().max(20).optional().nullable(),
  businessHoursSummary: z.string().max(1000).optional().nullable(),
  serviceObservations: z.string().max(1500).optional().nullable(),
})

function normalizeOptionalString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalPhone(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const digits = normalizePhone(value)
  return digits ? digits : null
}

function isValidPhone(value: string | null | undefined) {
  return value == null || (value.length >= 10 && value.length <= 11)
}

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
    const parsed = StorePublicInfoSchema.safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Dados publicos da agenda invalidos." },
        { status: 400 }
      )
    }

    const phone = normalizeOptionalPhone(parsed.data.phone)
    const whatsappPhone = normalizeOptionalPhone(parsed.data.whatsappPhone)

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { ok: false, message: "Telefone invalido. Informe DDD + numero." },
        { status: 400 }
      )
    }

    if (!isValidPhone(whatsappPhone)) {
      return NextResponse.json(
        { ok: false, message: "WhatsApp invalido. Informe DDD + numero." },
        { status: 400 }
      )
    }

    const updatedStore = await prisma.store.update({
      where: { id: guard.storeId },
      data: {
        phone,
        whatsappPhone,
        address: normalizeOptionalString(parsed.data.address),
        complement: normalizeOptionalString(parsed.data.complement),
        neighborhood: normalizeOptionalString(parsed.data.neighborhood),
        city: normalizeOptionalString(parsed.data.city),
        state: normalizeOptionalString(parsed.data.state),
        zipcode: normalizeOptionalString(parsed.data.zipcode),
        businessHoursSummary: normalizeOptionalString(
          parsed.data.businessHoursSummary
        ),
        serviceObservations: normalizeOptionalString(
          parsed.data.serviceObservations
        ),
      },
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
      (error as Error)?.message ??
      "Erro ao atualizar dados publicos da agenda."

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
