import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  blockedScheduleSchema,
  BlockedScheduleFormValues,
  defaultBlockedScheduleValues,
} from "../schemas"

type UseBlockedScheduleFormControllerProps = {
  onSuccess?: (data: BlockedScheduleFormValues) => Promise<void> | void
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

  async function onSubmit(data: BlockedScheduleFormValues) {
    await props?.onSuccess?.(data)
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