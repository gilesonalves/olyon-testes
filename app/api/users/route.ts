import bcrypt from "bcryptjs"
import { Prisma, prisma } from "@/lib/prisma"
import { UserCreateApiSchema } from "@/lib/validators/user"
import {
  badRequest,
  created,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"

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

export async function GET() {
  try {
    const guard = await requireMembershipRole("STAFF")
    if (!guard.ok) {
      return guard.status === 401
        ? unauthorized(guard.error)
        : forbidden(guard.error)
    }

    const members = await prisma.membership.findMany({
      where: { storeId: guard.storeId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { id: "desc" },
    })

    const data = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }))

    return ok(data)
  } catch (e) {
    console.error("[GET /api/users]", e)
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
    const parsed = UserCreateApiSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(" • ") || "Payload inválido"
      )
    }

    const { name, email, password, role, profile, contacts } = parsed.data
    const hashed = await bcrypt.hash(password, 10)

    const profileData = profile
      ? {
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
      : undefined

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        memberships: { create: { storeId: guard.storeId, role } },

        // ✅ nested create NÃO deve passar userId
        profile: profileData ? { create: profileData } : undefined,

        contacts: contacts?.length
          ? {
              create: contacts.map((c) => ({
                name: c.name,
                phone: c.phone,
                relationship: c.relationship,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile: true,
        contacts: true,
      },
    })

    return created({
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      profile: user.profile
        ? formatProfile(
            user.profile as {
              gender: string | null
              birthDate: Date | null
            } & Record<string, unknown>
          )
        : null,
      contacts: user.contacts,
    })
  } catch (e) {
    // ✅ P2002 (unique)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta as { target?: unknown } | undefined)?.target
      const field = Array.isArray(target) ? (target[0] as string | undefined) : undefined

      if (field === "email") return badRequest("Já existe um usuário com esse email.")
      if (field === "cpf") return badRequest("Já existe um usuário com esse CPF.")
      return badRequest("Já existe um registro com valor único duplicado.")
    }

    console.error("[POST /api/users]", e)
    return serverError()
  }
}
