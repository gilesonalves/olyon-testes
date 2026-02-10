export function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function isValidCPF(cpf: string) {
  const cleaned = cpf.replace(/\D/g, "")

  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  const calcDigit = (base: string, factor: number) => {
    let total = 0
    for (let i = 0; i < base.length; i++) {
      total += Number(base[i]) * factor--
    }
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const digit1 = calcDigit(cleaned.slice(0, 9), 10)
  const digit2 = calcDigit(cleaned.slice(0, 10), 11)

  return (
    digit1 === Number(cleaned[9]) &&
    digit2 === Number(cleaned[10])
  )
}
