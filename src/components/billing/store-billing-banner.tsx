"use client"

import Link from "next/link"
import type { StoreBillingSnapshot } from "@/lib/billing/store-billing"

export function StoreBillingBanner({
  billing,
}: {
  billing: StoreBillingSnapshot
}) {
  if (billing.operationalStatus === "SUSPENDED") {
    return (
      <div className="border-b border-red-300 bg-red-50 px-6 py-3 text-sm text-red-900">
        <span className="font-medium">
          Sua loja está suspensa. Entre em contato com o suporte para reativar.
        </span>{" "}
        <Link href="/financeiro" className="underline underline-offset-2">
          Ver minha assinatura
        </Link>
      </div>
    )
  }

  if (billing.status === "PENDING" || billing.status === "OVERDUE") {
    return (
      <div className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-sm text-amber-900">
        Sua assinatura está pendente. Regularize para evitar suspensão.{" "}
        <Link href="/financeiro" className="font-medium underline underline-offset-2">
          Ver detalhes
        </Link>
      </div>
    )
  }

  return null
}
