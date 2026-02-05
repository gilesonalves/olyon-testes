import { useMemo, useState } from "react"
import type { Card } from "@/core/types"
import { SIDE_LEGEND } from "@/core/constants/legend"
import { getCardsByIds } from "@/data/cards"
import { cn } from "@/lib/utils"
import { CardView } from "./CardView"

type DeckSelectorProps = {
  availableCardIds: string[]
  onConfirm: (selectedCards: Card[]) => void
  onCancel: () => void
  className?: string
}

const MAX_SELECTION = 5

export function DeckSelector({
  availableCardIds,
  onConfirm,
  onCancel,
  className,
}: DeckSelectorProps) {
  const availableCards = useMemo(
    () => getCardsByIds(availableCardIds),
    [availableCardIds]
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedCards = useMemo(
    () => getCardsByIds(selectedIds),
    [selectedIds]
  )
  const canConfirm = selectedIds.length === MAX_SELECTION

  function toggleCard(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      if (prev.length >= MAX_SELECTION) {
        return prev
      }
      return [...prev, id]
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {selectedIds.length}/{MAX_SELECTION}
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-white/5 px-2 py-1">
            Topo: {SIDE_LEGEND.n}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1">
            Direita: {SIDE_LEGEND.e}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1">
            Baixo: {SIDE_LEGEND.s}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-1">
            Esquerda: {SIDE_LEGEND.w}
          </span>
        </div>
      </div>

      {selectedCards.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {selectedCards.map((card) => (
            <CardView key={card.id} card={card} size="md" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {availableCards.map((card) => {
          const selected = selectedIds.includes(card.id)
          return (
            <CardView
              key={card.id}
              card={card}
              size="sm"
              isSelectable
              onClick={() => toggleCard(card.id)}
              className={cn(
                "transition ring-2 ring-transparent",
                selected && "ring-emerald-400"
              )}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(selectedCards)}
          disabled={!canConfirm}
          className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
