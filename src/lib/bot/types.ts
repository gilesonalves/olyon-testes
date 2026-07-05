// src/lib/bot/types.ts
import type { ConversationState } from "@/lib/prisma"

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

export type TimeSelectionStage = "DAY" | "TIME"

export type BotConversationContext = {
  timezone?: string | null
  customerName?: string | null
  mainMenuShown?: boolean | null
  priceListPage?: number | null
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
  dateOptions?:
    | Array<{
        dateKey: string
        label: string
        firstStartAt: string
      }>
    | null
  selectedDateKey?: string | null
  selectedDateLabel?: string | null
  timeSelectionStage?: TimeSelectionStage | null
  dateOptionPage?: number | null
  timeSlotPage?: number | null
}

export type BotAction =
  | { type: "REPLY_TEXT"; text: string }
  | { type: "REPLY_STORE_INFO" }
  | { type: "SHOW_MAIN_MENU" }
  | { type: "SHOW_SERVICE_PRICES_PAGE"; page: number }
  | { type: "SHOW_SERVICE_SELECTION" }
  | { type: "SHOW_STAFF_SELECTION" }
  | { type: "SHOW_DAY_SELECTION" }
  | { type: "SHOW_TIME_SELECTION" }
  | { type: "SHOW_BOOKING_CONFIRMATION" }
  | { type: "SHOW_APPOINTMENT_ACTION" }
  | { type: "SHOW_APPOINTMENT_CANCELLATION_CONFIRMATION" }
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
  | { type: "SELECT_DAY_FROM_TEXT"; text: string }
  | { type: "SELECT_TIME_INPUT"; text: string }
  | { type: "CLEAR_DRAFT_DATETIME" }
  | { type: "CREATE_APPOINTMENT_FROM_DRAFT" }
  | { type: "RESCHEDULE_APPOINTMENT_FROM_DRAFT" }

export type BotResult = {
  actions: BotAction[]
}
