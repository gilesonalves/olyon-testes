"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  resetStoreOwnerPasswordSchema,
  updateStoreOwnerSchema,
  type ResetStoreOwnerPasswordInput,
  type StoreOwnerData,
  type UpdateStoreOwnerInput,
} from "@/lib/admin/store-owner"

type OwnerManagementProps = {
  storeId: string
  storeName: string
  initialOwner: StoreOwnerData
}

type OwnerUpdateResponse =
  | { ok: true; data: StoreOwnerData }
  | { ok: false; error: string }

type PasswordResetResponse =
  | { ok: true; data: { userId: string } }
  | { ok: false; error: string }

function InlineFieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-600">{message}</p>
}

export function OwnerManagement({
  storeId,
  storeName,
  initialOwner,
}: OwnerManagementProps) {
  const router = useRouter()
  const [owner, setOwner] = useState(initialOwner)
  const [isSavingOwner, setIsSavingOwner] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const ownerForm = useForm<UpdateStoreOwnerInput>({
    resolver: zodResolver(updateStoreOwnerSchema),
    defaultValues: {
      name: initialOwner.name,
      email: initialOwner.email,
    },
  })

  const passwordForm = useForm<ResetStoreOwnerPasswordInput>({
    resolver: zodResolver(resetStoreOwnerPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  async function updateOwner(values: UpdateStoreOwnerInput) {
    setIsSavingOwner(true)

    try {
      const response = await fetch(`/api/admin/stores/${storeId}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const json = (await response
        .json()
        .catch(() => null)) as OwnerUpdateResponse | null

      if (!response.ok || !json?.ok) {
        const error =
          json && !json.ok
            ? json.error
            : "Não foi possível salvar os dados do proprietário."

        if (response.status === 409) {
          ownerForm.setError("email", { message: error })
        }

        toast.error(error)
        return
      }

      setOwner(json.data)
      ownerForm.reset({
        name: json.data.name,
        email: json.data.email,
      })
      toast.success("Dados do proprietário atualizados.")
      router.refresh()
    } catch {
      toast.error("Não foi possível salvar os dados do proprietário.")
    } finally {
      setIsSavingOwner(false)
    }
  }

  async function resetPassword(values: ResetStoreOwnerPasswordInput) {
    setIsResettingPassword(true)

    try {
      const response = await fetch(
        `/api/admin/stores/${storeId}/owner/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      )
      const json = (await response
        .json()
        .catch(() => null)) as PasswordResetResponse | null

      if (!response.ok || !json?.ok) {
        const error =
          json && !json.ok
            ? json.error
            : "Não foi possível redefinir a senha."
        toast.error(error)
        return
      }

      passwordForm.reset({
        password: "",
        confirmPassword: "",
      })
      setShowPassword(false)
      toast.success("Senha redefinida com sucesso.")
    } catch {
      toast.error("Não foi possível redefinir a senha.")
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/dashboard/stores/${storeId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Gerenciar proprietário</h1>
            <p className="text-sm text-muted-foreground">{storeName}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-3xl w-full">
        <section className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold">Proprietário atual</h2>
          <div>
            <b>Nome:</b> {owner.name}
          </div>
          <div>
            <b>E-mail:</b> {owner.email}
          </div>
          <div>
            <b>User ID:</b> {owner.userId}
          </div>
          <div>
            <b>Role:</b> {owner.role}
          </div>
        </section>

        <section className="border rounded-lg p-4 space-y-4">
          <div>
            <h2 className="font-semibold">Editar dados</h2>
            <p className="text-sm text-muted-foreground">
              Atualize o nome e o e-mail do proprietário atual.
            </p>
          </div>

          <form
            onSubmit={ownerForm.handleSubmit(updateOwner)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="owner-name">Nome</Label>
              <Input
                id="owner-name"
                {...ownerForm.register("name")}
                aria-invalid={!!ownerForm.formState.errors.name}
              />
              <InlineFieldError
                message={ownerForm.formState.errors.name?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-email">E-mail</Label>
              <Input
                id="owner-email"
                type="email"
                {...ownerForm.register("email")}
                aria-invalid={!!ownerForm.formState.errors.email}
              />
              <InlineFieldError
                message={ownerForm.formState.errors.email?.message}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isSavingOwner}
            >
              {isSavingOwner ? "Salvando..." : "Salvar dados"}
            </Button>
          </form>
        </section>

        <section className="border rounded-lg p-4 space-y-4">
          <div>
            <h2 className="font-semibold">Redefinir senha</h2>
            <p className="text-sm text-muted-foreground">
              A nova senha substituirá a senha atual deste proprietário.
            </p>
          </div>

          <form
            onSubmit={passwordForm.handleSubmit(resetPassword)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="owner-password">Nova senha</Label>
              <Input
                id="owner-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...passwordForm.register("password")}
                aria-invalid={!!passwordForm.formState.errors.password}
              />
              <InlineFieldError
                message={passwordForm.formState.errors.password?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-confirm-password">
                Confirmar nova senha
              </Label>
              <Input
                id="owner-confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword")}
                aria-invalid={
                  !!passwordForm.formState.errors.confirmPassword
                }
              />
              <InlineFieldError
                message={
                  passwordForm.formState.errors.confirmPassword?.message
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={isResettingPassword}
              >
                {isResettingPassword
                  ? "Redefinindo..."
                  : "Redefinir senha"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Ocultar senha" : "Mostrar senha"}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
