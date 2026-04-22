"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  Controller as ControllerForm,
  type Resolver,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import * as z from "zod"

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import HeaderPage from "@/components/headerPage"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { maskCPF } from "@/lib/utils/maskCpf"
import { maskPhone } from "@/lib/utils/maskPhone"
import { GENDERS, type Gender } from "@/constants/genders"
import { RELATIONSHIPS } from "@/constants/relationships"
import { PhoneField } from "./PhoneField"
import { userFormCreateSchema, userFormEditSchema } from "../schemas"

type UserFormProps = {
  mode: "create" | "edit"
  userId?: string
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

type UserData = {
  id: string
  name: string
  email: string
  role: "OWNER" | "ADMIN" | "STAFF"
  profile?: {
    cpf?: string
    phone?: string
    secondaryPhone?: string
    gender?: { _id: string; value: string } | null
    birthDate?: string | null
    zipcode?: string
    state?: string
    city?: string
    neighborhood?: string
    address?: string
    number?: string
    complement?: string
  }
  contacts?: Array<{
    id?: string
    name: string
    phone: string
    relationship: string
  }>
}

/**
 * Componente reutilizável para criar/editar usuários com perfil e contatos.
 * - mode="create": password obrigatório, POST /api/users
 * - mode="edit": password opcional, carrega dados, PUT /api/users/:id
 */
export function UserForm({ mode, userId }: UserFormProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(mode === "edit" && !!userId)
  const [submitting, setSubmitting] = useState(false)

  const createSchema = userFormCreateSchema
  const editSchema = userFormEditSchema

  type CreateValues = z.input<typeof createSchema>
  type EditValues = z.input<typeof editSchema>
  type Values = CreateValues | EditValues

  const schema = mode === "create" ? createSchema : editSchema

  const DEFAULT_VALUES = useMemo(
    () =>
      ({
        name: "",
        email: "",
        role: "STAFF",
        password: "",
        gender: null,
        birthDate: "",
        cpf: "",
        phone: "",
        secondaryPhone: "",
        zipcode: "",
        state: "",
        city: "",
        neighborhood: "",
        address: "",
        number: "",
        complement: "",
        contacts: [],
      }) as Values,
    []
  )

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: DEFAULT_VALUES,
  })

  type Contact = NonNullable<Values["contacts"]>[number]

  const emptyContact = useMemo(
    () =>
      ({
        name: "",
        phone: "",
        relationship: "",
      }) as Contact,
    []
  )

  const [newContact, setNewContact] = useState<Contact>(emptyContact)

  const { fields: contactFields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const contactsRootError = form.formState.errors.contacts as
    | { message?: string }
    | undefined

  useEffect(() => {
    if (mode !== "create") return

    setLoading(false)
    form.reset(DEFAULT_VALUES)
    setNewContact(emptyContact)
  }, [mode, form, DEFAULT_VALUES, emptyContact])

  useEffect(() => {
    if (mode !== "edit" || !userId) return

    let cancelled = false

    async function loadUser() {
      setLoading(true)

      try {
        const res = await fetch(`/api/users/${userId}`, { cache: "no-store" })
        const json = (await res.json()) as ApiResponse<UserData>

        if (!res.ok || !json.ok) {
          toast.error(json.ok ? "Falha ao carregar usuário." : json.error)
          return
        }

        const user = json.data
        if (cancelled) return

        form.reset({
          name: user.name ?? "",
          email: user.email ?? "",
          role: user.role ?? "STAFF",
          password: "",

          gender: user.profile?.gender ?? null,
          birthDate: user.profile?.birthDate ?? "",
          cpf: user.profile?.cpf ? maskCPF(user.profile.cpf) : "",
          phone: user.profile?.phone ? maskPhone(user.profile.phone) : "",
          secondaryPhone: user.profile?.secondaryPhone
            ? maskPhone(user.profile.secondaryPhone)
            : "",

          // ✅ ENDEREÇO volta preenchendo do profile
          zipcode: user.profile?.zipcode ?? "",
          state: user.profile?.state ?? "",
          city: user.profile?.city ?? "",
          neighborhood: user.profile?.neighborhood ?? "",
          address: user.profile?.address ?? "",
          number: user.profile?.number ?? "",
          complement: user.profile?.complement ?? "",

          contacts: (user.contacts ?? []).map((c) => ({
            ...c,
            phone: c.phone ? maskPhone(c.phone) : "",
          })),
        } as Values)

        setNewContact(emptyContact)
      } catch {
        toast.error("Erro ao carregar usuário.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [mode, userId, form, emptyContact])

  const handleNewContactChange = (field: keyof Contact, value: string) => {
    const nextValue = field === "phone" ? maskPhone(value) : value

    setNewContact((prev: Contact) => ({
      ...prev,
      [field]: nextValue,
    }))
  }

  const handleAddContact = () => {
    const hasEmptyField =
      !newContact.name || !newContact.phone || !newContact.relationship

    if (hasEmptyField) {
      form.setError("contacts", {
        type: "manual",
        message: "Preencha os dados do contato",
      })
      return
    }

    form.clearErrors("contacts")
    append(newContact)
    setNewContact(emptyContact)
  }

  const handleRemoveContact = (index: number) => {
    remove(index)
  }

  async function onSubmit(data: Values) {
    try {
      setSubmitting(true)

      if (mode === "create" && !data.password) {
        toast.error("Informe uma senha (mínimo 8 caracteres).")
        return
      }

      const contactsPayload =
        mode === "edit"
          ? (data.contacts ?? [])
          : data.contacts && data.contacts.length > 0
            ? data.contacts
            : undefined

      const basePayload = {
        name: data.name,
        email: data.email,
        role: data.role,
        profile: {
          cpf: data.cpf || undefined,
          phone: data.phone || undefined,
          secondaryPhone: data.secondaryPhone || undefined,
          gender: data.gender ?? undefined,
          birthDate: data.birthDate || undefined,

          // ✅ ENDEREÇO indo no payload de profile
          zipcode: data.zipcode || undefined,
          state: data.state || undefined,
          city: data.city || undefined,
          neighborhood: data.neighborhood || undefined,
          address: data.address || undefined,
          number: data.number || undefined,
          complement: data.complement || undefined,
        },
        contacts: contactsPayload,
      }

      const payload =
        mode === "create"
          ? { ...basePayload, password: data.password }
          : { ...basePayload, ...(data.password ? { password: data.password } : {}) }

      const method = mode === "create" ? "POST" : "PUT"
      const url = mode === "create" ? "/api/users" : `/api/users/${userId}`

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = (await res.json()) as ApiResponse<UserData>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao salvar usuário." : json.error)
        return
      }

      toast.success(
        mode === "create" ? "Usuário criado com sucesso!" : "Usuário atualizado!"
      )

      router.push("/usuarios")
      router.refresh()
    } catch {
      toast.error("Erro ao salvar usuário.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <HeaderPage>
          <div className="flex items-center justify-between">
            <span className="text-foreground font-normal">{mode === "create" ? "Novo usuário" : "Editar usuário"}</span>
          </div>
        </HeaderPage>
        <div className="bg-white px-6 py-7">Carregando usuário...</div>
      </>
    )
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">{mode === "create" ? "Novo usuário" : "Editar usuário"}</span>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        <form className="w-full flex flex-col gap-7" onSubmit={form.handleSubmit(onSubmit)}>
        {/* ROLE + PASSWORD */}
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="role"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Permissão</FieldLabel>
                <Select value={(field.value as string) ?? "STAFF"} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a permissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">OWNER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="STAFF">STAFF</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">
                  Senha {mode === "edit" && "(deixar em branco para manter)"}
                </FieldLabel>
                <Input
                  {...field}
                  id="password"
                  type="password"
                  aria-invalid={fieldState.invalid}
                  placeholder={mode === "create" ? "Mínimo 8 caracteres" : ""}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {/* DADOS PESSOAIS */}
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input {...field} id="name" type="text" aria-invalid={fieldState.invalid} placeholder="Digite aqui seu Nome" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="gender"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Gênero</FieldLabel>
                <Select
                  value={field.value?._id ?? ""}
                  onValueChange={(value) => {
                    const selected: Gender | null = GENDERS.find((item) => item._id === value) ?? null
                    field.onChange(selected)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((gender) => (
                      <SelectItem key={gender._id} value={gender._id}>
                        {gender.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="birthDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="birthDate">Data de nascimento</FieldLabel>
                <Input {...field} id="birthDate" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {/* EMAIL / CPF / PHONE */}
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input {...field} id="email" type="email" aria-invalid={fieldState.invalid} placeholder="Digite aqui seu Email" disabled={mode === "edit"} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="cpf"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cpf">CPF</FieldLabel>
                <Input
                  id="cpf"
                  type="text"
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(maskCPF(e.target.value))}
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite seu CPF"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <PhoneField name="phone" control={form.control} />
        </FieldGroup>

        {/* TELEFONE SECUNDÁRIO */}
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="secondaryPhone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="secondaryPhone">Telefone secundário</FieldLabel>
                <Input
                  id="secondaryPhone"
                  type="text"
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                  aria-invalid={fieldState.invalid}
                  placeholder="(xx) xxxx-xxxx"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {/* CONTATOS */}
        <div>
          <h2 className="text-xl font-semibold pb-4">Contatos</h2>

          <FieldGroup className="flex flex-col gap-6">
            <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field>
                <FieldLabel htmlFor="new-contact-name">Nome</FieldLabel>
                <Input id="new-contact-name" type="text" value={newContact.name} onChange={(e) => handleNewContactChange("name", e.target.value)} placeholder="Nome do contato" />
              </Field>

              <Field>
                <FieldLabel htmlFor="new-contact-phone">Telefone</FieldLabel>
                <Input id="new-contact-phone" type="text" value={newContact.phone} onChange={(e) => handleNewContactChange("phone", e.target.value)} placeholder="(xx) xxxxx-xxxx" />
              </Field>

              <Field>
                <FieldLabel>Relação</FieldLabel>
                <Select value={newContact.relationship} onValueChange={(value) => handleNewContactChange("relationship", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a relação" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((relationship) => (
                      <SelectItem key={relationship._id} value={relationship._id}>
                        {relationship.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={handleAddContact}>
                Adicionar contato
              </Button>
            </div>

            {contactsRootError?.message && <FieldError errors={[contactsRootError]} />}

            <div className="flex flex-col gap-4">
              {contactFields.map((contact, index) => (
                <div key={contact.id} className="rounded-md border p-4 flex flex-col gap-4">
                  <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ControllerForm
                      name={`contacts.${index}.name`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`contacts-${index}-name`}>Nome</FieldLabel>
                          <Input {...field} id={`contacts-${index}-name`} type="text" aria-invalid={fieldState.invalid} placeholder="Nome do contato" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <ControllerForm
                      name={`contacts.${index}.phone`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`contacts-${index}-phone`}>Telefone</FieldLabel>
                          <Input
                            id={`contacts-${index}-phone`}
                            type="text"
                            value={(field.value as string) ?? ""}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            aria-invalid={fieldState.invalid}
                            placeholder="(xx) xxxx-xxxx"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <ControllerForm
                      name={`contacts.${index}.relationship`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Relação</FieldLabel>
                          <Select value={(field.value as string) ?? ""} onValueChange={(value) => field.onChange(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a relação" />
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIONSHIPS.map((relationship) => (
                                <SelectItem key={relationship._id} value={relationship._id}>
                                  {relationship.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveContact(index)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </FieldGroup>
        </div>

        {/* ✅ ENDEREÇO (RESTaurado) */}
        <div>
          <h2 className="text-xl font-semibold pb-4">Endereço</h2>

          <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4">
            <ControllerForm
              name="zipcode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="zipcode">CEP</FieldLabel>
                  <Input {...field} id="zipcode" type="text" aria-invalid={fieldState.invalid} placeholder="Digite o CEP" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <ControllerForm
              name="state"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="state">Estado</FieldLabel>
                  <Input {...field} id="state" type="text" aria-invalid={fieldState.invalid} placeholder="UF" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <ControllerForm
              name="city"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="city">Cidade</FieldLabel>
                  <Input {...field} id="city" type="text" aria-invalid={fieldState.invalid} placeholder="Cidade" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4">
            <ControllerForm
              name="neighborhood"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="neighborhood">Bairro</FieldLabel>
                  <Input {...field} id="neighborhood" type="text" aria-invalid={fieldState.invalid} placeholder="Bairro" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <ControllerForm
              name="address"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="address">Endereço</FieldLabel>
                  <Input {...field} id="address" type="text" aria-invalid={fieldState.invalid} placeholder="Rua / Av." />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <ControllerForm
              name="number"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="number">Número</FieldLabel>
                  <Input {...field} id="number" type="text" aria-invalid={fieldState.invalid} placeholder="Número" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ControllerForm
              name="complement"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="complement">Complemento</FieldLabel>
                  <Input {...field} id="complement" type="text" aria-invalid={fieldState.invalid} placeholder="Complemento" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </div>

        <div className="flex md:justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="md:w-auto">
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        </form>
      </div>
    </>
  )
}