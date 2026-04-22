"use client"

import HeaderPage from "@/components/headerPage"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"

import { ClientForm } from "../components/ClientForm"

type Role = "OWNER" | "ADMIN" | "STAFF"

export default function ClienteEditPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id

  const { data: session } = useSession()
  const myRole = session?.user?.role as Role | undefined
  const canManage = myRole === "OWNER" || myRole === "ADMIN"

  if (!canManage || !clientId) {
    return (
      <>
        <HeaderPage>
          <div className="flex items-center justify-between">
            <span className="text-foreground font-normal">Editar cliente</span>
          </div>
        </HeaderPage>
        <div className="bg-white px-6 py-7">
          <p className="text-red-600">Você não tem permissão para editar clientes.</p>
        </div>
      </>
    )
  }

  return <ClientForm mode="edit" clientId={clientId} />
}
