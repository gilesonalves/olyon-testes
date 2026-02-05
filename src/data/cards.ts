/**
 * Card database - 30 original fantasy cards
 */

import type { Card } from "../core/types"

export const ALL_CARDS: Card[] = [
  // Common Cards (20)
  {
    id: "goblin-scout",
    name: "Batedor Goblin",
    sides: { n: 2, e: 3, s: 2, w: 4 },
    rarity: "common",
    element: null,
  },
  {
    id: "forest-sprite",
    name: "Sprite da Floresta",
    sides: { n: 3, e: 2, s: 4, w: 2 },
    rarity: "common",
    element: "wind",
  },
  {
    id: "stone-golem",
    name: "Golem de Pedra",
    sides: { n: 5, e: 2, s: 3, w: 2 },
    rarity: "common",
    element: "earth",
  },
  {
    id: "river-serpent",
    name: "Serpente do Rio",
    sides: { n: 2, e: 4, s: 3, w: 3 },
    rarity: "common",
    element: "water",
  },
  {
    id: "wind-wisp",
    name: "Fogo-fátuo do Vento",
    sides: { n: 4, e: 3, s: 2, w: 2 },
    rarity: "common",
    element: "wind",
  },
  {
    id: "flame-imp",
    name: "Diabrete das Chamas",
    sides: { n: 3, e: 4, s: 2, w: 3 },
    rarity: "common",
    element: "fire",
  },
  {
    id: "frost-pixie",
    name: "Pixie do Gelo",
    sides: { n: 2, e: 2, s: 5, w: 3 },
    rarity: "common",
    element: "ice",
  },
  {
    id: "thunder-hawk",
    name: "Falcão do Trovão",
    sides: { n: 4, e: 3, s: 3, w: 2 },
    rarity: "common",
    element: "thunder",
  },
  {
    id: "mud-crawler",
    name: "Rastejador de Lama",
    sides: { n: 3, e: 3, s: 3, w: 3 },
    rarity: "common",
    element: "earth",
  },
  {
    id: "cave-bat",
    name: "Morcego da Caverna",
    sides: { n: 1, e: 5, s: 2, w: 4 },
    rarity: "common",
    element: "dark",
  },
  {
    id: "sand-beetle",
    name: "Besouro da Areia",
    sides: { n: 4, e: 2, s: 2, w: 4 },
    rarity: "common",
    element: null,
  },
  {
    id: "moss-troll",
    name: "Troll do Musgo",
    sides: { n: 5, e: 3, s: 2, w: 1 },
    rarity: "common",
    element: "earth",
  },
  {
    id: "ember-snake",
    name: "Serpente de Brasas",
    sides: { n: 2, e: 5, s: 3, w: 2 },
    rarity: "common",
    element: "fire",
  },
  {
    id: "cloud-sprite",
    name: "Sprite das Nuvens",
    sides: { n: 4, e: 2, s: 3, w: 3 },
    rarity: "common",
    element: "wind",
  },
  {
    id: "swamp-frog",
    name: "Sapo do Pântano",
    sides: { n: 3, e: 3, s: 4, w: 2 },
    rarity: "common",
    element: "water",
  },
  {
    id: "iron-ant",
    name: "Formiga de Ferro",
    sides: { n: 2, e: 4, s: 4, w: 2 },
    rarity: "common",
    element: null,
  },
  {
    id: "spark-mouse",
    name: "Rato Faiscante",
    sides: { n: 3, e: 4, s: 2, w: 2 },
    rarity: "common",
    element: "thunder",
  },
  {
    id: "shadow-rat",
    name: "Rato das Sombras",
    sides: { n: 2, e: 3, s: 4, w: 3 },
    rarity: "common",
    element: "dark",
  },
  {
    id: "honey-bee",
    name: "Abelha do Mel",
    sides: { n: 3, e: 2, s: 3, w: 4 },
    rarity: "common",
    element: null,
  },
  {
    id: "snow-owl",
    name: "Coruja da Neve",
    sides: { n: 4, e: 4, s: 1, w: 2 },
    rarity: "common",
    element: "ice",
  },

  // Rare Cards (8)
  {
    id: "crystal-dragon",
    name: "Dragão de Cristal",
    sides: { n: 7, e: 5, s: 4, w: 5 },
    rarity: "rare",
    element: "ice",
  },
  {
    id: "phoenix-knight",
    name: "Cavaleiro Fênix",
    sides: { n: 6, e: 6, s: 4, w: 4 },
    rarity: "rare",
    element: "fire",
  },
  {
    id: "storm-titan",
    name: "Titã da Tempestade",
    sides: { n: 5, e: 7, s: 5, w: 3 },
    rarity: "rare",
    element: "thunder",
  },
  {
    id: "ancient-treant",
    name: "Ent Ancestral",
    sides: { n: 6, e: 4, s: 6, w: 4 },
    rarity: "rare",
    element: "earth",
  },
  {
    id: "deep-leviathan",
    name: "Leviatã das Profundezas",
    sides: { n: 4, e: 6, s: 5, w: 6 },
    rarity: "rare",
    element: "water",
  },
  {
    id: "void-specter",
    name: "Espectro do Vazio",
    sides: { n: 5, e: 5, s: 5, w: 5 },
    rarity: "rare",
    element: "dark",
  },
  {
    id: "sunfire-angel",
    name: "Anjo do Fogo Solar",
    sides: { n: 7, e: 4, s: 5, w: 4 },
    rarity: "rare",
    element: "holy",
  },
  {
    id: "tempest-griffin",
    name: "Grifo da Tempestade",
    sides: { n: 6, e: 5, s: 3, w: 6 },
    rarity: "rare",
    element: "wind",
  },

  // Legendary Cards (2)
  {
    id: "eternal-phoenix",
    name: "Fênix Eterna",
    sides: { n: 8, e: 7, s: 6, w: 7 },
    rarity: "legendary",
    element: "fire",
  },
  {
    id: "primordial-wyrm",
    name: "Wyrm Primordial",
    sides: { n: 7, e: 8, s: 7, w: 6 },
    rarity: "legendary",
    element: "dark",
  },
]

function withDefaultImage(card: Card): Card {
  return {
    ...card,
    imageUrl: card.imageUrl ?? `/cards/${card.id}.png`,
  }
}

/**
 * Get card by ID
 */
export function getCardById(id: string): Card | undefined {
  const card = ALL_CARDS.find((item) => item.id === id)
  return card ? withDefaultImage(card) : undefined
}

/**
 * Get multiple cards by IDs
 */
export function getCardsByIds(ids: string[]): Card[] {
  return ids
    .map((id) => getCardById(id))
    .filter((card): card is Card => card !== undefined)
}

/**
 * Get cards by rarity
 */
export function getCardsByRarity(rarity: Card["rarity"]): Card[] {
  return ALL_CARDS.filter((card) => card.rarity === rarity)
}

/**
 * Get random cards from a pool
 */
export function getRandomCards(count: number, pool: Card[] = ALL_CARDS): Card[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
