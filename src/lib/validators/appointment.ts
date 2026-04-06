import { z } from "zod"
import { normalizePhone } from "@/lib/utils/maskPhone"

function isValidDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  )
}

function isValidTimeKey(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) {
    return false
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

const nullableTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const nullablePhoneString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null

    const digits = normalizePhone(value.trim())
    return digits.length > 0 ? digits : null
  })

const nullableDateTimeString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })
  .refine((value) => value === null || z.string().datetime().safeParse(value).success, {
    message: "Data/hora invalida.",
  })
  .transform((value) => (value ? new Date(value) : null))

const nullableDateKeyString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })
  .refine((value) => value === null || isValidDateKey(value), {
    message: "Data da busca invalida.",
  })

const dateKeyString = z.string().trim().refine(isValidDateKey, {
  message: "Data invalida.",
})

const timeKeyString = z.string().trim().refine(isValidTimeKey, {
  message: "Horario invalido.",
})

export const AppointmentCreateSchema = z.object({
  serviceId: z.string().trim().min(1, "Servico e obrigatorio."),
  staffMembershipId: nullableTrimmedString,
  customerName: z.string().trim().min(2, "Nome do cliente e obrigatorio."),
  customerPhone: nullablePhoneString.refine((value) => {
    if (value === null) return true
    return value.length >= 10 && value.length <= 11
  }, "Telefone invalido. Informe DDD + numero."),
  customerEmail: nullableTrimmedString.refine((value) => {
    if (value === null) return true
    return z.string().email().safeParse(value).success
  }, "E-mail invalido."),
  date: dateKeyString,
  time: timeKeyString,
  allowPastScheduling: z.boolean().optional().default(false),
  notes: nullableTrimmedString,
})

const optionalNullableTrimmedString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const optionalNullablePhoneString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null

    const digits = normalizePhone(value.trim())
    return digits.length > 0 ? digits : null
  })

const AppointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "CANCELED",
  "DONE",
  "NO_SHOW",
])

export const AppointmentUpdateSchema = z
  .object({
    serviceId: z.string().trim().min(1, "Servico e obrigatorio.").optional(),
    staffMembershipId: optionalNullableTrimmedString,
    customerName: z.string().trim().min(2, "Nome do cliente e obrigatorio.").optional(),
    customerPhone: optionalNullablePhoneString.refine((value) => {
      if (value === undefined || value === null) return true
      return value.length >= 10 && value.length <= 11
    }, "Telefone invalido. Informe DDD + numero."),
    customerEmail: optionalNullableTrimmedString.refine((value) => {
      if (value === undefined || value === null) return true
      return z.string().email().safeParse(value).success
    }, "E-mail invalido."),
    date: dateKeyString.optional(),
    time: timeKeyString.optional(),
    allowPastScheduling: z.boolean().optional(),
    notes: optionalNullableTrimmedString,
    status: AppointmentStatusSchema.optional(),
  })
  .refine((value) => (value.date === undefined) === (value.time === undefined), {
    message: "Informe data e horario juntos para remarcar o agendamento.",
    path: ["date"],
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Informe ao menos um campo para atualizar o agendamento.",
  })

export const AppointmentListQuerySchema = z.object({
  date: nullableDateKeyString,
})

export const AppointmentAvailabilityQuerySchema = z.object({
  serviceId: z.string().trim().min(1, "Servico e obrigatorio."),
  staffMembershipId: nullableTrimmedString,
  excludeAppointmentId: nullableTrimmedString,
  searchDate: nullableDateKeyString,
  searchStartAt: nullableDateTimeString,
}).refine((value) => value.searchDate !== null || value.searchStartAt !== null, {
  message: "Data da busca e obrigatoria.",
  path: ["searchDate"],
})

export const PublicAppointmentAvailabilityQuerySchema = z.object({
  serviceId: z.string().trim().min(1, "Servico e obrigatorio."),
  staffMembershipId: z.string().trim().min(1, "Profissional e obrigatorio."),
  searchDate: dateKeyString,
})

export const PublicAppointmentCreateSchema = AppointmentCreateSchema
  .omit({ allowPastScheduling: true })
  .refine((value) => value.staffMembershipId !== null, {
    message: "Profissional e obrigatorio.",
    path: ["staffMembershipId"],
  })
  .refine((value) => value.customerPhone !== null, {
    message: "Telefone invalido. Informe DDD + numero.",
    path: ["customerPhone"],
  })

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>
export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>
export type AppointmentListQueryInput = z.infer<typeof AppointmentListQuerySchema>
export type AppointmentAvailabilityQueryInput = z.infer<typeof AppointmentAvailabilityQuerySchema>
export type PublicAppointmentAvailabilityQueryInput = z.infer<
  typeof PublicAppointmentAvailabilityQuerySchema
>
export type PublicAppointmentCreateInput = z.infer<typeof PublicAppointmentCreateSchema>
