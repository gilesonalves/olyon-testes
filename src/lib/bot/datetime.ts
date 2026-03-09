import { Weekday } from "../../../generated/prisma/client"

const DAY_MS = 24 * 60 * 60 * 1000

const weekdayLabels: Record<Weekday, string> = {
  SUN: "domingo",
  MON: "segunda",
  TUE: "terca",
  WED: "quarta",
  THU: "quinta",
  FRI: "sexta",
  SAT: "sabado",
}

const weekdayTokens: Array<{ weekday: Weekday; tokens: string[] }> = [
  { weekday: "SUN", tokens: ["domingo", "dom"] },
  { weekday: "MON", tokens: ["segunda", "segunda feira", "seg"] },
  { weekday: "TUE", tokens: ["terca", "terca feira", "terça", "terça feira", "ter"] },
  { weekday: "WED", tokens: ["quarta", "quarta feira", "qua"] },
  { weekday: "THU", tokens: ["quinta", "quinta feira", "qui"] },
  { weekday: "FRI", tokens: ["sexta", "sexta feira", "sex"] },
  { weekday: "SAT", tokens: ["sabado", "sábado", "sab"] },
]

type LocalDateParts = {
  year: number
  month: number
  day: number
}

type LocalDateTimeParts = LocalDateParts & {
  hour: number
  minute: number
  second: number
}

type ParsedTime = {
  hour: number
  minute: number
}

export type ParsedDateTimeValue = {
  startAt: Date
  dateKey: string
  timeKey: string
  weekday: Weekday
  label: string
}

export type ParsedDateTimeResult =
  | {
      ok: true
      value: ParsedDateTimeValue
    }
  | {
      ok: false
      error: string
    }

export function getBotTimezone() {
  return process.env.WHATSAPP_SCHEDULING_TIMEZONE ?? process.env.APP_TIMEZONE ?? "America/Sao_Paulo"
}

export function normalizeBotText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function timeKeyToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

export function minutesToTimeKey(totalMinutes: number) {
  const normalized = Math.max(0, totalMinutes)
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function parseDateKeyToStoreDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey)
  const value = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS)

  return formatDateKey({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  })
}

export function getWeekdayFromDateKey(dateKey: string): Weekday {
  const { year, month, day } = parseDateKey(dateKey)
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsWeekday] as Weekday
}

export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getLocalDateTimeParts(date, timeZone)
  return formatDateKey(parts)
}

export function getTimeKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getLocalDateTimeParts(date, timeZone)
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
}

export function formatDateTimeForBot(date: Date, timeZone: string) {
  const dateKey = getDateKeyInTimeZone(date, timeZone)
  const timeKey = getTimeKeyInTimeZone(date, timeZone)
  const weekday = getWeekdayFromDateKey(dateKey)
  const [, , month, day] = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []

  return `${weekdayLabels[weekday]} ${day}/${month} as ${timeKey}`
}

export function combineDateKeyAndTime(dateKey: string, timeKey: string, timeZone: string) {
  const date = parseDateKey(dateKey)
  const time = parseTimeKey(timeKey)

  return localDateTimeToUtc(
    {
      ...date,
      ...time,
      second: 0,
    },
    timeZone
  )
}

export function parseDateTimeFromText(params: {
  text: string
  now?: Date
  timeZone?: string
}): ParsedDateTimeResult {
  const now = params.now ?? new Date()
  const timeZone = params.timeZone ?? getBotTimezone()
  const normalized = normalizeBotText(params.text)

  const parsedTime = extractTime(normalized)
  if (!parsedTime) {
    return {
      ok: false,
      error: "Nao entendi o horario. Ex.: amanha 14h, segunda 15:30 ou dia 12 as 9h.",
    }
  }

  const nowLocal = getLocalDateTimeParts(now, timeZone)
  const dateKey = resolveDateKey(normalized, nowLocal, parsedTime)

  if (!dateKey) {
    return {
      ok: false,
      error: "Nao entendi o dia. Ex.: amanha 14h, segunda 15:30 ou dia 12 as 9h.",
    }
  }

  const timeKey = `${String(parsedTime.hour).padStart(2, "0")}:${String(parsedTime.minute).padStart(2, "0")}`
  const startAt = combineDateKeyAndTime(dateKey, timeKey, timeZone)

  if (startAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      error: "Preciso de um horario futuro. Ex.: amanha 14h.",
    }
  }

  return {
    ok: true,
    value: {
      startAt,
      dateKey,
      timeKey,
      weekday: getWeekdayFromDateKey(dateKey),
      label: formatDateTimeForBot(startAt, timeZone),
    },
  }
}

