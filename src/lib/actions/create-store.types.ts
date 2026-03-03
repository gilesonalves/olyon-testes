import { z } from "zod"
import { createStoreSchema } from "./create-store.schema"

export type CreateStoreInput = z.infer<typeof createStoreSchema>

export type CreateStoreResult =
  | { success: true; storeId: string; ownerId: string }
  | { success: false; error: "INVALID_INPUT"; message: string }
  | { success: false; error: "DUPLICATE_SLUG"; message: string }
  | { success: false; error: "DUPLICATE_EMAIL"; message: string }
  | { success: false; error: "FORBIDDEN"; message: string }
  | { success: false; error: "UNKNOWN"; message: string }