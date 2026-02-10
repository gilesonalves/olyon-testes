import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { canAccessApp } from "./src/lib/auth"

/**
 * Middleware do olyon-app (cliente).
 * - Exige autenticação
 * - Bloqueia SUPER_ADMIN
 * - Exige membership válida (role + storeId)
 * - Preserva rota original (callbackUrl)
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  // 🔒 Não autenticado → login
  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 🧠 Regras de negócio
  const role = token.role as string | undefined
  const hasMembership = Boolean(token.storeId)

  if (!canAccessApp(role, hasMembership)) {
    const deniedUrl = new URL("/login", req.url)
    deniedUrl.searchParams.set("error", "AppAccessDenied")
    return NextResponse.redirect(deniedUrl)
  }

  // ✅ Tudo certo
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/usuarios/:path*",
    "/servicos/:path*",
    "/eventos/:path*",
    "/agendamentos/:path*",
    "/horarios-de-atendimento/:path*",
    "/entradas-saidas/:path*",
    "/contas-a-pagar/:path*",
    "/controle-pagamentos/:path*",
    "/equipe/:path*",
  ],
}
