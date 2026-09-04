import type { Cell, RegionMap, RuleName, Tier } from './types.ts'
import { neighbours8, regionCells } from './board.ts'

/** Cost of each deduction, used to score a solve. Roughly "how long a person stares". */
export const RULE_WEIGHT: Record<RuleName, number> = {
  'only-square': 1,
  'line-locks-region': 3,
  'region-locks-line': 3,
  crowding: 6,
  'paired-beams': 10,
}

/** Cheapest first — the solver always reaches for the simplest rule that fires. */
const RULE_ORDER: RuleName[] = [
  'only-square',
  'line-locks-region',
  'region-locks-line',
  'crowding',
  'paired-beams',
]

const TIER_OF: Record<RuleName, Tier> = {
  'only-square': 'gentle',
  'line-locks-region': 'warm',
  'region-locks-line': 'warm',
  crowding: 'bright',
  'paired-beams': 'blazing',
}

/** Tier ordering, so the generator can hill-climb toward an easier board. */
export const TIER_INDEX: Record<Tier, number> = {
  gentle: 0,
  warm: 1,
  bright: 2,
  blazing: 3,
}

export interface DeduceResult {
  /** False means the puzzle needs a guess somewhere, so it is not shippable. */
  solved: boolean
  solution: number[]
  hardestRule: RuleName
  tier: Tier
  score: number
  steps: number
}

interface Unit {
  cells: Cell[]
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = []
  const build = (start: number, acc: T[]): void => {
    if (acc.length === k) {
      out.push(acc.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i])
      build(i + 1, acc)
      acc.pop()
    }
  }
  build(0, [])
  return out
}

class Deducer {
  readonly n: number
  readonly regions: RegionMap
  readonly cand: boolean[][]
  readonly cat: boolean[][]
  readonly rowUnits: Unit[]
  readonly colUnits: Unit[]
  readonly regionUnits: Unit[]
  readonly allUnits: Unit[]
  placed = 0
  broken = false

  constructor(regions: RegionMap) {
    this.n = regions.length
    this.regions = regions
    this.cand = Array.from({ length: this.n }, () => Array<boolean>(this.n).fill(true))
    this.cat = Array.from({ length: this.n }, () => Array<boolean>(this.n).fill(false))

    this.rowUnits = []
    this.colUnits = []
    for (let i = 0; i < this.n; i++) {
      const row: Cell[] = []
      const col: Cell[] = []
      for (let j = 0; j < this.n; j++) {
        row.push({ r: i, c: j })
        col.push({ r: j, c: i })
      }
      this.rowUnits.push({ cells: row })
      this.colUnits.push({ cells: col })
    }
    this.regionUnits = []
    for (let g = 0; g < this.n; g++) this.regionUnits.push({ cells: regionCells(regions, g) })
    this.allUnits = [...this.rowUnits, ...this.colUnits, ...this.regionUnits]
  }

  private candidatesIn(u: Unit): Cell[] {
    return u.cells.filter((cell) => this.cand[cell.r][cell.c])
  }

  private isSolved(u: Unit): boolean {
    return u.cells.some((cell) => this.cat[cell.r][cell.c])
  }

  private eliminate(r: number, c: number): boolean {
    if (!this.cand[r][c]) return false
    this.cand[r][c] = false
    return true
  }

  /** Settling a cat rules out its row, its column, its beam, and every touching square. */
  private place(r: number, c: number): void {
    this.cat[r][c] = true
    this.placed++
    for (let i = 0; i < this.n; i++) {
      this.cand[r][i] = false
      this.cand[i][c] = false
    }
    for (const cell of regionCells(this.regions, this.regions[r][c])) {
      this.cand[cell.r][cell.c] = false
    }
    for (const cell of neighbours8(r, c, this.n)) this.cand[cell.r][cell.c] = false
  }

  /** A row, column or beam with exactly one square left. The bread-and-butter move. */
  private onlySquare(): boolean {
    for (const u of this.allUnits) {
      if (this.isSolved(u)) continue
      const cs = this.candidatesIn(u)
      if (cs.length === 0) {
        this.broken = true
        return false
      }
      if (cs.length === 1) {
        this.place(cs[0].r, cs[0].c)
        return true
      }
    }
    return false
  }

  /** All of a row's remaining squares sit in one beam, so that beam is spent here. */
  private lineLocksRegion(): boolean {
    for (const u of [...this.rowUnits, ...this.colUnits]) {
      if (this.isSolved(u)) continue
      const cs = this.candidatesIn(u)
      if (cs.length < 2) continue
      const g = this.regions[cs[0].r][cs[0].c]
      if (!cs.every((cell) => this.regions[cell.r][cell.c] === g)) continue
      const inLine = new Set(cs.map((cell) => cell.r * this.n + cell.c))
      let hit = false
      for (const cell of regionCells(this.regions, g)) {
        if (!inLine.has(cell.r * this.n + cell.c)) hit = this.eliminate(cell.r, cell.c) || hit
      }
      if (hit) return true
    }
    return false
  }

