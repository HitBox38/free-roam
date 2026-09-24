export const PRESENCE_PALETTE = [
  "#3B82F6",
  "#F97316",
  "#10B981",
  "#A855F7",
  "#EAB308",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
] as const

function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

export function colorForUser(identityHex: string): string {
  const normalized = identityHex.trim().toLowerCase()
  const hash = fnv1aHash(normalized)
  return PRESENCE_PALETTE[hash % PRESENCE_PALETTE.length]
}
