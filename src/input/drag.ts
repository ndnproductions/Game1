import type { Game } from '../core/game'
import type { Renderer, DragState } from '../render/renderer'
import { GRID_SIZE, canPlace } from '../core/grid'

interface Callbacks {
  onPickUp: () => void
  onDrop: (slot: number, gx: number, gy: number) => void
  onInvalid: () => void
  onRestart: () => void
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export class DragController {
  state: DragState | null = null
  private pointerId: number | null = null
  /** Mouse users get no lift; a cursor does not hide the piece the way a thumb does. */
  private lift = 0

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
    private renderer: Renderer,
    private cb: Callbacks,
  ) {
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onCancel)
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault()

    if (this.game.gameOver) {
      this.cb.onRestart()
      return
    }
    if (this.pointerId !== null) return

    const slot = this.hitTestTray(e.clientX, e.clientY)
    if (slot === null) return

    const piece = this.game.tray[slot]
    if (!piece) return

    this.pointerId = e.pointerId
    this.canvas.setPointerCapture(e.pointerId)
    this.lift = e.pointerType === 'mouse' ? 0 : this.renderer.layout.cell * 0.9

    this.state = { slot, piece, px: 0, py: 0, gx: 0, gy: 0, valid: false }
    this.track(e.clientX, e.clientY)
    this.cb.onPickUp()
  }

  private onMove = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId || !this.state) return
    e.preventDefault()
    this.track(e.clientX, e.clientY)
  }

  private onUp = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId || !this.state) return
    e.preventDefault()

    const { slot, gx, gy, valid } = this.state
    this.release(e.pointerId)

    if (valid) this.cb.onDrop(slot, gx, gy)
    else this.cb.onInvalid()
  }

  private onCancel = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return
    this.release(e.pointerId)
  }

  private release(pointerId: number): void {
    this.state = null
    this.pointerId = null
    if (this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId)
    }
  }

  /**
   * The piece rides centred on the pointer and lifted clear of it, then snaps
   * to the nearest legal cell. Snapping is clamped rather than rejected at the
   * edges so a slightly-off drop still lands where the player obviously meant.
   */
  private track(clientX: number, clientY: number): void {
    if (!this.state) return
    const L = this.renderer.layout
    const { piece } = this.state

    const px = clientX - (piece.w * L.cell) / 2
    const py = clientY - (piece.h * L.cell) / 2 - this.lift

    const centerX = px + (piece.w * L.cell) / 2
    const centerY = py + (piece.h * L.cell) / 2
    const margin = L.cell * 1.5
    const overBoard =
      centerX > L.gridX - margin &&
      centerX < L.gridX + L.gridPx + margin &&
      centerY > L.gridY - margin &&
      centerY < L.gridY + L.gridPx + margin

    let gx = 0
    let gy = 0
    let valid = false

    if (overBoard) {
      gx = clamp(Math.round((px - L.gridX) / L.cell), 0, GRID_SIZE - piece.w)
      gy = clamp(Math.round((py - L.gridY) / L.cell), 0, GRID_SIZE - piece.h)
      valid = canPlace(this.game.grid, piece, gx, gy)
    }

    this.state.px = px
    this.state.py = py
    this.state.gx = gx
    this.state.gy = gy
    this.state.valid = valid
  }

  /** Generous hit box: the visual piece plus half a tray cell of slop. */
  private hitTestTray(clientX: number, clientY: number): number | null {
    const L = this.renderer.layout
    if (clientY < L.trayY - L.trayCell) return null

    for (let slot = 0; slot < this.game.tray.length; slot++) {
      const piece = this.game.tray[slot]
      if (!piece) continue

      const centerX = L.slotW * (slot + 0.5)
      const centerY = L.trayY + L.trayH / 2
      const halfW = (piece.w * L.trayCell) / 2 + L.trayCell
      const halfH = (piece.h * L.trayCell) / 2 + L.trayCell

      if (
        clientX > centerX - halfW &&
        clientX < centerX + halfW &&
        clientY > centerY - halfH &&
        clientY < centerY + halfH
      ) {
        return slot
      }
    }
    return null
  }
}
