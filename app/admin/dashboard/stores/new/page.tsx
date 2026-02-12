"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createStore } from "@/lib/actions/create-store"
import { createStoreSchema } from "@/lib/actions/create-store.schema"
import type { CreateStoreInput } from "@/lib/actions/create-store.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function NewStorePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: { name: "" },
  })

  async function onSubmit(data: CreateStoreInput) {
    setIsSubmitting(true)
    try {
      const result = await createStore(data)

      if (result.success) {
        toast.success("Loja criada com sucesso")
        router.push(`/admin/dashboard/stores/${result.storeId}/owner`)
        return
      }

      switch (result.error) {
        case "INVALID_INPUT":
          toast.error(result.message)
          form.setError("name", { message: result.message })
          break
        case "DUPLICATE_SLUG":
          toast.error(result.message)
          form.setError("name", { message: result.message })
          break
        case "FORBIDDEN":
          toast.error(result.message)
          break
        default:
          toast.error(result.message)
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
        <h2 className="text-lg font-medium mb-6">Nova loja</h2>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da loja</Label>
            <Input
              id="name"
              placeholder="Ex: loja-teste"
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Criando..." : "Criar loja"}
          </Button>
        </form>
      </main>
    </div>
  )
}
