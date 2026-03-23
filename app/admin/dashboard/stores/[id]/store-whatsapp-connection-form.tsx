"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import {
  getWhatsAppConnectionState,
  toWhatsAppConnectionFormValues,
  WHATSAPP_CONNECTION_STATE_LABELS,
  WHATSAPP_CONNECTION_STATUS_LABELS,
  WHATSAPP_CONNECTION_STATUS_OPTIONS,
  WHATSAPP_PROVIDER_LABELS,
  WHATSAPP_PROVIDER_OPTIONS,
  whatsAppConnectionSchema,
  type WhatsAppConnectionEditableRecord,
  type WhatsAppConnectionFormValues,
} from "@/lib/whatsapp/admin-connection"

type StoreWhatsAppConnectionFormProps = {
  storeId: string
  initialConnection: WhatsAppConnectionEditableRecord | null
}

type FieldErrorsMap = Partial<Record<keyof WhatsAppConnectionFormValues, string[]>>

function InlineFieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-600">{message}</p>
}

const STATE_STYLES = {
  missing: "border-slate-200 bg-slate-100 text-slate-700",
  active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  inactive: "border-amber-200 bg-amber-100 text-amber-800",
} as const

export function StoreWhatsAppConnectionForm({
  storeId,
  initialConnection,
}: StoreWhatsAppConnectionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedConnection, setSavedConnection] = useState(initialConnection)
  const [showAccessToken, setShowAccessToken] = useState(false)

  const form = useForm<WhatsAppConnectionFormValues>({
    resolver: zodResolver(whatsAppConnectionSchema),
    defaultValues: toWhatsAppConnectionFormValues(initialConnection),
  })

  const savedState = getWhatsAppConnectionState(savedConnection)

  function applyFieldErrors(fieldErrors?: FieldErrorsMap) {
    if (!fieldErrors) {
      return
    }

    for (const [fieldName, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0]
      if (!message) {
        continue
      }

      form.setError(fieldName as keyof WhatsAppConnectionFormValues, {
        message,
      })
    }
  }

  async function onSubmit(values: WhatsAppConnectionFormValues) {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/stores/${storeId}/whatsapp-connection`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.ok) {
        applyFieldErrors(json?.details?.fieldErrors)
        toast.error(json?.error ?? "Nao foi possivel salvar a conexao WhatsApp.")
        return
      }

      const nextConnection = json.data?.connection ?? null
      form.reset(toWhatsAppConnectionFormValues(nextConnection))
      setSavedConnection(nextConnection)

      toast.success(
        savedConnection?.id
          ? "Conexao WhatsApp atualizada com sucesso."
          : "Conexao WhatsApp criada com sucesso."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Estado atual</p>
            <p className="text-sm text-muted-foreground">
              Somente conexoes ativas sao usadas pelo webhook da Meta.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-medium ${STATE_STYLES[savedState]}`}
          >
            {WHATSAPP_CONNECTION_STATE_LABELS[savedState]}
          </span>
        </div>

        {savedConnection ? (
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>
              Provider salvo: {WHATSAPP_PROVIDER_LABELS[savedConnection.provider ?? "META_WHATSAPP"]}
            </p>
            <p>
              Status tecnico salvo:{" "}
              {WHATSAPP_CONNECTION_STATUS_LABELS[savedConnection.status ?? "PENDING"]}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta loja ainda nao possui conexao tecnica cadastrada.
          </p>
        )}

        {form.formState.isDirty ? (
          <p className="text-sm text-amber-700">Existem alteracoes pendentes de salvamento.</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Controller
            control={form.control}
            name="provider"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full" id="provider">
                  <SelectValue placeholder="Selecione o provider" />
                </SelectTrigger>
                <SelectContent>
                  {WHATSAPP_PROVIDER_OPTIONS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {WHATSAPP_PROVIDER_LABELS[provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <InlineFieldError message={form.formState.errors.provider?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status tecnico</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full" id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {WHATSAPP_CONNECTION_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {WHATSAPP_CONNECTION_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <InlineFieldError message={form.formState.errors.status?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumberId">phoneNumberId</Label>
          <Input
            id="phoneNumberId"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ex: 123456789012345"
            {...form.register("phoneNumberId")}
          />
          <InlineFieldError message={form.formState.errors.phoneNumberId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessAccountId">businessAccountId</Label>
          <Input
            id="businessAccountId"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ex: 987654321098765"
            {...form.register("businessAccountId")}
          />
          <InlineFieldError message={form.formState.errors.businessAccountId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayPhoneNumber">displayPhoneNumber</Label>
          <Input
            id="displayPhoneNumber"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ex: +55 11 99999-8888"
            {...form.register("displayPhoneNumber")}
          />
          <InlineFieldError message={form.formState.errors.displayPhoneNumber?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="verifyToken">verifyToken</Label>
          <Input
            id="verifyToken"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ex: token-verificacao-loja"
            {...form.register("verifyToken")}
          />
          <InlineFieldError message={form.formState.errors.verifyToken?.message} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Label htmlFor="accessToken">accessToken</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAccessToken((current) => !current)}
            >
              {showAccessToken ? "Ocultar token" : "Mostrar token"}
            </Button>
          </div>
          <Input
            id="accessToken"
            type={showAccessToken ? "text" : "password"}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex: EAA..."
            {...form.register("accessToken")}
          />
          <p className="text-sm text-muted-foreground">
            Este token so aparece nesta tela de detalhes da loja.
          </p>
          <InlineFieldError message={form.formState.errors.accessToken?.message} />
        </div>

        <div className="rounded-lg border p-4 md:col-span-2">
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="isActive">Conexao ativa</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando desligada, o webhook nao usa esta conexao para verificacao ou inbound.
                  </p>
                </div>

                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          <InlineFieldError message={form.formState.errors.isActive?.message} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Salvando..."
            : savedConnection?.id
              ? "Salvar conexao"
              : "Cadastrar conexao"}
        </Button>
      </div>
    </form>
  )
}
