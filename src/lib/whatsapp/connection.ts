import { prisma } from "@/lib/prisma"
import type { ParsedIncomingWhatsAppMessage } from "@/lib/whatsapp/parse"

const inboundConnectionSelect = {
  id: true,
  storeId: true,
  phoneNumberId: true,
  displayPhoneNumber: true,
  businessAccountId: true,
} as const

const outboundConnectionSelect = {
  id: true,
  storeId: true,
  provider: true,
  phoneNumberId: true,
  displayPhoneNumber: true,
  businessAccountId: true,
  accessToken: true,
  status: true,
  isActive: true,
} as const

export async function findActiveWhatsAppConnectionByVerifyToken(verifyToken: string) {
  return prisma.whatsAppConnection.findFirst({
    where: {
      provider: "META_WHATSAPP",
      verifyToken,
      isActive: true,
    },
    select: inboundConnectionSelect,
  })
}

export async function findActiveWhatsAppConnectionForInboundMessage(
  message: ParsedIncomingWhatsAppMessage
) {
  if (!message.phoneNumberId) {
    return null
  }

  return prisma.whatsAppConnection.findFirst({
    where: {
      provider: "META_WHATSAPP",
      phoneNumberId: message.phoneNumberId,
      isActive: true,
      status: "CONNECTED",
    },
    select: inboundConnectionSelect,
  })
}

export async function findActiveWhatsAppConnectionByStoreId(storeId: string) {
  return prisma.whatsAppConnection.findFirst({
    where: {
      storeId,
      provider: "META_WHATSAPP",
      isActive: true,
      status: "CONNECTED",
    },
    select: outboundConnectionSelect,
  })
}
