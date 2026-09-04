import type { Puzzle } from './types.ts'
import { generateAlways } from './generator.ts'

/**
 * FNV-1a over the UTC date. Everyone gets the same puzzle on the same day with no
 * backend and no accounts — the date is the only input.
 */
export function dailySeed(date: Date): number {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
  let h = 2166136261 >>> 0
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export function dailyPuzzle(date: Date, n = 8): Puzzle {
  return generateAlways(n, dailySeed(date))
}
