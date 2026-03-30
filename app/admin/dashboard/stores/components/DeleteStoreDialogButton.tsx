"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const PAGE_SIZE = 10

export type AdminStoreListItem = {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
}

export function StoresTable({ stores }: { stores: AdminStoreListItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleStores = stores.slice(0, visibleCount)
  const hasMoreItems = visibleStores.length < stores.length

  return (
    <>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Criada em</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleStores.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.slug}</td>
                <td className="p-3">{s.active ? "Ativa" : "Inativa"}</td>
                <td className="p-3">{new Date(s.createdAt).toLocaleString("pt-BR")}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <a
                      href={`/admin/dashboard/stores/${s.id}`}
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs"
                    >
                      Detalhes
                    </a>
                    <DeleteStoreDialogButton storeId={s.id} storeName={s.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMoreItems ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </>
  )
}

export function DeleteStoreDialogButton({
  storeId,
  storeName,
}: {
  storeId: string
  storeName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)

  const canDelete = confirmText === storeName

  async function onDelete() {
    if (!canDelete) {
      toast.error("Digite exatamente o nome da loja para confirmar.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, { method: "DELETE" })
      const json = (await res.json()) as { ok: boolean; message?: string }

      if (!res.ok || !json.ok) {
        toast.error(json.message ?? "Erro ao excluir loja")
        return
      }

      toast.success("Loja excluída")
      setOpen(false)
      setConfirmText("")
      router.refresh()
    } catch {
      toast.error("Erro ao excluir loja")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) setConfirmText("")
    }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Excluir
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir loja (hard delete)</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p className="text-red-600">
            Atenção: isso apagará a loja e TODOS os dados relacionados.
          </p>
          <p>
            Digite o nome da loja para confirmar: <b>{storeName}</b>
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={storeName}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={!canDelete || loading}
          >
            {loading ? "Excluindo..." : "Confirmar exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}