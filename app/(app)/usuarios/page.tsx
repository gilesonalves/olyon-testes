"use client"

import HeaderPage from "@/components/headerPage"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import ListPageSkeleton from "@/components/loading/list-page-skeleton"

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

type Role = "OWNER" | "ADMIN" | "STAFF"

type UserRow = {
  id: string
  name: string
  email: string
  role: Role
}

const PAGE_SIZE = 10

export default function UsuariosPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const myId = session?.user?.id as string | undefined
  const myRole = session?.user?.role as Role | undefined
  const canManage = myRole === "OWNER" || myRole === "ADMIN"

  const [items, setItems] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMoreItems = visibleItems.length < items.length
  const showInitialSkeleton = loading && items.length === 0

  async function loadUsers() {
    try {
      setLoading(true)
      const res = await fetch("/api/users")
      const json = await res.json()

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Falha ao carregar usuários.")
        setItems([])
        return
      }

      setItems(json.data ?? [])
    } catch {
      toast.error("Erro ao carregar usuários.")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function removeUser(userId: string) {
    try {
      setRemovingId(userId)
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      const json = await res.json()

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Falha ao remover usuário.")
        return
      }

      toast.success("Usuário removido da loja!")
      await loadUsers()
    } catch {
      toast.error("Erro ao remover usuário.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Usuários</span>

          {canManage && (
            <Link className="btn-segundary" href="/usuarios/novo">
              Novo usuário
            </Link>
          )}
        </div>
      </HeaderPage>

      {showInitialSkeleton ? (
        <ListPageSkeleton message="Carregando usuários..." showAction={canManage} />
      ) : (
      <div className="bg-white px-6 py-7">
        {items.length === 0 ? (
          <div>Nenhum usuário nesta loja.</div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleItems.map((u) => {
                const isMe = myId && u.id === myId
                const rowClickable = canManage // staff só vê

                return (
                  <div
                    key={u.id}
                    className={`flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      rowClickable ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => {
                      if (!rowClickable) return
                      router.push(`/usuarios/${u.id}`)
                    }}
                    role={rowClickable ? "button" : undefined}
                    tabIndex={rowClickable ? 0 : -1}
                    onKeyDown={(e) => {
                      if (!rowClickable) return
                      if (e.key === "Enter") router.push(`/usuarios/${u.id}`)
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.name} {isMe ? "(você)" : ""}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {u.email} • {u.role}
                      </p>
                    </div>

                    {canManage && (
                      <div
                        className="flex items-center gap-2 sm:justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/usuarios/${u.id}`}>
                          <Button type="button" variant="outline">
                            Editar
                          </Button>
                        </Link>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={isMe || removingId === u.id}
                            >
                              {isMe
                                ? "Remover (bloqueado)"
                                : removingId === u.id
                                ? "Removendo..."
                                : "Remover"}
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover usuário da loja?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esse usuário perderá acesso a esta loja. Você pode adicioná-lo novamente depois.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeUser(u.id)}>
                                Confirmar remoção
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {hasMoreItems ? (
              <div className="mt-4 flex justify-center">
                <Button type="button" variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
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