  /** All of a beam's remaining squares sit in one row, so no other beam may use that row. */
  private regionLocksLine(): boolean {
    for (let g = 0; g < this.n; g++) {
      const u = this.regionUnits[g]
      if (this.isSolved(u)) continue
      const cs = this.candidatesIn(u)
      if (cs.length < 2) continue
      if (cs.every((cell) => cell.r === cs[0].r)) {
        let hit = false
        for (let c = 0; c < this.n; c++) {
          if (this.regions[cs[0].r][c] !== g) hit = this.eliminate(cs[0].r, c) || hit
        }
        if (hit) return true
      }
      if (cs.every((cell) => cell.c === cs[0].c)) {
        let hit = false
        for (let r = 0; r < this.n; r++) {
          if (this.regions[r][cs[0].c] !== g) hit = this.eliminate(r, cs[0].c) || hit
        }
        if (hit) return true
      }
    }
    return false
  }

  /**
   * Every square a unit has left touches some square X. Wherever that unit's cat
   * lands it will be beside X, so no cat can sit on X. This is the rule that makes
   * the diagonal constraint bite, and the one good players lean on hardest.
   */
  private crowding(): boolean {
    for (const u of this.allUnits) {
      if (this.isSolved(u)) continue
      const cs = this.candidatesIn(u)
      if (cs.length < 2) continue
      let shared: Set<number> | null = null
      for (const cell of cs) {
        const around = new Set(neighbours8(cell.r, cell.c, this.n).map((x) => x.r * this.n + x.c))
        if (shared === null) {
          shared = around
        } else {
          const prev: Set<number> = shared
          shared = new Set([...prev].filter((k) => around.has(k)))
        }
        if (shared.size === 0) break
      }
      if (shared === null || shared.size === 0) continue
      let hit = false
      for (const key of shared) {
        hit = this.eliminate(Math.floor(key / this.n), key % this.n) || hit
      }
      if (hit) return true
    }
    return false
  }

  /** k beams confined to k rows consume those rows outright — nothing else may use them. */
  private regionsLockLines(axis: 'r' | 'c'): boolean {
    const open = this.regionUnits.filter((u) => !this.isSolved(u))
    for (const k of [2, 3]) {
      if (open.length < k) continue
      for (const combo of combinations(open, k)) {
        const lines = new Set<number>()
        for (const u of combo) {
          for (const cell of this.candidatesIn(u)) lines.add(axis === 'r' ? cell.r : cell.c)
        }
        if (lines.size !== k) continue
        const owned = new Set<number>()
        for (const u of combo) for (const cell of u.cells) owned.add(cell.r * this.n + cell.c)
        let hit = false
        for (const line of lines) {
          for (let i = 0; i < this.n; i++) {
            const r = axis === 'r' ? line : i
            const c = axis === 'r' ? i : line
            if (!owned.has(r * this.n + c)) hit = this.eliminate(r, c) || hit
          }
        }
        if (hit) return true
      }
    }
    return false
  }

  /** The mirror: k rows whose squares all fall in k beams consume those beams. */
  private linesLockRegions(units: Unit[]): boolean {
    const open = units.filter((u) => !this.isSolved(u))
    for (const k of [2, 3]) {
      if (open.length < k) continue
      for (const combo of combinations(open, k)) {
        const beams = new Set<number>()
        const owned = new Set<number>()
        for (const u of combo) {
          for (const cell of this.candidatesIn(u)) beams.add(this.regions[cell.r][cell.c])
          for (const cell of u.cells) owned.add(cell.r * this.n + cell.c)
        }
        if (beams.size !== k) continue
        let hit = false
        for (const g of beams) {
          for (const cell of regionCells(this.regions, g)) {
            if (!owned.has(cell.r * this.n + cell.c)) hit = this.eliminate(cell.r, cell.c) || hit
          }
        }
        if (hit) return true
      }
    }
    return false
  }

  private pairedBeams(): boolean {
    return (
      this.regionsLockLines('r') ||
      this.regionsLockLines('c') ||
      this.linesLockRegions(this.rowUnits) ||
      this.linesLockRegions(this.colUnits)
    )
  }

  apply(rule: RuleName): boolean {
    switch (rule) {
      case 'only-square':
        return this.onlySquare()
      case 'line-locks-region':
        return this.lineLocksRegion()
      case 'region-locks-line':
        return this.regionLocksLine()
      case 'crowding':
        return this.crowding()
      case 'paired-beams':
        return this.pairedBeams()
    }
  }

  solution(): number[] {
    const out: number[] = []
    for (let r = 0; r < this.n; r++) {
      const c = this.cat[r].indexOf(true)
      out.push(c)
    }
    return out
  }
}

/**
 * Solve using human deductions only. `solved: false` means the board needs a
 * guess somewhere — the generator throws those away rather than ship them.
 */
export function deduce(regions: RegionMap): DeduceResult {
  const n = regions.length
  const d = new Deducer(regions)
  let hardest: RuleName = 'only-square'
  let score = 0
  let steps = 0

  for (let guard = 0; guard < n * n * 40; guard++) {
    if (d.broken || d.placed === n) break
    let fired: RuleName | null = null
    for (const rule of RULE_ORDER) {
      if (d.apply(rule)) {
        fired = rule
        break
      }
    }
    if (fired === null) break
    steps++
    score += RULE_WEIGHT[fired]
    if (RULE_ORDER.indexOf(fired) > RULE_ORDER.indexOf(hardest)) hardest = fired
  }

  const solved = !d.broken && d.placed === n
  return {
    solved,
    solution: solved ? d.solution() : [],
    hardestRule: hardest,
    tier: TIER_OF[hardest],
    score,
    steps,
  }
}
