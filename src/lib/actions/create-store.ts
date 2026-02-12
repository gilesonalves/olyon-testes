"use server"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
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
    const msg = parsed.error.issues[0]?.message ?? "Informe o nome da loja"
    return { success: false, error: "INVALID_INPUT", message: msg }
  }

  const name = parsed.data.name
  const slug = generateSlug(name)

  const existing = await prisma.store.findUnique({
    where: { slug },
  })
  if (existing) {
    return {
      success: false,
      error: "DUPLICATE_SLUG",
      message: "Ja existe uma loja com esse nome",
    }
  }

  try {
    const store = await prisma.store.create({
      data: { name, slug, active: true },
    })
    return { success: true, storeId: store.id }
  } catch {
    return {
      success: false,
      error: "UNKNOWN",
      message: "Erro ao criar loja",
    }
  }
}
