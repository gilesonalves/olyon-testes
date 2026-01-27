"use client"
import { Controller as ControllerForm } from "react-hook-form"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Controller } from "../controllers"
import { maskCPF } from "@/lib/utils/maskCpf"
import { maskPhone } from "@/lib/utils/maskPhone"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GENDERS, type Gender } from "@/constants/genders"
import { RELATIONSHIPS } from "@/constants/relationships"
import { Button } from "@/components/ui/button"
import { PhoneField } from "../components/PhoneField"

export default function ItemNovo() {
  const {
    form,
    onSubmit,
    contactFields,
    newContact,
    handleNewContactChange,
    handleAddContact,
    handleRemoveContact,
  } = Controller()

  const contactsRootError = form.formState.errors.contacts as
    | { message?: string }
    | undefined

  return (
    <div className="bg-white px-6 py-7">
      <div className="flex justify-between items-center pb-6">
        <p>Usuários</p>
        <button type="submit" className="btn-segundary">
          Novo
        </button>
      </div>
      <form className="w-full flex flex-col gap-7" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field className="" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input
                  {...field}
                  id="name"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite aqui seu Nome"
                />
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
                    const selected: Gender | null =
                      GENDERS.find((item) => item._id === value) ?? null

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
              <Field className="" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="birthDate">Data de nascimento</FieldLabel>
                <Input
                  {...field}
                  id="birthDate"
                  type="date"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite aqui seu Email"
                />
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
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(maskCPF(e.target.value))}
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite seu CPF"
                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="phone"
            control={form.control}
            render={({ fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <PhoneField name="phone" control={form.control} />
                
              </Field>
            )}
          />
        </FieldGroup>
        <div>
          <h2 className="text-xl font-semibold pb-4">Contatos</h2>

          <FieldGroup className="flex flex-col gap-6">
            <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field>
                <FieldLabel htmlFor="new-contact-name">Nome</FieldLabel>
                <Input
                  id="new-contact-name"
                  type="text"
                  value={newContact.name}
                  onChange={(e) => handleNewContactChange("name", e.target.value)}
                  placeholder="Nome do contato"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="new-contact-phone">Telefone</FieldLabel>
                <Input
                  id="new-contact-phone"
                  type="text"
                  value={newContact.phone}
                  onChange={(e) => handleNewContactChange("phone", e.target.value)}
                  placeholder="(27) 91234-5678"
                />
              </Field>

              <Field>
                <FieldLabel>Relação</FieldLabel>
                <Select
                  value={newContact.relationship}
                  onValueChange={(value) =>
                    handleNewContactChange("relationship", value)
                  }
                >
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
                          <FieldLabel htmlFor={`contacts-${index}-name`}>
                            Nome
                          </FieldLabel>
                          <Input
                            {...field}
                            id={`contacts-${index}-name`}
                            type="text"
                            aria-invalid={fieldState.invalid}
                            placeholder="Nome do contato"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <ControllerForm
                      name={`contacts.${index}.phone`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={`contacts-${index}-phone`}>
                            Telefone
                          </FieldLabel>
                          <Input
                            id={`contacts-${index}-phone`}
                            type="text"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            aria-invalid={fieldState.invalid}
                            placeholder="(11) 91234-5678"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <ControllerForm
                      name={`contacts.${index}.relationship`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Relação</FieldLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a relação" />
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIONSHIPS.map((relationship) => (
                                <SelectItem
                                  key={relationship._id}
                                  value={relationship._id}
                                >
                                  {relationship.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveContact(index)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </FieldGroup>
        </div>
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="zipcode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="zipcode">CEP</FieldLabel>
                <Input
                  {...field}
                  id="zipcode"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite o CEP"
                />
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
                <Input
                  {...field}
                  id="state"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite o estado"
                />
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
                <Input
                  {...field}
                  id="city"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite a cidade"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ControllerForm
            name="neighborhood"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="neighborhood">Bairro</FieldLabel>
                <Input
                  {...field}
                  id="neighborhood"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite o bairro"
                />
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
                <Input
                  {...field}
                  id="address"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite o endereço"
                />
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
                <Input
                  {...field}
                  id="number"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite o número"
                />
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
                <Input
                  {...field}
                  id="complement"
                  type="text"
                  aria-invalid={fieldState.invalid}
                  placeholder="Digite o complemento"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex md:justify-end">
          <Button type="submit" className="w-full md:w-auto">
            Salvar
          </Button>
        </div>
      </form>
    </div>
  )
}
