export function formatDate(value: string) {
  if (!value) return ""

  const [year, month, day] = value.split("-")

  return `${day}/${month}/${year}`
}
