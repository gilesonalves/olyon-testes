import type { Card } from "@/core/types"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

type CardViewProps = {
  card: Card
  size?: "sm" | "md" | "lg"
  isSelectable?: boolean
  onClick?: () => void
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<CardViewProps["size"]>, string> = {
  sm: "w-[86px] h-[120px]",
  md: "w-[110px] h-[150px]",
  lg: "w-[160px] h-[220px]",
}

const RARITY_FRAME: Record<Card["rarity"], string> = {
  common: "border border-white/10",
  rare: "border border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_18px_rgba(34,211,238,0.12)]",
  legendary:
    "border border-amber-300/50 shadow-[0_0_0_1px_rgba(252,211,77,0.30),0_0_22px_rgba(252,211,77,0.16)]",
}

export function CardView({
  card,
  size = "md",
  isSelectable,
  onClick,
  className,
}: CardViewProps) {
  const imageSrc = card.imageUrl || "/cards/placeholder.png"
  const isSmall = size === "sm"
  const badgeClass = cn(
    "bg-black/60 backdrop-blur-sm rounded-md text-white font-extrabold drop-shadow",
    isSmall ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs"
  )
  const frameBySize =
    isSmall && card.rarity !== "common"
      ? card.rarity === "rare"
        ? "border border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]"
        : "border border-amber-300/50 shadow-[0_0_0_1px_rgba(252,211,77,0.22)]"
      : RARITY_FRAME[card.rarity]
  const rarityAccent =
    card.rarity === "rare"
      ? "ring-1 ring-cyan-300/40"
      : card.rarity === "legendary"
        ? "ring-1 ring-amber-300/50"
        : ""
  const selectedGlow =
    card.rarity === "legendary"
      ? [
          "0 0 0 1px rgba(252,211,77,0.35)",
          "0 0 18px rgba(252,211,77,0.22)",
          "0 0 0 1px rgba(252,211,77,0.45)",
          "0 0 18px rgba(252,211,77,0.22)",
        ]
      : [
          "0 0 0 1px rgba(16,185,129,0.30)",
          "0 0 16px rgba(16,185,129,0.20)",
          "0 0 0 1px rgba(16,185,129,0.38)",
          "0 0 16px rgba(16,185,129,0.20)",
        ]
  const shouldGlow = false

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-md bg-black text-white shadow-sm",
        SIZE_CLASSES[size],
        frameBySize,
        rarityAccent,
        isSelectable && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={isSelectable ? "button" : undefined}
      aria-pressed={isSelectable ? false : undefined}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: shouldGlow ? selectedGlow : undefined,
      }}
      whileHover={
        isSelectable ? { scale: 1.03, y: -2, transition: { duration: 0.15 } } : undefined
      }
      whileTap={isSelectable ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <img
        src={imageSrc}
        alt={card.name}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          const target = event.currentTarget
          if (target.src.endsWith("/cards/placeholder.png")) return
          target.src = "/cards/placeholder.png"
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/70" />
      {card.rarity === "legendary" && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent"
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="absolute inset-0 z-10">
        <div className={cn("absolute left-1/2 top-1 -translate-x-1/2", badgeClass)}>
          {card.sides.n}
        </div>
        <div className={cn("absolute right-1 top-1/2 -translate-y-1/2", badgeClass)}>
          {card.sides.e}
        </div>
        <div className={cn("absolute left-1/2 bottom-1 -translate-x-1/2", badgeClass)}>
          {card.sides.s}
        </div>
        <div className={cn("absolute left-1 top-1/2 -translate-y-1/2", badgeClass)}>
          {card.sides.w}
        </div>
      </div>

      {!isSmall && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 px-2 py-1 text-center text-xs font-medium text-white">
          <span className="block truncate">{card.name}</span>
        </div>
      )}
    </motion.div>
  )
}