function parseDateKey(value: string): LocalDateParts {
  const [year, month, day] = value.split("-").map(Number)
  return { year, month, day }
}

function parseTimeKey(value: string): ParsedTime {
  const [hour, minute] = value.split(":").map(Number)
  return { hour, minute }
}

function formatDateKey(parts: LocalDateParts) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

function getLocalDateTimeParts(date: Date, timeZone: string): LocalDateTimeParts {
  const formatter = getDateTimeFormatter(timeZone)
  const parts = formatter.formatToParts(date)

  const values = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
  }

  for (const part of parts) {
    if (part.type === "year") values.year = Number(part.value)
    if (part.type === "month") values.month = Number(part.value)
    if (part.type === "day") values.day = Number(part.value)
    if (part.type === "hour") values.hour = Number(part.value)
    if (part.type === "minute") values.minute = Number(part.value)
    if (part.type === "second") values.second = Number(part.value)
  }

  return values
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()

function getDateTimeFormatter(timeZone: string) {
  const cacheKey = timeZone
  const existing = dateTimeFormatters.get(cacheKey)

  if (existing) {
    return existing
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  dateTimeFormatters.set(cacheKey, formatter)

  return formatter
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getLocalDateTimeParts(date, timeZone)
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return utcGuess - date.getTime()
}

function localDateTimeToUtc(parts: LocalDateTimeParts, timeZone: string) {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  const firstOffset = getTimeZoneOffsetMs(new Date(guess), timeZone)
  let corrected = guess - firstOffset
  const secondOffset = getTimeZoneOffsetMs(new Date(corrected), timeZone)

  if (secondOffset !== firstOffset) {
    corrected = guess - secondOffset
  }

  return new Date(corrected)
}

function extractTime(text: string): ParsedTime | null {
  const colonMatch = text.match(/\b(?:as\s+)?(\d{1,2}):(\d{2})\b/)
  if (colonMatch) {
    return buildTime(Number(colonMatch[1]), Number(colonMatch[2]))
  }

  const hourWithHMatch = text.match(/\b(?:as\s+)?(\d{1,2})h(?:\s*(\d{2}))?\b/)
  if (hourWithHMatch) {
    return buildTime(Number(hourWithHMatch[1]), Number(hourWithHMatch[2] ?? 0))
  }

  const plainHourMatch = text.match(/\b(?:as|para as|pra as|pra)\s+(\d{1,2})\b/)
  if (plainHourMatch) {
    return buildTime(Number(plainHourMatch[1]), 0)
  }

  return null
}

function buildTime(hour: number, minute: number): ParsedTime | null {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null
  return { hour, minute }
}

function resolveDateKey(
  text: string,
  nowLocal: LocalDateTimeParts,
  requestedTime: ParsedTime
) {
  const currentDateKey = formatDateKey(nowLocal)

  if (text.includes("depois de amanha")) {
    return addDaysToDateKey(currentDateKey, 2)
  }

  if (text.includes("amanha")) {
    return addDaysToDateKey(currentDateKey, 1)
  }

  if (text.includes("hoje")) {
    return currentDateKey
  }

  const explicitDate = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/)
  if (explicitDate) {
    const day = Number(explicitDate[1])
    const month = Number(explicitDate[2])
    const year = explicitDate[3] ? normalizeYear(Number(explicitDate[3])) : undefined

    return resolveAbsoluteDate({
      nowLocal,
      requestedTime,
      day,
      month,
      year,
    })
  }

  const dayOnlyMatch = text.match(/\bdia\s+(\d{1,2})(?:[\/-](\d{1,2}))?\b/)
  if (dayOnlyMatch) {
    const day = Number(dayOnlyMatch[1])
    const month = dayOnlyMatch[2] ? Number(dayOnlyMatch[2]) : undefined

    if (month) {
      return resolveAbsoluteDate({
        nowLocal,
        requestedTime,
        day,
        month,
      })
    }

    return resolveDayOfMonth({
      nowLocal,
      requestedTime,
      day,
    })
  }

  for (const entry of weekdayTokens) {
    if (entry.tokens.some((token) => text.includes(token))) {
      return resolveWeekday({
        nowLocal,
        requestedTime,
        weekday: entry.weekday,
      })
    }
  }

  return null
}

