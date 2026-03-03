export function getErrorMessage(error: unknown, fallback = "Erro inesperado") {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === "string") return msg
  }
  return fallback
}