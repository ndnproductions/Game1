import type { Piece } from './pieces'

export const GRID_SIZE = 8
export const EMPTY = -1

export type Grid = Int8Array

export function createGrid(): Grid {
  const grid = new Int8Array(GRID_SIZE * GRID_SIZE)
  grid.fill(EMPTY)
  return grid
}

export function at(grid: Grid, x: number, y: number): number {
  return grid[y * GRID_SIZE + x]
}

export function canPlace(grid: Grid, piece: Piece, gx: number, gy: number): boolean {
  for (const cell of piece.cells) {
    const x = gx + cell.x
    const y = gy + cell.y
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false
    if (grid[y * GRID_SIZE + x] !== EMPTY) return false
  }
  return true
}

export function place(grid: Grid, piece: Piece, gx: number, gy: number): void {
  for (const cell of piece.cells) {
    grid[(gy + cell.y) * GRID_SIZE + (gx + cell.x)] = piece.color
  }
}

/** True if the piece fits anywhere at all on the current board. */
export function hasAnyPlacement(grid: Grid, piece: Piece): boolean {
  for (let gy = 0; gy <= GRID_SIZE - piece.h; gy++) {
    for (let gx = 0; gx <= GRID_SIZE - piece.w; gx++) {
      if (canPlace(grid, piece, gx, gy)) return true
    }
  }
  return false
}

export interface FullLines {
  rows: number[]
  cols: number[]
}

export function findFullLines(grid: Grid): FullLines {
  const rows: number[] = []
  const cols: number[] = []

  for (let y = 0; y < GRID_SIZE; y++) {
    let full = true
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y * GRID_SIZE + x] === EMPTY) {
        full = false
        break
      }
    }
    if (full) rows.push(y)
  }

  for (let x = 0; x < GRID_SIZE; x++) {
    let full = true
    for (let y = 0; y < GRID_SIZE; y++) {
      if (grid[y * GRID_SIZE + x] === EMPTY) {
        full = false
        break
      }
    }
    if (full) cols.push(x)
  }

  return { rows, cols }
}

/**
 * Blanks every cell covered by the given lines and returns them, so the
 * renderer can spawn a clear effect at each one.
 */
export function clearLines(grid: Grid, lines: FullLines): { x: number; y: number; color: number }[] {
  const cleared: { x: number; y: number; color: number }[] = []
  const seen = new Set<number>()

  const wipe = (x: number, y: number) => {
    const i = y * GRID_SIZE + x
    if (seen.has(i)) return
    seen.add(i)
    cleared.push({ x, y, color: grid[i] })
  }

  for (const y of lines.rows) for (let x = 0; x < GRID_SIZE; x++) wipe(x, y)
  for (const x of lines.cols) for (let y = 0; y < GRID_SIZE; y++) wipe(x, y)

  for (const i of seen) grid[i] = EMPTY
  return cleared
}
