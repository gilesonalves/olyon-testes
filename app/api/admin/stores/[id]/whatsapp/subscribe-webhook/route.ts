import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { prisma } from "@/lib/prisma"
import {
  MetaWebhookSubscriptionError,
  subscribeWabaToApp,
} from "@/lib/whatsapp/meta-webhook-subscription"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }>
}

async function requireSuperAdminSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return unauthorized("Nao autenticado")
  }

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    return forbidden("Sem permissao para administrar lojas")
  }

  return session
}

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireSuperAdminSession()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id: storeId } = await params

    if (!storeId) {
      return badRequest("Informe o id da store.")
    }

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      select: {
        id: true,
        WhatsAppConnection: {
          select: {
            id: true,
            provider: true,
            businessAccountId: true,
            accessToken: true,
            isActive: true,
          },
        },
      },
    })

    if (!store) {
      return notFound("Store nao encontrada")
    }

    const connection = store.WhatsAppConnection

    if (!connection) {
      return notFound("Conexao WhatsApp nao encontrada para esta store")
    }

    if (!connection.isActive) {
      return badRequest("A conexao WhatsApp da store nao esta ativa.")
    }

    if (connection.provider !== "META_WHATSAPP") {
      return badRequest("A conexao WhatsApp da store nao utiliza o provider Meta.")
    }

    const businessAccountId = connection.businessAccountId.trim()
    const accessToken = connection.accessToken.trim()

    if (!businessAccountId || !accessToken) {
      return badRequest(
        "A conexao WhatsApp nao possui businessAccountId e accessToken validos."
      )
    }

    await subscribeWabaToApp({
      businessAccountId,
      accessToken,
    })

    await prisma.whatsAppConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        status: "CONNECTED",
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(
      {
        ok: true,
        message: "WABA inscrita nos webhooks da Meta com sucesso.",
        businessAccountId,
        storeId: store.id,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof MetaWebhookSubscriptionError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: error.status }
      )
    }

    console.error(
      "[POST /api/admin/stores/[id]/whatsapp/subscribe-webhook]",
      error
    )

    return serverError(
      "Nao foi possivel assinar a WABA nos webhooks da Meta."
    )
  }
}
