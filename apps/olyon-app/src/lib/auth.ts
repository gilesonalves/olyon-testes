/**
 * Regras de acesso Olyon
 *
 * olyon-app: apenas usuários com membership válida em uma loja ativa.
 * SUPER_ADMIN não pode acessar o app do cliente.
 */

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const
export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'STAFF'] as const
export type MembershipRoleType = (typeof MEMBERSHIP_ROLES)[number]
/** Role na sessão do olyon-app (sempre membership, nunca SUPER_ADMIN aqui). */
export type MembershipRole = 'OWNER' | 'ADMIN' | 'STAFF'

export function isSuperAdmin(role: string | undefined): boolean {
  return role === SUPER_ADMIN_ROLE
}

export function canAccessApp(role: string | undefined, hasMembership: boolean): boolean {
  if (isSuperAdmin(role)) return false
  return hasMembership
}

export function canAccessAdmin(role: string | undefined): boolean {
  return isSuperAdmin(role)
}
