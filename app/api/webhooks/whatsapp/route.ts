import { NextRequest } from "next/server"
import { prisma, Prisma } from "@/lib/prisma"
import { badRequest, ok, serverError, unauthorized } from "@/lib/api/response"
import {
  checkAvailabilityForSlot,
  listEligibleStaffForService,
  listNextAvailableSlots,
  resolveEligibleStaffChoice,
  type EligibleStaffMember,
  type SuggestedSlot,
} from "@/lib/appointments/availability"
import { handleIncomingMessage } from "@/lib/bot/flow"
import {
  getDateKeyInTimeZone,
  formatDateTimeForBot,
  getBotTimezone,
  getTimeKeyInTimeZone,
  getWeekdayFromDateKey,
  normalizeBotText,
  parseDateTimeFromText,
  type ParsedDateTimeValue,
} from "@/lib/bot/datetime"
import type { BotConversationContext } from "@/lib/bot/types"
import { parseIncomingWhatsApp } from "@/lib/whatsapp/parse"

type DraftWithRelations = Prisma.AppointmentDraftGetPayload<{
  include: {
    service: {
      select: {
        id: true
        name: true
        durationMin: true
      }
    }
    membership: {
      select: {
        id: true
        user: {
          select: {
            name: true
          }
        }
      }
    }
  }
}>

const TIME_SUGGESTIONS_LIMIT = 5

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return { error: "non-serializable payload" } as Prisma.InputJsonValue
  }
}

function buildStaffOptionsText(staffMembers: EligibleStaffMember[]) {
  return staffMembers.map((staff, index) => `${index + 1}. ${staff.name}`).join("\n")
}

function buildStaffChoiceMessage(serviceName: string, staffMembers: EligibleStaffMember[]) {
  return `Perfeito! Qual profissional voce prefere para ${serviceName}?\n${buildStaffOptionsText(staffMembers)}\nResponda com o numero ou com o nome.`
}

function buildSuggestedSlotsText(suggestions: SuggestedSlot[]) {
  return suggestions.map((slot, index) => `${index + 1}. ${slot.label}`).join("\n")
}

function buildTimeSuggestionsMessage(params: {
  intro?: string
  suggestions: SuggestedSlot[]
}) {
  if (!params.suggestions.length) {
    return `${params.intro ? `${params.intro}\n` : ""}Nao encontrei horarios proximos disponiveis agora. Pode me dizer outro dia ou periodo para eu buscar disponibilidade.`
  }

  return `${params.intro ? `${params.intro}\n` : ""}Aqui estao alguns horarios disponiveis:\n${buildSuggestedSlotsText(params.suggestions)}\n\nPode responder com o numero da opcao ou me dizer outro dia e horario.`
}

function buildUnavailableTimeMessage(params: {
  message: string
  suggestions: SuggestedSlot[]
}) {
  if (!params.suggestions.length) {
    return `${params.message} Pode me dizer outro dia ou periodo para eu buscar disponibilidade.`
  }

  return `${params.message}\nSugestoes proximas:\n${buildSuggestedSlotsText(params.suggestions)}\n\nPode responder com o numero da opcao ou me dizer outro dia e horario.`
}

function serializeSuggestedSlots(suggestions: SuggestedSlot[]) {
  return suggestions.map((slot) => ({
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    label: slot.label,
  }))
}

function getStoredSuggestedSlots(context: Record<string, unknown>) {
  const raw = context.timeSlotSuggestions
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return []
    }

    const startAt = typeof entry.startAt === "string" ? entry.startAt : null
    const endAt = typeof entry.endAt === "string" ? entry.endAt : null
    const label = typeof entry.label === "string" ? entry.label : null

    if (!startAt || !endAt || !label) {
      return []
    }

    const parsedStartAt = new Date(startAt)
    const parsedEndAt = new Date(endAt)

    if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
      return []
    }

    return [
      {
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        label,
      } satisfies SuggestedSlot,
    ]
  })
}

function resolveSuggestedSlotChoice(text: string, suggestions: SuggestedSlot[]) {
  const match = normalizeBotText(text).match(/^(\d{1,2})$/)
  if (!match) {
    return null
  }

  return suggestions[Number(match[1]) - 1] ?? null
}

