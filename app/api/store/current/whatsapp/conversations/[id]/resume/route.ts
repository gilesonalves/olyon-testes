import { NextResponse } from "next/server"
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { prisma } from "@/lib/prisma"
import { buildBotFlowResetContext } from "@/lib/bot/flow"

type RouteContext = {
  params: Promise<{ id: string }>
}

async function requireStoreAdmin() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return guard.status === 401
      ? unauthorized(guard.error)
      : forbidden(guard.error)
  }

  return guard
}

function conflict(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 409 })
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value))
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params
    if (!id) {
      return badRequest("Informe o id da conversa.")
    }

    const body = await req.json().catch(() => null)
    if (body && typeof body === "object" && !Array.isArray(body) && "storeId" in body) {
      return badRequest(
        "O storeId nao pode ser enviado. A loja atual e resolvida pela sessao."
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id,
          storeId: authResult.storeId,
          channel: "WHATSAPP",
        },
        select: {
          id: true,
          state: true,
          context: true,
        },
      })

      if (!conversation) {
        return {
          status: "not_found" as const,
        }
      }

      if (conversation.state !== "PAUSED") {
        return {
          status: "not_paused" as const,
          state: conversation.state,
        }
      }

      const currentContext =
        conversation.context &&
        typeof conversation.context === "object" &&
        !Array.isArray(conversation.context)
          ? conversation.context
          : {}

      await tx.appointmentDraft.updateMany({
        where: {
          storeId: authResult.storeId,
          conversationId: conversation.id,
          status: "DRAFT",
        },
        data: {
          status: "ABANDONED",
        },
      })

      const updatedConversation = await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          state: "IDLE",
          lastMessageAt: new Date(),
          context: toJsonValue({
            ...currentContext,
            ...buildBotFlowResetContext(false),
          }),
        },
        select: {
          id: true,
          state: true,
        },
      })

      return {
        status: "resumed" as const,
        conversation: updatedConversation,
      }
    })

    if (result.status === "not_found") {
      return notFound("Conversa WhatsApp nao encontrada para a loja atual.")
    }

    if (result.status === "not_paused") {
      return conflict(
        `A conversa nao esta pausada. Estado atual: ${result.state}.`
      )
    }

    return ok({
      id: result.conversation.id,
      state: result.conversation.state,
    })
  } catch (error) {
    console.error("[POST /api/store/current/whatsapp/conversations/[id]/resume]", error)
    return serverError("Nao foi possivel retomar a conversa WhatsApp.")
  }
}
