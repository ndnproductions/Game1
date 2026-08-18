import type { Game } from '../core/game'
import type { Piece } from '../core/pieces'
import type { FullLines } from '../core/grid'
import { GRID_SIZE, EMPTY, at } from '../core/grid'
import type { Layout } from './theme'
import { COLORS, BLOCKS, computeLayout, roundRect } from './theme'

export interface DragState {
  slot: number
  piece: Piece
  /** Top-left of the floating piece, in CSS pixels. */
  px: number
  py: number
  gx: number
  gy: number
  valid: boolean
}

interface ClearFx {
  x: number
  y: number
  color: number
  t: number
}

interface Popup {
  x: number
  y: number
  text: string
  color: string
  t: number
}

const FX_DURATION = 0.42
const POPUP_DURATION = 0.9

export class Renderer {
  private ctx: CanvasRenderingContext2D
  layout: Layout

  private clearFx: ClearFx[] = []
  private popups: Popup[] = []
  private shakeAmount = 0
  private trayScale = [1, 1, 1]

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')
    this.ctx = ctx
    this.layout = computeLayout(1, 1)
    this.resize()
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const w = window.innerWidth
    const h = window.innerHeight
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.layout = computeLayout(w, h)
  }

  burst(cells: { x: number; y: number; color: number }[]): void {
    for (const c of cells) this.clearFx.push({ ...c, t: 0 })
  }

  popup(text: string, x: number, y: number, color = COLORS.accent): void {
    this.popups.push({ text, x, y, color, t: 0 })
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(this.shakeAmount + amount, 22)
  }

  /** Pops a tray slot when a fresh piece lands in it. */
  popSlot(slot: number): void {
    this.trayScale[slot] = 0.2
  }

  private step(dt: number): void {
    for (const fx of this.clearFx) fx.t += dt
    this.clearFx = this.clearFx.filter((fx) => fx.t < FX_DURATION)

    for (const p of this.popups) p.t += dt
    this.popups = this.popups.filter((p) => p.t < POPUP_DURATION)

    this.shakeAmount *= Math.pow(0.001, dt)
    if (this.shakeAmount < 0.15) this.shakeAmount = 0

    for (let i = 0; i < this.trayScale.length; i++) {
      this.trayScale[i] += (1 - this.trayScale[i]) * Math.min(1, dt * 14)
    }
  }

  draw(game: Game, drag: DragState | null, dt: number): void {
    this.step(dt)

    const { ctx } = this

    ctx.save()
    if (this.shakeAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeAmount,
        (Math.random() - 0.5) * this.shakeAmount,
      )
    }

    this.drawBackground()
    this.drawHeader(game)

    const preview = drag && drag.valid ? previewLines(game, drag) : null
    this.drawBoard(game, drag, preview)
    this.drawClearFx()
    this.drawTray(game, drag)
    if (drag) this.drawFloatingPiece(drag)
    this.drawPopups()

    ctx.restore()

    if (game.gameOver) this.drawGameOver(game)
  }

  private drawBackground(): void {
    const { ctx } = this
    const L = this.layout
    const grad = ctx.createRadialGradient(
      L.w / 2, L.gridY + L.gridPx / 2, 0,
      L.w / 2, L.gridY + L.gridPx / 2, Math.max(L.w, L.h) * 0.8,
    )
    grad.addColorStop(0, COLORS.bgGlow)
    grad.addColorStop(1, COLORS.bg)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, L.w, L.h)
  }

  private drawHeader(game: Game): void {
    const { ctx } = this
    const L = this.layout
    const cx = L.w / 2

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const top = L.headerY

    ctx.fillStyle = COLORS.textDim
    ctx.font = `600 ${Math.round(L.headerH * 0.16)}px system-ui, sans-serif`
    ctx.fillText('SCORE', cx, top + L.headerH * 0.34)

    ctx.fillStyle = COLORS.text
    ctx.font = `800 ${Math.round(L.headerH * 0.42)}px system-ui, sans-serif`
    ctx.fillText(String(game.score), cx, top + L.headerH * 0.64)

    ctx.textAlign = 'left'
    ctx.fillStyle = COLORS.textDim
    ctx.font = `600 ${Math.round(L.headerH * 0.16)}px system-ui, sans-serif`
    ctx.fillText(`BEST ${game.best}`, L.pad, top + L.headerH * 0.42)

    if (game.combo > 1) {
      const label = `COMBO x${(1 + 0.25 * Math.min(game.combo, 8)).toFixed(2)}`
      ctx.textAlign = 'right'
      ctx.fillStyle = COLORS.accent
      ctx.font = `800 ${Math.round(L.headerH * 0.17)}px system-ui, sans-serif`
      ctx.fillText(label, L.w - L.pad, top + L.headerH * 0.42)
    }
  }

  private drawBoard(game: Game, drag: DragState | null, preview: FullLines | null): void {
    const { ctx } = this
    const L = this.layout
    const radius = L.cell * 0.22
    const inset = L.cell * 0.05

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = L.gridX + x * L.cell
        const py = L.gridY + y * L.cell

        ctx.fillStyle = COLORS.slot
        roundRect(ctx, px + inset, py + inset, L.cell - inset * 2, L.cell - inset * 2, radius)
        ctx.fill()

        const value = at(game.grid, x, y)
        if (value !== EMPTY) this.drawBlock(px, py, L.cell, value, 1, 1)
      }
    }

    if (drag) {
      for (const cell of drag.piece.cells) {
        const x = drag.gx + cell.x
        const y = drag.gy + cell.y
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue
        const px = L.gridX + x * L.cell
        const py = L.gridY + y * L.cell
        if (drag.valid) {
          this.drawBlock(px, py, L.cell, drag.piece.color, 0.45, 1)
        } else {
          ctx.fillStyle = 'rgba(255,92,122,0.16)'
          roundRect(ctx, px + inset, py + inset, L.cell - inset * 2, L.cell - inset * 2, radius)
          ctx.fill()
        }
      }
    }

    // Drawn last and on top: every cell of a completing line is already covered
    // by a block or the ghost, so a slot-level highlight would never be seen.
    if (preview) this.drawPreviewLines(preview)
  }

  private drawPreviewLines(preview: FullLines): void {
    const { ctx } = this
    const L = this.layout
    const pulse = 0.18 + 0.12 * Math.sin(performance.now() / 90)

    ctx.save()
    for (const y of preview.rows) {
      const py = L.gridY + y * L.cell
      ctx.fillStyle = `rgba(255,255,255,${pulse})`
      roundRect(ctx, L.gridX, py + L.cell * 0.04, L.gridPx, L.cell * 0.92, L.cell * 0.3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = Math.max(1.5, L.cell * 0.05)
      ctx.stroke()
    }
    for (const x of preview.cols) {
      const px = L.gridX + x * L.cell
      ctx.fillStyle = `rgba(255,255,255,${pulse})`
      roundRect(ctx, px + L.cell * 0.04, L.gridY, L.cell * 0.92, L.gridPx, L.cell * 0.3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = Math.max(1.5, L.cell * 0.05)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawClearFx(): void {
    const L = this.layout
    for (const fx of this.clearFx) {
      const p = fx.t / FX_DURATION
      const scale = 1 + p * 0.85
      const alpha = 1 - p
      const px = L.gridX + fx.x * L.cell
      const py = L.gridY + fx.y * L.cell
      this.drawBlock(px, py, L.cell, fx.color, alpha, scale)
    }
  }

  private drawTray(game: Game, drag: DragState | null): void {
    const L = this.layout
    const playable = game.playableSlots()

    for (let slot = 0; slot < game.tray.length; slot++) {
      const piece = game.tray[slot]
      if (!piece) continue
      if (drag && drag.slot === slot) continue

      const cell = L.trayCell * this.trayScale[slot]
      const centerX = L.slotW * (slot + 0.5)
      const centerY = L.trayY + L.trayH / 2
      const originX = centerX - (piece.w * cell) / 2
      const originY = centerY - (piece.h * cell) / 2
      const alpha = playable[slot] ? 1 : 0.34

      for (const c of piece.cells) {
        this.drawBlock(originX + c.x * cell, originY + c.y * cell, cell, piece.color, alpha, 1)
      }
    }
  }

  private drawFloatingPiece(drag: DragState): void {
    const L = this.layout
    for (const c of drag.piece.cells) {
      this.drawBlock(
        drag.px + c.x * L.cell,
        drag.py + c.y * L.cell,
        L.cell,
        drag.piece.color,
        drag.valid ? 1 : 0.65,
        1,
      )
    }
  }

  private drawPopups(): void {
    const { ctx } = this
    const L = this.layout
    for (const p of this.popups) {
      const t = p.t / POPUP_DURATION
      ctx.globalAlpha = 1 - t * t
      ctx.fillStyle = p.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `800 ${Math.round(L.cell * (0.5 + t * 0.15))}px system-ui, sans-serif`
      ctx.fillText(p.text, p.x, p.y - t * L.cell * 1.8)
      ctx.globalAlpha = 1
    }
  }

  private drawGameOver(game: Game): void {
    const { ctx } = this
    const L = this.layout

    ctx.fillStyle = 'rgba(10,10,20,0.82)'
    ctx.fillRect(0, 0, L.w, L.h)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = COLORS.danger
    ctx.font = `900 ${Math.round(L.w * 0.1)}px system-ui, sans-serif`
    ctx.fillText('GAME OVER', L.w / 2, L.h * 0.38)

    ctx.fillStyle = COLORS.text
    ctx.font = `800 ${Math.round(L.w * 0.15)}px system-ui, sans-serif`
    ctx.fillText(String(game.score), L.w / 2, L.h * 0.5)

    ctx.fillStyle = COLORS.textDim
    ctx.font = `600 ${Math.round(L.w * 0.045)}px system-ui, sans-serif`
    ctx.fillText(`BEST ${game.best}`, L.w / 2, L.h * 0.58)
    ctx.fillText('TAP TO PLAY AGAIN', L.w / 2, L.h * 0.68)
  }

  private drawBlock(
    px: number,
    py: number,
    size: number,
    colorIndex: number,
    alpha: number,
    scale: number,
  ): void {
    const { ctx } = this
    const [base, light] = BLOCKS[colorIndex % BLOCKS.length] ?? BLOCKS[0]
    const inset = size * 0.05
    const s = size - inset * 2
    const grow = (s * (scale - 1)) / 2
    const x = px + inset - grow
    const y = py + inset - grow
    const w = s + grow * 2

    ctx.globalAlpha = alpha
    ctx.fillStyle = base
    roundRect(ctx, x, y, w, w, w * 0.24)
    ctx.fill()

    ctx.fillStyle = light
    roundRect(ctx, x + w * 0.14, y + w * 0.12, w * 0.72, w * 0.3, w * 0.14)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

/** Which lines the current drag target would complete, for the board highlight. */
function previewLines(game: Game, drag: DragState): FullLines | null {
  return game.previewLines(drag.slot, drag.gx, drag.gy)
}
