"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller as ControllerForm, useForm } from "react-hook-form"
import { type Resolver } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Controller } from "../controllers"
import { formSchema, type FormValues } from "../schemas"

export default function ItemNovo() {
  const router = useRouter()
  const { createEntry } = Controller({ autoLoad: false })
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      category: "",
      description: "",
      transactionDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      status: "PENDING",
    },
  })

  const onSubmit = async (data: FormValues) => {
    const result = await createEntry({
      type: "EXPENSE",
      amount: Number(data.amount),
      category: data.category,
      description: data.description?.trim() ? data.description.trim() : null,
      transactionDate: data.transactionDate,
      dueDate: data.dueDate?.trim() ? data.dueDate : null,
      status: data.status,
    })

    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }

    toast.success("Despesa criada com sucesso!")
    router.push("/contas-a-pagar")
    router.refresh()
  }

  return (
    <div className="bg-white px-6 py-7">
      <div className="pb-6">
        <p>Contas a Pagar</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
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
                  placeholder="R$ 0,00"
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
                  placeholder="Ex.: Fornecedor, Aluguel, Taxa"
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

          <ControllerForm
            name="dueDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="dueDate">Vencimento</FieldLabel>
                <Input {...field} id="dueDate" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <select
                  {...field}
                  id="status"
                  aria-invalid={fieldState.invalid}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                  <option value="OVERDUE">Vencido</option>
                </select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
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
                  placeholder="Descreva a despesa"
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
