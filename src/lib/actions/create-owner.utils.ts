import bcrypt from "bcryptjs"

export const DEFAULT_OWNER_PASSWORD = "admin123"

export async function hashDefaultOwnerPassword(): Promise<string> {
  return bcrypt.hash(DEFAULT_OWNER_PASSWORD, 10)
}
