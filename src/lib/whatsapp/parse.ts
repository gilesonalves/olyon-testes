export type ParsedIncomingWhatsAppMessage = {
  source: "meta" | "test"
  providerMessageId: string
  from: string
  text: string | null
  phoneNumberId: string | null
  displayPhoneNumber: string | null
  businessAccountId: string | null
  timestamp: string | null
  messageType: string
  raw: unknown
}

export type ParsedWhatsAppWebhookPayload = {
  source: "meta" | "test"
  messages: ParsedIncomingWhatsAppMessage[]
  raw: unknown
}

type TestPayload = {
  providerMessageId?: unknown
  from?: unknown
  text?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function parseLegacyTestPayload(payload: unknown): ParsedWhatsAppWebhookPayload | null {
  if (!isObject(payload)) {
    return null
  }

  const p = payload as TestPayload

  if (typeof p.providerMessageId !== "string" || typeof p.from !== "string") {
    return null
  }

  return {
    source: "test",
    raw: payload,
    messages: [
      {
        source: "test",
        providerMessageId: p.providerMessageId,
        from: p.from,
        text: typeof p.text === "string" ? p.text : null,
        phoneNumberId: null,
        displayPhoneNumber: null,
        businessAccountId: null,
        timestamp: null,
        messageType: "text",
        raw: payload,
      },
    ],
  }
}

function parseMetaWebhookPayload(payload: unknown): ParsedWhatsAppWebhookPayload | null {
  if (!isObject(payload) || payload.object !== "whatsapp_business_account") {
    return null
  }

  const entry = Array.isArray(payload.entry) ? payload.entry : []
  const messages: ParsedIncomingWhatsAppMessage[] = []

  for (const entryItem of entry) {
    if (!isObject(entryItem)) {
      continue
    }

    const businessAccountId = toOptionalString(entryItem.id)
    const changes = Array.isArray(entryItem.changes) ? entryItem.changes : []

    for (const changeItem of changes) {
      if (!isObject(changeItem) || !isObject(changeItem.value)) {
        continue
      }

      const value = changeItem.value
      const metadata = isObject(value.metadata) ? value.metadata : null
      const phoneNumberId = metadata ? toOptionalString(metadata.phone_number_id) : null
      const displayPhoneNumber = metadata ? toOptionalString(metadata.display_phone_number) : null
      const contacts = Array.isArray(value.contacts) ? value.contacts : []
      const providerMessages = Array.isArray(value.messages) ? value.messages : []

      for (const providerMessage of providerMessages) {
        if (!isObject(providerMessage)) {
          continue
        }

        const providerMessageId = toOptionalString(providerMessage.id)
        const from = toOptionalString(providerMessage.from)

        if (!providerMessageId || !from) {
          continue
        }

        const messageType = toOptionalString(providerMessage.type) ?? "unknown"
        const text =
          messageType === "text" && isObject(providerMessage.text)
            ? toOptionalString(providerMessage.text.body)
            : null

        messages.push({
          source: "meta",
          providerMessageId,
          from,
          text,
          phoneNumberId,
          displayPhoneNumber,
          businessAccountId,
          timestamp: toOptionalString(providerMessage.timestamp),
          messageType,
          raw: {
            entryId: businessAccountId,
            field: toOptionalString(changeItem.field),
            metadata,
            contacts,
            message: providerMessage,
          },
        })
      }
    }
  }

  return {
    source: "meta",
    messages,
    raw: payload,
  }
}

export function parseIncomingWhatsApp(payload: unknown): ParsedWhatsAppWebhookPayload | null {
  return parseMetaWebhookPayload(payload) ?? parseLegacyTestPayload(payload)
}
