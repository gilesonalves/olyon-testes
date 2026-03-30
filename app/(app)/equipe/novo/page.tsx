"use client"

import { useEffect, useState } from "react"
import { Controller } from "react-hook-form"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Controllers from "../controllers/page"
import { ServicesCheckboxGroup } from "../components/services-checkbox-group"
import { toast } from "sonner"

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

type UserRow = {
  id: string
  name: string
  email: string
  role: "OWNER" | "ADMIN" | "STAFF"
}

export default function ItemNovo() {
  const { form, onSubmit } = Controllers()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  async function loadUsers() {
    try {
      setLoadingUsers(true)
      const res = await fetch("/api/users", { cache: "no-store" })
      const json = (await res.json()) as ApiResponse<UserRow[]>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao carregar usuários." : json.error)
        setUsers([])
        return
      }

      // equipe: normalmente faz sentido filtrar STAFF/ADMIN (e excluir OWNER se quiser)
      const list = (json.data ?? []).filter((u) => u.role !== "OWNER")
      setUsers(list)
    } catch {
      toast.error("Erro ao carregar usuários.")
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Novo profissional da equipe</span>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col gap-7">
        {/* Selecionar usuário existente */}
        <FieldGroup>
          <Controller
            name="userId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Usuário</FieldLabel>

                <Select
                  value={(field.value as string) ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingUsers ? "Carregando usuários..." : "Selecione um usuário"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} • {u.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {/* Serviços executados */}
        <FieldGroup>
          <Controller
            name="serviceIds"
            control={form.control}
            render={({ field }) => (
              <ServicesCheckboxGroup
                value={(field.value as string[]) ?? []}
                onChange={field.onChange}
              />
            )}
          />

          {form.formState.errors.serviceIds && (
            <p className="text-sm text-destructive -mt-3">
              {String(form.formState.errors.serviceIds.message)}
            </p>
          )}
        </FieldGroup>

        <div className="text-right pt-2">
          <Button type="submit" variant={"primary"} className="cursor-pointer">
            Salvar
          </Button>
        </div>
        </form>
      </div>
    </>
  )
}