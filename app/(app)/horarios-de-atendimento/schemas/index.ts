import * as z from "zod"
export const formSchema = z.object({
  type: z.enum(["enabled" , "disabled"]),
  timeStart: z.string(),
  timeEnd: z.string(),
})



export const blockedScheduleSchema = z
  .object({
    dates: z
      .array(z.string())
      .min(1, "Selecione pelo menos uma data para o bloqueio."),
    allDay: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // Se for dia inteiro, não precisa validar horários
    if (values.allDay) {
      return
    }

    // Horário inicial obrigatório
    if (!values.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Horário inicial é obrigatório",
      })
    }

    // Horário final obrigatório
    if (!values.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Horário final é obrigatório",
      })
    }

    // Validar ordem dos horários
    if (values.startTime && values.endTime) {
      const [startH, startM] = values.startTime.split(":").map(Number)
      const [endH, endM] = values.endTime.split(":").map(Number)

      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM

      if (endMinutes <= startMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "Horário final deve ser maior que o horário inicial",
        })
      }
    }
  })

export type BlockedScheduleFormValues = z.infer<
  typeof blockedScheduleSchema
>

export const defaultBlockedScheduleValues: BlockedScheduleFormValues = {
  dates: [],
  allDay: false,
  startTime: "",
  endTime: "",
}

export const horarioSchema = z.object({
  horaInicial: z.string(),
  horaFinal: z.string(),
})

export const diaSchema = z.object({
  enabled: z.boolean(),
  horarios: z.array(horarioSchema),
})
