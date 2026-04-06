import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api/response";
import { requireMembershipRole } from "@/lib/guards/require-membership-role";
import { TeamCreateApiSchema } from "@/lib/validators/team";

export async function GET() {
  try {
    const guard = await requireMembershipRole("STAFF");
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error);
    }

    const members = await prisma.membership.findMany({
      where: {
        storeId: guard.storeId,
        types: { some: { type: "PROFISSIONAL" } },
      },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
        services: {
          select: {
            serviceId: true,
            service: { select: { id: true, name: true, durationMin: true, active: true } },
          },
        },
        professionalWeekSchedules: {
          include: {
            intervals: {
              orderBy: { startTime: "asc" },
            },
          },
          orderBy: { weekday: "asc" },
        },
        types: { select: { type: true } },
      },
      orderBy: { id: "desc" },
    });

    const data = members.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      types: m.types.map((t) => t.type),
      services: m.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        durationMin: s.service.durationMin,
        active: s.service.active,
      })),
      serviceIds: m.services.map((s) => s.serviceId),
      scheduleDays: m.professionalWeekSchedules.map((day) => ({
        weekday: day.weekday,
        enabled: day.enabled,
        intervals: day.intervals.map((interval) => ({
          startTime: interval.startTime,
          endTime: interval.endTime,
        })),
      })),
    }));

    return ok(data);
  } catch (e) {
    console.error("[GET /api/team]", e);
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireMembershipRole("ADMIN");
    if (!guard.ok) {
      return guard.status === 401 ? unauthorized(guard.error) : forbidden(guard.error);
    }

    const body = await req.json();
    const parsed = TeamCreateApiSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues.map((i) => i.message).join(" • ") || "Payload inválido"
      );
    }

    const { userId, serviceIds, extraTypes } = parsed.data;

    // precisa existir membership do user nessa loja (porque equipe = usuário logado)
    const membership = await prisma.membership.findUnique({
      where: { userId_storeId: { userId, storeId: guard.storeId } },
      select: { id: true },
    });

    if (!membership) {
      return badRequest("Usuário não pertence a esta loja. Crie o usuário pela tela de Usuários.");
    }

    const membershipId = membership.id;

    // PROFISSIONAL sempre presente
    const typesToAdd = Array.from(
      new Set(["PROFISSIONAL", ...(extraTypes ?? [])])
    ).filter(Boolean) as Array<"PROFISSIONAL" | "FINANCEIRO" | "ATENDENTE">;

    await prisma.$transaction(async (tx) => {
      // garante PROFISSIONAL + extras (idempotente)
      await tx.membershipTypeLink.createMany({
        data: typesToAdd.map((t) => ({ membershipId, type: t })),
        skipDuplicates: true,
      });

      // services: replace total
      await tx.membershipService.deleteMany({ where: { membershipId } });
      await tx.membershipService.createMany({
        data: serviceIds.map((serviceId) => ({ membershipId, serviceId })),
      });
    });

    const updated = await prisma.membership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
        types: { select: { type: true } },
        services: { select: { serviceId: true } },
      },
    });

    return ok({
      membershipId,
      user: updated?.user,
      role: updated?.role,
      types: updated?.types.map((t) => t.type) ?? [],
      serviceIds: updated?.services.map((s) => s.serviceId) ?? [],
    });
  } catch (e) {
    console.error("[POST /api/team]", e);
    return serverError();
  }
}
