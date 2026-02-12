import { z } from "zod"
import { createOwnerSchema } from "./create-owner.schema"

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>

export type CreateOwnerResult =
  | { success: true }
  | { success: false; error: "INVALID_INPUT"; message: string }
  | { success: false; error: "EMAIL_ALREADY_EXISTS"; message: string }
  | { success: false; error: "STORE_NOT_FOUND"; message: string }
  | { success: false; error: "FORBIDDEN"; message: string }
  | { success: false; error: "UNKNOWN"; message: string }
