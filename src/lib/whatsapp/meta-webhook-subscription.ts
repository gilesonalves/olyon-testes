const DEFAULT_META_GRAPH_API_VERSION = "v25.0"
const META_GRAPH_TIMEOUT_MS = 10_000

export class MetaWebhookSubscriptionError extends Error {
  status: 502

  constructor(message = "Falha ao assinar a WABA nos webhooks da Meta.") {
    super(message)
    this.name = "MetaWebhookSubscriptionError"
    this.status = 502
  }
}

export async function subscribeWabaToApp(params: {
  businessAccountId: string
  accessToken: string
}) {
  const businessAccountId = params.businessAccountId.trim()
  const accessToken = params.accessToken.trim()
  const graphVersion =
    process.env.META_GRAPH_API_VERSION?.trim() ||
    DEFAULT_META_GRAPH_API_VERSION
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), META_GRAPH_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(businessAccountId)}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    )
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error("whatsapp subscribed_apps failed", {
        businessAccountId,
        status: response.status,
        data,
      })

      throw new MetaWebhookSubscriptionError()
    }

    console.info("whatsapp subscribed_apps success", {
      businessAccountId,
    })

    return data as unknown
  } catch (error) {
    if (error instanceof MetaWebhookSubscriptionError) {
      throw error
    }

    console.error("whatsapp subscribed_apps failed", {
      businessAccountId,
      status: null,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "network_error",
    })

    throw new MetaWebhookSubscriptionError()
  } finally {
    clearTimeout(timeoutId)
  }
}
