"use server"

import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { MembershipRole, prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth-options"

import { createStoreSchema } from "./create-store.schema"
import { generateSlug } from "./create-store.utils"
import type { CreateStoreInput, CreateStoreResult } from "./create-store.types"

export async function createStore(
  input: CreateStoreInput
): Promise<CreateStoreResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.globalRole !== "SUPER_ADMIN") {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Acesso restrito ao administrador do sistema",
    }
  }

  const parsed = createStoreSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos"
    return { success: false, error: "INVALID_INPUT", message: msg }
  }

  const { name, ownerName, ownerEmail, password } = parsed.data
  const slug = generateSlug(name)

  const existingStore = await prisma.store.findUnique({ where: { slug } })
  if (existingStore) {
    return {
      success: false,
      error: "DUPLICATE_SLUG",
      message: "Ja existe uma loja com esse nome",
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: { name, slug, active: true },
      })

      const passwordHash = await bcrypt.hash(password, 10)

      const owner = await tx.user.upsert({
        where: { email: ownerEmail },
        create: {
          name: ownerName,
          email: ownerEmail,
          password: passwordHash,
          globalRole: null,
        },
        update: {},
        select: { id: true },
      })

      await tx.membership.upsert({
        where: {
          userId_storeId: {
            userId: owner.id,
            storeId: store.id,
          },
        },
        create: {
          storeId: store.id,
          userId: owner.id,
          role: MembershipRole.OWNER,
        },
        update: { role: MembershipRole.OWNER },
      })

      return { storeId: store.id, ownerId: owner.id }
    })

    return { success: true, storeId: result.storeId, ownerId: result.ownerId }
  } catch {
    return {
      success: false,
      error: "UNKNOWN",
      message: "Erro ao criar loja",
    }
  }
}
