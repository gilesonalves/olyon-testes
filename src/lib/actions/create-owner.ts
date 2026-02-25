"use server"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth-options"
import { createOwnerSchema } from "./create-owner.schema"
import { hashPassword } from "./create-owner.utils"
import type { CreateOwnerInput, CreateOwnerResult } from "./create-owner.types"

export async function createOwner(
  storeId: string,
  input: CreateOwnerInput
): Promise<CreateOwnerResult> {
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

  const parsed = createOwnerSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados invalidos"
    return { success: false, error: "INVALID_INPUT", message }
  }

  const normalizedStoreId = storeId.trim()
  if (!normalizedStoreId) {
    return {
      success: false,
      error: "STORE_NOT_FOUND",
      message: "Loja nao encontrada",
    }
  }

  const store = await prisma.store.findUnique({
    where: { id: normalizedStoreId },
    select: { id: true },
  })

  if (!store) {
    return {
      success: false,
      error: "STORE_NOT_FOUND",
      message: "Loja nao encontrada",
    }
  }

  const { name, email, password } = parsed.data

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingUser) {
    return {
      success: false,
      error: "EMAIL_ALREADY_EXISTS",
      message: "Email ja cadastrado",
    }
  }

  try {
    const hashed = await hashPassword(password)

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashed,
        },
      })

      await tx.membership.create({
        data: {
          userId: user.id,
          storeId: normalizedStoreId,
          role: "OWNER",
        },
      })
    })

    return { success: true }
  } catch (error: unknown) {
    const e = error as { code?: string }

    if (e?.code === "P2002") {
      return {
        success: false,
        error: "EMAIL_ALREADY_EXISTS",
        message: "Email ja cadastrado",
      }
    }

    if (e?.code === "P2003") {
      return {
        success: false,
        error: "STORE_NOT_FOUND",
        message: "Loja nao encontrada",
      }
    }

    return {
      success: false,
      error: "UNKNOWN",
      message: "Erro ao criar proprietario",
    }
  }
}