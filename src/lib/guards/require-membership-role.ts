import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import type { MembershipRole } from "@/lib/auth"

const ROLE_RANK: Record<MembershipRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  STAFF: 1,
}

export type RequireMembershipResult =
  | { ok: true; storeId: string; role: MembershipRole; userId: string }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Garante:
 * - usuário autenticado
 * - storeId presente na sessão
 * - role presente na sessão
 * - role >= minRole
 */
export async function requireMembershipRole(
  minRole: MembershipRole
): Promise<RequireMembershipResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Não autenticado" }
  }

  const storeId = session.user.storeId
  const role = session.user.role as MembershipRole | undefined

  if (!storeId || !role) {
    // sem membership ativa (ex.: SUPER_ADMIN ou usuário sem loja)
    return { ok: false, status: 401, error: "Selecione uma loja para continuar." }
  }

  const userRank = ROLE_RANK[role]
  const minRank = ROLE_RANK[minRole]

  if (userRank < minRank) {
    return { ok: false, status: 403, error: "Sem permissão para executar esta ação." }
  }

  return { ok: true, storeId, role, userId: session.user.id }
}
