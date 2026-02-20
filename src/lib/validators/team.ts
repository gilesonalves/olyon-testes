import { z } from "zod";

export const MembershipTypeSchema = z.enum([
  "PROFISSIONAL",
  "FINANCEIRO",
  "ATENDENTE",
]);

export const TeamCreateApiSchema = z.object({
  userId: z.string().min(1, "userId é obrigatório"),
  serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
  extraTypes: z.array(MembershipTypeSchema).optional(),
});

export const TeamUpdateApiSchema = z
  .object({
    serviceIds: z.array(z.string()).optional(), // se vier, replace
    extraTypes: z.array(MembershipTypeSchema).optional(), // replace (mantém PROFISSIONAL)
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nada para atualizar" });