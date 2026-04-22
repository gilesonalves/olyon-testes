import {
  AppointmentStatus,
  GlobalRole,
  MembershipRole,
  MembershipType,
  prisma,
  type Weekday,
} from "../src/lib/prisma"
import bcrypt from "bcryptjs"
import {
  addDaysToDateKey,
  combineDateKeyAndTime,
  getBotTimezone,
  getDateKeyInTimeZone,
  getWeekdayFromDateKey,
  parseDateKeyToStoreDate,
} from "../src/lib/bot/datetime"

const STORE_ID = "store-loja-principal"
const STORE_SLUG = "loja-principal"
const OWNER_EMAIL = "admin@olyon.com"
const SUPER_ADMIN_EMAIL = "superadmin@olyon.com"
const STAFF_ANA_EMAIL = "ana.profissional@olyon.com"
const STAFF_BRUNO_EMAIL = "bruno.profissional@olyon.com"
const TEST_SERVICE_NAME = "Corte WhatsApp"
const TEST_SERVICE_DESCRIPTION = "Servico de teste para fluxo de agendamento via WhatsApp"
const TEST_TIMEZONE = getBotTimezone()
const WEEKDAYS: Weekday[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const ENABLED_WEEKDAYS = new Set<Weekday>(["MON", "TUE", "WED", "THU", "FRI"])
const DEFAULT_INTERVALS = [
  { startTime: "09:00", endTime: "12:00" },
  { startTime: "13:00", endTime: "18:00" },
]

async function upsertProfessionalMembership(params: {
  userId: string
  storeId: string
  serviceId: string
}) {
  const membership = await prisma.membership.upsert({
    where: {
      userId_storeId: {
        userId: params.userId,
        storeId: params.storeId,
      },
    },
    update: {
      role: MembershipRole.STAFF,
    },
    create: {
      userId: params.userId,
      storeId: params.storeId,
      role: MembershipRole.STAFF,
    },
  })

  await prisma.membershipTypeLink.upsert({
    where: {
      membershipId_type: {
        membershipId: membership.id,
        type: MembershipType.PROFISSIONAL,
      },
    },
    update: {},
    create: {
      membershipId: membership.id,
      type: MembershipType.PROFISSIONAL,
    },
  })

  await prisma.membershipService.upsert({
    where: {
      membershipId_serviceId: {
        membershipId: membership.id,
        serviceId: params.serviceId,
      },
    },
    update: {},
    create: {
      membershipId: membership.id,
      serviceId: params.serviceId,
    },
  })

  return membership
}

async function resetWeeklySchedule(storeId: string) {
  for (const weekday of WEEKDAYS) {
    const enabled = ENABLED_WEEKDAYS.has(weekday)

    const day = await prisma.weekScheduleDay.upsert({
      where: {
        storeId_weekday: {
          storeId,
          weekday,
        },
      },
      update: {
        enabled,
      },
      create: {
        storeId,
        weekday,
        enabled,
      },
    })

    await prisma.weekScheduleInterval.deleteMany({
      where: {
        dayId: day.id,
      },
    })

    if (enabled) {
      await prisma.weekScheduleInterval.createMany({
        data: DEFAULT_INTERVALS.map((interval) => ({
          dayId: day.id,
          startTime: interval.startTime,
          endTime: interval.endTime,
        })),
      })
    }
  }
}

function getNextBusinessDateKey(baseDate = new Date()) {
  let candidate = addDaysToDateKey(getDateKeyInTimeZone(baseDate, TEST_TIMEZONE), 1)

  while (["SAT", "SUN"].includes(getWeekdayFromDateKey(candidate))) {
    candidate = addDaysToDateKey(candidate, 1)
  }

  return candidate
}

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      name: "Super Admin",
      password: passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
    },
    create: {
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      password: passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      name: "Admin Loja",
      password: passwordHash,
    },
    create: {
      name: "Admin Loja",
      email: OWNER_EMAIL,
      password: passwordHash,
    },
  })

  const store = await prisma.store.upsert({
    where: { id: STORE_ID },
    update: {
      name: "Loja Principal",
      slug: STORE_SLUG,
      active: true,
    },
    create: {
      id: STORE_ID,
      name: "Loja Principal",
      slug: STORE_SLUG,
      active: true,
    },
  })

  await prisma.membership.upsert({
    where: {
      userId_storeId: {
        userId: owner.id,
        storeId: store.id,
      },
    },
    update: {
      role: MembershipRole.OWNER,
    },
    create: {
      userId: owner.id,
      storeId: store.id,
      role: MembershipRole.OWNER,
    },
  })

  const service = await prisma.service.upsert({
    where: {
      storeId_name: {
        storeId: store.id,
        name: TEST_SERVICE_NAME,
      },
    },
    update: {
      description: TEST_SERVICE_DESCRIPTION,
      durationMin: 60,
      active: true,
    },
    create: {
      storeId: store.id,
      name: TEST_SERVICE_NAME,
      description: TEST_SERVICE_DESCRIPTION,
      durationMin: 60,
      active: true,
    },
  })

  const anaUser = await prisma.user.upsert({
    where: { email: STAFF_ANA_EMAIL },
    update: {
      name: "Ana Profissional",
      password: passwordHash,
    },
    create: {
      name: "Ana Profissional",
      email: STAFF_ANA_EMAIL,
      password: passwordHash,
    },
  })

  const brunoUser = await prisma.user.upsert({
    where: { email: STAFF_BRUNO_EMAIL },
    update: {
      name: "Bruno Profissional",
      password: passwordHash,
    },
    create: {
      name: "Bruno Profissional",
      email: STAFF_BRUNO_EMAIL,
      password: passwordHash,
    },
  })

  const anaMembership = await upsertProfessionalMembership({
    userId: anaUser.id,
    storeId: store.id,
    serviceId: service.id,
  })

  const brunoMembership = await upsertProfessionalMembership({
    userId: brunoUser.id,
    storeId: store.id,
    serviceId: service.id,
  })

  await resetWeeklySchedule(store.id)

  const nextBusinessDateKey = getNextBusinessDateKey()
  const nextBusinessDate = parseDateKeyToStoreDate(nextBusinessDateKey)

  await prisma.blockedSchedule.deleteMany({
    where: {
      storeId: store.id,
      date: nextBusinessDate,
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
    },
  })

  await prisma.blockedSchedule.create({
    data: {
      storeId: store.id,
      date: nextBusinessDate,
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
    },
  })

  await prisma.appointment.deleteMany({
    where: {
      storeId: store.id,
      externalRef: {
        in: [
          "seed:wamid.TESTE-001",
          "seed:whatsapp-busy-ana",
        ],
      },
    },
  })

  const busyStartAt = combineDateKeyAndTime(nextBusinessDateKey, "09:00", TEST_TIMEZONE)
  const busyEndAt = combineDateKeyAndTime(nextBusinessDateKey, "10:00", TEST_TIMEZONE)

  await prisma.appointment.create({
    data: {
      storeId: store.id,
      status: AppointmentStatus.SCHEDULED,
      serviceId: service.id,
      staffMembershipId: anaMembership.id,
      customerName: "Cliente Seed Ana",
      customerPhone: "+5511999990001",
      startAt: busyStartAt,
      endAt: busyEndAt,
      source: "WHATSAPP",
      externalRef: "seed:whatsapp-busy-ana",
      metadata: {
        source: "seed",
        scenario: "busy-slot-for-ana",
      },
    },
  })

  console.log("Seed concluido.")
  console.log(`Loja: ${store.name} (${store.id})`)
  console.log(`Servico de teste: ${service.name} (${service.durationMin} min)`)
  console.log(
    `Profissionais elegiveis: ${anaUser.name} (${anaMembership.id}) e ${brunoUser.name} (${brunoMembership.id})`
  )
  console.log(`Agenda semanal: segunda a sexta, 09:00-12:00 e 13:00-18:00 (${TEST_TIMEZONE})`)
  console.log(`Bloqueio criado em ${nextBusinessDateKey}, 10:00-11:00`)
  console.log(`Agendamento existente para Ana em ${nextBusinessDateKey}, 09:00-10:00`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
