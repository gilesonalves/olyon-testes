import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"


export default function Login() {
  

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
        <form>
          <FieldSet>
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
          </FieldSet>
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
        <p className="text-center text-base mt-6 font-medium">
          Ainda não é cadastrado?
          <Link href={"/cadastro"} className="text-sm text-verde text-right font-semibold hover:underline ml-2">
            Cadastre-se aqui
          </Link>
        </p>
      </div>

    </div>
  );
}
