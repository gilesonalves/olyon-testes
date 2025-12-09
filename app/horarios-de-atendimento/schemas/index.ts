import * as z from "zod"

export const formSchema = z.object({
  type: z.enum(["enabled" , "disabled"]),
  timeStart: z.string(),
  timeEnd: z.string(),
})

