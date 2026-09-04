import type { Puzzle, Tier } from './types.ts'
import { generateAlways, generateInTier } from './generator.ts'

export interface LevelSpec {
  n: number
  tier: Tier
  /** Which named run of levels this belongs to — the map groups stages by these. */
  chapter: string
}

/**
 * The stage ladder. Board size steps 6 → 8 → 10, and each size climbs its own
 * tier ladder before the next size opens.
 *
 * Size and deduction depth are the only two levers that genuinely make a board
 * harder. Blocked squares are the obvious-looking third one and it does not work:
 * removing candidate squares only shrinks the search, so a board with props on it
 * is strictly easier than the same board without them. Props are decoration and
 * variety, never difficulty.
 */
export function specFor(level: number): LevelSpec {
  if (level <= 10) return { n: 6, tier: 'gentle', chapter: 'The Sunroom' }
  if (level <= 25) return { n: 6, tier: 'warm', chapter: 'The Sunroom' }
  if (level <= 40) return { n: 8, tier: 'warm', chapter: 'The Garden' }
  if (level <= 65) return { n: 8, tier: 'bright', chapter: 'The Garden' }
  if (level <= 90) return { n: 8, tier: 'blazing', chapter: 'The Garden' }
  if (level <= 110) return { n: 10, tier: 'warm', chapter: 'The Attic' }
  if (level <= 140) return { n: 10, tier: 'bright', chapter: 'The Attic' }
  return { n: 10, tier: 'blazing', chapter: 'The Attic' }
}

/** The chapters in order, with the level each one opens on. */
export const CHAPTERS: Array<{ name: string; from: number; n: number }> = [
  { name: 'The Sunroom', from: 1, n: 6 },
  { name: 'The Garden', from: 26, n: 8 },
  { name: 'The Attic', from: 91, n: 10 },
]

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
  // 10x10 searches are far slower, so give the big boards a smaller ease budget
  // and lean on seed-walking instead of long hill-climbs.
  const opts = spec.n >= 10 ? { tries: 20, easeBudget: 60 } : {}
  return generateInTier(spec.n, seed, spec.tier, opts) ?? generateAlways(spec.n, seed, opts)
}
