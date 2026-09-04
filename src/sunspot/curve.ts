import type { Puzzle, Tier } from './types.ts'
import { generateAlways, generateInTier } from './generator.ts'

export interface LevelSpec {
  n: number
  tier: Tier
}

/**
 * The difficulty ladder. Board size grows before rule difficulty does — a new
 * player should meet a bigger grid well before they meet a harder deduction,
 * because a bigger grid still yields to the rules they already know.
 */
export function specFor(level: number): LevelSpec {
  if (level <= 6) return { n: 6, tier: 'gentle' }
  if (level <= 12) return { n: 7, tier: 'gentle' }
  if (level <= 20) return { n: 7, tier: 'warm' }
  if (level <= 40) return { n: 8, tier: 'warm' }
  if (level <= 70) return { n: 8, tier: 'bright' }
  if (level <= 110) return { n: 8, tier: 'blazing' }
  return { n: 9, tier: 'blazing' }
}

/** Deterministic per-level seed, so rebuilding the pack reproduces the same levels. */
export function levelSeed(level: number): number {
  return (level * 2654435761 + 0x9e3779b9) >>> 0
}

/**
 * Never returns null. If the requested tier proves unreachable for a seed we ship
 * a correct board of the nearest difficulty rather than leave a gap in the ladder.
 */
export function buildLevel(level: number): Puzzle {
  const spec = specFor(level)
  const seed = levelSeed(level)
  return generateInTier(spec.n, seed, spec.tier) ?? generateAlways(spec.n, seed)
}
