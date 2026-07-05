"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Copy, ExternalLink, Globe, Settings2 } from "lucide-react"
import { toast } from "sonner"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"

type StorePublicInfo = {
  id: string
  name: string
  slug: string
}

type CurrentStorePayload = {
  store: StorePublicInfo | null
  membership: { id: string; role: string } | null
  source: "admin_session" | "nextauth"
  publicAgendaUrl: string | null
  publicInfoSource: "STORE"
  storeSettingsUrl: string
}

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  message?: string
}

function getAbsoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  if (typeof window === "undefined") {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

export default function AgendaOnlinePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [store, setStore] = useState<StorePublicInfo | null>(null)
  const [publicAgendaUrl, setPublicAgendaUrl] = useState<string | null>(null)
  const [storeSettingsUrl, setStoreSettingsUrl] = useState("/configuracoes/loja")

  const publicAgendaHref = useMemo(() => {
    if (publicAgendaUrl) {
      return publicAgendaUrl
    }

    if (!store) {
      return null
    }

    return `/agenda/${store.slug}`
  }, [publicAgendaUrl, store])

  useEffect(() => {
    let alive = true

    async function loadCurrentStore() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/store/current", { cache: "no-store" })
        const json = (await response.json().catch(() => null)) as
          | ApiSuccess<CurrentStorePayload>
          | ApiError
          | null

        if (!response.ok || !json?.ok) {
          throw new Error(
            json && !json.ok
              ? (json.message ?? "Não foi possível carregar o painel da agenda online.")
              : "Não foi possível carregar o painel da agenda online."
          )
        }

        if (!alive) {
          return
        }

        setStore(json.data.store)
        setPublicAgendaUrl(json.data.publicAgendaUrl)
        setStoreSettingsUrl(json.data.storeSettingsUrl)
      } catch (loadError) {
        if (!alive) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar o painel da agenda online."
        )
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    void loadCurrentStore()

    return () => {
      alive = false
    }
  }, [])

  async function handleCopyLink() {
    if (!publicAgendaHref) {
      toast.error("Nenhum link público disponível para copiar.")
      return
    }

    try {
      await navigator.clipboard.writeText(getAbsoluteUrl(publicAgendaHref))
      toast.success("Link público copiado com sucesso.")
    } catch {
      toast.error("Não foi possível copiar o link público.")
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="font-normal text-foreground">Agenda online</span>
        </div>
      </HeaderPage>

      <div className="w-full max-w-5xl bg-white px-4 py-6 sm:px-6 sm:py-7">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] px-5 py-10 text-center text-sm text-slate-600">
            Carregando painel da agenda online...
          </div>
        ) : !store ? (
          <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/80 px-5 py-10 text-center text-sm text-amber-800">
            {error ??
              "Nenhuma loja selecionada. Escolha uma loja para acessar o link público."}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_38%,#eef6ff_100%)] p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <Globe className="size-3.5" />
                    Painel do link público
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {store.name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {publicAgendaHref ?? `/agenda/${store.slug}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={handleCopyLink}>
                    <Copy className="size-4" />
                    Copiar link
                  </Button>
                  <Button asChild>
                    <Link href={publicAgendaHref ?? `/agenda/${store.slug}`} target="_blank">
                      <ExternalLink className="size-4" />
                      Abrir agenda online
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Como este canal funciona
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">
                    Este link usa os dados públicos cadastrados na loja.
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    Telefone, endereço e informações institucionais são editados na
                    configuração da loja.
                  </p>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      Slug público
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{store.slug}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button asChild variant="outline">
                    <Link href="/horarios-de-atendimento">
                      Gerenciar horários de atendimento
                    </Link>
                  </Button>

                  <Button asChild variant="outline">
                    <Link href={storeSettingsUrl}>
                      <Settings2 className="size-4" />
                      Ir para configurações da loja
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  )
}
