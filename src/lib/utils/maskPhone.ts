export function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11)
}

export function maskPhone(value: string) {
  const digits = normalizePhone(value)

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

export function formatPhone(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const digits = normalizePhone(trimmed)
  if (digits.length < 10 || digits.length > 11) {
    return trimmed
  }

  return maskPhone(digits)
}
