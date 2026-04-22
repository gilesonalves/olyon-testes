export type BlockedScheduleItem = {
  id: string
  date: string // yyyy-mm-dd
  allDay: boolean
  startTime?: string
  endTime?: string
  membershipId: string | null
  membershipName: string | null
}
