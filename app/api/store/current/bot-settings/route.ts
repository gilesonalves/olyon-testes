import { NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { getBotSettingsForStore, toCompleteBotSettings } from "@/lib/bot/settings"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma } from "@/lib/prisma"
import { botSettingsSchema } from "@/lib/validators/bot-settings"

export const runtime = "nodejs"

async function requireStoreAdmin() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(guard.error)
      : forbidden(guard.error)
  }

  return guard
}

async function requireStoreMember() {
  const guard = await requireMembershipRole("STAFF")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(guard.error)
      : forbidden(guard.error)
  }

  return guard
}

function validationError(details: ReturnType<typeof botSettingsSchema.safeParse>) {
  if (details.success) {
    return badRequest("Payload invalido.")
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Payload invalido.",
      details: details.error.flatten(),
    },
    { status: 400 }
  )
}

export async function GET() {
  try {
    const authResult = await requireStoreMember()
    if (authResult instanceof Response) {
      return authResult
    }

    return ok(await getBotSettingsForStore(authResult.storeId))
  } catch (error) {
    console.error("bot settings load failed", {
      route: "GET /api/store/current/bot-settings",
      error: error instanceof Error ? error.message : String(error),
    })
    return serverError("Nao foi possivel carregar as configuracoes do bot.")
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Body JSON invalido.")
    }

    if ("storeId" in body) {
      return badRequest(
        "O storeId nao pode ser enviado. A loja atual e resolvida pela sessao."
      )
    }

    const parsed = botSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(parsed)
    }

    const savedSettings = await prisma.botSettings.upsert({
      where: {
        storeId: authResult.storeId,
      },
      create: {
        storeId: authResult.storeId,
        ...parsed.data,
      },
      update: parsed.data,
      select: {
        id: true,
        storeId: true,
        welcomeMessage: true,
        showMenuAfterWelcome: true,
        humanHandoffMessage: true,
        customerRequestedHumanMessage: true,
        autoResumeEnabled: true,
        autoResumeAfterMinutes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return ok(toCompleteBotSettings(authResult.storeId, savedSettings))
  } catch (error) {
    console.error("bot settings save failed", {
      route: "PUT /api/store/current/bot-settings",
      error: error instanceof Error ? error.message : String(error),
    })
    return serverError("Nao foi possivel salvar as configuracoes do bot.")
  }
}
