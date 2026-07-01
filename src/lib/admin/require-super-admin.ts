import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { SUPER_ADMIN_ROLE } from "@/lib/auth"

export async function requireSuperAdminApiAccess(): Promise<Response | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return Response.json(
      { ok: false, error: "Usuário não autenticado." },
      { status: 401 }
    )
  }

  if (session.user.globalRole !== SUPER_ADMIN_ROLE) {
    return Response.json(
      { ok: false, error: "Acesso restrito ao administrador do sistema." },
      { status: 403 }
    )
  }

  return null
}
