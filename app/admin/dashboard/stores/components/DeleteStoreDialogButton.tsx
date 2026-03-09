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