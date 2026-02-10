export type RelationshipOption = {
  _id: string
  value: string
}

export const RELATIONSHIPS: RelationshipOption[] = [
  { _id: "parent", value: "Pai / Mãe" },
  { _id: "sibling", value: "Irmão / Irmã" },
  { _id: "partner", value: "Cônjuge / Parceiro(a)" },
  { _id: "relative", value: "Parente" },
  { _id: "friend", value: "Amigo(a)" },
  { _id: "other", value: "Outro" },
]

