import type { Puzzle, RegionMap, Tier } from './types.ts'
import { countSolutions, isConnected, regionCells, sameSolution } from './board.ts'
import { makeRng } from './rng.ts'
import { TIER_INDEX, deduce } from './solver.ts'
import { generate, generateAlways, generateInTier } from './generator.ts'
import { dailyPuzzle, dailySeed } from './daily.ts'

let failures = 0

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`)
  } else {
    failures++
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`)
  }
}

function parse(rows: string[]): RegionMap {
  return rows.map((row) => [...row].map((ch) => ch.charCodeAt(0) - 65))
}

/** Everything a board must satisfy before it is allowed near a player. */
function audit(p: Puzzle): string | null {
  const n = p.n
  const seen = new Set<number>()
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const g = p.regions[r][c]
      if (g < 0 || g >= n) return `region id ${g} out of range`
      seen.add(g)
    }
  }
  if (seen.size !== n) return `expected ${n} beams, found ${seen.size}`
  for (let g = 0; g < n; g++) {
    if (!isConnected(p.regions, g)) return `beam ${g} is not connected`
    if (regionCells(p.regions, g).length < 3) return `beam ${g} is a sliver`
  }
  if (countSolutions(p.regions, 3) !== 1) return 'not uniquely solvable'

  const used = new Set<number>()
  for (let r = 0; r < n; r++) {
    const c = p.solution[r]
    if (used.has(c)) return 'solution repeats a column'
    used.add(c)
    if (r > 0 && Math.abs(p.solution[r - 1] - c) <= 1) return 'solution has touching cats'
  }
  const beams = new Set(p.solution.map((c, r) => p.regions[r][c]))
  if (beams.size !== n) return 'solution repeats a beam'

  const solved = deduce(p.regions)
  if (!solved.solved) return 'needs a guess — human rules cannot finish it'
  if (!sameSolution(solved.solution, p.solution)) return 'deduced a different solution'
  return null
}

console.log('\nrng')
{
  const a = makeRng(42)
  const b = makeRng(42)
  const c = makeRng(43)
  const seqA = [a(), a(), a()]
  const seqB = [b(), b(), b()]
  const seqC = [c(), c(), c()]
  check('same seed gives the same stream', sameSolution(seqA, seqB))
  check('different seed diverges', !sameSolution(seqA, seqC))
  check('stays in [0,1)', seqA.every((v) => v >= 0 && v < 1))
}

console.log('\nuniqueness checker')
{
  // The board I drew by hand for the mockup. It looks fine and has six solutions,
  // which is exactly the trap this checker exists to catch.
  const loose = parse([
    'AAABBCCD',
    'AABBBCCD',
    'FFBBCCDD',
    'FFECCDDD',
    'FEEEGGGG',
    'FEEHHGGG',
    'FFHHHGGG',
    'HHHHHHGG',
  ])
  check('rejects a hand-drawn board with many solutions', countSolutions(loose, 6) > 1)
  check('every beam in the fixture is connected', [...Array(8).keys()].every((g) => isConnected(loose, g)))
}

console.log('\ngenerator')
{
  const started = performance.now()
  const tiers: Record<string, number> = {}
  const puzzles: Puzzle[] = []
  let misses = 0

  for (let i = 0; i < 40; i++) {
    const p = generate(8, 1000 + i * 104729)
    if (p === null) {
      misses++
      continue
    }
    puzzles.push(p)
    tiers[p.tier] = (tiers[p.tier] ?? 0) + 1
  }

  const requested: Record<string, string> = {}
  for (const t of ['gentle', 'warm', 'bright', 'blazing'] as Tier[]) {
    const hit = generateInTier(8, 5150 + TIER_INDEX[t] * 31, t)
    requested[t] = hit === null ? 'unreachable' : `${hit.tier} (score ${hit.score})`
    check(`can generate a ${t} board on request`, hit !== null && hit.tier === t)
  }
  console.log(`  info tier requests ${JSON.stringify(requested)}`)

  const elapsed = performance.now() - started
  check('produced a board for every seed', misses === 0, `${misses} seeds gave up`)
  check('produced 40 boards', puzzles.length === 40, `got ${puzzles.length}`)

  const bad = puzzles.map(audit).filter((x): x is string => x !== null)
  check('every board passes the full audit', bad.length === 0, bad.slice(0, 3).join('; '))

  const scores = puzzles.map((p) => p.score)
  check('difficulty scores vary', new Set(scores).size > 1)
  console.log(
    `  info tiers ${JSON.stringify(tiers)} · ${(elapsed / Math.max(1, puzzles.length)).toFixed(0)}ms per board`,
  )
  console.log(`  info score range ${Math.min(...scores)}–${Math.max(...scores)}`)
}

console.log('\nboard sizes')
{
  // The three sizes the stage ladder ships, through the same call buildLevel uses.
  // A single seed is not enough at 10x10 — generateAlways walks seeds, which is
  // exactly why the level pack never has a gap.
  for (const n of [6, 8, 10]) {
    const p = generateAlways(n, 99 + n, n >= 10 ? { tries: 25, easeBudget: 40 } : {})
    check(`generates a ${n}x${n} board`, audit(p) === null, audit(p) ?? '')
  }
}

console.log('\ndaily')
{
  const day = new Date(Date.UTC(2026, 8, 4))
  const same = new Date(Date.UTC(2026, 8, 4))
  const next = new Date(Date.UTC(2026, 8, 5))
  check('same date gives the same seed', dailySeed(day) === dailySeed(same))
  check('next date gives a different seed', dailySeed(day) !== dailySeed(next))

  const a = dailyPuzzle(day)
  const b = dailyPuzzle(same)
  const c = dailyPuzzle(next)
  check('daily puzzle is reproducible', sameSolution(a.solution, b.solution))
  check('daily puzzle beams are reproducible', JSON.stringify(a.regions) === JSON.stringify(b.regions))
  check('daily puzzle changes day to day', !sameSolution(a.solution, c.solution))
  check('daily puzzle is shippable', audit(a) === null, audit(a) ?? '')

  // A whole year, because a single date that fails to generate is a day with no game.
  let worst = ''
  for (let i = 0; i < 365 && worst === ''; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i))
    const p = dailyPuzzle(d)
    const problem = audit(p)
    if (problem !== null) worst = `${d.toISOString().slice(0, 10)}: ${problem}`
  }
  check('every day of 2026 generates a shippable board', worst === '', worst)

  const tier: Tier = a.tier
  console.log(`  info 2026-09-04 is ${tier}, score ${a.score}, ${a.steps} deductions`)
}

console.log('')
if (failures > 0) throw new Error(`${failures} check(s) failed`)
console.log('all checks passed\n')
