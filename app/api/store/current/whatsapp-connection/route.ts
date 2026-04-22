import { NextResponse } from "next/server"
import {
  badRequest,
  created,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { Prisma, prisma } from "@/lib/prisma"
import {
  toWhatsAppConnectionApiData,
  toWhatsAppConnectionFormValues,
  toWhatsAppConnectionUpsertData,
  whatsAppConnectionEditableSelect,
  whatsAppConnectionSchema,
} from "@/lib/whatsapp/admin-connection"
import { evaluateWhatsAppConnectionOperationalStatus } from "@/lib/whatsapp/operational-status"

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

function toStoreScopedWhatsAppConnectionApiData(
  connection?: Parameters<typeof toWhatsAppConnectionApiData>[0]
) {
  return {
    ...toWhatsAppConnectionApiData(connection),
    formValues: toWhatsAppConnectionFormValues(connection),
    operational: evaluateWhatsAppConnectionOperationalStatus(connection),
  }
}

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

    return ok(toStoreScopedWhatsAppConnectionApiData(store.WhatsAppConnection))
  } catch (error) {
    console.error("[GET /api/store/current/whatsapp-connection]", error)
    return serverError("Nao foi possivel carregar a conexao WhatsApp da loja.")
  }
}

export async function PATCH(req: Request) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Body JSON invalido.")
    }

    if ("storeId" in body) {
      return badRequest(
        "O storeId nao pode ser enviado. A loja atual e resolvida pela sessao."
      )
    }

    const parsed = whatsAppConnectionSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(parsed)
    }

    const store = await prisma.store.findUnique({
      where: { id: authResult.storeId },
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
      where: { storeId: authResult.storeId },
      create: {
        id: crypto.randomUUID(),
        storeId: authResult.storeId,
        ...connectionData,
        updatedAt: now,
      },
      update: {
        ...connectionData,
        updatedAt: now,
      },
      select: whatsAppConnectionEditableSelect,
    })

    const responseData = toStoreScopedWhatsAppConnectionApiData(savedConnection)

    if (store.WhatsAppConnection?.id) {
      return ok(responseData)
    }

    return created(responseData)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest(getUniqueConstraintMessage(error))
    }

    console.error("[PATCH /api/store/current/whatsapp-connection]", error)
    return serverError("Nao foi possivel salvar a conexao WhatsApp da loja.")
  }
}
