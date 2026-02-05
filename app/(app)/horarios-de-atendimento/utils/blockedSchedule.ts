import type { BlockedScheduleItem } from "../types"

export type BlockedInterval = {
  date: string
  startTime: string
  endTime: string
}

type WeekdayBlockedInfo = {
  allDay: boolean
  intervals: BlockedInterval[]
  dates: string[]
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  if (!year || !month || !day) {
    return null
  }
  return new Date(year, month - 1, day)
}

export function isDayFullyBlocked(
  date: Date | string,
  blockedItems: BlockedScheduleItem[]
) {
  const dateKey = typeof date === "string" ? date : toDateKey(date)
  return blockedItems.some((item) => item.date === dateKey && item.allDay)
}

export function getBlockedIntervals(
  date: Date | string,
  blockedItems: BlockedScheduleItem[]
) {
  const dateKey = typeof date === "string" ? date : toDateKey(date)
  return blockedItems
    .filter(
      (item) =>
        item.date === dateKey &&
        !item.allDay &&
        item.startTime &&
        item.endTime
    )
    .map((item) => ({
      date: item.date,
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
    }))
}

export function getWeekdayBlockedInfo(blockedItems: BlockedScheduleItem[]) {
  const info: WeekdayBlockedInfo[] = Array.from({ length: 7 }, () => ({
    allDay: false,
    intervals: [],
    dates: [],
  }))

  blockedItems.forEach((item) => {
    const date = fromDateKey(item.date)
    if (!date) {
      return
    }
    const weekday = date.getDay()
    const dayInfo = info[weekday]

    dayInfo.dates.push(item.date)

    if (item.allDay) {
      dayInfo.allDay = true
      dayInfo.intervals = []
      return
    }

    if (dayInfo.allDay) {
      return
    }

    if (item.startTime && item.endTime) {
      dayInfo.intervals.push({
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
      })
    }
  })

  return info
}
