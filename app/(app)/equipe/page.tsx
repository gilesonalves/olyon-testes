"use client"

import { useEffect, useMemo, useState } from "react"
import HeaderPage from "@/components/headerPage"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type TeamRow = {
  membershipId: string
  userId: string
  name: string
  email: string
  role: "OWNER" | "ADMIN" | "STAFF"
  types: Array<"PROFISSIONAL" | "FINANCEIRO" | "ATENDENTE">
  serviceIds: string[]
  services: Array<{
    id: string
    name: string
    durationMin: number
    active: boolean
  }>
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

const PAGE_SIZE = 10

export default function Equipe() {
  const router = useRouter()
  const [items, setItems] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMoreItems = visibleItems.length < items.length

  async function load() {
    try {
      setLoading(true)
      const res = await fetch("/api/team", { cache: "no-store" })
      const json = (await res.json()) as ApiResponse<TeamRow[]>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao carregar equipe." : json.error)
        setItems([])
        return
      }

      setItems(json.data ?? [])
    } catch {
      toast.error("Erro ao carregar equipe.")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function removeFromTeam(membershipId: string) {
    try {
      setRemovingId(membershipId)
      const res = await fetch(`/api/team/${membershipId}`, { method: "DELETE" })
      const json = (await res.json()) as ApiResponse<{ id: string }>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao remover da equipe." : json.error)
        return
      }

      toast.success("Profissional removido da equipe.")
      await load()
    } catch {
      toast.error("Erro ao remover da equipe.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Equipe</span>
          <Link href="/equipe/novo" className="btn-segundary">
            Novo
          </Link>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        {loading ? (
          <div>Carregando...</div>
        ) : items.length === 0 ? (
          <div>Nenhum profissional cadastrado na equipe.</div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleItems.map((m) => (
                <div
                  key={m.membershipId}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {m.email} • {m.role} •{" "}
                      {m.services?.length ? `${m.services.length} serviço(s)` : "sem serviços"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-segundary"
                        onClick={() => router.push(`/equipe/${m.membershipId}`)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="btn-delete"
                        disabled={removingId === m.membershipId}
                        onClick={() => removeFromTeam(m.membershipId)}
                      >
                        {removingId === m.membershipId ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMoreItems ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="btn-segundary"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Carregar mais
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}