import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { blockedScheduleUpdateSchema } from "@/lib/validators/schedule";

function parseDateKey(dateKey: string) {
  const [y,m,d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 });

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = blockedScheduleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const exists = await prisma.blockedSchedule.findFirst({ where: { id, storeId } });
  if (!exists) return Response.json({ ok: false, message: "Bloqueio não encontrado" }, { status: 404 });

  const { date, allDay, startTime, endTime } = parsed.data;

  const updated = await prisma.blockedSchedule.update({
    where: { id },
    data: {
      date: parseDateKey(date),
      allDay,
      startTime: allDay ? null : (startTime ?? null),
      endTime: allDay ? null : (endTime ?? null),
    },
  });

  return Response.json({
    ok: true,
    data: {
      id: updated.id,
      date: updated.date.toISOString().slice(0, 10),
      allDay: updated.allDay,
      startTime: updated.startTime ?? undefined,
      endTime: updated.endTime ?? undefined,
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const storeId = _req.headers.get("x-store-id");
  if (!storeId) return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 });

  const { id } = await ctx.params;
  const exists = await prisma.blockedSchedule.findFirst({ where: { id, storeId } });
  if (!exists) return Response.json({ ok: false, message: "Bloqueio não encontrado" }, { status: 404 });

  await prisma.blockedSchedule.delete({ where: { id } });
  return Response.json({ ok: true, data: { id } });
}