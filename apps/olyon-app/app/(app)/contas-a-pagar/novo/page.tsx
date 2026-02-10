"use client"
import { Controller as ControllerForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Controller } from "../controllers"

export default function ItemNovo() {
  const { form, onSubmit } = Controller()
  return (
    <div className="bg-white px-6 py-7">
      <div className="pb-6">
        <p>
          Contas a Pagar
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <FieldGroup className="grid grid-cols-3 gap-5">
          <ControllerForm
            name="value"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="value">
                  Valor
                </FieldLabel>
                <Input
                  {...field}
                  id="value"
                  aria-invalid={fieldState.invalid}
                  placeholder="R$ 0,00"

                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <ControllerForm
            name="category"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="category">
                  Categoria
                </FieldLabel>
                <select {...field}
                  id="category"
                  aria-invalid={fieldState.invalid}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option >Selecione a categoria</option>
                </select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

        </FieldGroup>
        <FieldGroup className="my-6">
          <ControllerForm
            name="observation"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="observation">
                  Observações
                </FieldLabel>
                <textarea {...field}
                  id="observation"
                  aria-invalid={fieldState.invalid}
                  placeholder="Descreva o evento"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="text-right">
          <Button type="submit" variant={"primary"} >
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}
