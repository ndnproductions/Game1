import type { Piece } from './pieces'
import { randomPiece, cellCount } from './pieces'
import type { Grid, FullLines } from './grid'
import {
  createGrid,
  canPlace,
  place,
  findFullLines,
  clearLines,
  hasAnyPlacement,
} from './grid'

export const TRAY_SIZE = 3
const BEST_KEY = 'block-roguelite.best'

export interface ClearedCell {
  x: number
  y: number
  color: number
}

export interface PlaceResult {
  cleared: ClearedCell[]
  lines: FullLines
  gained: number
  combo: number
  gameOver: boolean
}

export class Game {
  grid: Grid = createGrid()
  tray: (Piece | null)[] = []
  score = 0
  best = 0
  combo = 0
  gameOver = false

  constructor() {
    this.best = readBest()
    this.refillTray()
  }

  reset(): void {
    this.grid = createGrid()
    this.score = 0
    this.combo = 0
    this.gameOver = false
    this.tray = []
    this.refillTray()
  }

  /**
   * Refills all three slots at once. Retries a bounded number of times so the
   * player is never handed a tray that is dead on arrival — an unavoidable
   * game over feels like the game cheated, not like a mistake.
   */
  private refillTray(): void {
    for (let attempt = 0; attempt < 40; attempt++) {
      const tray = [randomPiece(), randomPiece(), randomPiece()]
      if (tray.some((p) => hasAnyPlacement(this.grid, p))) {
        this.tray = tray
        return
      }
    }
    this.tray = [randomPiece(), randomPiece(), randomPiece()]
  }

  canPlaceAt(slot: number, gx: number, gy: number): boolean {
    const piece = this.tray[slot]
    if (!piece || this.gameOver) return false
    return canPlace(this.grid, piece, gx, gy)
  }

  placeAt(slot: number, gx: number, gy: number): PlaceResult | null {
    const piece = this.tray[slot]
    if (!piece || this.gameOver) return null
    if (!canPlace(this.grid, piece, gx, gy)) return null

    place(this.grid, piece, gx, gy)
    this.tray[slot] = null

    const lines = findFullLines(this.grid)
    const lineCount = lines.rows.length + lines.cols.length
    const cleared = lineCount > 0 ? clearLines(this.grid, lines) : []

    if (lineCount > 0) this.combo++
    else this.combo = 0

    const linePoints = lineCount > 0 ? 100 * lineCount + 50 * lineCount * (lineCount - 1) : 0
    const multiplier = 1 + 0.25 * Math.min(this.combo, 8)
    const gained = Math.round((cellCount(piece) + linePoints) * multiplier)

    this.score += gained
    if (this.score > this.best) {
      this.best = this.score
      writeBest(this.best)
    }

    if (this.tray.every((p) => p === null)) this.refillTray()

    this.gameOver = !this.tray.some((p) => p !== null && hasAnyPlacement(this.grid, p))

    return { cleared, lines, gained, combo: this.combo, gameOver: this.gameOver }
  }

  /**
   * Lines that placing `slot` at (gx, gy) would complete, without mutating
   * anything. Drives the board highlight while the player is still dragging.
   */
  previewLines(slot: number, gx: number, gy: number): FullLines | null {
    const piece = this.tray[slot]
    if (!piece || !canPlace(this.grid, piece, gx, gy)) return null

    const copy = this.grid.slice() as Grid
    place(copy, piece, gx, gy)
    const lines = findFullLines(copy)
    return lines.rows.length + lines.cols.length > 0 ? lines : null
  }

  /** Slots the player could still legally play, used to dim dead pieces. */
  playableSlots(): boolean[] {
    return this.tray.map((p) => p !== null && hasAnyPlacement(this.grid, p))
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(value: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(value))
  } catch {
    // Private browsing or blocked storage — a lost high score is not fatal.
  }
}
