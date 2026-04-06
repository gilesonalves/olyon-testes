import { prisma } from "@/lib/prisma"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { ClientUpdateApiSchema } from "@/lib/validators/client"

type Params = { params: Promise<{ id: string }> }

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
}) {
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

export async function GET(_: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params

    const client = await prisma.client.findFirst({
      where: { id, storeId: guard.storeId },
    })

    if (!client) {
      return notFound("Cliente não pertence a esta loja.")
    }

    return ok(serializeClient(client))
  } catch (error) {
    console.error("[GET /api/clients/:id]", error)
    return serverError()
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params
    const body = await req.json()
    const parsed = ClientUpdateApiSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((issue) => issue.message).join(" • ") || "Payload inválido"
      )
    }

    const existingClient = await prisma.client.findFirst({
      where: { id, storeId: guard.storeId },
      select: { id: true },
    })

    if (!existingClient) {
      return notFound("Cliente não pertence a esta loja.")
    }

    const email = normalizeEmail(parsed.data.email)
    const cpf = normalizeCpf(parsed.data.cpf)

    if (email) {
      const duplicateEmail = await prisma.client.findFirst({
        where: {
          storeId: guard.storeId,
          id: { not: id },
          email: { equals: email, mode: "insensitive" },
        },
        select: { id: true },
      })

      if (duplicateEmail) {
        return badRequest("Já existe um cliente com esse email nesta loja.")
      }
    }

    if (cpf) {
      const duplicateCpf = await prisma.client.findFirst({
        where: { storeId: guard.storeId, id: { not: id }, cpf },
        select: { id: true },
      })

      if (duplicateCpf) {
        return badRequest("Já existe um cliente com esse CPF nesta loja.")
      }
    }

    const data: {
      name?: string
      email?: string | null
      cpf?: string | null
      phone?: string | null
      secondaryPhone?: string | null
      gender?: string | null
      birthDate?: Date | null
      notes?: string | null
      isActive?: boolean
    } = {}

    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim()
    if (parsed.data.email !== undefined) data.email = email ?? null
    if (parsed.data.cpf !== undefined) data.cpf = cpf ?? null
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone?.trim() || null
    if (parsed.data.secondaryPhone !== undefined) {
      data.secondaryPhone = parsed.data.secondaryPhone?.trim() || null
    }
    if (parsed.data.gender !== undefined) {
      data.gender = parsed.data.gender ? JSON.stringify(parsed.data.gender) : null
    }
    if (parsed.data.birthDate !== undefined) {
      data.birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes?.trim() || null
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

    const updatedClient = await prisma.client.update({
      where: { id },
      data,
    })

    return ok(serializeClient(updatedClient))
  } catch (error) {
    console.error("[PUT /api/clients/:id]", error)
    return serverError()
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params

    const client = await prisma.client.findFirst({
      where: { id, storeId: guard.storeId },
      select: { id: true },
    })

    if (!client) {
      return notFound("Cliente não pertence a esta loja.")
    }

    await prisma.client.delete({ where: { id } })

    return ok({ id })
  } catch (error) {
    console.error("[DELETE /api/clients/:id]", error)
    return serverError()
  }
}