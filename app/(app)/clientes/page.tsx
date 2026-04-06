"use client"

import HeaderPage from "@/components/headerPage"
import ListPageSkeleton from "@/components/loading/list-page-skeleton"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatPhone } from "@/lib/utils/maskPhone"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type Role = "OWNER" | "ADMIN" | "STAFF"

type ClientRow = {
  id: string
  name: string
  email: string | null
  cpf: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
}

const PAGE_SIZE = 10

export default function ClientesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const myRole = session?.user?.role as Role | undefined
  const canManage = myRole === "OWNER" || myRole === "ADMIN"

  const [items, setItems] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMoreItems = visibleItems.length < items.length
  const showInitialSkeleton = loading && items.length === 0

  async function loadClients() {
    try {
      setLoading(true)
      const response = await fetch("/api/clients")
      const json = await response.json()

      if (!response.ok || !json?.ok) {
        toast.error(json?.error ?? "Falha ao carregar clientes.")
        setItems([])
        return
      }

      setItems(json.data ?? [])
    } catch {
      toast.error("Erro ao carregar clientes.")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClients()
  }, [])

  async function removeClient(clientId: string) {
    try {
      setRemovingId(clientId)
      const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" })
      const json = await response.json()

      if (!response.ok || !json?.ok) {
        toast.error(json?.error ?? "Falha ao remover cliente.")
        return
      }

      toast.success("Cliente removido com sucesso!")
      await loadClients()
    } catch {
      toast.error("Erro ao remover cliente.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Clientes</span>

          {canManage ? (
            <Link className="btn-segundary" href="/clientes/novo">
              Novo cliente
            </Link>
          ) : null}
        </div>
      </HeaderPage>

      {showInitialSkeleton ? (
        <ListPageSkeleton message="Carregando clientes..." showAction={canManage} />
      ) : (
        <div className="bg-white px-6 py-7">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
              <p className="text-base font-medium text-slate-900">Nenhum cliente cadastrado nesta loja</p>
              <p className="mt-2 text-sm text-slate-500">
                {canManage
                  ? "Use o botão acima para criar o primeiro cliente e começar a organizar o histórico da operação."
                  : "Ainda não existem clientes cadastrados para a loja selecionada."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleItems.map((client) => {
                  const rowClickable = canManage
                  const formattedPhone = formatPhone(client.phone)

                  return (
                    <div
                      key={client.id}
                      className={`flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                        rowClickable ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => {
                        if (!rowClickable) return
                        router.push(`/clientes/${client.id}`)
                      }}
                      role={rowClickable ? "button" : undefined}
                      tabIndex={rowClickable ? 0 : -1}
                      onKeyDown={(event) => {
                        if (!rowClickable) return
                        if (event.key === "Enter") {
                          router.push(`/clientes/${client.id}`)
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">{client.name}</p>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              client.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {client.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {client.email || "Sem email"}
                          {formattedPhone ? ` • ${formattedPhone}` : ""}
                          {client.cpf ? ` • CPF ${client.cpf}` : ""}
                        </p>
                      </div>

                      {canManage ? (
                        <div
                          className="flex items-center gap-2 sm:justify-end"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Link href={`/clientes/${client.id}`}>
                            <Button type="button" variant="outline">
                              Editar
                            </Button>
                          </Link>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={removingId === client.id}
                              >
                                {removingId === client.id ? "Removendo..." : "Remover"}
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação exclui o cadastro do cliente desta loja. Use apenas quando tiver certeza de que o registro não deve permanecer no histórico operacional.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeClient(client.id)}>
                                  Confirmar remoção
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {hasMoreItems ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                  >
                    Carregar mais
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </>
  )
}