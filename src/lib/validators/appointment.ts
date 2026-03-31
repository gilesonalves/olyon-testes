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
  startAt: z.string().datetime("Data/hora invalida."),
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
    startAt: z.string().datetime("Data/hora invalida.").optional(),
    notes: optionalNullableTrimmedString,
    status: AppointmentStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Informe ao menos um campo para atualizar o agendamento.",
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

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>
export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>
export type AppointmentAvailabilityQueryInput = z.infer<typeof AppointmentAvailabilityQuerySchema>
