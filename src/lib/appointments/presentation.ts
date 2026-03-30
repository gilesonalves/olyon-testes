const appointmentStatusLabels: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELED: "Cancelado",
  DONE: "Conclu\u00eddo",
  NO_SHOW: "N\u00e3o compareceu",
}

function getRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function getString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getCreatedByName(metadata: unknown) {
  const record = getRecord(metadata)
  if (!record) {
    return null
  }

  return (
    getString(record.createdByUserName) ??
    getString(record.createdByName) ??
    getString(getRecord(record.createdByUser)?.name)
  )
}

export function getAppointmentStatusLabel(status: string) {
  return appointmentStatusLabels[status] ?? status
}

export function getAppointmentSourceLabel(source: string, metadata?: unknown) {
  if (source === "ADMIN") {
    const createdByName = getCreatedByName(metadata)
    return createdByName ? `Criado por ${createdByName}` : "Criado manualmente"
  }

  if (source === "WHATSAPP") {
    return "WhatsApp"
  }

  if (source === "WEB") {
    return "Link de agendamento"
  }

  const normalizedSource = getString(source)
  return normalizedSource ? `Origem: ${normalizedSource}` : "Origem nao informada"
}
