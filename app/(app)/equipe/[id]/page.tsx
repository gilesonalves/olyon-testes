"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import HeaderPage from "@/components/headerPage"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"
import { ServicesCheckboxGroup } from "../components/services-checkbox-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

type TeamDetails = {
  membershipId: string
  userId: string
  name: string
  email: string
  role: "OWNER" | "ADMIN" | "STAFF"
  types: Array<"PROFISSIONAL" | "FINANCEIRO" | "ATENDENTE">
  serviceIds: string[]
}

const EXTRA_TYPES = [
  { id: "FINANCEIRO", label: "Financeiro" },
  { id: "ATENDENTE", label: "Atendente" },
] as const

export default function EquipeEditPage() {
  const params = useParams<{ id: string }>()
  const membershipId = params?.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [name, setName] = useState("")
  const [role, setRole] = useState<TeamDetails["role"]>("STAFF")
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [extraTypes, setExtraTypes] = useState<Array<"FINANCEIRO" | "ATENDENTE">>([])

  const initial = useMemo(
    () => ({ serviceIds: [] as string[], extraTypes: [] as Array<"FINANCEIRO" | "ATENDENTE"> }),
    []
  )

  useEffect(() => {
    if (!membershipId) return

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/team/${membershipId}`, { cache: "no-store" })
        const json = (await res.json()) as ApiResponse<TeamDetails>

        if (!res.ok || !json.ok) {
          toast.error(json.ok ? "Falha ao carregar profissional." : json.error)
          return
        }

        if (cancelled) return

        const data = json.data
        setName(data.name)
        setRole(data.role)
        setServiceIds(data.serviceIds ?? [])

        // mantém só extras (PROFISSIONAL é implícito)
        const extras = (data.types ?? []).filter(
          (t) => t === "FINANCEIRO" || t === "ATENDENTE"
        ) as Array<"FINANCEIRO" | "ATENDENTE">
        setExtraTypes(extras)

        initial.serviceIds = data.serviceIds ?? []
        initial.extraTypes = extras
      } catch {
        toast.error("Erro ao carregar profissional.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [membershipId, initial])

  function toggleExtraType(t: "FINANCEIRO" | "ATENDENTE") {
    setExtraTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  async function onSave() {
    if (!membershipId) return
    try {
      setSaving(true)

      const res = await fetch(`/api/team/${membershipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds,
          extraTypes,
        }),
      })

      const json = (await res.json()) as ApiResponse<unknown>
      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao salvar." : json.error)
        return
      }

      toast.success("Profissional atualizado!")
      router.push("/equipe")
      router.refresh()
    } catch {
      toast.error("Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function onRemove() {
    if (!membershipId) return
    try {
      setRemoving(true)
      const res = await fetch(`/api/team/${membershipId}`, { method: "DELETE" })
      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok || !json.ok) {
        toast.error(json.ok ? "Falha ao remover." : json.error)
        return
      }

      toast.success("Removido da equipe.")
      router.push("/equipe")
      router.refresh()
    } catch {
      toast.error("Erro ao remover.")
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return <div className="bg-white px-6 py-7">Carregando...</div>
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Editar profissional</span>
          <Button variant="outline" onClick={() => router.push("/equipe")}>
            Voltar
          </Button>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7 flex flex-col gap-8">
        <div>
          <p className="text-lg font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{role}</p>
        </div>

        {/* Serviços */}
        <div>
          <FieldLabel>Serviços executados</FieldLabel>
          <ServicesCheckboxGroup value={serviceIds} onChange={setServiceIds} />
        </div>

        {/* Extra types */}
        <div>
          <FieldLabel>Tipos adicionais</FieldLabel>
          <FieldGroup className="flex flex-wrap gap-6 mt-4">
            {EXTRA_TYPES.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <Checkbox
                  id={t.id}
                  checked={extraTypes.includes(t.id)}
                  onCheckedChange={() => toggleExtraType(t.id)}
                />
                <Label htmlFor={t.id}>{t.label}</Label>
              </div>
            ))}
          </FieldGroup>
          <p className="text-xs text-muted-foreground mt-2">
            PROFISSIONAL é sempre mantido (é o que faz aparecer na equipe/agendamentos).
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="destructive" onClick={onRemove} disabled={removing}>
            {removing ? "Removendo..." : "Remover da equipe"}
          </Button>

          <Button onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </>
  )
}