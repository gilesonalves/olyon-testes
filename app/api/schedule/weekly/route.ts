import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { weekScheduleSchema } from "@/lib/validators/schedule";

const weekdays = ["SUN","MON","TUE","WED","THU","FRI","SAT"] as const;

export async function GET(req: NextRequest) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 });

  // garante 7 dias (upsert)
  await prisma.$transaction(
    weekdays.map((weekday) =>
      prisma.weekScheduleDay.upsert({
        where: { storeId_weekday: { storeId, weekday } },
        update: {},
        create: { storeId, weekday, enabled: false },
      })
    )
  );

  const days = await prisma.weekScheduleDay.findMany({
    where: { storeId },
    include: { intervals: { orderBy: { startTime: "asc" } } },
    orderBy: { weekday: "asc" },
  });

  const data = days.map((d) => ({
    weekday: d.weekday,
    enabled: d.enabled,
    intervals: d.intervals.map((i) => ({ startTime: i.startTime, endTime: i.endTime })),
  }));

  return Response.json({ ok: true, data: { days: data } });
}

export async function PUT(req: NextRequest) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) return Response.json({ ok: false, message: "Missing x-store-id" }, { status: 400 });

  const body = await req.json();
  const parsed = weekScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const { days } = parsed.data;

  await prisma.$transaction(async (tx) => {
    for (const day of days) {
      const dayRow = await tx.weekScheduleDay.upsert({
        where: { storeId_weekday: { storeId, weekday: day.weekday } },
        update: { enabled: day.enabled },
        create: { storeId, weekday: day.weekday, enabled: day.enabled },
      });

      // substitui intervalos
      await tx.weekScheduleInterval.deleteMany({ where: { dayId: dayRow.id } });

      if (day.enabled && day.intervals.length) {
        await tx.weekScheduleInterval.createMany({
          data: day.intervals.map((i) => ({
            dayId: dayRow.id,
            startTime: i.startTime,
            endTime: i.endTime,
          })),
        });
      }
    }
  });

  return Response.json({ ok: true });
}