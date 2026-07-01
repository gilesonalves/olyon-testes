import type { z } from "zod"
import type { createOwnerSchema } from "./create-owner.schema"

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>

export type CreateOwnerError =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "STORE_NOT_FOUND"
  | "UNKNOWN"

export type CreateOwnerResult =
  | { success: true }
  | { success: false; error: CreateOwnerError; message: string }
