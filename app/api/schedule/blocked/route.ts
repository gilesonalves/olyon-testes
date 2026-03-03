import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { blockedScheduleCreateSchema } from "@/lib/validators/schedule";

function parseDateKey(dateKey: string) {
  // YYYY-MM-DD -> Date (00:00)
  const [y,m,d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function GET(req: NextRequest) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 });

  const items = await prisma.blockedSchedule.findMany({
    where: { storeId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // devolver no formato da UI (dateKey)
  const data = items.map((i) => ({
    id: i.id,
    date: i.date.toISOString().slice(0, 10),
    allDay: i.allDay,
    startTime: i.startTime ?? undefined,
    endTime: i.endTime ?? undefined,
  }));

  return Response.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 });

  const body = await req.json();
  const parsed = blockedScheduleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const { dates, allDay, startTime, endTime } = parsed.data;

  const created = await prisma.blockedSchedule.createMany({
    data: dates.map((dateKey) => ({
      storeId,
      date: parseDateKey(dateKey),
      allDay,
      startTime: allDay ? null : (startTime ?? null),
      endTime: allDay ? null : (endTime ?? null),
    })),
  });

  return Response.json({ ok: true, data: { created: created.count } }, { status: 201 });
}