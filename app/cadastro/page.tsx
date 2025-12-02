"use client"

import Link from "next/link";
import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const formSchema = z.object({
  email: z.string().email("Digite um email válido"),
  password: z.string("Digite a senha").min(6, "A senha deve ter pelo menos 6 caracteres"),
})
export default function Cadastro() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
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
            Cadastro
          </h2>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">

          <FieldGroup>
            <Controller
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
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex justify-between items-center">
                    <FieldLabel htmlFor="password">
                      Senha
                    </FieldLabel>
                  </div>
                  <Input
                    {...field}
                    id="password"
                    type="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="Digite aqui sua Senha"

                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

          </FieldGroup>
          <Button type="submit" variant={"primary"} className="w-full cursor-pointer mt-6">Entrar</Button>
        </form>
        <p className="text-center text-base mt-6 font-medium">
          Já é cadastrado?
          <Link href={"/login"} className="text-sm text-verde text-right font-semibold hover:underline ml-2">
            Clique aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
