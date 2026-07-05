export const WHATSAPP_CUSTOMER_FALLBACK_NAME = "Cliente WhatsApp"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeComparableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function getUsableWhatsAppCustomerName(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const name = value.replace(/\s+/g, " ").trim()
  if (!name) {
    return null
  }

  if (
    normalizeComparableName(name) ===
    normalizeComparableName(WHATSAPP_CUSTOMER_FALLBACK_NAME)
  ) {
    return null
  }

  const digits = name.replace(/\D/g, "")
  const nonPhoneCharacters = name.replace(/[\d\s()+-]/g, "")

  if (digits.length >= 8 && !nonPhoneCharacters) {
    return null
  }

  return name
}

export function extractWhatsAppProfileName(payload: unknown) {
  if (!isRecord(payload)) {
    return null
  }

  const contacts = Array.isArray(payload.contacts) ? payload.contacts : []

  for (const contact of contacts) {
    if (!isRecord(contact)) {
      continue
    }

    const profile = isRecord(contact.profile) ? contact.profile : null
    const name = getUsableWhatsAppCustomerName(profile?.name)

    if (name) {
      return name
    }
  }

  return null
}

export function getWhatsAppCustomerNameFromConversationContext(
  context: unknown
) {
  if (!isRecord(context)) {
    return null
  }

  return getUsableWhatsAppCustomerName(context.customerName)
}

export function resolveWhatsAppCustomerName(params: {
  draftName?: unknown
  clientName?: unknown
  conversationName?: unknown
  profileName?: unknown
  collectedName?: unknown
}) {
  return (
    getUsableWhatsAppCustomerName(params.draftName) ??
    getUsableWhatsAppCustomerName(params.clientName) ??
    getUsableWhatsAppCustomerName(params.conversationName) ??
    getUsableWhatsAppCustomerName(params.profileName) ??
    getUsableWhatsAppCustomerName(params.collectedName) ??
    WHATSAPP_CUSTOMER_FALLBACK_NAME
  )
}

export function shouldReplaceWhatsAppCustomerName(
  currentName: unknown,
  candidateName: unknown
) {
  return (
    !getUsableWhatsAppCustomerName(currentName) &&
    Boolean(getUsableWhatsAppCustomerName(candidateName))
  )
}
