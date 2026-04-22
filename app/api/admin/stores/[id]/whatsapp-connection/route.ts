import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"
import {
  badRequest,
  created,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { Prisma, prisma } from "@/lib/prisma"
import {
  toWhatsAppConnectionApiData,
  toWhatsAppConnectionUpsertData,
  whatsAppConnectionEditableSelect,
  whatsAppConnectionSchema,
} from "@/lib/whatsapp/admin-connection"

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

function validationError(details: ReturnType<typeof whatsAppConnectionSchema.safeParse>) {
  if (details.success) {
    return badRequest("Payload invalido")
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Payload invalido",
      details: details.error.flatten(),
    },
    { status: 400 }
  )
}

function getUniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError) {
  const targets = Array.isArray(error.meta?.target)
    ? error.meta.target.map(String)
    : [String(error.meta?.target ?? "")]

  if (targets.some((target) => target.includes("phoneNumberId"))) {
    return "O phoneNumberId informado ja esta vinculado a outra store."
  }

  if (targets.some((target) => target.includes("verifyToken"))) {
    return "O verifyToken informado ja esta em uso por outra store."
  }

  if (targets.some((target) => target.includes("storeId"))) {
    return "Esta store ja possui uma conexao WhatsApp cadastrada."
  }

  return "Nao foi possivel salvar a conexao WhatsApp por conflito de unicidade."
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireSuperAdminSession()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    if (!id) {
      return badRequest("Informe o id da store.")
    }

    const store = await prisma.store.findUnique({
      where: { id },
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

    return ok(toWhatsAppConnectionApiData(store.WhatsAppConnection))
  } catch (error) {
    console.error("[GET /api/admin/stores/[id]/whatsapp-connection]", error)
    return serverError("Nao foi possivel carregar a conexao WhatsApp da loja.")
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireSuperAdminSession()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    if (!id) {
      return badRequest("Informe o id da store.")
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return badRequest("Body JSON invalido.")
    }

    const parsed = whatsAppConnectionSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(parsed)
    }

    const store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        WhatsAppConnection: {
          select: { id: true },
        },
      },
    })

    if (!store) {
      return notFound("Store nao encontrada")
    }

    const connectionData = toWhatsAppConnectionUpsertData(parsed.data)
    const now = new Date()

    const savedConnection = await prisma.whatsAppConnection.upsert({
      where: { storeId: id },
      create: {
        id: crypto.randomUUID(),
        storeId: id,
        ...connectionData,
        updatedAt: now,
      },
      update: {
        ...connectionData,
        updatedAt: now,
      },
      select: whatsAppConnectionEditableSelect,
    })

    const responseData = toWhatsAppConnectionApiData(savedConnection)

    if (store.WhatsAppConnection?.id) {
      return ok(responseData)
    }

    return created(responseData)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest(getUniqueConstraintMessage(error))
    }

    console.error("[PUT /api/admin/stores/[id]/whatsapp-connection]", error)
    return serverError("Nao foi possivel salvar a conexao WhatsApp da loja.")
  }
}
