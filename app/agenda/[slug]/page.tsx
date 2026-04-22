import { notFound } from "next/navigation"
import { getPublicBookingPageDataBySlug } from "@/lib/public-booking"
import PublicBookingPage from "./public-booking-page"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function AgendaPublicaPage({ params }: Props) {
  const { slug } = await params
  const data = await getPublicBookingPageDataBySlug(slug)

  if (!data) {
    notFound()
  }

  return <PublicBookingPage data={data} />
}
