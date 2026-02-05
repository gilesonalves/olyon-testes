import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

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
