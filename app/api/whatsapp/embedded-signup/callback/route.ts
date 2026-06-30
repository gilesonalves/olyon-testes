import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { Prisma, prisma } from "@/lib/prisma"
import { requireMembershipRole } from "@/lib/guards/require-membership-role"
import { whatsAppConnectionEditableSelect } from "@/lib/whatsapp/admin-connection"
import {
  MetaEmbeddedSignupError,
  createWhatsAppVerifyToken,
  resolveMetaEmbeddedSignupConnection,
} from "@/lib/whatsapp/embedded-signup"
import {
  MetaWebhookSubscriptionError,
  subscribeWabaToApp,
} from "@/lib/whatsapp/meta-webhook-subscription"
import { whatsAppEmbeddedSignupCallbackSchema } from "@/lib/validators/whatsapp-embedded-signup"

export const runtime = "nodejs"

type EmbeddedSignupSuccessResponse = {
  ok: true
  data: {
    connectionId: string
    status: "CONNECTED" | "PENDING"
    phoneNumberId: string
    wabaId: string
    displayPhoneNumber: string
  }
}

type EmbeddedSignupErrorResponse = {
  ok: false
  error: {
    message: string
    code: string
    details?: Record<string, unknown>
  }
}

function success(
  data: EmbeddedSignupSuccessResponse["data"],
  status = 200
) {
  return NextResponse.json<EmbeddedSignupSuccessResponse>(
    {
      ok: true,
      data,
    },
    { status }
  )
}

function failure(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json<EmbeddedSignupErrorResponse>(
    {
      ok: false,
      error: {
        message,
        code,
        ...(details ? { details } : {}),
      },
    },
    { status }
  )
}

function getUniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError) {
  const targets = Array.isArray(error.meta?.target)
    ? error.meta.target.map(String)
    : [String(error.meta?.target ?? "")]

  if (targets.some((target) => target.includes("phoneNumberId"))) {
    return "O phoneNumberId retornado pela Meta ja esta vinculado a outra loja."
  }

  if (targets.some((target) => target.includes("verifyToken"))) {
    return "Nao foi possivel gerar um verifyToken unico para a loja atual. Tente novamente."
  }

  if (targets.some((target) => target.includes("storeId"))) {
    return "A loja atual ja possui uma conexao WhatsApp cadastrada."
  }

  return "Nao foi possivel salvar a conexao WhatsApp por conflito de unicidade."
}

async function requireStoreAdmin() {
  const guard = await requireMembershipRole("ADMIN")

  if (!guard.ok) {
    return failure(
      guard.status,
      guard.status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      guard.error
    )
  }

  return guard
}

