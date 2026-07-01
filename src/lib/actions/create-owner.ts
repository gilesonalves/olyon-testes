"use server"

import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { MembershipRole, prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

import { createOwnerSchema } from "./create-owner.schema"
import type { CreateOwnerInput, CreateOwnerResult } from "./create-owner.types"

export async function createOwner(
  storeId: string,
  input: CreateOwnerInput
): Promise<CreateOwnerResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Acesso restrito ao administrador do sistema",
    }
  }

  const parsed = createOwnerSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos"
    return { success: false, error: "INVALID_INPUT", message: msg }
  }

  const { name, email, password } = parsed.data

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true },
  })

  if (!store) {
    return {
      success: false,
      error: "STORE_NOT_FOUND",
      message: "Loja não encontrada",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1) acha owner atual da loja
      const currentOwnerMembership = await tx.membership.findFirst({
        where: { storeId, role: MembershipRole.OWNER },
        select: { id: true, userId: true },
      })

      // 2) cria ou reutiliza o usuario sem sobrescrever uma senha existente
      const passwordHash = await bcrypt.hash(password, 10)

      const newOwner = await tx.user.upsert({
        where: { email },
        create: {
          name,
          email,
          password: passwordHash,
          globalRole: null,
        },
        update: {},
        select: { id: true },
      })

      await tx.membership.upsert({
        where: {
          userId_storeId: {
            userId: newOwner.id,
            storeId,
          },
        },
        create: {
          storeId,
          userId: newOwner.id,
          role: MembershipRole.OWNER,
        },
        update: { role: MembershipRole.OWNER },
      })

      // 3) rebaixa owner antigo para ADMIN (se existir)
      if (
        currentOwnerMembership &&
        currentOwnerMembership.userId !== newOwner.id
      ) {
        await tx.membership.update({
          where: { id: currentOwnerMembership.id },
          data: { role: MembershipRole.ADMIN },
        })
      }
    })

    return { success: true }
  } catch {
    return {
      success: false,
      error: "UNKNOWN",
      message: "Erro ao criar proprietário",
    }
  }
}
