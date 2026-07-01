export type ParsedIncomingInteractiveReply = {
  type: "button_reply" | "list_reply"
  id: string
  title: string
  description: string | null
}

export type ParsedIncomingWhatsAppMessage = {
  source: "meta" | "test"
  providerMessageId: string
  from: string
  text: string | null
  interactiveReply: ParsedIncomingInteractiveReply | null
  phoneNumberId: string | null
  displayPhoneNumber: string | null
  businessAccountId: string | null
  timestamp: string | null
  messageType: string
  raw: unknown
}

export type ParsedSmbMessageEcho = {
  source: "meta"
  providerMessageId: string | null
  from: string | null
  to: string
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
  messageEchoes: ParsedSmbMessageEcho[]
  raw: unknown
}

type TestPayload = {
  providerMessageId?: unknown
  from?: unknown
  text?: unknown
  selectedOptionId?: unknown
  selectedOptionTitle?: unknown
  selectedOptionDescription?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function parseInteractiveReply(payload: unknown): ParsedIncomingInteractiveReply | null {
  if (!isObject(payload)) {
    return null
  }

  const type = toOptionalString(payload.type)

  if (type === "button_reply" && isObject(payload.button_reply)) {
    const id = toOptionalString(payload.button_reply.id)
    const title = toOptionalString(payload.button_reply.title)

    if (!id || !title) {
      return null
    }

    return {
      type,
      id,
      title,
      description: null,
    }
  }

  if (type === "list_reply" && isObject(payload.list_reply)) {
    const id = toOptionalString(payload.list_reply.id)
    const title = toOptionalString(payload.list_reply.title)

    if (!id || !title) {
      return null
    }

    return {
      type,
      id,
      title,
      description: toOptionalString(payload.list_reply.description),
    }
  }

  return null
}

function parseProviderMessageText(
  providerMessage: Record<string, unknown>,
  messageType: string
) {
  if (messageType === "text" && isObject(providerMessage.text)) {
    return toOptionalString(providerMessage.text.body)
  }

  if (
    (messageType === "image" ||
      messageType === "video" ||
      messageType === "document") &&
    isObject(providerMessage[messageType])
  ) {
    return toOptionalString(providerMessage[messageType].caption)
  }

  return null
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
    messageEchoes: [],
    messages: [
      {
        source: "test",
        providerMessageId: p.providerMessageId,
        from: p.from,
        text:
          typeof p.text === "string"
            ? p.text
            : typeof p.selectedOptionTitle === "string"
              ? p.selectedOptionTitle
              : null,
        interactiveReply:
          typeof p.selectedOptionId === "string" && typeof p.selectedOptionTitle === "string"
            ? {
                type: "list_reply",
                id: p.selectedOptionId,
                title: p.selectedOptionTitle,
                description:
                  typeof p.selectedOptionDescription === "string"
                    ? p.selectedOptionDescription
                    : null,
              }
            : null,
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
  const messageEchoes: ParsedSmbMessageEcho[] = []

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
      const field = toOptionalString(changeItem.field)
      const contacts = Array.isArray(value.contacts) ? value.contacts : []
      const providerMessages = Array.isArray(value.messages) ? value.messages : []
      const providerMessageEchoes =
        field === "smb_message_echoes" && Array.isArray(value.message_echoes)
          ? value.message_echoes
          : []

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
        const interactiveReply =
          messageType === "interactive"
            ? parseInteractiveReply(providerMessage.interactive)
            : null
        const text =
          parseProviderMessageText(providerMessage, messageType) ??
          interactiveReply?.title ??
          null

        messages.push({
          source: "meta",
          providerMessageId,
          from,
          text,
          interactiveReply,
          phoneNumberId,
          displayPhoneNumber,
          businessAccountId,
          timestamp: toOptionalString(providerMessage.timestamp),
          messageType,
          raw: {
            entryId: businessAccountId,
            field,
            metadata,
            contacts,
            message: providerMessage,
          },
        })
      }

      for (const providerMessageEcho of providerMessageEchoes) {
        if (!isObject(providerMessageEcho)) {
          continue
        }

        const to = toOptionalString(providerMessageEcho.to)
        if (!to) {
          continue
        }

        const messageType =
          toOptionalString(providerMessageEcho.type) ?? "unknown"

        messageEchoes.push({
          source: "meta",
          providerMessageId: toOptionalString(providerMessageEcho.id),
          from: toOptionalString(providerMessageEcho.from),
          to,
          text: parseProviderMessageText(providerMessageEcho, messageType),
          phoneNumberId,
          displayPhoneNumber,
          businessAccountId:
            businessAccountId ?? toOptionalString(value.wabaId),
          timestamp: toOptionalString(providerMessageEcho.timestamp),
          messageType,
          raw: {
            entryId: businessAccountId,
            field,
            metadata,
            messageEcho: providerMessageEcho,
          },
        })
      }
    }
  }

  return {
    source: "meta",
    messages,
    messageEchoes,
    raw: payload,
  }
}

export function parseIncomingWhatsApp(payload: unknown): ParsedWhatsAppWebhookPayload | null {
  return parseMetaWebhookPayload(payload) ?? parseLegacyTestPayload(payload)
}
