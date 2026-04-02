import { notFound, ok, serverError } from "@/lib/api/response"
import { getPublicBookingPageDataBySlug } from "@/lib/public-booking"

type Params = {
  params: Promise<{ slug: string }>
}

export async function GET(_: Request, { params }: Params) {
  try {
    const { slug } = await params
    const data = await getPublicBookingPageDataBySlug(slug)

    if (!data) {
      return notFound("Loja nao encontrada.")
    }

    return ok(data)
  } catch (e) {
    console.error("[GET /api/public/agenda/[slug]]", e)
    return serverError()
  }
}
