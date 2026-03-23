// src/lib/bot/types.ts
import type { ConversationState } from "../../../generated/prisma/client"

type FlowState = Extract<
  ConversationState,
  | "IDLE"
  | "CHOOSING_APPOINTMENT"
  | "CHOOSING_APPOINTMENT_ACTION"
  | "CHOOSING_SERVICE"
  | "CHOOSING_STAFF"
  | "CHOOSING_TIME"
  | "CONFIRMING"
  | "CONFIRMING_APPOINTMENT_CANCELLATION"
>

export type BotConversationContext = {
  timezone?: string | null
  mainMenuShown?: boolean | null
  appointmentOptions?:
    | Array<{
        id: string
        label: string
      }>
    | null
  selectedAppointmentId?: string | null
  selectedAppointmentLabel?: string | null
  rescheduleAppointmentId?: string | null
  timeSlotSuggestions?:
    | Array<{
        startAt: string
        endAt: string
        label: string
      }>
    | null
}

export type BotAction =
  | { type: "REPLY_TEXT"; text: string }
  | { type: "REPLY_STORE_INFO" }
  | { type: "SET_STATE"; state: FlowState }
  | { type: "PATCH_CONTEXT"; context: Partial<BotConversationContext> }
  | { type: "ENSURE_DRAFT" }
  | { type: "LIST_FUTURE_APPOINTMENTS" }
  | { type: "SELECT_EXISTING_APPOINTMENT"; text: string }
  | { type: "CANCEL_SELECTED_APPOINTMENT" }
  | { type: "PREPARE_RESCHEDULE_FROM_SELECTED_APPOINTMENT" }
  | { type: "SELECT_SERVICE_FROM_TEXT"; text: string }
  | { type: "RESOLVE_STAFF_FOR_DRAFT" }
  | { type: "SELECT_STAFF_FROM_TEXT"; text: string }
  | { type: "SUGGEST_TIME_SLOTS" }
  | { type: "SELECT_SUGGESTED_SLOT"; text: string }
  | { type: "PARSE_DATETIME_FROM_TEXT"; text: string }
  | { type: "CHECK_AVAILABILITY_FOR_DRAFT" }
  | { type: "SAVE_DRAFT_DATETIME" }
  | { type: "CLEAR_DRAFT_DATETIME" }
  | { type: "CREATE_APPOINTMENT_FROM_DRAFT" }
  | { type: "RESCHEDULE_APPOINTMENT_FROM_DRAFT" }

export type BotResult = {
  actions: BotAction[]
}
