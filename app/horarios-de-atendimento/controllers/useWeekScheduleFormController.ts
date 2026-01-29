import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const horarioSchema = z.object({
  horaInicial: z.string(),
  horaFinal: z.string(),
})

const diaSchema = z.object({
  enabled: z.boolean(),
  horarios: z.array(horarioSchema),
})

export type DiaFormValues = z.infer<typeof diaSchema>

export function useWeekScheduleFormController() {
  const form = useForm<DiaFormValues>({
    resolver: zodResolver(diaSchema),
    defaultValues: {
      enabled: false,
      horarios: [],
    },
  })

  function onSubmit(data: DiaFormValues) {
    console.log("Horários semanais:", data)
  }

  return {
    form,
    onSubmit,
  }
}
