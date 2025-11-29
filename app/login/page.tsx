"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"


const formSchema = z.object({
  email: z.string().email("Digite um email válido"),
  password: z.string("Digite a senha").min(6, "A senha deve ter pelo menos 6 caracteres"),
})

export default function Home() {
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
        <div className="text-center pb-10">
          <picture>
            <img className="block mx-auto"
              src="/imagens/logo-login.svg"
              alt=""
            />
          </picture>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          {/* <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input id="username" type="text" placeholder="Max Leiter" />
                <FieldDescription>
                  Choose a unique username for your account.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
                <Input id="password" type="password" placeholder="••••••••" />
              </Field>
            </FieldGroup>
            <Button type="submit" className="btn-primary mt-6">Entrar</Button>
          </FieldSet> */}
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
                    <Link href="/recuperar-senha" className="text-sm text-verde text-right font-semibold hover:underline">
                      Esqueceu sua senha?
                    </Link>
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
        {/* <div>
          <div className="space-y-2 pb-6">
            <label className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Digite aqui seu email"
              className="w-full border border-gray-400 rounded px-3 py-2"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">
                Senha
              </label>
              <a
                href="/recuperar-senha"
                className="text-sm text-verde text-right font-semibold hover:underline"
              >
                Esqueceu sua senha?
              </a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Digite aqui sua senha"
              className="w-full border border-gray-400 rounded px-3 py-2"
              required
            />
          </div>

          <Button type="submit" className="btn-primary mt-6">Entrar</Button>

        </div> */}
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