function normalizeYear(value: number) {
  if (value >= 100) return value
  return 2000 + value
}

function resolveAbsoluteDate(params: {
  nowLocal: LocalDateTimeParts
  requestedTime: ParsedTime
  day: number
  month: number
  year?: number
}) {
  const year = params.year ?? params.nowLocal.year
  const candidate = buildDateIfValid(year, params.month, params.day)

  if (!candidate) {
    return null
  }

  if (params.year) {
    return formatDateKey(candidate)
  }

  if (compareLocalDateTime(candidate, params.requestedTime, params.nowLocal) >= 0) {
    return formatDateKey(candidate)
  }

  const nextYear = buildDateIfValid(year + 1, params.month, params.day)
  return nextYear ? formatDateKey(nextYear) : null
}

function resolveDayOfMonth(params: {
  nowLocal: LocalDateTimeParts
  requestedTime: ParsedTime
  day: number
}) {
  for (let offset = 0; offset <= 12; offset += 1) {
    const candidateMonth = addMonths(params.nowLocal.year, params.nowLocal.month, offset)
    const candidate = buildDateIfValid(candidateMonth.year, candidateMonth.month, params.day)

    if (!candidate) {
      continue
    }

    if (compareLocalDateTime(candidate, params.requestedTime, params.nowLocal) >= 0) {
      return formatDateKey(candidate)
    }
  }

  return null
}

function resolveWeekday(params: {
  nowLocal: LocalDateTimeParts
  requestedTime: ParsedTime
  weekday: Weekday
}) {
  const currentDateKey = formatDateKey(params.nowLocal)
  const currentWeekday = getWeekdayFromDateKey(currentDateKey)
  const todayIndex = weekdayIndex(currentWeekday)
  const targetIndex = weekdayIndex(params.weekday)

  let diff = (targetIndex - todayIndex + 7) % 7
  if (diff === 0 && compareLocalDateTime(parseDateKey(currentDateKey), params.requestedTime, params.nowLocal) <= 0) {
    diff = 7
  }

  return addDaysToDateKey(currentDateKey, diff)
}

function buildDateIfValid(year: number, month: number, day: number) {
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null
  }

  return {
    year,
    month,
    day,
  }
}

function addMonths(year: number, month: number, offset: number) {
  const baseMonthIndex = month - 1 + offset
  return {
    year: year + Math.floor(baseMonthIndex / 12),
    month: (baseMonthIndex % 12) + 1,
  }
}

function compareLocalDateTime(
  candidateDate: LocalDateParts,
  candidateTime: ParsedTime,
  nowLocal: LocalDateTimeParts
) {
  const candidateValue = `${formatDateKey(candidateDate)}T${String(candidateTime.hour).padStart(2, "0")}:${String(candidateTime.minute).padStart(2, "0")}`
  const nowValue = `${formatDateKey(nowLocal)}T${String(nowLocal.hour).padStart(2, "0")}:${String(nowLocal.minute).padStart(2, "0")}`

  return candidateValue.localeCompare(nowValue)
}

function weekdayIndex(weekday: Weekday) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].indexOf(weekday)
}
