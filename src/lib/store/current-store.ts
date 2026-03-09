import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

type AdminSessionPayload = {
  adminId?: string
  userId?: string
  sub?: string
  role?: string
  membershipRole?: string
  storeId?: string
  store_id?: string
  store?: { id?: string }
}

type NextAuthTokenClaims = {
  sub?: string
  userId?: string
  storeId?: string
  role?: string
}

type CurrentStoreContext = {
  source: "admin_session" | "nextauth"
  userId: string
  store: { id: string; name: string; slug: string } | null
  membership: { id: string; role: string } | null
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = (4 - (normalized.length % 4)) % 4
  return Buffer.from(normalized + "=".repeat(padding), "base64").toString("utf-8")
}

function decodeJwtPayload(token: string): AdminSessionPayload | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const json = decodeBase64Url(parts[1])

    const parsed: unknown = JSON.parse(json)
    if (!parsed || typeof parsed !== "object") return null

    const obj = parsed as Record<string, unknown>
    const storeObj =
      typeof obj.store === "object" && obj.store
        ? (obj.store as Record<string, unknown>)
        : undefined

    return {
      adminId: typeof obj.adminId === "string" ? obj.adminId : undefined,
      userId: typeof obj.userId === "string" ? obj.userId : undefined,
      sub: typeof obj.sub === "string" ? obj.sub : undefined,
      role: typeof obj.role === "string" ? obj.role : undefined,
      membershipRole:
        typeof obj.membershipRole === "string" ? obj.membershipRole : undefined,
      storeId: typeof obj.storeId === "string" ? obj.storeId : undefined,
      store_id: typeof obj.store_id === "string" ? obj.store_id : undefined,
      store:
        storeObj && typeof storeObj.id === "string" ? { id: storeObj.id } : undefined,
    }
  } catch {
    return null
  }
}

function resolveStoreIdFromAdminPayload(payload: AdminSessionPayload | null) {
  if (!payload) return undefined
  if (typeof payload.storeId === "string" && payload.storeId.length > 0) {
    return payload.storeId
  }
  if (typeof payload.store_id === "string" && payload.store_id.length > 0) {
    return payload.store_id
  }
  if (payload.store?.id) {
    return payload.store.id
  }
  return undefined
}

async function findStoreById(storeId: string) {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, slug: true },
  })
}

function resolveUserIdFromToken(token: NextAuthTokenClaims | null): string | undefined {
  if (typeof token?.userId === "string" && token.userId.length > 0) {
    return token.userId
  }
  if (typeof token?.sub === "string" && token.sub.length > 0) {
    return token.sub
  }
  return undefined
}

export async function getCurrentStoreContext(
  req: NextRequest
): Promise<CurrentStoreContext> {
  const cookieStore = await cookies()
  const adminSessionCookie = cookieStore.get("admin_session")?.value ?? req.cookies.get("admin_session")?.value

  if (adminSessionCookie) {
    const payload = decodeJwtPayload(adminSessionCookie)
    const storeId = resolveStoreIdFromAdminPayload(payload)
    if (storeId) {
      const store = await findStoreById(storeId)
      const role = payload?.role ?? payload?.membershipRole ?? "STORE_ADMIN"
      return {
        source: "admin_session",
        userId: payload?.adminId ?? payload?.userId ?? payload?.sub ?? "admin",
        store,
        membership: store ? { id: "admin", role } : null,
      }
    }
  }

  const rawToken = (await getToken({ req })) as NextAuthTokenClaims | null
  const userId = resolveUserIdFromToken(rawToken)

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: {
      id: true,
      role: true,
      store: { select: { id: true, name: true, slug: true } },
    }
  })

  if (membership?.store) {
    return {
      source: "nextauth",
      userId,
      store: membership.store,
      membership: { id: membership.id, role: membership.role },
    }
  }

  if (typeof rawToken?.storeId === "string" && rawToken.storeId.length > 0) {
    const store = await findStoreById(rawToken.storeId)
    return {
      source: "nextauth",
      userId,
      store,
      membership: null,
    }
  }

  return {
    source: "nextauth",
    userId,
    store: null,
    membership: null,
  }
}

export async function getCurrentStoreIdOrThrow(req: NextRequest) {
  const context = await getCurrentStoreContext(req)

  if (!context.store?.id) {
    throw new Error("Nenhuma loja selecionada")
  }

  return {
    userId: context.userId,
    storeId: context.store.id,
    membership: context.membership,
  }
}