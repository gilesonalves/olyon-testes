"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Controller as ControllerForm, useForm } from "react-hook-form"
import { toast } from "sonner"

import HeaderPage from "@/components/headerPage"
import { GENDERS } from "@/constants/genders"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { maskCPF } from "@/lib/utils/maskCpf"
import { maskPhone } from "@/lib/utils/maskPhone"

import { clientFormSchema, type ClientFormValues } from "../schemas"

type ClientFormProps = {
  mode: "create" | "edit"
  clientId?: string
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

type ClientData = {
  id: string
  name: string
  email: string | null
  cpf: string | null
  phone: string | null
  secondaryPhone: string | null
  gender: { _id: string; value: string } | null
  birthDate: string | null
  notes: string | null
  isActive: boolean
}

export function ClientForm({ mode, clientId }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(mode === "edit" && !!clientId)
  const [submitting, setSubmitting] = useState(false)

  const defaultValues = useMemo<ClientFormValues>(
    () => ({
      name: "",
      email: "",
      cpf: "",
      phone: "",
      secondaryPhone: "",
      gender: null,
      birthDate: "",
      notes: "",
      isActive: true,
    }),
    []
  )

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (mode !== "edit" || !clientId) {
      setLoading(false)
      form.reset(defaultValues)
      return
    }

    let cancelled = false

    async function loadClient() {
      setLoading(true)

      try {
        const response = await fetch(`/api/clients/${clientId}`, { cache: "no-store" })
        const json = (await response.json()) as ApiResponse<ClientData>

        if (!response.ok || !json.ok) {
          toast.error(json.ok ? "Falha ao carregar cliente." : json.error)
          return
        }

        if (cancelled) {
          return
        }

        form.reset({
          name: json.data.name ?? "",
          email: json.data.email ?? "",
          cpf: json.data.cpf ? maskCPF(json.data.cpf) : "",
          phone: json.data.phone ? maskPhone(json.data.phone) : "",
          secondaryPhone: json.data.secondaryPhone
            ? maskPhone(json.data.secondaryPhone)
            : "",
          gender: json.data.gender ?? null,
          birthDate: json.data.birthDate ?? "",
          notes: json.data.notes ?? "",
          isActive: json.data.isActive,
        })
      } catch {
        toast.error("Erro ao carregar cliente.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadClient()

    return () => {
      cancelled = true
    }
  }, [clientId, defaultValues, form, mode])

  async function onSubmit(values: ClientFormValues) {
    try {
      setSubmitting(true)

      const payload = {
        name: values.name,
        email: values.email || undefined,
        cpf: values.cpf || undefined,
        phone: values.phone || undefined,
        secondaryPhone: values.secondaryPhone || undefined,
        gender: values.gender ?? undefined,
        birthDate: values.birthDate || undefined,
        notes: values.notes || undefined,
        isActive: values.isActive,
      }

      const response = await fetch(mode === "create" ? "/api/clients" : `/api/clients/${clientId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const json = (await response.json()) as ApiResponse<ClientData>

      if (!response.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao salvar cliente." : json.error)
        return
      }

      toast.success(
        mode === "create" ? "Cliente criado com sucesso!" : "Cliente atualizado!"
      )

      router.push("/clientes")
      router.refresh()
    } catch {
      toast.error("Erro ao salvar cliente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <HeaderPage>
          <div className="flex items-center justify-between">
            <span className="text-foreground font-normal">
              {mode === "create" ? "Novo cliente" : "Editar cliente"}
            </span>
          </div>
        </HeaderPage>
        <div className="bg-white px-6 py-7">Carregando cliente...</div>
      </>
    )
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">
            {mode === "create" ? "Novo cliente" : "Editar cliente"}
          </span>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        <form className="flex w-full flex-col gap-7" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ControllerForm
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-name">Nome</FieldLabel>
                  <Input id="client-name" {...field} value={field.value ?? ""} />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <ControllerForm
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-email">Email</FieldLabel>
                  <Input id="client-email" type="email" {...field} value={field.value ?? ""} />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <ControllerForm
              name="cpf"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-cpf">CPF</FieldLabel>
                  <Input
                    id="client-cpf"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(maskCPF(event.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="000.000.000-00"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <ControllerForm
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-phone">Whatsapp</FieldLabel>
                  <Input
                    id="client-phone"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(maskPhone(event.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="(xx) xxxxx-xxxx"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <ControllerForm
              name="secondaryPhone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-secondary-phone">Telefone secundário</FieldLabel>
                  <Input
                    id="client-secondary-phone"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(maskPhone(event.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="(xx) xxxxx-xxxx"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <ControllerForm
              name="birthDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-birth-date">Data de nascimento</FieldLabel>
                  <Input id="client-birth-date" type="date" {...field} value={field.value ?? ""} />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
            <ControllerForm
              name="gender"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Gênero</FieldLabel>
                  <Select
                    value={field.value?._id ?? "__none__"}
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? null : GENDERS.find((item) => item._id === value) ?? null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não informar</SelectItem>
                      {GENDERS.map((gender) => (
                        <SelectItem key={gender._id} value={gender._id}>
                          {gender.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <ControllerForm
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <div className="flex h-full items-end">
                  <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <Label htmlFor="client-active">Cliente ativo</Label>
                      <p className="mt-1 text-xs text-slate-500">
                        Clientes inativos continuam no histórico, mas ficam sinalizados na listagem.
                      </p>
                    </div>
                    <Switch
                      id="client-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                </div>
              )}
            />
          </FieldGroup>

          <ControllerForm
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="client-notes">Observações</FieldLabel>
                <Textarea
                  id="client-notes"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="Anote preferências, restrições ou contexto útil para o atendimento."
                />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/clientes")}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting
                ? mode === "create"
                  ? "Criando..."
                  : "Salvando..."
                : mode === "create"
                  ? "Criar cliente"
                  : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
