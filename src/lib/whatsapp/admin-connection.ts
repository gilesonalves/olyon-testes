import { z } from "zod"

export const WHATSAPP_PROVIDER_OPTIONS = ["META_WHATSAPP"] as const
export type WhatsAppProviderValue = (typeof WHATSAPP_PROVIDER_OPTIONS)[number]

export const WHATSAPP_CONNECTION_STATUS_OPTIONS = [
  "PENDING",
  "VERIFIED",
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
] as const
export type WhatsAppConnectionStatusValue =
  (typeof WHATSAPP_CONNECTION_STATUS_OPTIONS)[number]

export const WHATSAPP_PROVIDER_LABELS: Record<WhatsAppProviderValue, string> = {
  META_WHATSAPP: "Meta WhatsApp",
}

export const WHATSAPP_CONNECTION_STATUS_LABELS: Record<
  WhatsAppConnectionStatusValue,
  string
> = {
  PENDING: "Pendente",
  VERIFIED: "Verificada",
  CONNECTED: "Conectada",
  DISCONNECTED: "Desconectada",
  ERROR: "Erro",
}

export const WHATSAPP_CONNECTION_STATE_LABELS = {
  missing: "Sem conexão",
  active: "Conexão ativa",
  inactive: "Conexão inativa",
} as const

export type WhatsAppConnectionState =
  keyof typeof WHATSAPP_CONNECTION_STATE_LABELS

export const whatsAppConnectionEditableSelect = {
  id: true,
  provider: true,
  phoneNumberId: true,
  businessAccountId: true,
  displayPhoneNumber: true,
  verifyToken: true,
  accessToken: true,
  status: true,
  isActive: true,
} as const

function requiredText(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `Informe ${label}`)
    .max(maxLength, `${label} deve ter no máximo ${maxLength} caracteres`)
}

export const whatsAppConnectionSchema = z.object({
  provider: z.enum(WHATSAPP_PROVIDER_OPTIONS),
  phoneNumberId: requiredText("o phoneNumberId", 120),
  businessAccountId: requiredText("o businessAccountId", 120),
  displayPhoneNumber: requiredText("o displayPhoneNumber", 60),
  verifyToken: requiredText("o verifyToken", 255),
  accessToken: requiredText("o accessToken", 2000),
  status: z.enum(WHATSAPP_CONNECTION_STATUS_OPTIONS),
  isActive: z.boolean(),
})

export type WhatsAppConnectionFormValues = z.infer<
  typeof whatsAppConnectionSchema
>

export type WhatsAppConnectionEditableRecord = Partial<
  WhatsAppConnectionFormValues
> & {
  id?: string | null
}

const EMPTY_WHATSAPP_CONNECTION_FORM_VALUES: WhatsAppConnectionFormValues = {
  provider: "META_WHATSAPP",
  phoneNumberId: "",
  businessAccountId: "",
  displayPhoneNumber: "",
  verifyToken: "",
  accessToken: "",
  status: "PENDING",
  isActive: true,
}

export function toWhatsAppConnectionFormValues(
  data?: WhatsAppConnectionEditableRecord | null
): WhatsAppConnectionFormValues {
  if (!data) {
    return { ...EMPTY_WHATSAPP_CONNECTION_FORM_VALUES }
  }

  return {
    provider: data.provider ?? "META_WHATSAPP",
    phoneNumberId: data.phoneNumberId ?? "",
    businessAccountId: data.businessAccountId ?? "",
    displayPhoneNumber: data.displayPhoneNumber ?? "",
    verifyToken: data.verifyToken ?? "",
    accessToken: data.accessToken ?? "",
    status: data.status ?? "PENDING",
    isActive: data.isActive ?? true,
  }
}

export function toWhatsAppConnectionUpsertData(
  input: WhatsAppConnectionFormValues
) {
  return {
    provider: input.provider,
    phoneNumberId: input.phoneNumberId.trim(),
    businessAccountId: input.businessAccountId.trim(),
    displayPhoneNumber: input.displayPhoneNumber.trim(),
    verifyToken: input.verifyToken.trim(),
    accessToken: input.accessToken.trim(),
    status: input.status,
    isActive: input.isActive,
  }
}

export function getWhatsAppConnectionState(
  connection?: Pick<WhatsAppConnectionEditableRecord, "id" | "isActive"> | null
): WhatsAppConnectionState {
  if (!connection?.id) {
    return "missing"
  }

  return connection.isActive ? "active" : "inactive"
}

export function toWhatsAppConnectionApiData(
  connection?: WhatsAppConnectionEditableRecord | null
) {
  const state = getWhatsAppConnectionState(connection)

  return {
    connection: connection ?? null,
    state,
    stateLabel: WHATSAPP_CONNECTION_STATE_LABELS[state],
  }
}
