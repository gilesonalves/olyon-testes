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
  const isApiRoute = pathname.startsWith("/api/")
  const isAdminRoute = pathname.startsWith("/admin")
  const isAppRoute = [
    "/dashboard",
    "/atendimento",
    "/usuarios",
    "/servicos",
    "/agendamentos",
    "/configuracoes",
    "/horarios-de-atendimento",
    "/entradas-saidas",
    "/contas-a-pagar",
    "/controle-pagamentos",
    "/equipe",
    "/financeiro",
    "/clientes",
    "/agenda-online",
  ].some(route => pathname.startsWith(route))
  const isOperationalApiRoute = [
    "/api/appointments",
    "/api/clients",
    "/api/finance",
    "/api/schedule",
    "/api/services",
    "/api/team",
    "/api/users",
    "/api/store/current/bot-settings",
    "/api/store/current/whatsapp",
    "/api/store/current/whatsapp-connection",
    "/api/whatsapp/embedded-signup",
  ].some(route => pathname.startsWith(route))

  if (isApiRoute) {
    if (!isOperationalApiRoute || !token?.storeId) {
      return NextResponse.next()
    }

    try {
      const billingResponse = await fetch(
        new URL("/api/store/current/billing", req.url),
        {
          headers: {
            cookie: req.headers.get("cookie") ?? "",
          },
          cache: "no-store",
        }
      )
      const billingJson = (await billingResponse.json().catch(() => null)) as {
        ok?: boolean
        data?: { operationalStatus?: string }
      } | null

      if (
        billingResponse.ok &&
        billingJson?.ok &&
        billingJson.data?.operationalStatus === "SUSPENDED"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Sua loja esta suspensa. Acesse Financeiro para consultar a assinatura.",
          },
          { status: 403 }
        )
      }
    } catch {
      // Os guards das rotas continuam sendo a segunda camada de bloqueio.
    }

    return NextResponse.next()
  }

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

    const isAllowedWhenSuspended =
      pathname.startsWith("/dashboard") || pathname.startsWith("/financeiro")

    if (!isAllowedWhenSuspended) {
      try {
        const billingResponse = await fetch(
          new URL("/api/store/current/billing", req.url),
          {
            headers: {
              cookie: req.headers.get("cookie") ?? "",
            },
            cache: "no-store",
          }
        )
        const billingJson = (await billingResponse.json().catch(() => null)) as {
          ok?: boolean
          data?: { operationalStatus?: string }
        } | null

        if (
          billingResponse.ok &&
          billingJson?.ok &&
          billingJson.data?.operationalStatus === "SUSPENDED"
        ) {
          return NextResponse.redirect(
            new URL("/dashboard?billing=suspended", req.url)
          )
        }
      } catch {
        // Uma indisponibilidade de billing nao deve derrubar toda a navegacao.
      }
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
    "/atendimento/:path*",
    "/usuarios/:path*",
    "/servicos/:path*",
    "/agendamentos/:path*",
    "/configuracoes/:path*",
    "/horarios-de-atendimento/:path*",
    "/entradas-saidas/:path*",
    "/contas-a-pagar/:path*",
    "/controle-pagamentos/:path*",
    "/equipe/:path*",
    "/financeiro/:path*",
    "/clientes/:path*",
    "/agenda-online/:path*",
    "/agendamentos-lab/:path*",
    "/api/:path*",
  ],
}
