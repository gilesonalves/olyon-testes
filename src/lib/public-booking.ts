import { prisma, type Prisma } from "@/lib/prisma"
import { getBotTimezone, getDateKeyInTimeZone } from "@/lib/bot/datetime"

export type PublicStoreSummary = {
  id: string
  slug: string
  name: string
  phone: string | null
  whatsappPhone: string | null
  address: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipcode: string | null
  serviceObservations: string | null
  businessHoursSummary: string | null
}

export type PublicServiceSummary = {
  id: string
  name: string
  description: string | null
  durationMin: number
}

export type PublicProfessionalSummary = {
  membershipId: string
  name: string
  serviceIds: string[]
}

export type PublicBookingPageData = {
  store: PublicStoreSummary
  services: PublicServiceSummary[]
  professionals: PublicProfessionalSummary[]
  timeZone: string
  todayDate: string
}

export const publicStoreSummarySelect = {
  id: true,
  slug: true,
  name: true,
  phone: true,
  whatsappPhone: true,
  address: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
  zipcode: true,
  serviceObservations: true,
  businessHoursSummary: true,
} satisfies Prisma.StoreSelect

export async function findActiveStoreBySlug(slug: string) {
  return prisma.store.findFirst({
    where: {
      slug,
      active: true,
      OR: [
        { billing: { is: null } },
        { billing: { operationalStatus: "ACTIVE" } },
      ],
    },
    select: publicStoreSummarySelect,
  })
}

export async function getPublicBookingPageDataBySlug(
  slug: string
): Promise<PublicBookingPageData | null> {
  const store = await findActiveStoreBySlug(slug)

  if (!store) {
    return null
  }

  const publicStore: PublicStoreSummary = {
    id: store.id,
    slug: store.slug,
    name: store.name,
    phone: store.phone,
    whatsappPhone: store.whatsappPhone,
    address: store.address,
    complement: store.complement,
    neighborhood: store.neighborhood,
    city: store.city,
    state: store.state,
    zipcode: store.zipcode,
    serviceObservations: store.serviceObservations,
    businessHoursSummary: store.businessHoursSummary,
  }

  const [services, professionals] = await prisma.$transaction([
    prisma.service.findMany({
      where: {
        storeId: store.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.membership.findMany({
      where: {
        storeId: store.id,
        types: { some: { type: "PROFISSIONAL" } },
        services: {
          some: {
            service: {
              active: true,
            },
          },
        },
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
        services: {
          where: {
            service: {
              active: true,
            },
          },
          select: {
            serviceId: true,
          },
        },
      },
    }),
  ])

  const timeZone = getBotTimezone()

  return {
    store: publicStore,
    services,
    professionals: professionals
      .map((professional) => ({
        membershipId: professional.id,
        name: professional.user.name,
        serviceIds: professional.services.map((service) => service.serviceId),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    timeZone,
    todayDate: getDateKeyInTimeZone(new Date(), timeZone),
  }
}
