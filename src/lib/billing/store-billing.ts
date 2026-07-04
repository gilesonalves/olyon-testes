import { z } from "zod"
import {
  StoreBillingStatus,
  StoreOperationalStatus,
  type StoreBilling,
} from "@/lib/prisma"
import { getBillingTimeZone } from "@/lib/billing/due-date"

export const billingPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe o periodo no formato AAAA-MM.")

const optionalNotesSchema = z
  .string()
  .trim()
  .max(1000, "A observacao deve ter no maximo 1000 caracteres.")
  .nullable()
  .optional()

export const updateStoreBillingSchema = z
  .object({
    monthlyAmount: z.number().min(0, "O valor mensal nao pode ser negativo.").nullable().optional(),
    dueDay: z
      .number()
      .int()
      .min(1, "O dia de vencimento deve estar entre 1 e 31.")
      .max(31, "O dia de vencimento deve estar entre 1 e 31.")
      .nullable()
      .optional(),
    notes: optionalNotesSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  })

export const markStoreBillingPaidSchema = z.object({
  period: billingPeriodSchema,
  amount: z.number().min(0, "O valor pago nao pode ser negativo.").nullable().optional(),
  paidAt: z.iso.datetime(),
  notes: optionalNotesSchema,
  reactivate: z.boolean().optional().default(false),
})

export const markStoreBillingPendingSchema = z.object({
  period: billingPeriodSchema,
  notes: optionalNotesSchema,
})

export const markStoreBillingOverdueSchema = z
  .object({
    period: billingPeriodSchema.optional(),
    notes: optionalNotesSchema,
  })
  .optional()
  .default({})

export const changeStoreOperationalStatusSchema = z
  .object({
    notes: optionalNotesSchema,
  })
  .optional()
  .default({})

export type StoreBillingSnapshot = {
  configured: boolean
  status: StoreBillingStatus
  operationalStatus: StoreOperationalStatus
  monthlyAmount: number | null
  dueDay: number | null
  currentPeriod: string | null
  lastPaidAt: string | null
  nextDueAt: string | null
  timeZone: string
}

export const DEFAULT_STORE_BILLING: StoreBillingSnapshot = {
  configured: false,
  status: StoreBillingStatus.PENDING,
  operationalStatus: StoreOperationalStatus.ACTIVE,
  monthlyAmount: null,
  dueDay: null,
  currentPeriod: null,
  lastPaidAt: null,
  nextDueAt: null,
  timeZone: getBillingTimeZone(),
}

export function serializeStoreBilling(
  billing: StoreBilling | null
): StoreBillingSnapshot {
  if (!billing) {
    return DEFAULT_STORE_BILLING
  }

  return {
    configured: true,
    status: billing.status,
    operationalStatus: billing.operationalStatus,
    monthlyAmount:
      billing.monthlyAmount === null ? null : Number(billing.monthlyAmount),
    dueDay: billing.dueDay,
    currentPeriod: billing.currentPeriod,
    lastPaidAt: billing.lastPaidAt?.toISOString() ?? null,
    nextDueAt: billing.nextDueAt?.toISOString() ?? null,
    timeZone: getBillingTimeZone(),
  }
}
