import {
  createMetaWhatsAppTemplate,
  listMetaWhatsAppTemplates,
  type MetaWhatsAppTemplate,
  type MetaWhatsAppTemplateCreationComponent,
} from "@/lib/meta/meta-templates"
import {
  AppointmentReminderKind,
  WhatsAppTemplateProvisionKind,
  WhatsAppTemplateProvisionStatus,
  prisma,
} from "@/lib/prisma"
import { findActiveWhatsAppConnectionByStoreId } from "@/lib/whatsapp/connection"

const DEFAULT_LANGUAGE = "pt_BR"
const DEFAULT_CATEGORY = "UTILITY"
const MAX_ERROR_LENGTH = 1_000

type DefaultWhatsAppTemplateDefinition = {
  kind: WhatsAppTemplateProvisionKind
  reminderKind: AppointmentReminderKind
  templateName: string
  language: string
  category: "UTILITY"
  body: string
  examples: Array<{
    param_name: string
    example: string
  }>
}

type ActiveWhatsAppConnection = NonNullable<
  Awaited<ReturnType<typeof findActiveWhatsAppConnectionByStoreId>>
>

export type WhatsAppTemplateProvisionView = {
  kind: WhatsAppTemplateProvisionKind
  templateName: string
  language: string
  category: string
  status: WhatsAppTemplateProvisionStatus
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  error: string | null
  lastSyncedAt: string | null
}

export type WhatsAppTemplateProvisioningResult = {
  templates: WhatsAppTemplateProvisionView[]
  hasErrors: boolean
}

export class WhatsAppTemplateProvisioningError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = "WhatsAppTemplateProvisioningError"
    this.statusCode = statusCode
  }
}

export const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    kind: WhatsAppTemplateProvisionKind.APPOINTMENT_REMINDER_ONE_HOUR,
    reminderKind: AppointmentReminderKind.ONE_HOUR,
    templateName: "lembrete_agendamento_1h",
    language: DEFAULT_LANGUAGE,
    category: DEFAULT_CATEGORY,
    body: `Olá {{cliente_nome}}, passando para lembrar do seu agendamento.

Falta aproximadamente 1 hora.

Serviço: {{servico_nome}}
Profissional: {{profissional_nome}}
Data: {{data_agendamento}}
Horário: {{horario_agendamento}}

Até já!`,
    examples: [
      { param_name: "cliente_nome", example: "Mariana" },
      { param_name: "servico_nome", example: "Corte de cabelo" },
      { param_name: "profissional_nome", example: "Ana" },
      { param_name: "data_agendamento", example: "segunda-feira 06/07" },
      { param_name: "horario_agendamento", example: "14:30" },
    ],
  },
  {
    kind:
      WhatsAppTemplateProvisionKind.APPOINTMENT_REMINDER_FIFTEEN_MINUTES,
    reminderKind: AppointmentReminderKind.FIFTEEN_MINUTES,
    templateName: "lembrete_agendamento_15min",
    language: DEFAULT_LANGUAGE,
    category: DEFAULT_CATEGORY,
    body: `Olá {{cliente_nome}}, seu horário está chegando.

Faltam aproximadamente 15 minutos para o seu agendamento.

Serviço: {{servico_nome}}
Profissional: {{profissional_nome}}
Data: {{data_agendamento}}
Horário: {{horario_agendamento}}

Estamos te esperando!`,
    examples: [
      { param_name: "cliente_nome", example: "Mariana" },
      { param_name: "servico_nome", example: "Corte de cabelo" },
      { param_name: "profissional_nome", example: "Ana" },
      { param_name: "data_agendamento", example: "segunda-feira 06/07" },
      { param_name: "horario_agendamento", example: "14:30" },
    ],
  },
] as const satisfies readonly DefaultWhatsAppTemplateDefinition[]

function templateKey(kind: WhatsAppTemplateProvisionKind, language: string) {
  return `${kind}:${language}`
}

function sanitizeError(error: unknown, accessToken?: string) {
  let message =
    error instanceof Error
      ? error.message
      : "Falha inesperada ao provisionar template WhatsApp."

  if (accessToken) {
    message = message.replaceAll(accessToken, "[REDACTED]")
  }

  message = message
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/access_token=[^&\s]+/gi, "access_token=[REDACTED]")

  return message.length <= MAX_ERROR_LENGTH
    ? message
    : `${message.slice(0, MAX_ERROR_LENGTH - 3)}...`
}