function toParsedDateTimeValue(startAt: Date, timeZone: string): ParsedDateTimeValue {
  const dateKey = getDateKeyInTimeZone(startAt, timeZone)
  const timeKey = getTimeKeyInTimeZone(startAt, timeZone)

  return {
    startAt,
    dateKey,
    timeKey,
    weekday: getWeekdayFromDateKey(dateKey),
    label: formatDateTimeForBot(startAt, timeZone),
  }
}

function resolveConversationTimezone(context: Prisma.JsonValue | null | undefined) {
  if (context && typeof context === "object" && !Array.isArray(context)) {
    const value = (context as { timezone?: unknown }).timezone
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  return getBotTimezone()
}

function getConversationContextRecord(context: Prisma.JsonValue | null | undefined) {
  if (context && typeof context === "object" && !Array.isArray(context)) {
    return { ...(context as Record<string, unknown>) }
  }

  return {}
}

function buildBotContext(context: Prisma.JsonValue | null | undefined): BotConversationContext {
  const record = getConversationContextRecord(context)

  return {
    timezone: typeof record.timezone === "string" ? record.timezone : null,
    mainMenuShown: record.mainMenuShown === true,
    timeSlotSuggestions: serializeSuggestedSlots(getStoredSuggestedSlots(record)),
  }
}

export async function POST(req: NextRequest) {
  try {
    const storeId = req.headers.get("x-store-id")
    const secret = req.headers.get("x-webhook-secret")

    if (!storeId) {
      return badRequest("Missing x-store-id")
    }

    const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET
    if (expectedSecret && secret !== expectedSecret) {
      return unauthorized("Unauthorized")
    }

    const payload = (await req.json()) as unknown
    const msg = parseIncomingWhatsApp(payload)

    if (!msg) {
      return badRequest("Unsupported payload format for WhatsApp webhook")
    }

    const currentStoreId = storeId
    const incomingMessage = msg

    const existingInbound = await prisma.conversationMessage.findUnique({
      where: {
        storeId_providerMessageId: {
          storeId: currentStoreId,
          providerMessageId: incomingMessage.providerMessageId,
        },
      },
      select: {
        id: true,
        conversationId: true,
        conversation: {
          select: {
            state: true,
          },
        },
      },
    })

    if (existingInbound) {
      return ok({
        conversationId: existingInbound.conversationId,
        messageId: existingInbound.id,
        nextState: existingInbound.conversation.state,
        draftId: null,
        appointmentId: null,
        replies: [],
        replayed: true,
      })
    }

    const defaultTimezone = getBotTimezone()

    const conversation = await prisma.conversation.upsert({
      where: {
        storeId_channel_contact: {
          storeId: currentStoreId,
          channel: "WHATSAPP",
          contact: incomingMessage.from,
        },
      },
      update: {
        lastMessageAt: new Date(),
      },
      create: {
        storeId: currentStoreId,
        channel: "WHATSAPP",
        contact: incomingMessage.from,
        state: "IDLE",
        context: toJsonValue({ timezone: defaultTimezone }),
        lastMessageAt: new Date(),
      },
    })

    const timeZone = resolveConversationTimezone(conversation.context)
    let conversationContext = getConversationContextRecord(conversation.context)

    const savedIn = await prisma.conversationMessage.create({
      data: {
        storeId: currentStoreId,
        conversationId: conversation.id,
        direction: "IN",
        providerMessageId: incomingMessage.providerMessageId,
        text: incomingMessage.text ?? undefined,
        payload: toJsonValue(incomingMessage.raw),
      },
    })

    const bot = handleIncomingMessage({
      state: conversation.state,
      text: incomingMessage.text,
      context: buildBotContext(conversation.context),
    })

    const outMessages: string[] = []
    let nextState: string | null = null
    let ensuredDraftId: string | null = null
    let createdAppointmentId: string | null = null
    let parsedDateTime: ParsedDateTimeValue | null = null
    let draftCache: DraftWithRelations | null = null
    let shouldStop = false

    await prisma.$transaction(async (tx) => {
      async function updateState(
        state: "IDLE" | "CHOOSING_SERVICE" | "CHOOSING_STAFF" | "CHOOSING_TIME" | "CONFIRMING"
      ) {
        nextState = state
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { state, lastMessageAt: new Date() },
        })
      }

      async function appendBotReply(text: string, extraPayload?: Record<string, unknown>) {
        outMessages.push(text)

        await tx.conversationMessage.create({
          data: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            direction: "OUT",
            text,
            payload: toJsonValue({
              source: "bot",
              text,
              ...extraPayload,
            }),
          },
        })
      }

      async function persistConversationContext(patch: Partial<BotConversationContext>) {
        conversationContext = {
          ...conversationContext,
          ...patch,
        }

        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            context: toJsonValue(conversationContext),
          },
        })
      }

      async function setSuggestedTimeSlots(suggestions: SuggestedSlot[]) {
        await persistConversationContext({
          timeSlotSuggestions: suggestions.length ? serializeSuggestedSlots(suggestions) : null,
        })
      }

      async function ensureDraft() {
        if (ensuredDraftId) {
          return ensuredDraftId
        }

        const draft = await tx.appointmentDraft.findFirst({
          where: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            status: "DRAFT",
          },
          orderBy: { createdAt: "desc" },
        })

        if (draft) {
          ensuredDraftId = draft.id
          return draft.id
        }

        const created = await tx.appointmentDraft.create({
          data: {
            storeId: currentStoreId,
            conversationId: conversation.id,
            status: "DRAFT",
            channel: "WHATSAPP",
            customerPhone: incomingMessage.from,
          },
        })

        ensuredDraftId = created.id
        draftCache = null
        return created.id
      }

      async function getDraft(forceRefresh = false) {
        const draftId = await ensureDraft()

        if (draftCache && draftCache.id === draftId && !forceRefresh) {
          return draftCache
        }

        draftCache = await tx.appointmentDraft.findUnique({
          where: { id: draftId },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                durationMin: true,
              },
            },
            membership: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })

        return draftCache
      }

      async function clearDraftDateTime() {
        const draftId = await ensureDraft()

        await tx.appointmentDraft.update({
          where: { id: draftId },
          data: {
            startAt: null,
            endAt: null,
          },
        })

        if (draftCache?.id === draftId) {
          draftCache = {
            ...draftCache,
            startAt: null,
            endAt: null,
          }
        }
      }

      async function setDraftSelection(data: {
        serviceId?: string | null
        staffMembershipId?: string | null
        startAt?: Date | null
        endAt?: Date | null
      }) {
        const draftId = await ensureDraft()

        await tx.appointmentDraft.update({
          where: { id: draftId },
          data,
        })

        draftCache = null
      }

      async function loadTimeSuggestionsForDraft(draft: DraftWithRelations, searchStartAt?: Date) {
        if (!draft.service || !draft.staffMembershipId) {
          return []
        }

        return listNextAvailableSlots({
          db: tx,
          storeId: currentStoreId,
          durationMin: draft.service.durationMin,
          timeZone,
          staffMembershipId: draft.staffMembershipId,
          searchStartAt,
          limit: TIME_SUGGESTIONS_LIMIT,
        })
      }

      async function sendTimeSuggestionsForDraft(params: {
        draft: DraftWithRelations
        intro?: string
        searchStartAt?: Date
      }) {
        const suggestions = await loadTimeSuggestionsForDraft(params.draft, params.searchStartAt)
        await setSuggestedTimeSlots(suggestions)

        await appendBotReply(
          buildTimeSuggestionsMessage({
            intro: params.intro,
            suggestions,
          }),
          {
            serviceId: params.draft.service?.id,
            staffMembershipId: params.draft.staffMembershipId,
            suggestions: serializeSuggestedSlots(suggestions),
          }
        )

        return suggestions
      }

      async function ensureResolvedStaffForDraft() {
        const draft = await getDraft(true)

        if (!draft?.service) {
          await updateState("CHOOSING_SERVICE")
          await appendBotReply(
            "Antes de escolher profissional, preciso identificar o servico. Qual servico voce quer agendar?",
            {
              reason: "SERVICE_REQUIRED",
            }
          )
          shouldStop = true
          return null
        }

        if (draft.staffMembershipId && draft.membership) {
          return draft
        }

        const eligibleStaff = await listEligibleStaffForService({
          db: tx,
          storeId: currentStoreId,
          serviceId: draft.service.id,
        })

        if (eligibleStaff.length === 0) {
          await setDraftSelection({
            serviceId: null,
            staffMembershipId: null,
            startAt: null,
            endAt: null,
          })
          await setSuggestedTimeSlots([])
          await updateState("CHOOSING_SERVICE")
          await appendBotReply(
            `Nao ha profissional disponivel para ${draft.service.name} no momento. Escolha outro servico.`,
            {
              reason: "NO_ELIGIBLE_STAFF",
              serviceId: draft.service.id,
            }
          )
          shouldStop = true
          return null
        }

        if (eligibleStaff.length === 1) {
          await setDraftSelection({
            staffMembershipId: eligibleStaff[0].membershipId,
          })
          return getDraft(true)
        }

        await updateState("CHOOSING_STAFF")
        await setSuggestedTimeSlots([])
        await appendBotReply(buildStaffChoiceMessage(draft.service.name, eligibleStaff), {
          reason: "STAFF_SELECTION_REQUIRED",
          serviceId: draft.service.id,
        })
        shouldStop = true
        return null
      }

      for (const action of bot.actions) {
        if (shouldStop) {
          break
        }

        if (action.type === "SET_STATE") {
          await updateState(action.state)
          continue
        }

        if (action.type === "PATCH_CONTEXT") {
          await persistConversationContext(action.context)
          continue
        }

        if (action.type === "ENSURE_DRAFT") {
          await ensureDraft()
          continue
        }

        if (action.type === "SELECT_SERVICE_FROM_TEXT") {
          await ensureDraft()

          const query = normalizeBotText(action.text)
          const services = await tx.service.findMany({
            where: {
              storeId: currentStoreId,
              active: true,
            },
            select: {
              id: true,
              name: true,
              durationMin: true,
            },
            orderBy: { name: "asc" },
          })

          const matched =
            services.find((service) => normalizeBotText(service.name) === query) ??
            services.find((service) => {
              const normalizedName = normalizeBotText(service.name)
              return normalizedName.includes(query) || query.includes(normalizedName)
            })

          if (!matched) {
            const list = services.map((service, index) => `${index + 1}) ${service.name}`).join("\n")

            const textOut = services.length
              ? `Nao encontrei esse servico. Escolha uma opcao:\n${list}`
              : "Ainda nao ha servicos cadastrados. Peca para o admin cadastrar um servico primeiro."

            await updateState("CHOOSING_SERVICE")
            await appendBotReply(textOut, {
              reason: "SERVICE_NOT_FOUND",
            })
            shouldStop = true
            continue
          }

          await setDraftSelection({
            serviceId: matched.id,
            staffMembershipId: null,
            startAt: null,
            endAt: null,
          })
          await setSuggestedTimeSlots([])
          continue
        }

        if (action.type === "RESOLVE_STAFF_FOR_DRAFT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({
            draft,
            intro: `Show! Servico: ${draft.service!.name}. Profissional: ${draft.membership!.user.name}.`,
          })
          continue
        }

        if (action.type === "SELECT_STAFF_FROM_TEXT") {
          const draft = await getDraft(true)

          if (!draft?.service) {
            await updateState("CHOOSING_SERVICE")
            await appendBotReply(
              "Antes de escolher profissional, preciso identificar o servico. Qual servico voce quer agendar?",
              {
                reason: "SERVICE_REQUIRED",
              }
            )
            shouldStop = true
            continue
          }

          const eligibleStaff = await listEligibleStaffForService({
            db: tx,
            storeId: currentStoreId,
            serviceId: draft.service.id,
          })

          if (eligibleStaff.length === 0) {
            await setDraftSelection({
              serviceId: null,
              staffMembershipId: null,
              startAt: null,
              endAt: null,
            })
            await setSuggestedTimeSlots([])
            await updateState("CHOOSING_SERVICE")
            await appendBotReply(
              `Nao ha profissional disponivel para ${draft.service.name} no momento. Escolha outro servico.`,
              {
                reason: "NO_ELIGIBLE_STAFF",
                serviceId: draft.service.id,
              }
            )
            shouldStop = true
            continue
          }

          if (eligibleStaff.length === 1) {
            await setDraftSelection({
              staffMembershipId: eligibleStaff[0].membershipId,
              startAt: null,
              endAt: null,
            })

            const updatedDraft = await getDraft(true)
            await updateState("CHOOSING_TIME")
            await sendTimeSuggestionsForDraft({
              draft: updatedDraft!,
              intro: `Vou seguir com ${updatedDraft!.membership!.user.name}.`,
            })
            continue
          }

          const selectedStaff = resolveEligibleStaffChoice({
            text: action.text,
            staffMembers: eligibleStaff,
          })

          if (!selectedStaff.ok) {
            await updateState("CHOOSING_STAFF")

            const textOut =
              selectedStaff.reason === "AMBIGUOUS"
                ? `Encontrei mais de um profissional parecido. Escolha pelo numero:\n${buildStaffOptionsText(eligibleStaff)}`
                : `Nao entendi qual profissional voce quer. Escolha pelo numero ou nome:\n${buildStaffOptionsText(eligibleStaff)}`

            await appendBotReply(textOut, {
              reason:
                selectedStaff.reason === "AMBIGUOUS" ? "STAFF_SELECTION_AMBIGUOUS" : "STAFF_SELECTION_INVALID",
              serviceId: draft.service.id,
            })
            shouldStop = true
            continue
          }

          await setDraftSelection({
            staffMembershipId: selectedStaff.staff.membershipId,
            startAt: null,
            endAt: null,
          })

          const updatedDraft = await getDraft(true)
          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({
            draft: updatedDraft!,
            intro: `Perfeito! Vou seguir com ${updatedDraft!.membership!.user.name}.`,
          })
          continue
        }

        if (action.type === "SUGGEST_TIME_SLOTS") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId || !draft.membership) {
            continue
          }

          await updateState("CHOOSING_TIME")
          await sendTimeSuggestionsForDraft({ draft })
          continue
        }

        if (action.type === "SELECT_SUGGESTED_SLOT") {
          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId) {
            continue
          }

          let suggestions = getStoredSuggestedSlots(conversationContext)
          if (!suggestions.length) {
            suggestions = await loadTimeSuggestionsForDraft(draft)
            await setSuggestedTimeSlots(suggestions)
          }

          const selectedSlot = resolveSuggestedSlotChoice(action.text, suggestions)

          if (!selectedSlot) {
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildTimeSuggestionsMessage({
                intro: "Nao encontrei essa opcao.",
                suggestions,
              }),
              {
                reason: "SUGGESTED_SLOT_INVALID",
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(suggestions),
              }
            )
            shouldStop = true
            continue
          }

          parsedDateTime = toParsedDateTimeValue(selectedSlot.startAt, timeZone)
          continue
        }

        if (action.type === "PARSE_DATETIME_FROM_TEXT") {
          const parsed = parseDateTimeFromText({
            text: action.text,
            timeZone,
          })

          if (!parsed.ok) {
            parsedDateTime = null
            const suggestions = getStoredSuggestedSlots(conversationContext)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              suggestions.length
                ? `${parsed.error}\n${buildSuggestedSlotsText(suggestions)}\n\nPode responder com o numero da opcao ou me dizer outro dia e horario.`
                : parsed.error,
              {
                reason: "DATETIME_PARSE_FAILED",
                suggestions: serializeSuggestedSlots(suggestions),
              }
            )
            shouldStop = true
            continue
          }

          parsedDateTime = parsed.value
          continue
        }

        if (action.type === "CHECK_AVAILABILITY_FOR_DRAFT") {
          if (!parsedDateTime) {
            shouldStop = true
            continue
          }

          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId) {
            continue
          }

          const availability = await checkAvailabilityForSlot({
            db: tx,
            storeId: currentStoreId,
            requestedStartAt: parsedDateTime.startAt,
            durationMin: draft.service.durationMin,
            timeZone,
            staffMembershipId: draft.staffMembershipId,
            suggestionsLimit: TIME_SUGGESTIONS_LIMIT,
          })

          if (!availability.available) {
            await clearDraftDateTime()
            await setSuggestedTimeSlots(availability.suggestions)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildUnavailableTimeMessage({
                message: availability.message,
                suggestions: availability.suggestions,
              }),
              {
                reason: availability.reason,
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(availability.suggestions),
              }
            )
            shouldStop = true
            continue
          }

          draftCache = draft
          parsedDateTime = {
            ...parsedDateTime,
            startAt: availability.startAt,
            label: formatDateTimeForBot(availability.startAt, timeZone),
          }
          continue
        }

        if (action.type === "SAVE_DRAFT_DATETIME") {
          if (!parsedDateTime) {
            shouldStop = true
            continue
          }

          const draft = await ensureResolvedStaffForDraft()
          if (!draft?.service || !draft.staffMembershipId || !draft.membership) {
            continue
          }

          const endAt = new Date(parsedDateTime.startAt.getTime() + draft.service.durationMin * 60 * 1000)

          await setDraftSelection({
            startAt: parsedDateTime.startAt,
            endAt,
          })
          await setSuggestedTimeSlots([])

          const updatedDraft = await getDraft(true)
          await appendBotReply(
            `Perfeito! Posso confirmar seu agendamento de ${updatedDraft!.service!.name} com ${updatedDraft!.membership!.user.name} para ${formatDateTimeForBot(parsedDateTime.startAt, timeZone)}? Responda SIM para confirmar ou NAO para escolher outro horario.`,
            {
              serviceId: updatedDraft!.service!.id,
              staffMembershipId: updatedDraft!.membership!.id,
              startAt: parsedDateTime.startAt.toISOString(),
              endAt: endAt.toISOString(),
            }
          )
          continue
        }

        if (action.type === "CLEAR_DRAFT_DATETIME") {
          await clearDraftDateTime()
          await setSuggestedTimeSlots([])
          continue
        }

        if (action.type === "CREATE_APPOINTMENT_FROM_DRAFT") {
          const draft = await ensureResolvedStaffForDraft()

          if (!draft?.service || !draft.startAt || !draft.endAt || !draft.staffMembershipId || !draft.membership) {
            if (!shouldStop) {
              await updateState("CHOOSING_TIME")
              await appendBotReply(
                "Ainda nao tenho um horario pronto para confirmar. Me diga outro dia e horario.",
                {
                  reason: "DRAFT_DATETIME_REQUIRED",
                }
              )
              shouldStop = true
            }
            continue
          }

          const latestAvailability = await checkAvailabilityForSlot({
            db: tx,
            storeId: currentStoreId,
            requestedStartAt: draft.startAt,
            durationMin: draft.service.durationMin,
            timeZone,
            staffMembershipId: draft.staffMembershipId,
            suggestionsLimit: TIME_SUGGESTIONS_LIMIT,
          })

          if (!latestAvailability.available) {
            await clearDraftDateTime()
            await setSuggestedTimeSlots(latestAvailability.suggestions)
            await updateState("CHOOSING_TIME")
            await appendBotReply(
              buildUnavailableTimeMessage({
                message: `Esse horario nao esta mais disponivel para ${draft.membership.user.name}.`,
                suggestions: latestAvailability.suggestions,
              }),
              {
                reason: latestAvailability.reason,
                staffMembershipId: draft.staffMembershipId,
                suggestions: serializeSuggestedSlots(latestAvailability.suggestions),
              }
            )
            shouldStop = true
            continue
          }

          const appointment = await tx.appointment.create({
            data: {
              storeId: currentStoreId,
              status: "SCHEDULED",
              serviceId: draft.service.id,
              staffMembershipId: draft.staffMembershipId,
              customerName: draft.customerName?.trim() || "Cliente WhatsApp",
              customerPhone: draft.customerPhone ?? incomingMessage.from,
              customerEmail: draft.customerEmail ?? undefined,
              startAt: draft.startAt,
              endAt: draft.endAt,
              notes: draft.notes ?? undefined,
              source: "WHATSAPP",
              externalRef: incomingMessage.providerMessageId,
              metadata: toJsonValue({
                conversationId: conversation.id,
                draftId: draft.id,
                confirmedByMessageId: savedIn.id,
              }),
            },
          })

          await tx.appointmentDraft.update({
            where: { id: draft.id },
            data: {
              status: "CONFIRMED",
              appointmentId: appointment.id,
            },
          })
          await setSuggestedTimeSlots([])

          createdAppointmentId = appointment.id
          await appendBotReply(
            `Agendamento confirmado! ${draft.service.name} com ${draft.membership.user.name} em ${formatDateTimeForBot(appointment.startAt, timeZone)}.`,
            {
              appointmentId: appointment.id,
              staffMembershipId: draft.staffMembershipId,
            }
          )
          continue
        }

        if (action.type === "REPLY_TEXT") {
          await appendBotReply(action.text)
        }
      }
    })

    return ok({
      conversationId: conversation.id,
      messageId: savedIn.id,
      nextState,
      draftId: ensuredDraftId,
      appointmentId: createdAppointmentId,
      replies: outMessages,
      replayed: false,
    })
  } catch (error) {
    console.error("whatsapp webhook error", error)
    return serverError("Nao foi possivel processar o webhook do WhatsApp")
  }
}
