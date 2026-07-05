"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createOwner } from "@/lib/actions/create-owner"
import { createOwnerSchema } from "@/lib/actions/create-owner.schema"
import type { CreateOwnerInput } from "@/lib/actions/create-owner.types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type NewOwnerFormProps = {
  storeId: string
}

export function NewOwnerForm({ storeId }: NewOwnerFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<CreateOwnerInput>({
    resolver: zodResolver(createOwnerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: CreateOwnerInput) {
    setIsSubmitting(true)

    try {
      const result = await createOwner(storeId, data)

      if (result.success) {
        toast.success("Proprietário definido com sucesso")
        router.push("/admin/dashboard")
        return
      }

      switch (result.error) {
        case "INVALID_INPUT":
          toast.error(result.message)

          // mapeia mensagens comuns para campos
          if (result.message === "Informe o nome") {
            form.setError("name", { message: result.message })
          } else if (result.message === "Informe um email valido") {
            form.setError("email", { message: result.message })
          } else if (result.message.includes("Senha")) {
            form.setError("password", { message: result.message })
          } else if (result.message.includes("senhas")) {
            form.setError("confirmPassword", { message: result.message })
          }

          break

        case "STORE_NOT_FOUND":
        case "FORBIDDEN":
          toast.error(result.message)
          break

        default:
          toast.error("Erro ao criar proprietário")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </Link>
          <h1 className="text-xl font-semibold">Olyon Admin</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-md">
        <h2 className="text-lg font-medium mb-6">Novo proprietário</h2>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do usuário</Label>
            <Input
              id="name"
              placeholder="Ex: João Silva"
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail do usuário</Label>
            <Input
              id="email"
              type="email"
              placeholder="Ex: proprietario@loja.com"
              {...form.register("email")}
              aria-invalid={!!form.formState.errors.email}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha inicial</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 caracteres"
              {...form.register("password")}
              aria-invalid={!!form.formState.errors.password}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Se o e-mail já existir, a senha atual será preservada.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Repita a senha"
              {...form.register("confirmPassword")}
              aria-invalid={!!form.formState.errors.confirmPassword}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Ocultar senha" : "Mostrar senha"}
            </Button>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Criando..." : "Criar proprietario"}
          </Button>
        </form>
      </main>
    </div>
  )
}
