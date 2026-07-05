"use client"
import { Controller as ControllerForm } from "react-hook-form"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Controller } from "./controllers"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function LoginErrorMessage() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")

  if (!errorParam) {
    return null
  }

  return (
    <p className="mt-4 text-sm font-medium text-red-600">
      Credenciais inválidas ou acesso negado.
    </p>
  )
}

export default function Login() {
  const { form, onSubmit } = Controller()

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center pb-10">
          <picture>
            <img className="block mx-auto"
              src="/imagens/logo-login.svg"
              alt=""
            />
          </picture>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <FieldGroup>
            <ControllerForm
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">
                    E-mail
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="Digite aqui seu e-mail"

                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <ControllerForm
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex justify-between items-center">
                    <FieldLabel htmlFor="password">
                      Senha
                    </FieldLabel>
                    <Link href="/recuperar-senha" className="text-sm text-verde text-right font-semibold hover:underline">
                      Esqueceu sua senha?
                    </Link>
                  </div>

                  <Input
                    {...field}
                    id="password"
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Digite aqui sua senha"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

          </FieldGroup>
          <Suspense fallback={null}>
            <LoginErrorMessage />
          </Suspense>
          <Button type="submit" variant={"primary"} className="w-full cursor-pointer mt-6">
            Entrar
          </Button>
        </form>
        <div>
          <p className="text-center text-base mt-6 font-medium">
            Ainda não é cadastrado?
            <Link href={"/cadastro"} className="text-sm text-verde text-right font-semibold hover:underline ml-2">
              Cadastre-se aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
