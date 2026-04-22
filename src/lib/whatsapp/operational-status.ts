import {
  type WhatsAppConnectionEditableRecord,
  WHATSAPP_CONNECTION_STATUS_LABELS,
  WHATSAPP_PROVIDER_LABELS,
} from "@/lib/whatsapp/admin-connection"

export const WHATSAPP_CONNECTION_OPERATIONAL_STATE_LABELS = {
  missing: "Conexao ausente",
  incomplete: "Configuracao incompleta",
  inactive: "Conexao inativa",
  ready: "Conexao pronta",
} as const

export type WhatsAppConnectionOperationalState =
  keyof typeof WHATSAPP_CONNECTION_OPERATIONAL_STATE_LABELS

export const WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS = {
  provider: "Provider",
  businessAccountId: "businessAccountId",
  phoneNumberId: "phoneNumberId",
  displayPhoneNumber: "displayPhoneNumber",
  verifyToken: "verifyToken",
  accessToken: "accessToken",
  status: "Status tecnico",
  isActive: "Conexao ativa",
} as const

export type WhatsAppConnectionOperationalField =
  keyof typeof WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS

export type WhatsAppConnectionOperationalCheck = {
  field: WhatsAppConnectionOperationalField
  label: string
  ok: boolean
  message: string
}

export type WhatsAppConnectionOperationalAssessment = {
  state: WhatsAppConnectionOperationalState
  stateLabel: string
  summary: string
  isReady: boolean
  checks: WhatsAppConnectionOperationalCheck[]
  blockingIssues: string[]
  completedChecks: number
  totalChecks: number
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0
}

function createMissingCheck(
  field: WhatsAppConnectionOperationalField
): WhatsAppConnectionOperationalCheck {
  return {
    field,
    label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS[field],
    ok: false,
    message: "Nenhuma conexao cadastrada para esta loja.",
  }
}

function evaluateStatusMessage(status: WhatsAppConnectionEditableRecord["status"]) {
  if (!status) {
    return {
      ok: false,
      message: "Status tecnico nao informado.",
    }
  }

  if (status === "CONNECTED") {
    return {
      ok: true,
      message: "Status tecnico CONNECTED e utilizavel operacionalmente.",
    }
  }

  return {
    ok: false,
    message: `Status tecnico atual: ${WHATSAPP_CONNECTION_STATUS_LABELS[status]}. O uso operacional exige CONNECTED.`,
  }
}

export function evaluateWhatsAppConnectionOperationalStatus(
  connection?: WhatsAppConnectionEditableRecord | null
): WhatsAppConnectionOperationalAssessment {
  if (!connection?.id) {
    const checks = (
      Object.keys(
        WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS
      ) as WhatsAppConnectionOperationalField[]
    ).map((field) => createMissingCheck(field))

    return {
      state: "missing",
      stateLabel: WHATSAPP_CONNECTION_OPERATIONAL_STATE_LABELS.missing,
      summary: "Nenhuma conexao tecnica foi cadastrada para esta loja.",
      isReady: false,
      checks,
      blockingIssues: ["Cadastre a conexao Meta/WhatsApp da loja para iniciar a configuracao operacional."],
      completedChecks: 0,
      totalChecks: checks.length,
    }
  }

  const statusEvaluation = evaluateStatusMessage(connection.status)

  const checks: WhatsAppConnectionOperationalCheck[] = [
    {
      field: "provider",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.provider,
      ok: connection.provider === "META_WHATSAPP",
      message:
        connection.provider === "META_WHATSAPP"
          ? `Provider ${WHATSAPP_PROVIDER_LABELS.META_WHATSAPP} configurado.`
          : hasText(connection.provider)
            ? `Provider atual (${connection.provider}) nao e compativel com a integracao Meta esperada.`
            : "Provider nao informado.",
    },
    {
      field: "businessAccountId",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.businessAccountId,
      ok: hasText(connection.businessAccountId),
      message: hasText(connection.businessAccountId)
        ? "businessAccountId informado."
        : "businessAccountId ausente.",
    },
    {
      field: "phoneNumberId",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.phoneNumberId,
      ok: hasText(connection.phoneNumberId),
      message: hasText(connection.phoneNumberId)
        ? "phoneNumberId informado."
        : "phoneNumberId ausente.",
    },
    {
      field: "displayPhoneNumber",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.displayPhoneNumber,
      ok: hasText(connection.displayPhoneNumber),
      message: hasText(connection.displayPhoneNumber)
        ? "displayPhoneNumber informado."
        : "displayPhoneNumber ausente.",
    },
    {
      field: "verifyToken",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.verifyToken,
      ok: hasText(connection.verifyToken),
      message: hasText(connection.verifyToken)
        ? "verifyToken informado."
        : "verifyToken ausente.",
    },
    {
      field: "accessToken",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.accessToken,
      ok: hasText(connection.accessToken),
      message: hasText(connection.accessToken)
        ? "accessToken informado."
        : "accessToken ausente.",
    },
    {
      field: "status",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.status,
      ok: statusEvaluation.ok,
      message: statusEvaluation.message,
    },
    {
      field: "isActive",
      label: WHATSAPP_CONNECTION_OPERATIONAL_FIELD_LABELS.isActive,
      ok: connection.isActive === true,
      message:
        connection.isActive === true
          ? "Conexao marcada como ativa."
          : "Conexao salva, mas desativada para uso operacional.",
    },
  ]

  const blockingIssues = checks.filter((check) => !check.ok).map((check) => check.message)
  const completedChecks = checks.filter((check) => check.ok).length

  let state: WhatsAppConnectionOperationalState = "ready"
  let summary =
    "A conexao possui os campos minimos, esta ativa e com status CONNECTED para uso operacional."

  if (connection.isActive !== true) {
    state = "inactive"
    summary =
      "Existe uma conexao salva, mas ela esta inativa e nao sera usada operacionalmente enquanto `isActive` permanecer desligado."
  } else if (blockingIssues.length > 0) {
    state = "incomplete"
    summary =
      "A conexao existe, mas ainda nao atende aos requisitos minimos para uso operacional seguro."
  }

  return {
    state,
    stateLabel: WHATSAPP_CONNECTION_OPERATIONAL_STATE_LABELS[state],
    summary,
    isReady: state === "ready",
    checks,
    blockingIssues,
    completedChecks,
    totalChecks: checks.length,
  }
}
