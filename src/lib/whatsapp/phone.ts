const BRAZIL_COUNTRY_CODE = "55"
const BRAZIL_LOCAL_PHONE_LENGTHS = new Set([10, 11])
const BRAZIL_WHATSAPP_PHONE_LENGTHS = new Set([12, 13])

/**
 * Normaliza apenas telefones brasileiros para o formato aceito pela Meta.
 * Este MVP não tenta inferir ou validar números internacionais.
 */
export function normalizeBrazilianPhoneForWhatsApp(
  phone: string | null | undefined
): string | null {
  if (typeof phone !== "string") {
    return null
  }

  const digits = phone.replace(/\D/g, "")

  if (!digits) {
    return null
  }

  if (
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    BRAZIL_WHATSAPP_PHONE_LENGTHS.has(digits.length)
  ) {
    return digits
  }

  if (BRAZIL_LOCAL_PHONE_LENGTHS.has(digits.length)) {
    return `${BRAZIL_COUNTRY_CODE}${digits}`
  }

  return null
}