function mapMetaStatus(status: string | null | undefined) {
  switch (status?.trim().toUpperCase()) {
    case "PENDING":
      return WhatsAppTemplateProvisionStatus.PENDING
    case "APPROVED":
      return WhatsAppTemplateProvisionStatus.APPROVED
    case "REJECTED":
      return WhatsAppTemplateProvisionStatus.REJECTED
    case "PAUSED":
      return WhatsAppTemplateProvisionStatus.PAUSED
    case "DISABLED":
      return WhatsAppTemplateProvisionStatus.DISABLED
    default:
      return WhatsAppTemplateProvisionStatus.UNKNOWN
  }
}

function toView(
  provision: {
    kind: WhatsAppTemplateProvisionKind
    templateName: string
    language: string
    category: string
    status: WhatsAppTemplateProvisionStatus
    submittedAt: Date | null
    approvedAt: Date | null
    rejectedAt: Date | null
    rejectionReason: string | null
    error: string | null
    lastSyncedAt: Date | null
  }
): WhatsAppTemplateProvisionView {
  return {
    kind: provision.kind,
    templateName: provision.templateName,
    language: provision.language,
    category: provision.category,
    status: provision.status,
    submittedAt: provision.submittedAt?.toISOString() ?? null,
    approvedAt: provision.approvedAt?.toISOString() ?? null,
    rejectedAt: provision.rejectedAt?.toISOString() ?? null,
    rejectionReason: provision.rejectionReason,
    error: provision.error,
    lastSyncedAt: provision.lastSyncedAt?.toISOString() ?? null,
  }
}

function emptyView(
  definition: DefaultWhatsAppTemplateDefinition
): WhatsAppTemplateProvisionView {
  return {
    kind: definition.kind,
    templateName: definition.templateName,
    language: definition.language,
    category: definition.category,
    status: WhatsAppTemplateProvisionStatus.NOT_CREATED,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    error: null,
    lastSyncedAt: null,
  }
}

async function listProvisionViews(storeId: string) {
  const provisions = await prisma.whatsAppTemplateProvision.findMany({
    where: { storeId },
  })
  const byKey = new Map(
    provisions.map((provision) => [
      templateKey(provision.kind, provision.language),
      provision,
    ])
  )

  return DEFAULT_WHATSAPP_TEMPLATES.map((definition) => {
    const provision = byKey.get(
      templateKey(definition.kind, definition.language)
    )

    return provision ? toView(provision) : emptyView(definition)
  })
}

export async function getDefaultWhatsAppTemplateProvisionsForStore(
  storeId: string
) {
  return listProvisionViews(storeId)
}

async function ensureProvisionRows(
  storeId: string,
  connection: ActiveWhatsAppConnection
) {
  const current = await prisma.whatsAppTemplateProvision.findMany({
    where: { storeId },
  })
  const byKey = new Map(
    current.map((provision) => [
      templateKey(provision.kind, provision.language),
      provision,
    ])
  )

  for (const definition of DEFAULT_WHATSAPP_TEMPLATES) {
    const existing = byKey.get(
      templateKey(definition.kind, definition.language)
    )

    if (!existing) {
      await prisma.whatsAppTemplateProvision.create({
        data: {
          storeId,
          connectionId: connection.id,
          businessAccountId: connection.businessAccountId,
          kind: definition.kind,
          templateName: definition.templateName,
          language: definition.language,
          category: definition.category,
        },
      })
      continue
    }

    const wabaChanged =
      existing.businessAccountId !== connection.businessAccountId

    await prisma.whatsAppTemplateProvision.update({
      where: { id: existing.id },
      data: {
        connectionId: connection.id,
        businessAccountId: connection.businessAccountId,
        templateName: definition.templateName,
        category: definition.category,
        ...(wabaChanged
          ? {
              status: WhatsAppTemplateProvisionStatus.NOT_CREATED,
              metaTemplateId: null,
              lastSyncedAt: null,
              submittedAt: null,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
              error: null,
            }
          : {}),
      },
    })
  }
}

function findMetaTemplate(
  templates: MetaWhatsAppTemplate[],
  definition: DefaultWhatsAppTemplateDefinition
) {
  return templates.find(
    (template) =>
      template.name === definition.templateName &&
      template.language === definition.language
  )
}

