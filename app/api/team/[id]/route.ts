import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response";
import { requireMembershipRole } from "@/lib/guards/require-membership-role";
import { TeamUpdateApiSchema } from "@/lib/validators/team";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("STAFF");
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error);
    }

    const { id } = await params;

    const membership = await prisma.membership.findFirst({
      where: { id, storeId: guard.storeId },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
        types: { select: { type: true } },
        services: {
          select: {
            serviceId: true,
            service: { select: { id: true, name: true, durationMin: true, active: true } },
          },
        },
      },
    });

    if (!membership) return notFound("Membro não encontrado nesta loja.");

    return ok({
      membershipId: membership.id,
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      types: membership.types.map((t) => t.type),
      services: membership.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        durationMin: s.service.durationMin,
        active: s.service.active,
      })),
      serviceIds: membership.services.map((s) => s.serviceId),
    });
  } catch (e) {
    console.error("[GET /api/team/:id]", e);
    return serverError();
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN");
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = TeamUpdateApiSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(" • ") || "Payload inválido"
      );
    }

    const membership = await prisma.membership.findFirst({
      where: { id, storeId: guard.storeId },
      select: { id: true },
    });

    if (!membership) return notFound("Membro não encontrado nesta loja.");

    const { serviceIds, extraTypes } = parsed.data;

    await prisma.$transaction(async (tx) => {
      // services: replace se vier definido
      if (serviceIds !== undefined) {
        await tx.membershipService.deleteMany({ where: { membershipId: id } });

        if (serviceIds.length > 0) {
          await tx.membershipService.createMany({
            data: serviceIds.map((serviceId) => ({ membershipId: id, serviceId })),
          });
        }
      }

      // tipos: replace (mantendo PROFISSIONAL sempre)
      if (extraTypes !== undefined) {
        // remove tudo que NÃO é PROFISSIONAL
        await tx.membershipTypeLink.deleteMany({
          where: { membershipId: id, NOT: { type: "PROFISSIONAL" } },
        });

        const extras = Array.from(new Set(extraTypes)).filter(
          (t) => t !== "PROFISSIONAL"
        );

        if (extras.length > 0) {
          await tx.membershipTypeLink.createMany({
            data: extras.map((t) => ({ membershipId: id, type: t })),
            skipDuplicates: true,
          });
        }

        // garante PROFISSIONAL
        await tx.membershipTypeLink.createMany({
          data: [{ membershipId: id, type: "PROFISSIONAL" }],
          skipDuplicates: true,
        });
      }
    });

    return ok({ id });
  } catch (e) {
    console.error("[PUT /api/team/:id]", e);
    return serverError();
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const guard = await requireMembershipRole("ADMIN");
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error);
    }

    const { id } = await params;

    const membership = await prisma.membership.findFirst({
      where: { id, storeId: guard.storeId },
      select: { id: true },
    });

    if (!membership) return notFound("Membro não encontrado nesta loja.");

    // Remove só o "profissional" da equipe, não remove usuário/membership
    await prisma.$transaction(async (tx) => {
      await tx.membershipTypeLink.deleteMany({
        where: { membershipId: id, type: "PROFISSIONAL" },
      });
      await tx.membershipService.deleteMany({ where: { membershipId: id } });
    });

    return ok({ id });
  } catch (e) {
    console.error("[DELETE /api/team/:id]", e);
    return serverError();
  }
}