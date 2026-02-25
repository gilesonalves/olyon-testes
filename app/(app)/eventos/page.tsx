"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Controller as RHFController } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import { Controller } from "./controllers"
import Servicos from "./components/servicos"

type EventItem = {
  id: string
  name: string
  description?: string | null
  active: boolean
}

export default function EventosPage() {
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/events", { method: "GET" })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Erro ao carregar eventos")
        setItems([])
        return
      }
console.log("[events] first item from API:", json?.data?.[0])
      setItems((json.data ?? []) as EventItem[])
    } catch {
      toast.error("Erro ao carregar eventos")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { form, onSubmit } = Controller({
    onCreated: async () => {
      setDialogOpen(false)
      await load()
    },
  })

  const empty = useMemo(() => !loading && items.length === 0, [loading, items.length])

  async function toggleActive(id: string, next: boolean) {
    if (!id) {
      toast.error("Evento inválido (sem id). Recarregue a página.")
      return
    }

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Erro ao atualizar evento")
        return
      }

      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, active: next } : it)))
      toast.success("Evento atualizado")
    } catch {
      toast.error("Erro ao atualizar evento")
    }
  }

  async function removeEvent(id: string) {
    if (!id) {
      toast.error("Evento inválido (sem id). Recarregue a página.")
      return
    }

    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Erro ao remover evento")
        return
      }

      setItems((prev) => prev.filter((it) => it.id !== id))
      toast.success("Evento removido")
    } catch {
      toast.error("Erro ao remover evento")
    }
  }



  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold">Tipos de Eventos</span>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogTrigger asChild>
                <Button variant="primary">Novo item</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-106.25">
                <DialogHeader className="pb-4">
                  <DialogTitle>Novo tipo de evento</DialogTitle>
                </DialogHeader>

                <FieldGroup>
                  <RHFController
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="name">Nome</FieldLabel>
                        <Input
                          {...field}
                          id="name"
                          type="text"
                          aria-invalid={fieldState.invalid}
                          placeholder="Digite aqui o nome do evento"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <RHFController
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="description">Descrição</FieldLabel>
                        <Textarea
                          {...field}
                          id="description"
                          aria-invalid={fieldState.invalid}
                          placeholder="Digite aqui a descrição do evento"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>

                <div>
                  <RHFController
                    name="serviceIds"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Serviços</FieldLabel>

                        <Servicos
                          title="Serviços"
                          value={field.value ?? []}
                          onChange={field.onChange}
                        />

                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>


                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      onClick={form.handleSubmit(
                        (data) => {
                          console.log("[events] submit OK", data)
                          return onSubmit(data)
                        },
                        (errors) => {
                          console.log("[events] submit INVALID", errors)
                          toast.error("Form inválido — verifique os campos")
                        }
                      )}
                    >
                      Salvar
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {empty && (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Nenhum evento cadastrado ainda.
          </div>
        )}

        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{it.name}</p>
                {it.description ? (
                  <p className="text-xs text-muted-foreground">{it.description}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="flex items-center space-x-2">

                  <Switch
                    id={`event-active-${it.id}`}
                    checked={it.active}
                    onCheckedChange={(next) => toggleActive(it.id, next)}
                  />
                  <Label htmlFor={`event-active-${it.id}`}>Habilitar</Label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="cursor-pointer"
                    onClick={() => removeEvent(it.id)}
                    aria-label="Remover"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}