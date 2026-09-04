import type { Cell, Puzzle, RegionMap, Tier } from './types.ts'
import type { Rng } from './rng.ts'
import type { DeduceResult } from './solver.ts'
import { makeRng, pick, shuffled } from './rng.ts'
import { countSolutions, isConnected, neighbours4, regionCells, sameSolution, solutionsOf } from './board.ts'
import { TIER_INDEX, deduce } from './solver.ts'

export interface GenerateOptions {
  /** Restarts before giving up. Each is a fresh placement, growth and repair. */
  tries?: number
  /** Reject boards with a beam smaller than this — slivers look like mistakes. */
  minRegion?: number
  /** Reject boards with a beam larger than this. */
  maxRegion?: number
  /** Aim for this difficulty. Best effort: an easier board is not always reachable. */
  targetTier?: Tier
  /** Hill-climbing steps spent making the board easier. */
  easeBudget?: number
}

/**
 * One cat per row and column with no two in touching columns. Rejection sampling
 * is fine here: a few percent of permutations qualify, so this lands quickly.
 */
function placement(n: number, rand: Rng): number[] | null {
  const seq = Array.from({ length: n }, (_, i) => i)
  for (let t = 0; t < 4000; t++) {
    const p = shuffled(seq, rand)
    if (p.every((c, i) => i === 0 || Math.abs(c - p[i - 1]) >= 2)) return p
  }
  return null
}

/**
 * Seed one beam on each cat and let them race outward. The skip keeps growth
 * uneven, which is what gives the beams their irregular hand-drawn shapes.
 */
function growRegions(solution: number[], rand: Rng): RegionMap | null {
  const n = solution.length
  const regions: RegionMap = Array.from({ length: n }, () => Array<number>(n).fill(-1))
  const frontier: Cell[][] = solution.map((c, r) => {
    regions[r][c] = r
    return [{ r, c }]
  })

  let left = n * n - n
  let guard = 0
  while (left > 0 && guard++ < n * n * 40) {
    for (let g = 0; g < n && left > 0; g++) {
      if (rand() < 0.35) continue
      const opts: Cell[] = []
      for (const cell of frontier[g]) {
        for (const nb of neighbours4(cell.r, cell.c, n)) {
          if (regions[nb.r][nb.c] === -1) opts.push(nb)
        }
      }
      if (opts.length === 0) continue
      const chosen = pick(opts, rand)
      regions[chosen.r][chosen.c] = g
      frontier[g].push(chosen)
      left--
    }
  }

  // Anything the race stranded goes to whichever beam already touches it.
  for (let pass = 0; pass < n * n && left > 0; pass++) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (regions[r][c] !== -1) continue
        const near = neighbours4(r, c, n)
          .map((x) => regions[x.r][x.c])
          .filter((g) => g >= 0)
        if (near.length === 0) continue
        regions[r][c] = pick(near, rand)
        left--
      }
    }
  }
  return left === 0 ? regions : null
}

/** Every legal single-cell reshaping of the beams, ignoring the cats' own squares. */
function boundaryMoves(regions: RegionMap, solution: number[]): Array<{ cell: Cell; from: number; to: number }> {
  const n = regions.length
  const fixed = new Set(solution.map((c, r) => r * n + c))
  const out: Array<{ cell: Cell; from: number; to: number }> = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (fixed.has(r * n + c)) continue
      const from = regions[r][c]
      for (const nb of neighbours4(r, c, n)) {
        const to = regions[nb.r][nb.c]
        if (to !== from) out.push({ cell: { r, c }, from, to })
      }
    }
  }
  return out
}

function sizesOk(regions: RegionMap, min: number, max: number): boolean {
  for (let g = 0; g < regions.length; g++) {
    const size = regionCells(regions, g).length
    if (size < min || size > max) return false
  }
  return true
}

/**
 * Random beams almost never yield a unique board — measured over 3000 boards, not
 * one had a single solution. So rather than generate-and-retry, we repair: take an
 * unwanted solution, and move one of its squares into a beam that same solution
 * already uses. That forces two cats into one beam and kills it outright. Repeat
 * until only the intended solution survives.
 */
function repair(regions: RegionMap, solution: number[], rand: Rng): boolean {
  const n = regions.length
  for (let step = 0; step < 500; step++) {
    const sols = solutionsOf(regions, 6)
    const alts = sols.filter((s) => !sameSolution(s, solution))
    if (alts.length === 0) return sols.length === 1

    const alt = pick(alts, rand)
    const moves: Array<{ cell: Cell; from: number; to: number }> = []
    for (let r = 0; r < n; r++) {
      const c = alt[r]
      if (solution[r] === c) continue // never touch a square the real solution needs
      const from = regions[r][c]
      for (const nb of neighbours4(r, c, n)) {
        const to = regions[nb.r][nb.c]
        if (to === from) continue
        if (!alt.some((ac, ar) => regions[ar][ac] === to)) continue
        moves.push({ cell: { r, c }, from, to })
      }
    }

    let moved = false
    for (const m of shuffled(moves, rand)) {
      regions[m.cell.r][m.cell.c] = m.to
      if (isConnected(regions, m.from) && isConnected(regions, m.to)) {
        moved = true
        break
      }
      regions[m.cell.r][m.cell.c] = m.from
    }
    if (!moved) return false
  }
  return false
}

function rank(d: DeduceResult): number {
  return d.solved ? TIER_INDEX[d.tier] * 10000 + d.score : Number.MAX_SAFE_INTEGER
}

