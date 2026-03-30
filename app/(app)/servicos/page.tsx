"use client"

import { useMemo, useState } from "react"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Controller as ControllerForm, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type Resolver } from "react-hook-form"
import { Controller } from "./controllers"
import NovoServicos from "./components/novoServicos"
import { formSchema, type FormValues } from "./schemas"

type Service = {
  id: string
  name: string
  description: string | null
  durationMin: number
  active: boolean
  createdAt: string
  updatedAt: string
}

const PAGE_SIZE = 10

export default function Servicos() {
  const { form, onSubmit, state, updateService, deleteService } = Controller()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Service | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>, // mantém compatível com seu setup atual
    defaultValues: {
      name: "",
      durationMin: 30,
      description: null,
    },
  })

  const openEdit = (s: Service) => {
    setSelected(s)
    editForm.reset({
      name: s.name,
      durationMin: s.durationMin,
      description: s.description ?? null,
    })
    setEditOpen(true)
  }

  const openDelete = (s: Service) => {
    setSelected(s)
    setDeleteOpen(true)
  }

  const handleEditSubmit = async (data: FormValues) => {
    if (!selected) return
    const ok = await updateService(selected.id, {
      name: data.name,
      durationMin: Number(data.durationMin),
      description: data.description ?? null,
    })
    if (ok) setEditOpen(false)
  }

  const handleDeleteConfirm = async () => {
    if (!selected) return
    const ok = await deleteService(selected.id)
    if (ok) setDeleteOpen(false)
  }

  const selectedName = useMemo(() => selected?.name ?? "este serviço", [selected])
  const visibleServices = useMemo(() => state.services.slice(0, visibleCount), [state.services, visibleCount])
  const hasMoreItems = visibleServices.length < state.services.length

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold">Serviços</span>

          {/* CREATE */}
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="primary">
                Novo item
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-106.25">
              <DialogHeader className="pb-4">
                <DialogTitle>Novo serviço</DialogTitle>
                <DialogDescription>
                  Cadastre um serviço informando nome e duração.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FieldGroup>
                  <ControllerForm
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
                          placeholder="Digite aqui o nome do serviço"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </FieldGroup>

                <ControllerForm
                  name="durationMin"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <NovoServicos
                      title="Duração"
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Fechar
                    </Button>
                  </DialogClose>

                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </HeaderPage>

      {/* LIST */}
      <div className="bg-white px-6 py-7">
        <div className="space-y-3">
          {state.loading ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              Carregando serviços...
            </div>
          ) : state.services.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
              Nenhum serviço cadastrado ainda.
            </div>
          ) : (
            <>
              {visibleServices.map((s: Service) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-600">{s.durationMin} min</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => openEdit(s)}>
                      Editar
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => openDelete(s)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}

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
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader className="pb-4">
            <DialogTitle>Editar serviço</DialogTitle>
            <DialogDescription>Atualize as informações do serviço.</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <FieldGroup>
              <ControllerForm
                name="name"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-name">Nome</FieldLabel>
                    <Input {...field} id="edit-name" type="text" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <ControllerForm
              name="durationMin"
              control={editForm.control}
              render={({ field, fieldState }) => (
                <NovoServicos
                  title="Duração"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader className="pb-2">
            <DialogTitle>Excluir serviço</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <b>{selectedName}</b>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
