import { prisma } from "@/lib/prisma"

export const DEFAULT_BOT_SETTINGS = {
  welcomeMessage: "Olá! Como posso te ajudar?",
  showMenuAfterWelcome: true,
  humanHandoffMessage:
    "Certo, vou te passar para o atendimento humano. Nossa equipe continuará a conversa por aqui.",
  customerRequestedHumanMessage:
    "Chat pausado. Em breve um atendente continuará por aqui.",
  autoResumeEnabled: false,
  autoResumeAfterMinutes: 30,
} as const

type BotSettingsRecord = {
  id: string
  storeId: string
  welcomeMessage: string | null
  showMenuAfterWelcome: boolean
  humanHandoffMessage: string | null
  customerRequestedHumanMessage: string | null
  autoResumeEnabled: boolean
  autoResumeAfterMinutes: number
  createdAt: Date
  updatedAt: Date
}

export type CompleteBotSettings = {
  id: string | null
  storeId: string
  welcomeMessage: string
  showMenuAfterWelcome: boolean
  humanHandoffMessage: string
  customerRequestedHumanMessage: string
  autoResumeEnabled: boolean
  autoResumeAfterMinutes: number
  createdAt: string | null
  updatedAt: string | null
}

export const botSettingsSelect = {
  id: true,
  storeId: true,
  welcomeMessage: true,
  showMenuAfterWelcome: true,
  humanHandoffMessage: true,
  customerRequestedHumanMessage: true,
  autoResumeEnabled: true,
  autoResumeAfterMinutes: true,
  createdAt: true,
  updatedAt: true,
} as const

function textOrDefault(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export function toCompleteBotSettings(
  storeId: string,
  settings: BotSettingsRecord | null
): CompleteBotSettings {
  return {
    id: settings?.id ?? null,
    storeId,
    welcomeMessage: textOrDefault(
      settings?.welcomeMessage,
      DEFAULT_BOT_SETTINGS.welcomeMessage
    ),
    showMenuAfterWelcome:
      settings?.showMenuAfterWelcome ??
      DEFAULT_BOT_SETTINGS.showMenuAfterWelcome,
    humanHandoffMessage: textOrDefault(
      settings?.humanHandoffMessage,
      DEFAULT_BOT_SETTINGS.humanHandoffMessage
    ),
    customerRequestedHumanMessage: textOrDefault(
      settings?.customerRequestedHumanMessage,
      DEFAULT_BOT_SETTINGS.customerRequestedHumanMessage
    ),
    autoResumeEnabled:
      settings?.autoResumeEnabled ?? DEFAULT_BOT_SETTINGS.autoResumeEnabled,
    autoResumeAfterMinutes:
      settings?.autoResumeAfterMinutes ??
      DEFAULT_BOT_SETTINGS.autoResumeAfterMinutes,
    createdAt: settings?.createdAt.toISOString() ?? null,
    updatedAt: settings?.updatedAt.toISOString() ?? null,
  }
}

export async function getBotSettingsForStore(storeId: string) {
  const settings = await prisma.botSettings.findUnique({
    where: { storeId },
    select: botSettingsSelect,
  })

  return toCompleteBotSettings(storeId, settings)
}
