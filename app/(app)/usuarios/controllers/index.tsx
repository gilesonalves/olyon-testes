import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import * as z from "zod"
import { maskPhone } from "@/lib/utils/maskPhone"
import { userFormCreateSchema as formSchema } from "../schemas"

export const Controller = () => {
  type FormValues = z.input<typeof formSchema>
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    },
  })

  type Contact = NonNullable<FormValues["contacts"]>[number]

  const emptyContact: Contact = {
    name: "",
    phone: "",
    relationship: "",
  }

  const [newContact, setNewContact] = useState<Contact>(emptyContact)

  const { fields: contactFields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const handleNewContactChange = (field: keyof Contact, value: string) => {
    const nextValue = field === "phone" ? maskPhone(value) : value
    setNewContact((prev) => ({
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

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Falha ao criar usuário.")
        return
      }

      toast.success("Usuário criado com sucesso!")
      router.push("/usuarios")
      router.refresh()
      form.reset()
    } catch {
      toast.error("Erro ao criar usuário.")
    }
  }

  return {
    form,
    onSubmit,
    contactFields,
    newContact,
    handleNewContactChange,
    handleAddContact,
    handleRemoveContact,
  }
}