/**
 * Repair stops the moment a board becomes unique, which is exactly the hardest a
 * board can be — every deduction is load-bearing. Easy levels need the opposite:
 * redundant constraint, so simple rules suffice. So we keep reshaping past
 * uniqueness, accepting any move that lowers the tier or the score. Without this
 * pass every generated board comes out at the top difficulty.
 */
function ease(
  regions: RegionMap,
  solution: number[],
  rand: Rng,
  budget: number,
  min: number,
  max: number,
  target?: Tier,
): DeduceResult {
  let cur = deduce(regions)
  let bestRank = rank(cur)
  let bestResult = cur
  let bestRegions = regions.map((row) => row.slice())
  let stale = 0

  for (let step = 0; step < budget; step++) {
    if (target !== undefined && bestResult.solved && bestResult.tier === target) break
    let moved = false
    for (const m of shuffled(boundaryMoves(regions, solution), rand).slice(0, 36)) {
      regions[m.cell.r][m.cell.c] = m.to
      const legal =
        isConnected(regions, m.from) &&
        isConnected(regions, m.to) &&
        sizesOk(regions, min, max) &&
        countSolutions(regions, 2) === 1
      if (legal) {
        const next = deduce(regions)
        // Sideways moves are accepted too: strict descent stalls on plateaus long
        // before it reaches the easy tiers.
        if (rank(next) <= rank(cur)) {
          cur = next
          moved = true
          if (rank(next) < bestRank) {
            bestRank = rank(next)
            bestResult = next
            bestRegions = regions.map((row) => row.slice())
            stale = 0
          }
          break
        }
      }
      regions[m.cell.r][m.cell.c] = m.from
    }
    if (!moved) break
    if (++stale > 30) break
  }

  // Wandering sideways can leave the board worse than its best; put the best back.
  for (let r = 0; r < regions.length; r++) {
    for (let c = 0; c < regions.length; c++) regions[r][c] = bestRegions[r][c]
  }
  return bestResult
}

export function generate(n: number, seed: number, opts: GenerateOptions = {}): Puzzle | null {
  const tries = opts.tries ?? 200
  const minRegion = opts.minRegion ?? 3
  const maxRegion = opts.maxRegion ?? Math.max(6, Math.round(n * 1.8))
  const easeBudget = opts.easeBudget ?? 90

  for (let restart = 0; restart < tries; restart++) {
    // A fresh stream per restart, so one unlucky board cannot poison the rest
    // while the whole run stays reproducible from `seed`.
    const rand = makeRng((seed + restart * 2654435761) >>> 0)

    const solution = placement(n, rand)
    if (solution === null) continue
    const regions = growRegions(solution, rand)
    if (regions === null) continue
    if (!repair(regions, solution, rand)) continue

    const result = ease(regions, solution, rand, easeBudget, minRegion, maxRegion, opts.targetTier)

    // Uniqueness alone still allows a board only brute force can crack. It ships
    // only if the human rules finish it, and finish it on the intended answer.
    if (!result.solved || !sameSolution(result.solution, solution)) continue
    if (!sizesOk(regions, minRegion, maxRegion)) continue
    if (opts.targetTier !== undefined && result.tier !== opts.targetTier) continue

    return {
      n,
      regions,
      solution,
      tier: result.tier,
      hardestRule: result.hardestRule,
      score: result.score,
      steps: result.steps,
      seed,
    }
  }
  return null
}

/**
 * Smallest beam a tier is allowed. This is not a cosmetic knob: `only-square`
 * cannot fire on the opening move unless some beam has exactly one square, so a
 * gentle board is unreachable without one. That single-square beam is the genre's
 * standard teaching device — it shows a new player what a beam is in one move.
 * Harder tiers forbid it, because there it would just give the answer away.
 */
const MIN_BEAM: Record<Tier, number> = {
  gentle: 1,
  warm: 2,
  bright: 3,
  blazing: 3,
}

/** Walk a deterministic seed sequence looking for a board in the requested tier. */
export function generateInTier(
  n: number,
  seed: number,
  tier: Tier,
  opts: GenerateOptions = {},
): Puzzle | null {
  for (let bump = 0; bump < 40; bump++) {
    const p = generate(n, (seed + bump * 40503) >>> 0, {
      ...opts,
      targetTier: tier,
      minRegion: opts.minRegion ?? MIN_BEAM[tier],
      tries: opts.tries ?? 30,
      easeBudget: opts.easeBudget ?? 160,
    })
    if (p !== null) return p
  }
  return null
}

/**
 * Always returns a board. Walks a deterministic seed sequence, so a seed whose
 * first board fails still yields the same puzzle on every device — which is what
 * the daily puzzle depends on.
 */
export function generateAlways(n: number, seed: number, opts: GenerateOptions = {}): Puzzle {
  for (let bump = 0; bump < 64; bump++) {
    const p = generate(n, (seed + bump * 40503) >>> 0, opts)
    if (p !== null) return p
  }
  // Last resort: drop the tier target rather than hand back nothing.
  const { targetTier: _drop, ...rest } = opts
  for (let bump = 0; bump < 64; bump++) {
    const p = generate(n, (seed + bump * 40503) >>> 0, { ...rest, tries: 200 })
    if (p !== null) return p
  }
  throw new Error(`could not generate a ${n}x${n} board from seed ${seed}`)
}
