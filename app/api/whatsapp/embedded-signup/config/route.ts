import { NextResponse } from "next/server"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import {
  MetaEmbeddedSignupError,
  getMetaEmbeddedSignupPublicConfig,
} from "@/lib/whatsapp/embedded-signup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function failure(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}

export async function GET() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return failure(
      guard.status,
      guard.status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      guard.error
    )
  }

  try {
    return NextResponse.json(
      {
        ok: true as const,
        data: getMetaEmbeddedSignupPublicConfig(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    if (error instanceof MetaEmbeddedSignupError) {
      return failure(
        error.status,
        "WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED",
        error.message
      )
    }

    console.error("[GET /api/whatsapp/embedded-signup/config]", error)

    return failure(
      500,
      "WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED",
      "Nao foi possivel carregar a configuracao do cadastro incorporado."
    )
  }
}
