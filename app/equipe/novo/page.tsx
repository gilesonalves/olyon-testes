"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),

})

export default function ItemNovo() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ""
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
          Equipe
        </p>

      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">

        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">
                  Nome
                </FieldLabel>
                <Input
                  {...field}
                  id="name"
                  type="name"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite aqui seu Nome"

                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

      </form>
      <div className="flex gap-6 mt-6">
        <div className="flex items-center gap-3">
          <Checkbox id="item-1" />
          <Label htmlFor="item-1">Corte de cabelo</Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id="item-2" />
          <Label htmlFor="item-2">Barba</Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id="item-3" />
          <Label htmlFor="item-3">Sombrancelha</Label>
        </div>
      </div>
      <div className="text-right pt-8">
        <Button type="submit" variant={"primary"} className=" cursor-pointer">Salvar</Button>
      </div>
    </div>
  );
}
