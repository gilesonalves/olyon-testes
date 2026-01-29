import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  blockedScheduleSchema,
  BlockedScheduleFormValues,
  defaultBlockedScheduleValues,
} from "../schemas"

type UseBlockedScheduleFormControllerProps = {
  onSuccess?: (data: BlockedScheduleFormValues) => void
}

export function useBlockedScheduleFormController(
  props?: UseBlockedScheduleFormControllerProps
) {
  const form = useForm<BlockedScheduleFormValues>({
    resolver: zodResolver(blockedScheduleSchema),
    defaultValues: defaultBlockedScheduleValues,
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const allDay = form.watch("allDay")

  function onSubmit(data: BlockedScheduleFormValues) {
    props?.onSuccess?.(data)

    toast.success("Horário bloqueado com sucesso", {
      position: "bottom-right",
    })
  }

  function resetForm() {
    form.reset(defaultBlockedScheduleValues)
  }




  return {
    form,
    allDay,
    onSubmit,
    resetForm,
  }
}
