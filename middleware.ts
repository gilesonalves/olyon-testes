import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  SUPER_ADMIN_ROLE,
  canAccessAdmin,
  canAccessApp,
} from "./src/lib/auth"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req })

  const isLogin = pathname === "/login"
  const isAdminRoute = pathname.startsWith("/admin")
  const isAppRoute = [
    "/dashboard",
    "/usuarios",
    "/servicos",
    "/agendamentos",
    "/configuracoes",
    "/horarios-de-atendimento",
    "/entradas-saidas",
    "/contas-a-pagar",
    "/controle-pagamentos",
    "/equipe",
  ].some(route => pathname.startsWith(route))

  // ─────────────────────────────────────────────
  // 🔓 LOGIN (rota pública)
  // ─────────────────────────────────────────────
  if (isLogin) {
    if (!token) return NextResponse.next()

    const globalRole = token.globalRole as string | undefined

    if (globalRole === SUPER_ADMIN_ROLE) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }

    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // ─────────────────────────────────────────────
  // 🔒 NÃO AUTENTICADO
  // ─────────────────────────────────────────────
  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const globalRole = token.globalRole as string | undefined

  // ─────────────────────────────────────────────
  // 🔐 ADMIN
  // ─────────────────────────────────────────────
  if (isAdminRoute) {
    if (!canAccessAdmin(globalRole)) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  }

  // ─────────────────────────────────────────────
  // 🏪 APP (LOJA)
  // ─────────────────────────────────────────────
  if (isAppRoute) {
    // SUPER_ADMIN nunca usa o app
    if (globalRole === SUPER_ADMIN_ROLE) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }

    const role = token.role as string | undefined
    const hasMembership = Boolean(token.storeId)

    if (!canAccessApp(role, hasMembership)) {
      return NextResponse.redirect(
        new URL("/login?error=AppAccessDenied", req.url)
      )
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/dashboard/:path*",
    "/usuarios/:path*",
    "/servicos/:path*",
    "/agendamentos/:path*",
    "/configuracoes/:path*",
    "/horarios-de-atendimento/:path*",
    "/entradas-saidas/:path*",
    "/contas-a-pagar/:path*",
    "/controle-pagamentos/:path*",
    "/equipe/:path*",
  ],
}
