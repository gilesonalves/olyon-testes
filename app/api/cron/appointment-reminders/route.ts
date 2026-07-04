import {
  dispatchPendingAppointmentReminders,
  reconcileAppointmentReminders,
} from "@/lib/appointments/reminders"
import { ok, serverError, unauthorized } from "@/lib/api/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()

  if (!cronSecret) {
    return false
  }

  return req.headers.get("authorization") === `Bearer ${cronSecret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return unauthorized("Cron nao autorizado.")
  }

  try {
    const now = new Date()
    const reconciliation = await reconcileAppointmentReminders({ now })
    const dispatch = await dispatchPendingAppointmentReminders({ now })

    return ok({
      created: reconciliation.created,
      claimed: dispatch.claimed,
      sent: dispatch.sent,
      skipped: reconciliation.skipped + dispatch.skipped,
      failed: dispatch.failed,
    })
  } catch (error) {
    console.error("[GET /api/cron/appointment-reminders]", {
      error: error instanceof Error ? error.message : String(error),
    })
    return serverError("Nao foi possivel processar os lembretes de agendamento.")
  }
}
