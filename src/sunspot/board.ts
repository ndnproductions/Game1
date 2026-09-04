import type { Cell, RegionMap } from './types.ts'

export function neighbours4(r: number, c: number, n: number): Cell[] {
  const out: Cell[] = []
  if (r > 0) out.push({ r: r - 1, c })
  if (r < n - 1) out.push({ r: r + 1, c })
  if (c > 0) out.push({ r, c: c - 1 })
  if (c < n - 1) out.push({ r, c: c + 1 })
  return out
}

/** The eight touching squares — cats object to diagonal neighbours too. */
export function neighbours8(r: number, c: number, n: number): Cell[] {
  const out: Cell[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) out.push({ r: nr, c: nc })
    }
  }
  return out
}

export function regionCells(regions: RegionMap, id: number): Cell[] {
  const out: Cell[] = []
  for (let r = 0; r < regions.length; r++) {
    for (let c = 0; c < regions.length; c++) {
      if (regions[r][c] === id) out.push({ r, c })
    }
  }
  return out
}

/** A region has to stay one connected blob, or it stops reading as a sunbeam. */
export function isConnected(regions: RegionMap, id: number): boolean {
  const cells = regionCells(regions, id)
  if (cells.length === 0) return false
  const n = regions.length
  const seen = new Set<number>([cells[0].r * n + cells[0].c])
  const stack: Cell[] = [cells[0]]
  while (stack.length > 0) {
    const cur = stack.pop() as Cell
    for (const nb of neighbours4(cur.r, cur.c, n)) {
      const key = nb.r * n + nb.c
      if (regions[nb.r][nb.c] === id && !seen.has(key)) {
        seen.add(key)
        stack.push(nb)
      }
    }
  }
  return seen.size === cells.length
}

/**
 * Every solution, up to `cap`. Used only to prove uniqueness — the player-facing
 * solver in solver.ts is the one restricted to human deductions.
 */
export function solutionsOf(regions: RegionMap, cap = 2): number[][] {
  const n = regions.length
  const found: number[][] = []
  const cols = new Set<number>()
  const used = new Set<number>()
  const place: number[] = []

  const walk = (row: number): void => {
    if (found.length >= cap) return
    if (row === n) {
      found.push(place.slice())
      return
    }
    for (let c = 0; c < n; c++) {
      const g = regions[row][c]
      if (cols.has(c) || used.has(g)) continue
      if (row > 0 && Math.abs(place[row - 1] - c) <= 1) continue
      cols.add(c)
      used.add(g)
      place.push(c)
      walk(row + 1)
      place.pop()
      used.delete(g)
      cols.delete(c)
    }
  }

  walk(0)
  return found
}

export function countSolutions(regions: RegionMap, cap = 2): number {
  return solutionsOf(regions, cap).length
}

export function sameSolution(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
