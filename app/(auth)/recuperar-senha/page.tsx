"use client"
import { Controller as ControllerForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Controller } from "./controllers"

export default function RecuperarSenha() {
 const { form, onSubmit } = Controller()

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center pb-6">
          <picture>
            <img className="block mx-auto pb-4"
              src="/imagens/logo-login.svg"
              alt=""
            />
          </picture>
          <h2 className="text-2xl text-center font-semibold">
            Recuperação de senha
          </h2>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <FieldGroup>
            <ControllerForm
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">
                    Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="Digite aqui seu Email"

                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <Button type="submit" variant={"primary"} className="w-full cursor-pointer mt-6">Recuperar</Button>
        </form>
      </div>
    </div>

  );
}
