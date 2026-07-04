import {
  combineDateKeyAndTime,
  getBotTimezone,
  getDateKeyInTimeZone,
} from "@/lib/bot/datetime"

export function getBillingTimeZone() {
  return process.env.APP_TIMEZONE ?? getBotTimezone()
}

function assertDueDay(dueDay: number) {
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new RangeError("O dia do vencimento deve estar entre 1 e 31.")
  }
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addMonths(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  }
}

function buildDueAt(
  year: number,
  month: number,
  dueDay: number,
  timeZone: string
) {
  assertDueDay(dueDay)

  const day = Math.min(dueDay, getLastDayOfMonth(year, month))
  const dateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`

  return combineDateKeyAndTime(dateKey, "12:00", timeZone)
}

export function calculateNextDueAt(
  dueDay: number,
  now = new Date(),
  timeZone = getBillingTimeZone()
) {
  assertDueDay(dueDay)

  const [year, month, currentDay] = getDateKeyInTimeZone(now, timeZone)
    .split("-")
    .map(Number)
  const target =
    currentDay <= dueDay
      ? { year, month }
      : addMonths(year, month, 1)

  return buildDueAt(target.year, target.month, dueDay, timeZone)
}

export function calculateNextCycleDueAt(
  period: string,
  dueDay: number,
  timeZone = getBillingTimeZone()
) {
  const match = period.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) {
    throw new RangeError("O periodo deve estar no formato AAAA-MM.")
  }

  const target = addMonths(Number(match[1]), Number(match[2]), 1)
  return buildDueAt(target.year, target.month, dueDay, timeZone)
}
