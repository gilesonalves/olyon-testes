"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

type Store = { id: string; name: string; slug: string }
type Membership = { id: string; role: string }

type StoreContextValue = {
  store: Store | null
  membership: Membership | null
  loading: boolean
  refresh: () => Promise<void>
  switchStore: (storeId: string) => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/stores/current")
      const json = await res.json()
      if (json?.ok) {
        setStore(json.data?.store ?? null)
        setMembership(json.data?.membership ?? null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function switchStore(storeId: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/stores/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Falha ao trocar loja")
      setStore(json.data.store)
      setMembership(json.data.membership)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const value = useMemo(
    () => ({ store, membership, loading, refresh, switchStore }),
    [store, membership, loading]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useCurrentStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useCurrentStore must be used within StoreProvider")
  return ctx
}