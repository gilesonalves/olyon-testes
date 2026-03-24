"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller as ControllerForm, useForm } from "react-hook-form"
import { type Resolver } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Controller } from "../controllers"
import { formSchema, type FormValues } from "../schemas"

export default function ItemNovo() {
  const router = useRouter()
  const { createEntry } = Controller({ autoLoad: false })
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      category: "",
      amount: 0,
      description: "",
      dueDate: "",
      transactionDate: new Date().toISOString().slice(0, 10),
      type: "EXPENSE",
    },
  })
  const selectedType = form.watch("type")

  useEffect(() => {
    if (selectedType === "INCOME") {
      form.setValue("dueDate", "", { shouldDirty: true, shouldValidate: true })
    }
  }, [form, selectedType])

  const onSubmit = async (data: FormValues) => {
    const result = await createEntry({
      type: data.type,
      amount: Number(data.amount),
      category: data.category,
      description: data.description?.trim() ? data.description.trim() : null,
      transactionDate: data.transactionDate,
      dueDate: data.type === "EXPENSE" && data.dueDate?.trim() ? data.dueDate : null,
    })

    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }

    toast.success("Lançamento criado com sucesso!")
    router.push("/entradas-saidas")
    router.refresh()
  }

  return (
    <div className="bg-white px-6 py-7">
      <div className="pb-6">
        <p>Entradas e Saídas</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <FieldGroup className="mb-6">
          <ControllerForm
            name="type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Escolha o tipo</FieldLabel>

                <RadioGroup className="flex" onValueChange={field.onChange} value={field.value}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INCOME" id="finance-income" />
                    <Label htmlFor="finance-income">Entrada</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXPENSE" id="finance-expense" />
                    <Label htmlFor="finance-expense">Saída</Label>
                  </div>
                </RadioGroup>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldGroup className="grid gap-5 md:grid-cols-2">
          <ControllerForm
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="amount">Valor</FieldLabel>
                <Input
                  {...field}
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={fieldState.invalid}
                  placeholder="0,00"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="category"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="category">Categoria</FieldLabel>
                <Input
                  {...field}
                  id="category"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Ex.: Fornecedor, Venda, Taxa"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="transactionDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="transactionDate">Data</FieldLabel>
                <Input {...field} id="transactionDate" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {selectedType === "EXPENSE" ? (
            <ControllerForm
              name="dueDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="dueDate">Vencimento</FieldLabel>
                  <Input {...field} id="dueDate" type="date" aria-invalid={fieldState.invalid} value={field.value ?? ""} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ) : null}
        </FieldGroup>

        <FieldGroup className="my-6">
          <ControllerForm
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="description">Observações</FieldLabel>
                <Textarea
                  {...field}
                  id="description"
                  aria-invalid={fieldState.invalid}
                  placeholder="Descreva o lançamento"
                  value={field.value ?? ""}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {form.formState.errors.root?.message ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {form.formState.errors.root.message}
          </div>
        ) : null}

        <div className="text-right">
          <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
