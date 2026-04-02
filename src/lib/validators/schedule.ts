import { z } from "zod"

const optionalMembershipId = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

export const blockedScheduleConflictActionSchema = z.enum([
  "KEEP_EXISTING_APPOINTMENTS",
  "CANCEL_CONFLICTING_APPOINTMENTS",
])

export const blockedScheduleCreateSchema = z
  .object({
    dates: z.array(z.string()).min(1),
    membershipId: optionalMembershipId,
    allDay: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    conflictAction: blockedScheduleConflictActionSchema.optional(),
  })
  .superRefine((values, ctx) => {
    if (values.allDay) return

    if (!values.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Horario inicial e obrigatorio",
      })
    }

    if (!values.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Horario final e obrigatorio",
      })
    }

    if (values.startTime && values.endTime && values.endTime <= values.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Horario final deve ser maior que o horario inicial",
      })
    }
  })

export const blockedScheduleUpdateSchema = z
  .object({
    date: z.string(),
    membershipId: optionalMembershipId,
    allDay: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.allDay) return

    if (!values.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Horario inicial e obrigatorio",
      })
    }

    if (!values.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Horario final e obrigatorio",
      })
    }

    if (values.startTime && values.endTime && values.endTime <= values.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Horario final deve ser maior que o horario inicial",
      })
    }
  })

export const weekScheduleSchema = z.object({
  membershipId: optionalMembershipId,
  days: z
    .array(
      z.object({
        weekday: z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]),
        enabled: z.boolean(),
        intervals: z
          .array(
            z.object({
              startTime: z.string(),
              endTime: z.string(),
            })
          )
          .default([]),
      })
    )
    .length(7),
})