async function updateFromMetaTemplate(params: {
  provisionId: string
  template: MetaWhatsAppTemplate
  now: Date
}) {
  const status = mapMetaStatus(params.template.status)
  const current = await prisma.whatsAppTemplateProvision.findUniqueOrThrow({
    where: { id: params.provisionId },
    select: {
      approvedAt: true,
      rejectedAt: true,
      submittedAt: true,
    },
  })

  return prisma.whatsAppTemplateProvision.update({
    where: { id: params.provisionId },
    data: {
      metaTemplateId: params.template.id,
      category: params.template.category,
      status,
      lastSyncedAt: params.now,
      submittedAt: current.submittedAt ?? params.now,
      approvedAt:
        status === WhatsAppTemplateProvisionStatus.APPROVED
          ? current.approvedAt ?? params.now
          : null,
      rejectedAt:
        status === WhatsAppTemplateProvisionStatus.REJECTED
          ? current.rejectedAt ?? params.now
          : null,
      rejectionReason:
        status === WhatsAppTemplateProvisionStatus.REJECTED
          ? params.template.rejected_reason ?? "Motivo não informado pela Meta."
          : null,
      error: null,
    },
  })
}

function buildCreationComponents(
  definition: DefaultWhatsAppTemplateDefinition
): MetaWhatsAppTemplateCreationComponent[] {
  return [
    {
      type: "BODY",
      text: definition.body,
      example: {
        body_text_named_params: definition.examples.map((example) => ({
          ...example,
        })),
      },
    },
  ]
}

export async function createTemplateIfMissing(params: {
  storeId: string
  connection: ActiveWhatsAppConnection
  definition: DefaultWhatsAppTemplateDefinition
  existingTemplates: MetaWhatsAppTemplate[]
}) {
  const provision = await prisma.whatsAppTemplateProvision.findUniqueOrThrow({
    where: {
      storeId_kind_language: {
        storeId: params.storeId,
        kind: params.definition.kind,
        language: params.definition.language,
      },
    },
  })
  const existingTemplate = findMetaTemplate(
    params.existingTemplates,
    params.definition
  )
  const now = new Date()

  if (existingTemplate) {
    return updateFromMetaTemplate({
      provisionId: provision.id,
      template: existingTemplate,
      now,
    })
  }

  if (
    provision.status === WhatsAppTemplateProvisionStatus.PENDING &&
    provision.submittedAt
  ) {
    return prisma.whatsAppTemplateProvision.update({
      where: { id: provision.id },
      data: {
        lastSyncedAt: now,
        error: null,
      },
    })
  }

  const claimed = await prisma.whatsAppTemplateProvision.updateMany({
    where: {
      id: provision.id,
      status: {
        not: WhatsAppTemplateProvisionStatus.PENDING,
      },
    },
    data: {
      status: WhatsAppTemplateProvisionStatus.PENDING,
      submittedAt: now,
      lastSyncedAt: now,
      rejectionReason: null,
      rejectedAt: null,
      error: null,
    },
  })

  if (claimed.count !== 1) {
    return prisma.whatsAppTemplateProvision.findUniqueOrThrow({
      where: { id: provision.id },
    })
  }

  try {
    const created = await createMetaWhatsAppTemplate({
      wabaId: params.connection.businessAccountId,
      accessToken: params.connection.accessToken,
      name: params.definition.templateName,
      language: params.definition.language,
      category: params.definition.category,
      components: buildCreationComponents(params.definition),
    })
    const status = created.status
      ? mapMetaStatus(created.status)
      : WhatsAppTemplateProvisionStatus.PENDING

    return prisma.whatsAppTemplateProvision.update({
      where: { id: provision.id },
      data: {
        metaTemplateId: created.id,
        status,
        lastSyncedAt: now,
        approvedAt:
          status === WhatsAppTemplateProvisionStatus.APPROVED ? now : null,
        rejectedAt:
          status === WhatsAppTemplateProvisionStatus.REJECTED ? now : null,
        rejectionReason: null,
        error: null,
      },
    })
  } catch (error) {
    return prisma.whatsAppTemplateProvision.update({
      where: { id: provision.id },
      data: {
        status: WhatsAppTemplateProvisionStatus.ERROR,
        lastSyncedAt: now,
        error: sanitizeError(error, params.connection.accessToken),
      },
    })
  }
}

