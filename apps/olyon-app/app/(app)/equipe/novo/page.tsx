"use client"

import { Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Controllers from "../controllers/page"
import { ServicesCheckboxGroup } from "../components/services-checkbox-group"

export default function ItemNovo() {
  const { form, onSubmit } = Controllers()

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

        <FieldGroup>
          <Controller
            name="services"
            control={form.control}
            render={({ field }) => (
              <ServicesCheckboxGroup
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
          {form.formState.errors.services && (
            <p className="text-sm text-destructive -mt-3">
              {form.formState.errors.services.message}
            </p>
          )}
        </FieldGroup>
        <div className="text-right pt-8">
          <Button type="submit" variant={"primary"} className=" cursor-pointer">Salvar</Button>
        </div>
      </form>
    </div>
  );
}
