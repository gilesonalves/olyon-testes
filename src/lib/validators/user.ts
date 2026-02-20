import { z } from "zod"

export const MembershipRoleSchema = z.enum(["OWNER", "ADMIN", "STAFF"])

// Zod schema para perfil de usuário (usado em CREATE e UPDATE)
export const UserProfileSchema = z.object({
  cpf: z.string().optional(),
  phone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  gender: z.object({ _id: z.string(), value: z.string() }).nullable().optional(),
  birthDate: z.string().optional(), // YYYY-MM-DD
  zipcode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
})

// Zod schema para contato de usuário (usado em CREATE e UPDATE)
export const UserContactSchema = z.object({
  name: z.string().min(1, "Nome do contato é obrigatório"),
  phone: z.string().min(1, "Telefone do contato é obrigatório"),
  relationship: z.string().min(1, "Relação é obrigatória"),
})

// API: CREATE (password obrigatório)
export const UserCreateApiSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  role: MembershipRoleSchema.default("STAFF"),
  profile: UserProfileSchema.optional(),
  contacts: z.array(UserContactSchema).optional(),
})

// API: UPDATE (password opcional, todos os campos são opcionais)
export const UserUpdateApiSchema = z
  .object({
    name: z.string().min(2, "Nome inválido").optional(),
    email: z.string().email("Email inválido").optional(),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional(),
    role: MembershipRoleSchema.optional(),
    profile: UserProfileSchema.optional(),
    contacts: z.array(UserContactSchema).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nada para atualizar",
  })
