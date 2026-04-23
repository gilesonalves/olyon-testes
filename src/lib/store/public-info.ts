import { z } from "zod"
import { formatPhone, normalizePhone } from "@/lib/utils/maskPhone"

function textField(maxLength: number) {
  return z.string().trim().max(maxLength)
}

function phoneField(label: string) {
  return textField(30).refine(
    (value) => {
      const digits = normalizePhone(value)
      return digits.length === 0 || (digits.length >= 10 && digits.length <= 11)
    },
    {
      message: `${label} invalido. Informe DDD + numero.`,
    }
  )
}

export const storePublicInfoSchema = z.object({
  phone: phoneField("Telefone"),
  whatsappPhone: phoneField("WhatsApp"),
  address: textField(255),
  complement: textField(120),
  neighborhood: textField(120),
  city: textField(120),
  state: textField(60),
  zipcode: textField(20),
  serviceObservations: textField(1000),
  businessHoursSummary: textField(500),
})

export type StorePublicInfoFormValues = z.infer<typeof storePublicInfoSchema>

export type StorePublicInfoFields = {
  name?: string | null
  phone: string | null
  whatsappPhone: string | null
  address: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipcode: string | null
  serviceObservations: string | null
  businessHoursSummary: string | null
}

const EMPTY_FORM_VALUES: StorePublicInfoFormValues = {
  phone: "",
  whatsappPhone: "",
  address: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipcode: "",
  serviceObservations: "",
  businessHoursSummary: "",
}

export const STORE_PUBLIC_INFO_FALLBACK_TEXT =
  "Ainda nao tenho telefone, endereco ou horario de atendimento configurados neste canal. Se voce quiser, posso te ajudar a iniciar um agendamento por aqui."

function toNullableString(value: string) {
  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : null
}

function buildAddressLine(store: Partial<StorePublicInfoFields>) {
  const streetLine = [store.address, store.complement, store.neighborhood]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(", ")

  const cityStateLine = [store.city, store.state]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join("/")

  const zipcodeLine =
    store.zipcode && store.zipcode.trim().length > 0 ? `CEP ${store.zipcode.trim()}` : null

  return [streetLine, cityStateLine, zipcodeLine]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join(" - ")
}

export function toStorePublicInfoFormValues(
  data?: Partial<StorePublicInfoFields> | null
): StorePublicInfoFormValues {
  if (!data) {
    return { ...EMPTY_FORM_VALUES }
  }

  return {
    phone: formatPhone(data.phone) ?? data.phone ?? "",
    whatsappPhone: formatPhone(data.whatsappPhone) ?? data.whatsappPhone ?? "",
    address: data.address ?? "",
    complement: data.complement ?? "",
    neighborhood: data.neighborhood ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    zipcode: data.zipcode ?? "",
    serviceObservations: data.serviceObservations ?? "",
    businessHoursSummary: data.businessHoursSummary ?? "",
  }
}

export function toStorePublicInfoUpdateData(input: StorePublicInfoFormValues) {
  const phone = normalizePhone(input.phone)
  const whatsappPhone = normalizePhone(input.whatsappPhone)

  return {
    phone: phone.length > 0 ? phone : null,
    whatsappPhone: whatsappPhone.length > 0 ? whatsappPhone : null,
    address: toNullableString(input.address),
    complement: toNullableString(input.complement),
    neighborhood: toNullableString(input.neighborhood),
    city: toNullableString(input.city),
    state: toNullableString(input.state),
    zipcode: toNullableString(input.zipcode),
    serviceObservations: toNullableString(input.serviceObservations),
    businessHoursSummary: toNullableString(input.businessHoursSummary),
  }
}

export function formatStorePublicInfoForWhatsApp(store: Partial<StorePublicInfoFields>) {
  const lines: string[] = []

  if (store.phone) {
    lines.push(`Telefone: ${store.phone}`)
  }

  if (store.whatsappPhone && store.whatsappPhone !== store.phone) {
    lines.push(`WhatsApp: ${store.whatsappPhone}`)
  }

  const addressLine = buildAddressLine(store)
  if (addressLine) {
    lines.push(`Endereco: ${addressLine}`)
  }

  if (store.businessHoursSummary) {
    lines.push(`Horario de atendimento: ${store.businessHoursSummary}`)
  }

  if (store.serviceObservations) {
    lines.push(`Observacoes: ${store.serviceObservations}`)
  }

  if (!lines.length) {
    return STORE_PUBLIC_INFO_FALLBACK_TEXT
  }

  const header =
    store.name && store.name.trim().length > 0
      ? `Informacoes de atendimento da ${store.name.trim()}:`
      : "Informacoes de atendimento:"

  return [header, ...lines].join("\n")
}
