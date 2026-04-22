export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CANCELED",
  "DONE",
  "NO_SHOW",
] as const

export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number]
export type AppointmentStatusFilterValue = "all" | AppointmentStatusValue

type AppointmentStatusPresentationOptions = {
  endAt?: string | Date | null
  now?: Date
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatusValue, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELED: "Cancelado",
  DONE: "Atendido",
  NO_SHOW: "N\u00e3o compareceu",
}

const APPOINTMENT_ACTIVE_STATUS_SET = new Set<AppointmentStatusValue>([
  "SCHEDULED",
  "CONFIRMED",
])

const APPOINTMENT_FINAL_STATUS_SET = new Set<AppointmentStatusValue>([
  "CANCELED",
  "DONE",
  "NO_SHOW",
])

type AppointmentStatusTone = {
  card: string
  accent: string
  muted: string
  pill: string
  badge: string
  menuButton: string
  final: boolean
}

const APPOINTMENT_STATUS_TONES: Record<AppointmentStatusValue, AppointmentStatusTone> = {
  SCHEDULED: {
    card: "border-violet-300 bg-violet-500 text-white shadow-[0_18px_36px_rgba(139,92,246,0.22)]",
    accent: "bg-violet-200",
    muted: "text-violet-50/85",
    pill: "border-white/20 bg-white/16 text-white",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    menuButton: "border-white/20 bg-white/16 text-white hover:bg-white/24 hover:text-white",
    final: false,
  },
  CONFIRMED: {
    card: "border-sky-300 bg-sky-500 text-white shadow-[0_18px_36px_rgba(14,165,233,0.22)]",
    accent: "bg-sky-200",
    muted: "text-sky-50/85",
    pill: "border-white/20 bg-white/16 text-white",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    menuButton: "border-white/20 bg-white/16 text-white hover:bg-white/24 hover:text-white",
    final: false,
  },
  CANCELED: {
    card: "border-rose-200 bg-rose-50 text-rose-900 shadow-[0_12px_26px_rgba(244,63,94,0.10)]",
    accent: "bg-rose-400",
    muted: "text-rose-700",
    pill: "border-rose-200 bg-white/85 text-rose-700",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    menuButton: "border-rose-200 bg-white/85 text-rose-700 hover:bg-white hover:text-rose-800",
    final: true,
  },
  DONE: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-[0_12px_26px_rgba(16,185,129,0.10)]",
    accent: "bg-emerald-400",
    muted: "text-emerald-700",
    pill: "border-emerald-200 bg-white/85 text-emerald-700",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    menuButton: "border-emerald-200 bg-white/85 text-emerald-700 hover:bg-white hover:text-emerald-800",
    final: true,
  },
  NO_SHOW: {
    card: "border-amber-200 bg-amber-50 text-amber-950 shadow-[0_12px_26px_rgba(245,158,11,0.10)]",
    accent: "bg-amber-400",
    muted: "text-amber-700",
    pill: "border-amber-200 bg-white/85 text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    menuButton: "border-amber-200 bg-white/85 text-amber-700 hover:bg-white hover:text-amber-800",
    final: true,
  },
}

export const APPOINTMENT_STATUS_OPTIONS = APPOINTMENT_STATUSES.map((status) => ({
  value: status,
  label: APPOINTMENT_STATUS_LABELS[status],
}))

export const APPOINTMENT_STATUS_FILTER_OPTIONS: Array<{
  value: AppointmentStatusFilterValue
  label: string
}> = [
  { value: "all", label: "Todos" },
  ...APPOINTMENT_STATUS_OPTIONS,
]

function resolveAppointmentStatusValue(status: string) {
  if (status === "ATTENDED") {
    return "DONE" as const
  }

  if (isAppointmentStatus(status)) {
    return status
  }

  return null
}

function getValidDate(value: string | Date | null | undefined) {
  if (!value) {
    return null
  }

  const resolvedDate = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(resolvedDate.getTime())) {
    return null
  }

  return resolvedDate
}

export function getAppointmentDisplayStatus(
  status: string,
  options?: AppointmentStatusPresentationOptions
) {
  const resolvedStatus = resolveAppointmentStatusValue(status)

  if (!resolvedStatus) {
    return status
  }

  if (!APPOINTMENT_ACTIVE_STATUS_SET.has(resolvedStatus)) {
    return resolvedStatus
  }

  const endAt = getValidDate(options?.endAt)
  const now = options?.now ?? new Date()

  if (!endAt || Number.isNaN(now.getTime())) {
    return resolvedStatus
  }

  return endAt.getTime() <= now.getTime() ? "DONE" : resolvedStatus
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

export function getAppointmentStatusLabel(
  status: string,
  options?: AppointmentStatusPresentationOptions
) {
  const displayStatus = getAppointmentDisplayStatus(status, options)

  if (isAppointmentStatus(displayStatus)) {
    return APPOINTMENT_STATUS_LABELS[displayStatus]
  }

  return status
}

export function isAppointmentStatus(value: string): value is AppointmentStatusValue {
  return APPOINTMENT_STATUSES.includes(value as AppointmentStatusValue)
}

export function isAppointmentActiveStatus(status: string) {
  const resolvedStatus = resolveAppointmentStatusValue(status)

  return resolvedStatus ? APPOINTMENT_ACTIVE_STATUS_SET.has(resolvedStatus) : false
}

export function isAppointmentFinalStatus(status: string) {
  const resolvedStatus = resolveAppointmentStatusValue(status)

  return resolvedStatus ? APPOINTMENT_FINAL_STATUS_SET.has(resolvedStatus) : false
}

export function getAppointmentStatusTone(
  status: string,
  options?: AppointmentStatusPresentationOptions
) {
  const displayStatus = getAppointmentDisplayStatus(status, options)

  return isAppointmentStatus(displayStatus)
    ? APPOINTMENT_STATUS_TONES[displayStatus]
    : APPOINTMENT_STATUS_TONES.SCHEDULED
}

export function getAppointmentStatusBadgeProps(
  status: string,
  options?: AppointmentStatusPresentationOptions
) {
  const displayStatus = getAppointmentDisplayStatus(status, options)

  if (!isAppointmentStatus(displayStatus)) {
    return {
      label: status,
      className: APPOINTMENT_STATUS_TONES.SCHEDULED.badge,
    }
  }

  return {
    label: APPOINTMENT_STATUS_LABELS[displayStatus],
    className: APPOINTMENT_STATUS_TONES[displayStatus].badge,
  }
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
