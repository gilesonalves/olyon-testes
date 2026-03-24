import { z } from "zod"

export const FinanceEntryCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive(),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  transactionDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE"]).optional(),
})

export const FinanceEntryUpdateSchema = FinanceEntryCreateSchema.partial()
  .extend({
    paidAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: "Informe ao menos um campo para atualizar",
    }
  )