import bcrypt from "bcryptjs"
import { Prisma, prisma } from "@/lib/prisma"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { UserUpdateApiSchema } from "@/lib/validators/user"

type Params = { params: Promise<{ id: string }> }

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function formatProfile(profile: {
  gender: string | null
  birthDate: Date | null
} & Record<string, unknown>) {
  if (!profile) return null

  return {
    ...profile,
    gender: profile.gender ? safeJsonParse(profile.gender) : null,
    birthDate: profile.birthDate
      ? profile.birthDate.toISOString().split("T")[0]
      : null,
  }
}

export async function GET(_: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN")
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error)
    }

    const { id } = await params

    const membership = await prisma.membership.findUnique({
      where: { userId_storeId: { userId: id, storeId: guard.storeId } },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            contacts: true,
          },
        },
      },
    })

    if (!membership) return notFound("Usuário não pertence a esta loja.")

    return ok({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      profile: membership.user.profile
        ? formatProfile(
            membership.user.profile as {
              gender: string | null
              birthDate: Date | null
            } & Record<string, unknown>
          )
        : null,
      contacts: membership.user.contacts,
    })
  } catch (e) {
    console.error("[GET /api/users/:id]", e)
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
    const parsed = UserUpdateApiSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(" • ") || "Payload inválido"
      )
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_storeId: { userId: id, storeId: guard.storeId } },
      select: { id: true },
    })

    if (!membership) return notFound("Usuário não pertence a esta loja.")

    const { role, name, email, password, profile, contacts } = parsed.data

    // 1) user (name/email/password)
    if (name || email || password) {
      try {
        const userData: { name?: string; email?: string; password?: string } = {}
        if (name) userData.name = name
        if (email) userData.email = email
        if (password) userData.password = await bcrypt.hash(password, 10)

        await prisma.user.update({
          where: { id },
          data: userData,
        })
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const target = (e.meta as { target?: unknown } | undefined)?.target
          const field = Array.isArray(target)
            ? (target[0] as string | undefined)
            : undefined

          if (field === "email") return badRequest("Já existe um usuário com esse email.")
          if (field === "cpf") return badRequest("Já existe um usuário com esse CPF.")
          return badRequest("Já existe um registro com valor único duplicado.")
        }
        throw e
      }
    }

    // 2) membership role
    if (role) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: { role },
      })
    }

    // 3) profile (upsert)
    if (profile) {
      const profileData = {
        cpf: profile.cpf ?? undefined,
        phone: profile.phone ?? undefined,
        secondaryPhone: profile.secondaryPhone ?? undefined,
        gender: profile.gender ? JSON.stringify(profile.gender) : undefined,
        birthDate: profile.birthDate ? new Date(profile.birthDate) : undefined,
        zipcode: profile.zipcode ?? undefined,
        state: profile.state ?? undefined,
        city: profile.city ?? undefined,
        neighborhood: profile.neighborhood ?? undefined,
        address: profile.address ?? undefined,
        number: profile.number ?? undefined,
        complement: profile.complement ?? undefined,
      }

      await prisma.userProfile.upsert({
        where: { userId: id },
        create: { userId: id, ...profileData },
        update: profileData,
      })
    }

    // 4) contacts (replace)
    if (contacts !== undefined) {
      await prisma.userContact.deleteMany({ where: { userId: id } })

      if (contacts.length > 0) {
        await prisma.userContact.createMany({
          data: contacts.map((c) => ({
            userId: id,
            name: c.name,
            phone: c.phone,
            relationship: c.relationship,
          })),
        })
      }
    }

    const updated = await prisma.membership.findUnique({
      where: { id: membership.id },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            contacts: true,
          },
        },
      },
    })

    if (!updated) return serverError()

    return ok({
      id: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
      profile: updated.user.profile
        ? formatProfile(
            updated.user.profile as {
              gender: string | null
              birthDate: Date | null
            } & Record<string, unknown>
          )
        : null,
      contacts: updated.user.contacts,
    })
  } catch (e) {
    console.error("[PUT /api/users/:id]", e)
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

    // ✅ não remover a si mesmo
    if (guard.userId === id) {
      return forbidden("Você não pode remover a si mesmo da loja.")
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_storeId: { userId: id, storeId: guard.storeId } },
      select: { id: true },
    })

    if (!membership) return notFound("Usuário não pertence a esta loja.")

    await prisma.membership.delete({ where: { id: membership.id } })

    return ok({ id })
  } catch (e) {
    console.error("[DELETE /api/users/:id]", e)
    return serverError()
  }
}
