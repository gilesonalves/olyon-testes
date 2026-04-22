import { prisma } from "@/lib/prisma"
import {
  badRequest,
  created,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { ClientCreateApiSchema } from "@/lib/validators/client"

type SerializedClient = {
  id: string
  name: string
  email: string | null
  cpf: string | null
  phone: string | null
  secondaryPhone: string | null
  gender: { _id: string; value: string } | null
  birthDate: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || undefined
}

function normalizeCpf(value?: string) {
  return value?.replace(/\D/g, "") || undefined
}

function serializeClient(client: {
  id: string
  name: string
  email: string | null
  cpf: string | null
  phone: string | null
  secondaryPhone: string | null
  gender: string | null
  birthDate: Date | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): SerializedClient {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    cpf: client.cpf,
    phone: client.phone,
    secondaryPhone: client.secondaryPhone,
    gender: client.gender ? safeJsonParse(client.gender) : null,
    birthDate: client.birthDate ? client.birthDate.toISOString().split("T")[0] : null,
    notes: client.notes,
    isActive: client.isActive,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }
}

export async function GET() {
  try {
    const guard = await requireMembershipRole("STAFF")
    if (!guard.ok) {
      return guard.status === 401
        ? unauthorized(guard.error)
        : forbidden(guard.error)
    }

    const clients = await prisma.client.findMany({
      where: { storeId: guard.storeId },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    })

    return ok(clients.map(serializeClient))
  } catch (error) {
    console.error("[GET /api/clients]", error)
    return serverError()
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401
        ? unauthorized(guard.error)
        : forbidden(guard.error)
    }

    const body = await req.json()
    const parsed = ClientCreateApiSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" • ") || "Payload inválido"
      )
    }

    const email = normalizeEmail(parsed.data.email)
    const cpf = normalizeCpf(parsed.data.cpf)

    if (email) {
      const existingEmail = await prisma.client.findFirst({
        where: {
          storeId: guard.storeId,
          email: { equals: email, mode: "insensitive" },
        },
        select: { id: true },
      })

      if (existingEmail) {
        return badRequest("Já existe um cliente com esse email nesta loja.")
      }
    }

    if (cpf) {
      const existingCpf = await prisma.client.findFirst({
        where: { storeId: guard.storeId, cpf },
        select: { id: true },
      })

      if (existingCpf) {
        return badRequest("Já existe um cliente com esse CPF nesta loja.")
      }
    }

    const client = await prisma.client.create({
      data: {
        storeId: guard.storeId,
        name: parsed.data.name.trim(),
        email: email ?? null,
        cpf: cpf ?? null,
        phone: parsed.data.phone?.trim() || null,
        secondaryPhone: parsed.data.secondaryPhone?.trim() || null,
        gender: parsed.data.gender ? JSON.stringify(parsed.data.gender) : null,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
        notes: parsed.data.notes?.trim() || null,
        isActive: parsed.data.isActive,
      },
    })

    return created(serializeClient(client))
  } catch (error) {
    console.error("[POST /api/clients]", error)
    return serverError()
  }
}
