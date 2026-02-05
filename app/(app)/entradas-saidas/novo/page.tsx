"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  category: z.string().min(1, "Selecione uma categoria"),
  value: z.string().min(1, "Digite um valor"),
  type: z.enum(["expense", "income"]),
})

export default function ItemNovo() {

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      value: "",
      type: "expense"
    },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    toast("You submitted the following values:", {
      description: (
        <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
      position: "bottom-right",
      classNames: {
        content: "flex flex-col gap-2",
      },
      style: {
        "--border-radius": "calc(var(--radius)  + 4px)",
      } as React.CSSProperties,
    })
  }
  return (
    <div className="bg-white px-6 py-7">
      <div className="pb-6">
        <p>
          Entradas e Saidas
        </p>

      </div>


      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <FieldGroup className="mb-6">
          <Controller
            name="type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  Escolha o tipo
                </FieldLabel>
                <RadioGroup
                  id="type_title"
                  className="flex"
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="option-one" />
                    <Label htmlFor="option-one">Entradas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="option-two" />
                    <Label htmlFor="option-two">Saídas</Label>
                  </div>
                </RadioGroup>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldGroup className="grid grid-cols-3 gap-5">
          <Controller
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
          <Controller
            name="value"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="value">
                  Categoria
                </FieldLabel>
                <select {...field}
                  id="value"
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
          <Controller
            name="value"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="value">
                  Observações
                </FieldLabel>
                <textarea {...field}
                  id="value"
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
