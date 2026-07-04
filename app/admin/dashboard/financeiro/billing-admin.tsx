"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { calculateNextDueAt } from "@/lib/billing/due-date"

type BillingStatus = "PAID" | "PENDING" | "OVERDUE"
type OperationalStatus = "ACTIVE" | "SUSPENDED"
type BillingFilter = "ALL" | BillingStatus | "SUSPENDED"

type AdminBillingStore = {
  storeId: string
  name: string
  slug: string
  active: boolean
  billingStatus: BillingStatus
  operationalStatus: OperationalStatus
  monthlyAmount: number | null
  dueDay: number | null
  currentPeriod: string | null
  lastPaidAt: string | null
  nextDueAt: string | null
  notes: string | null
  configured: boolean
  owner: { name: string; email: string } | null
}

type BillingListResponse =
  | {
      ok: true
      data: AdminBillingStore[]
      meta: { timeZone: string }
    }
  | { ok: false; error: string }

type BillingMutationResponse =
  | { ok: true; data: AdminBillingStore }
  | { ok: false; error: string }

const filters: Array<{ value: BillingFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PAID", label: "Pago" },
  { value: "PENDING", label: "Pendente" },
  { value: "OVERDUE", label: "Atrasado" },
  { value: "SUSPENDED", label: "Suspenso" },
]

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getTodayInputValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`
}

function formatDate(value: string | null, timeZone: string) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date(value))
    : "—"
}

function billingStatusClassName(status: BillingStatus) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-800"
  if (status === "OVERDUE") return "bg-red-100 text-red-800"
  return "bg-amber-100 text-amber-800"
}

function billingStatusLabel(status: BillingStatus) {
  if (status === "PAID") return "Pago"
  if (status === "OVERDUE") return "Atrasado"
  return "Pendente"
}

function formatPeriod(value: string | null) {
  const match = value?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) return "—"

  const monthLabels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ]

  return `${monthLabels[Number(match[2]) - 1]}/${match[1]}`
}

type StoreActionsProps = {
  store: AdminBillingStore
  disabled: boolean
  onMarkPaid: (store: AdminBillingStore) => void
  onManage: (store: AdminBillingStore) => void
}

function StoreActions({
  store,
  disabled,
  onMarkPaid,
  onManage,
}: StoreActionsProps) {
  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="primary"
        className="h-7 w-full px-2 text-xs"
        disabled={disabled}
        onClick={() => onMarkPaid(store)}
      >
        Marcar pago
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 w-full px-2 text-xs"
        disabled={disabled}
        onClick={() => onManage(store)}
      >
        Gerenciar
      </Button>
    </div>
  )
}

export function BillingAdmin() {
  const [stores, setStores] = useState<AdminBillingStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingTimeZone, setBillingTimeZone] = useState(
    "America/Sao_Paulo"
  )
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<BillingFilter>("ALL")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [processingStoreId, setProcessingStoreId] = useState<string | null>(null)
  const [editStore, setEditStore] = useState<AdminBillingStore | null>(null)
  const [paidStore, setPaidStore] = useState<AdminBillingStore | null>(null)
  const [manageStore, setManageStore] = useState<AdminBillingStore | null>(null)
  const [operationalChange, setOperationalChange] = useState<{
    store: AdminBillingStore
    action: "suspend" | "activate"
  } | null>(null)
  const [operationalNotes, setOperationalNotes] = useState("")
  const [editForm, setEditForm] = useState({
    monthlyAmount: "",
    dueDay: "",
    notes: "",
  })
  const [paidForm, setPaidForm] = useState({
    period: getCurrentPeriod(),
    amount: "",
    paidAt: getTodayInputValue(),
    notes: "",
    reactivate: false,
  })

  async function loadStores() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/billing/stores", {
        cache: "no-store",
      })
      const json = (await response.json().catch(() => null)) as
        | BillingListResponse
        | null

      if (!response.ok || !json?.ok) {
        setError(
          json && !json.ok
            ? json.error
            : "Não foi possível carregar o financeiro das lojas."
        )
        return
      }

      setStores(json.data)
      setBillingTimeZone(json.meta.timeZone)
    } catch {
      setError("Não foi possível carregar o financeiro das lojas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStores()
  }, [])

  const visibleStores = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR")

    return stores.filter((store) => {
      if (
        filter === "SUSPENDED" &&
        store.operationalStatus !== "SUSPENDED"
      ) {
        return false
      }

      if (
        filter !== "ALL" &&
        filter !== "SUSPENDED" &&
        store.billingStatus !== filter
      ) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [store.name, store.slug, store.owner?.name, store.owner?.email]
        .filter(Boolean)
        .some((value) =>
          value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
        )
    })
  }, [filter, search, stores])

  const nextDuePreview = useMemo(() => {
    if (!editForm.dueDay) {
      return null
    }

    const dueDay = Number(editForm.dueDay)
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return null
    }

    return calculateNextDueAt(
      dueDay,
      new Date(),
      billingTimeZone
    ).toISOString()
  }, [billingTimeZone, editForm.dueDay])

  function replaceStore(updated: AdminBillingStore) {
    setStores((current) =>
      current.map((store) =>
        store.storeId === updated.storeId ? updated : store
      )
    )
  }

  async function mutateStore(
    store: AdminBillingStore,
    path: string,
    body: unknown
  ) {
    setProcessingStoreId(store.storeId)

    try {
      const response = await fetch(
        `/api/admin/billing/stores/${store.storeId}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      const json = (await response.json().catch(() => null)) as
        | BillingMutationResponse
        | null

      if (!response.ok || !json?.ok) {
        toast.error(
          json && !json.ok ? json.error : "Não foi possível atualizar a loja."
        )
        return false
      }

      replaceStore(json.data)
      return true
    } catch {
      toast.error("Não foi possível atualizar a loja.")
      return false
    } finally {
      setProcessingStoreId(null)
    }
  }

  function openEdit(store: AdminBillingStore) {
    setEditForm({
      monthlyAmount:
        store.monthlyAmount === null ? "" : String(store.monthlyAmount),
      dueDay: store.dueDay === null ? "" : String(store.dueDay),
      notes: store.notes ?? "",
    })
    setEditStore(store)
  }

  function openMarkPaid(store: AdminBillingStore) {
    setPaidForm({
      period: getCurrentPeriod(),
      amount: store.monthlyAmount === null ? "" : String(store.monthlyAmount),
      paidAt: getTodayInputValue(),
      notes: "",
      reactivate: store.operationalStatus === "SUSPENDED",
    })
    setPaidStore(store)
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editStore) return

    setProcessingStoreId(editStore.storeId)

    try {
      const response = await fetch(
        `/api/admin/billing/stores/${editStore.storeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthlyAmount:
              editForm.monthlyAmount === ""
                ? null
                : Number(editForm.monthlyAmount),
            dueDay: editForm.dueDay === "" ? null : Number(editForm.dueDay),
            notes: editForm.notes.trim() || null,
          }),
        }
      )
      const json = (await response.json().catch(() => null)) as
        | BillingMutationResponse
        | null

      if (!response.ok || !json?.ok) {
        toast.error(
          json && !json.ok
            ? json.error
            : "Não foi possível salvar a configuração."
        )
        return
      }

      replaceStore(json.data)
      setEditStore(null)
      toast.success("Configuração financeira atualizada.")
    } catch {
      toast.error("Não foi possível salvar a configuração.")
    } finally {
      setProcessingStoreId(null)
    }
  }

  async function savePayment(event: FormEvent) {
    event.preventDefault()
    if (!paidStore) return

    const succeeded = await mutateStore(paidStore, "mark-paid", {
      period: paidForm.period,
      amount: paidForm.amount === "" ? null : Number(paidForm.amount),
      paidAt: new Date(`${paidForm.paidAt}T12:00:00`).toISOString(),
      notes: paidForm.notes.trim() || null,
      reactivate: paidForm.reactivate,
    })

    if (succeeded) {
      setPaidStore(null)
      toast.success("Pagamento registrado.")
    }
  }

  async function markPending(store: AdminBillingStore) {
    const succeeded = await mutateStore(store, "mark-pending", {
      period: getCurrentPeriod(),
    })
    if (succeeded) toast.success("Loja marcada como pendente.")
  }

  async function markOverdue(store: AdminBillingStore) {
    const succeeded = await mutateStore(store, "mark-overdue", {
      period: getCurrentPeriod(),
    })
    if (succeeded) toast.success("Loja marcada como atrasada.")
  }

  function openOperationalChange(
    store: AdminBillingStore,
    action: "suspend" | "activate"
  ) {
    setOperationalNotes("")
    setOperationalChange({ store, action })
  }

  async function saveOperationalChange(event: FormEvent) {
    event.preventDefault()
    if (!operationalChange) return

    const succeeded = await mutateStore(
      operationalChange.store,
      operationalChange.action,
      { notes: operationalNotes.trim() || null }
    )

    if (succeeded) {
      toast.success(
        operationalChange.action === "suspend"
          ? "Loja suspensa."
          : "Loja reativada."
      )
      setOperationalChange(null)
    }
  }

  function runManagedAction(
    action: "pending" | "overdue" | "operational" | "edit"
  ) {
    if (!manageStore) return

    const store = manageStore
    setManageStore(null)

    if (action === "pending") {
      void markPending(store)
      return
    }

    if (action === "overdue") {
      void markOverdue(store)
      return
    }

    if (action === "operational") {
      openOperationalChange(
        store,
        store.operationalStatus === "ACTIVE" ? "suspend" : "activate"
      )
      return
    }

    openEdit(store)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="billing-search">Buscar loja ou owner</Label>
            <p className="text-xs text-muted-foreground sm:hidden">
              {visibleStores.length} de {stores.length} lojas
            </p>
          </div>
          <Input
            id="billing-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome da loja, owner ou e-mail"
          />
        </div>

        <p className="hidden whitespace-nowrap text-sm text-muted-foreground sm:block">
          {visibleStores.length} de {stores.length} lojas
        </p>
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          aria-expanded={mobileFiltersOpen}
          aria-controls="mobile-billing-filters"
          onClick={() => setMobileFiltersOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-800 shadow-sm"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filtrar lojas
          </span>
          <span className="flex items-center gap-2 text-xs text-gray-500">
            {filters.find((item) => item.value === filter)?.label}
            <ChevronDown
              className={`size-4 transition-transform ${
                mobileFiltersOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {mobileFiltersOpen ? (
          <div
            id="mobile-billing-filters"
            className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
          >
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFilter(item.value)
                  setMobileFiltersOpen(false)
                }}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  filter === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden flex-wrap gap-2 sm:flex">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${
              filter === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => void loadStores()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : loading ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Carregando lojas...
        </div>
      ) : visibleStores.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Nenhuma loja encontrada para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:hidden lg:grid-cols-2">
            {visibleStores.map((store) => {
              const isProcessing = processingStoreId === store.storeId

              return (
                <article
                  key={store.storeId}
                  className={`rounded-xl border p-4 shadow-sm ${
                    store.operationalStatus === "SUSPENDED"
                      ? "border-red-200 bg-red-50/50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900">
                        {store.name}
                      </h2>
                      <p
                        className="truncate text-xs text-gray-500"
                        title={store.slug}
                      >
                        {store.slug}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                        store.operationalStatus === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {store.operationalStatus === "ACTIVE"
                        ? "Ativa"
                        : "Suspensa"}
                    </span>
                  </div>

                  {!store.active ? (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      Store.active inativa
                    </p>
                  ) : null}

                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Owner
                    </p>
                    {store.owner ? (
                      <div className="mt-1">
                        <p className="text-sm font-medium text-gray-900">
                          {store.owner.name}
                        </p>
                        <p className="break-all text-xs leading-5 text-gray-500">
                          {store.owner.email}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">Sem owner</p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Status
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${billingStatusClassName(
                            store.billingStatus
                          )}`}
                        >
                          {billingStatusLabel(store.billingStatus)}
                        </span>
                        {!store.configured ? (
                          <span className="inline-flex whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            Não configurado
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Assinatura
                      </p>
                      <dl className="mt-2 space-y-1.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Valor</dt>
                          <dd className="whitespace-nowrap font-medium text-gray-900">
                            {store.monthlyAmount === null
                              ? "—"
                              : currencyFormatter.format(store.monthlyAmount)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Período</dt>
                          <dd className="whitespace-nowrap font-medium text-gray-900">
                            {formatPeriod(store.currentPeriod)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-gray-500">Próximo</dt>
                          <dd className="whitespace-nowrap font-medium text-gray-900">
                            {formatDate(store.nextDueAt, billingTimeZone)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Pagamentos
                    </p>
                    <p className="mt-1 whitespace-nowrap text-sm text-gray-700">
                      Último:{" "}
                      <span className="font-medium text-gray-900">
                        {formatDate(store.lastPaidAt, billingTimeZone)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <StoreActions
                      store={store}
                      disabled={isProcessing}
                      onMarkPaid={openMarkPaid}
                      onManage={setManageStore}
                    />
                  </div>
                </article>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white xl:block">
            <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Loja
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Owner
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Assinatura
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Pagamentos
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleStores.map((store) => {
                  const isProcessing = processingStoreId === store.storeId

                  return (
                    <tr
                      key={store.storeId}
                      className={`border-b align-top last:border-b-0 ${
                        store.operationalStatus === "SUSPENDED"
                          ? "bg-red-50/50"
                          : "hover:bg-gray-50/70"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium leading-5 text-gray-900">
                          {store.name}
                        </p>
                        <p
                          className="mt-0.5 truncate text-xs text-gray-500"
                          title={store.slug}
                        >
                          {store.slug}
                        </p>
                        {!store.active ? (
                          <p className="mt-1 text-xs font-medium text-red-700">
                            Store.active inativa
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        {store.owner ? (
                          <>
                            <p className="font-medium leading-5 text-gray-900">
                              {store.owner.name}
                            </p>
                            <p className="mt-0.5 break-all text-xs leading-5 text-gray-500">
                              {store.owner.email}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-500">Sem owner</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${billingStatusClassName(
                              store.billingStatus
                            )}`}
                          >
                            {billingStatusLabel(store.billingStatus)}
                          </span>
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                              store.operationalStatus === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {store.operationalStatus === "ACTIVE"
                              ? "Ativa"
                              : "Suspensa"}
                          </span>
                          {!store.configured ? (
                            <span className="whitespace-nowrap text-xs text-gray-500">
                              Não configurado
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <dl className="grid grid-cols-[64px_auto] items-center justify-start gap-x-3 gap-y-1.5">
                          <dt className="text-xs text-gray-500">Valor</dt>
                          <dd className="whitespace-nowrap font-medium text-gray-900">
                            {store.monthlyAmount === null
                              ? "—"
                              : currencyFormatter.format(store.monthlyAmount)}
                          </dd>
                          <dt className="text-xs text-gray-500">Período</dt>
                          <dd className="whitespace-nowrap font-medium text-gray-900">
                            {formatPeriod(store.currentPeriod)}
                          </dd>
                          <dt className="text-xs text-gray-500">Próximo</dt>
                          <dd className="whitespace-nowrap font-medium text-gray-900">
                            {formatDate(store.nextDueAt, billingTimeZone)}
                          </dd>
                        </dl>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-gray-500">Último pagamento</p>
                        <p className="mt-1 whitespace-nowrap font-medium text-gray-900">
                          {formatDate(store.lastPaidAt, billingTimeZone)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StoreActions
                          store={store}
                          disabled={isProcessing}
                          onMarkPaid={openMarkPaid}
                          onManage={setManageStore}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(manageStore)}
        onOpenChange={(open) => {
          if (!open) setManageStore(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar assinatura</DialogTitle>
            <DialogDescription>{manageStore?.name}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={processingStoreId === manageStore?.storeId}
              onClick={() => runManagedAction("pending")}
            >
              Marcar pendente
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={processingStoreId === manageStore?.storeId}
              onClick={() => runManagedAction("overdue")}
            >
              Marcar atrasado
            </Button>
            <Button
              type="button"
              variant={
                manageStore?.operationalStatus === "ACTIVE"
                  ? "destructive"
                  : "secondary"
              }
              disabled={processingStoreId === manageStore?.storeId}
              onClick={() => runManagedAction("operational")}
            >
              {manageStore?.operationalStatus === "ACTIVE"
                ? "Suspender loja"
                : "Reativar loja"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={processingStoreId === manageStore?.storeId}
              onClick={() => runManagedAction("edit")}
            >
              Editar assinatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editStore)}
        onOpenChange={(open) => {
          if (!open) setEditStore(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar assinatura</DialogTitle>
            <DialogDescription>{editStore?.name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billing-monthly-amount">Valor mensal</Label>
                <Input
                  id="billing-monthly-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.monthlyAmount}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      monthlyAmount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-due-day">Dia do vencimento</Label>
                <Input
                  id="billing-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={editForm.dueDay}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      dueDay: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                Próximo vencimento automático
              </p>
              <p className="text-sm text-gray-600">
                {nextDuePreview
                  ? `Próximo vencimento calculado: ${formatDate(
                      nextDuePreview,
                      billingTimeZone
                    )}`
                  : "Informe um dia de vencimento entre 1 e 31 para calcular."}
              </p>
              <p className="text-xs text-gray-500">
                Em meses mais curtos, será usado o último dia válido.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-notes">Observação</Label>
              <Textarea
                id="billing-notes"
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                maxLength={1000}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditStore(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={processingStoreId === editStore?.storeId}
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(paidStore)}
        onOpenChange={(open) => {
          if (!open) setPaidStore(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>{paidStore?.name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={savePayment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-period">Período</Label>
                <Input
                  id="payment-period"
                  type="month"
                  required
                  value={paidForm.period}
                  onChange={(event) =>
                    setPaidForm((current) => ({
                      ...current,
                      period: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Valor pago</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidForm.amount}
                  onChange={(event) =>
                    setPaidForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Pago em</Label>
              <Input
                id="payment-date"
                type="date"
                required
                value={paidForm.paidAt}
                onChange={(event) =>
                  setPaidForm((current) => ({
                    ...current,
                    paidAt: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Observação</Label>
              <Textarea
                id="payment-notes"
                value={paidForm.notes}
                onChange={(event) =>
                  setPaidForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                maxLength={1000}
              />
            </div>
            {paidStore?.operationalStatus === "SUSPENDED" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={paidForm.reactivate}
                  onChange={(event) =>
                    setPaidForm((current) => ({
                      ...current,
                      reactivate: event.target.checked,
                    }))
                  }
                />
                Reativar a loja ao registrar o pagamento
              </label>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaidStore(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={processingStoreId === paidStore?.storeId}
              >
                Registrar pagamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(operationalChange)}
        onOpenChange={(open) => {
          if (!open) setOperationalChange(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {operationalChange?.action === "suspend"
                ? "Suspender loja"
                : "Reativar loja"}
            </DialogTitle>
            <DialogDescription>
              {operationalChange?.store.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveOperationalChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operational-notes">
                {operationalChange?.action === "suspend"
                  ? "Motivo da suspensão"
                  : "Observação da reativação"}
              </Label>
              <Textarea
                id="operational-notes"
                value={operationalNotes}
                onChange={(event) => setOperationalNotes(event.target.value)}
                maxLength={1000}
                placeholder="Registro interno opcional"
              />
            </div>
            {operationalChange?.action === "suspend" ? (
              <p className="text-sm text-red-700">
                A loja manterá acesso somente ao dashboard, à assinatura e ao
                logout.
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOperationalChange(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={
                  operationalChange?.action === "suspend"
                    ? "destructive"
                    : "primary"
                }
                disabled={
                  processingStoreId === operationalChange?.store.storeId
                }
              >
                {operationalChange?.action === "suspend"
                  ? "Confirmar suspensão"
                  : "Confirmar reativação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
