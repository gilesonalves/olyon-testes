"use client"

import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { UserForm } from "../components/UserForm"

type Role = "OWNER" | "ADMIN" | "STAFF"

export default function UsuarioEditPage() {
  const params = useParams<{ id: string }>()
  const userId = params?.id

  const { data: session } = useSession()
  const myRole = session?.user?.role as Role | undefined
  const canManage = myRole === "OWNER" || myRole === "ADMIN"

  // Se não pode gerenciar ou não tem userId, mostrar erro
  if (!canManage || !userId) {
    return (
      <div className="bg-white px-6 py-7">
        <p className="text-red-600">Você não tem permissão para editar usuários.</p>
      </div>
    )
  }

  return <UserForm mode="edit" userId={userId} />
}

