/**
 * Regras de acesso Olyon
 *
 * App do cliente: exige membership válida em loja ativa.
 * Admin: exige globalRole === SUPER_ADMIN.
 */

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const
export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'STAFF'] as const
export type MembershipRoleType = (typeof MEMBERSHIP_ROLES)[number]
/** Role na sessão do app do cliente. */
export type MembershipRole = 'OWNER' | 'ADMIN' | 'STAFF'

export function isSuperAdmin(globalRole: string | undefined): boolean {
  return globalRole === SUPER_ADMIN_ROLE
}

export function canAccessApp(role: string | undefined, hasMembership: boolean): boolean {
  return Boolean(role) && hasMembership
}

export function canAccessAdmin(globalRole: string | undefined): boolean {
  return isSuperAdmin(globalRole)
}
