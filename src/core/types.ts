export type CardSides = {
  n: number
  e: number
  s: number
  w: number
}

export type Rarity = "common" | "rare" | "legendary"

export type Element =
  | "fire"
  | "ice"
  | "wind"
  | "earth"
  | "water"
  | "thunder"
  | "dark"
  | "holy"
  | null

export type Card = {
  id: string
  name: string
  sides: CardSides
  rarity: Rarity
  element: Element
  imageUrl?: string
}
