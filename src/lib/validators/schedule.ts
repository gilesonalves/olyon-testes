import { z } from "zod";

export const blockedScheduleCreateSchema = z.object({
  dates: z.array(z.string()).min(1),
  allDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.allDay) return;

  if (!values.startTime) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startTime"], message: "Horário inicial é obrigatório" });
  if (!values.endTime) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Horário final é obrigatório" });

  if (values.startTime && values.endTime && values.endTime <= values.startTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Horário final deve ser maior que o horário inicial" });
  }
});

export const blockedScheduleUpdateSchema = z.object({
  date: z.string(),
  allDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.allDay) return;
  if (!values.startTime) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startTime"], message: "Horário inicial é obrigatório" });
  if (!values.endTime) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Horário final é obrigatório" });
  if (values.startTime && values.endTime && values.endTime <= values.startTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Horário final deve ser maior que o horário inicial" });
  }
});

export const weekScheduleSchema = z.object({
  days: z.array(z.object({
    weekday: z.enum(["SUN","MON","TUE","WED","THU","FRI","SAT"]),
    enabled: z.boolean(),
    intervals: z.array(z.object({
      startTime: z.string(),
      endTime: z.string(),
    })).default([]),
  })).length(7),
});