async function requireActiveConnection(storeId: string) {
  const connection = await findActiveWhatsAppConnectionByStoreId(storeId)

  if (!connection) {
    throw new WhatsAppTemplateProvisioningError(
      "Conexão WhatsApp ativa da loja atual não encontrada. Conecte a loja antes de provisionar templates."
    )
  }

  if (
    !connection.businessAccountId.trim() ||
    !connection.accessToken.trim()
  ) {
    throw new WhatsAppTemplateProvisioningError(
      "A conexão WhatsApp não possui businessAccountId e accessToken válidos."
    )
  }

  return connection
}

async function markProvisionRowsAsError(params: {
  storeId: string
  connection: ActiveWhatsAppConnection
  error: unknown
}) {
  await prisma.whatsAppTemplateProvision.updateMany({
    where: {
      storeId: params.storeId,
      businessAccountId: params.connection.businessAccountId,
    },
    data: {
      status: WhatsAppTemplateProvisionStatus.ERROR,
      lastSyncedAt: new Date(),
      error: sanitizeError(params.error, params.connection.accessToken),
    },
  })

  const templates = await listProvisionViews(params.storeId)
  return {
    templates,
    hasErrors: true,
  } satisfies WhatsAppTemplateProvisioningResult
}

export async function ensureDefaultWhatsAppTemplatesForStore(
  storeId: string
): Promise<WhatsAppTemplateProvisioningResult> {
  const connection = await requireActiveConnection(storeId)
  await ensureProvisionRows(storeId, connection)

  let existingTemplates: MetaWhatsAppTemplate[]

  try {
    existingTemplates = await listMetaWhatsAppTemplates({
      wabaId: connection.businessAccountId,
      accessToken: connection.accessToken,
    })
  } catch (error) {
    return markProvisionRowsAsError({ storeId, connection, error })
  }

  for (const definition of DEFAULT_WHATSAPP_TEMPLATES) {
    await createTemplateIfMissing({
      storeId,
      connection,
      definition,
      existingTemplates,
    })
  }

  const templates = await listProvisionViews(storeId)
  return {
    templates,
    hasErrors: templates.some(
      (template) => template.status === WhatsAppTemplateProvisionStatus.ERROR
    ),
  }
}

export async function syncTemplateStatusesForStore(
  storeId: string
): Promise<WhatsAppTemplateProvisioningResult> {
  const connection = await requireActiveConnection(storeId)
  await ensureProvisionRows(storeId, connection)

  let existingTemplates: MetaWhatsAppTemplate[]

  try {
    existingTemplates = await listMetaWhatsAppTemplates({
      wabaId: connection.businessAccountId,
      accessToken: connection.accessToken,
    })
  } catch (error) {
    return markProvisionRowsAsError({ storeId, connection, error })
  }

  const provisions = await prisma.whatsAppTemplateProvision.findMany({
    where: { storeId },
  })
  const byKey = new Map(
    provisions.map((provision) => [
      templateKey(provision.kind, provision.language),
      provision,
    ])
  )
  const now = new Date()

  for (const definition of DEFAULT_WHATSAPP_TEMPLATES) {
    const provision = byKey.get(
      templateKey(definition.kind, definition.language)
    )

    if (!provision) {
      continue
    }

    const metaTemplate = findMetaTemplate(existingTemplates, definition)

    if (metaTemplate) {
      await updateFromMetaTemplate({
        provisionId: provision.id,
        template: metaTemplate,
        now,
      })
      continue
    }

    await prisma.whatsAppTemplateProvision.update({
      where: { id: provision.id },
      data:
        provision.status === WhatsAppTemplateProvisionStatus.PENDING &&
        provision.submittedAt
          ? {
              lastSyncedAt: now,
              error: null,
            }
          : {
              status: WhatsAppTemplateProvisionStatus.NOT_CREATED,
              metaTemplateId: null,
              lastSyncedAt: now,
              submittedAt: null,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
              error: null,
            },
    })
  }

  const templates = await listProvisionViews(storeId)
  return {
    templates,
    hasErrors: templates.some(
      (template) => template.status === WhatsAppTemplateProvisionStatus.ERROR
    ),
  }
}

export function getProvisionKindForReminder(
  kind: AppointmentReminderKind
): WhatsAppTemplateProvisionKind {
  return kind === AppointmentReminderKind.ONE_HOUR
    ? WhatsAppTemplateProvisionKind.APPOINTMENT_REMINDER_ONE_HOUR
    : WhatsAppTemplateProvisionKind.APPOINTMENT_REMINDER_FIFTEEN_MINUTES
}
