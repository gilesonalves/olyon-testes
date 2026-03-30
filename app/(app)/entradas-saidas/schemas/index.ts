import * as z from "zod"

export const formSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  category: z.string().trim().min(2, "Informe uma categoria válida").max(80),
  description: z.string().trim().max(500).optional().nullable(),
  transactionDate: z.string().min(1, "Informe a data do lançamento"),
  dueDate: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === "EXPENSE" && !data.dueDate?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe a data de vencimento",
      path: ["dueDate"],
    })
  }
})

export type FormValues = z.infer<typeof formSchema>