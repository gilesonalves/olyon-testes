"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  storePublicInfoSchema,
  toStorePublicInfoFormValues,
  type StorePublicInfoFormValues,
} from "@/lib/store/public-info"

type StorePublicInfoFormProps = {
  storeId: string
  initialValues: StorePublicInfoFormValues
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-sm text-red-600">{message}</p>
}

export function StorePublicInfoForm({
  storeId,
  initialValues,
}: StorePublicInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<StorePublicInfoFormValues>({
    resolver: zodResolver(storePublicInfoSchema),
    defaultValues: initialValues,
  })

  async function onSubmit(values: StorePublicInfoFormValues) {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.ok) {
        toast.error(json?.message ?? "Não foi possível salvar os dados da loja.")
        return
      }

      form.reset(toStorePublicInfoFormValues(json.data))
      toast.success("Informações da loja salvas com sucesso.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" placeholder="Ex: (11) 3333-4444" {...form.register("phone")} />
          <InlineFieldError message={form.formState.errors.phone?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappPhone">WhatsApp</Label>
          <Input
            id="whatsappPhone"
            placeholder="Ex: (11) 99999-8888"
            {...form.register("whatsappPhone")}
          />
          <InlineFieldError message={form.formState.errors.whatsappPhone?.message} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            placeholder="Ex: Rua das Flores, 123"
            {...form.register("address")}
          />
          <InlineFieldError message={form.formState.errors.address?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input id="complement" placeholder="Ex: Sala 2" {...form.register("complement")} />
          <InlineFieldError message={form.formState.errors.complement?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input id="neighborhood" placeholder="Ex: Centro" {...form.register("neighborhood")} />
          <InlineFieldError message={form.formState.errors.neighborhood?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" placeholder="Ex: São Paulo" {...form.register("city")} />
          <InlineFieldError message={form.formState.errors.city?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" placeholder="Ex: SP" {...form.register("state")} />
          <InlineFieldError message={form.formState.errors.state?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipcode">CEP</Label>
          <Input id="zipcode" placeholder="Ex: 01000-000" {...form.register("zipcode")} />
          <InlineFieldError message={form.formState.errors.zipcode?.message} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="businessHoursSummary">Resumo do horário de funcionamento</Label>
          <Textarea
            id="businessHoursSummary"
            rows={3}
            placeholder="Ex: Segunda a sexta, das 9h às 18h. Sábado, das 9h às 13h."
            {...form.register("businessHoursSummary")}
          />
          <InlineFieldError message={form.formState.errors.businessHoursSummary?.message} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="serviceObservations">Observações de atendimento</Label>
          <Textarea
            id="serviceObservations"
            rows={4}
            placeholder="Ex: Atendimento somente com horário marcado."
            {...form.register("serviceObservations")}
          />
          <InlineFieldError message={form.formState.errors.serviceObservations?.message} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar informações"}
        </Button>
      </div>
    </form>
  )
}