export async function POST(req: Request) {
  try {
    const authResult = await requireStoreAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await req.json().catch(() => null)

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return failure(
        400,
        "WHATSAPP_EMBEDDED_SIGNUP_INVALID_PAYLOAD",
        "Body JSON invalido."
      )
    }

    if ("storeId" in body) {
      return failure(
        400,
        "WHATSAPP_EMBEDDED_SIGNUP_INVALID_PAYLOAD",
        "A store atual e resolvida pela sessao. Nao envie storeId no payload."
      )
    }

    const parsed = whatsAppEmbeddedSignupCallbackSchema.safeParse(body)

    if (!parsed.success) {
      return failure(
        400,
        "WHATSAPP_EMBEDDED_SIGNUP_INVALID_PAYLOAD",
        "Payload invalido para concluir o cadastro incorporado.",
        {
          fieldErrors: parsed.error.flatten().fieldErrors,
          formErrors: parsed.error.flatten().formErrors,
        }
      )
    }

    const store = await prisma.store.findUnique({
      where: { id: authResult.storeId },
      select: {
        id: true,
        WhatsAppConnection: {
          select: whatsAppConnectionEditableSelect,
        },
      },
    })

    if (!store) {
      return failure(404, "STORE_NOT_FOUND", "Store nao encontrada.")
    }

    const existingConnection = store.WhatsAppConnection
    const resolved = await resolveMetaEmbeddedSignupConnection({
      code: parsed.data.code,
      phoneNumberId: parsed.data.phoneNumberId,
      wabaId: parsed.data.wabaId,
    })

    const phoneNumberId =
      resolved.phoneNumberId ?? existingConnection?.phoneNumberId?.trim() ?? null
    const wabaId =
      resolved.wabaId ?? existingConnection?.businessAccountId?.trim() ?? null
    const displayPhoneNumber =
      resolved.displayPhoneNumber ??
      existingConnection?.displayPhoneNumber?.trim() ??
      null

    const hasConnectedPayload =
      Boolean(phoneNumberId) && Boolean(wabaId) && Boolean(displayPhoneNumber)

    if (!hasConnectedPayload) {
      const canPersistPending =
        Boolean(existingConnection?.id) &&
        existingConnection?.status !== "CONNECTED" &&
        Boolean(existingConnection?.phoneNumberId?.trim()) &&
        Boolean(existingConnection?.businessAccountId?.trim()) &&
        Boolean(existingConnection?.displayPhoneNumber?.trim()) &&
        Boolean(existingConnection?.verifyToken?.trim())

      if (!canPersistPending) {
        return failure(
          422,
          "WHATSAPP_EMBEDDED_SIGNUP_FAILED",
          "A Meta autenticou o cadastro, mas nao retornou dados suficientes para concluir a conexao da loja atual sem arriscar a configuracao ja existente."
        )
      }

      const savedPendingConnection = await prisma.whatsAppConnection.update({
        where: {
          storeId: authResult.storeId,
        },
        data: {
          accessToken: resolved.accessToken,
          status: "PENDING",
          updatedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          phoneNumberId: true,
          businessAccountId: true,
          displayPhoneNumber: true,
        },
      })

      return success(
        {
          connectionId: savedPendingConnection.id,
          status: "PENDING",
          phoneNumberId: savedPendingConnection.phoneNumberId,
          wabaId: savedPendingConnection.businessAccountId,
          displayPhoneNumber: savedPendingConnection.displayPhoneNumber,
        },
        200
      )
    }

    const connectedPhoneNumberId = phoneNumberId!
    const connectedWabaId = wabaId!
    const connectedDisplayPhoneNumber = displayPhoneNumber!

    const savedConnection = await prisma.whatsAppConnection.upsert({
      where: {
        storeId: authResult.storeId,
      },
      create: {
        id: randomUUID(),
        storeId: authResult.storeId,
        provider: "META_WHATSAPP",
        phoneNumberId: connectedPhoneNumberId,
        businessAccountId: connectedWabaId,
        displayPhoneNumber: connectedDisplayPhoneNumber,
        verifyToken: existingConnection?.verifyToken?.trim() || createWhatsAppVerifyToken(),
        accessToken: resolved.accessToken,
        status: "CONNECTED",
        isActive: true,
        updatedAt: new Date(),
      },
      update: {
        provider: "META_WHATSAPP",
        phoneNumberId: connectedPhoneNumberId,
        businessAccountId: connectedWabaId,
        displayPhoneNumber: connectedDisplayPhoneNumber,
        verifyToken: existingConnection?.verifyToken?.trim() || createWhatsAppVerifyToken(),
        accessToken: resolved.accessToken,
        status: "CONNECTED",
        isActive: true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        phoneNumberId: true,
        businessAccountId: true,
        displayPhoneNumber: true,
      },
    })

    try {
      await subscribeWabaToApp({
        businessAccountId: connectedWabaId,
        accessToken: resolved.accessToken,
      })
    } catch (error) {
      try {
        await prisma.whatsAppConnection.update({
          where: {
            id: savedConnection.id,
          },
          data: {
            status: "ERROR",
            updatedAt: new Date(),
          },
        })
      } catch (statusUpdateError) {
        console.error(
          "[POST /api/whatsapp/embedded-signup/callback] failed to mark subscription error",
          {
            storeId: authResult.storeId,
            connectionId: savedConnection.id,
            error: statusUpdateError,
          }
        )
      }

      if (error instanceof MetaWebhookSubscriptionError) {
        return failure(
          error.status,
          "WHATSAPP_WEBHOOK_SUBSCRIPTION_FAILED",
          error.message
        )
      }

      throw error
    }

    return success(
      {
        connectionId: savedConnection.id,
        status: "CONNECTED",
        phoneNumberId: savedConnection.phoneNumberId,
        wabaId: savedConnection.businessAccountId,
        displayPhoneNumber: savedConnection.displayPhoneNumber,
      },
      existingConnection?.id ? 200 : 201
    )
  } catch (error) {
    if (error instanceof MetaEmbeddedSignupError) {
      return failure(
        error.status,
        error.code === "META_EMBEDDED_SIGNUP_NOT_CONFIGURED"
          ? "WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED"
          : "WHATSAPP_EMBEDDED_SIGNUP_FAILED",
        error.message,
        error.details
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        400,
        "WHATSAPP_EMBEDDED_SIGNUP_CONFLICT",
        getUniqueConstraintMessage(error)
      )
    }

    console.error("[POST /api/whatsapp/embedded-signup/callback]", error)

    return failure(
      500,
      "WHATSAPP_EMBEDDED_SIGNUP_FAILED",
      "Nao foi possivel concluir o cadastro incorporado do WhatsApp."
    )
  }
}
