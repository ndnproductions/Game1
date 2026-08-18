import { Game } from './core/game'
import type { Piece } from './core/pieces'
import { Renderer } from './render/renderer'
import { DragController } from './input/drag'
import { COLORS } from './render/theme'
import {
  unlockAudio,
  playPickUp,
  playPlace,
  playInvalid,
  playClear,
  playGameOver,
  vibrate,
} from './audio'

const canvas = document.getElementById('game') as HTMLCanvasElement | null
if (!canvas) throw new Error('#game canvas missing')

const game = new Game()
const renderer = new Renderer(canvas)

const drag = new DragController(canvas, game, renderer, {
  onPickUp: () => {
    unlockAudio()
    playPickUp()
    vibrate(8)
  },
  onDrop: handleDrop,
  onInvalid: () => playInvalid(),
  onRestart: () => {
    game.reset()
    renderer.popSlot(0)
    renderer.popSlot(1)
    renderer.popSlot(2)
  },
})

function handleDrop(slot: number, gx: number, gy: number): void {
  const before: (Piece | null)[] = game.tray.slice()
  const result = game.placeAt(slot, gx, gy)

  if (!result) {
    playInvalid()
    return
  }

  playPlace()
  vibrate(12)

  // Any slot that went from empty to filled came from a refill, so pop it.
  for (let i = 0; i < game.tray.length; i++) {
    const wasFree = before[i] === null || i === slot
    if (wasFree && game.tray[i] !== null) renderer.popSlot(i)
  }

  const lineCount = result.lines.rows.length + result.lines.cols.length
  if (lineCount > 0) {
    renderer.burst(result.cleared)
    renderer.shake(4 + lineCount * 3)
    playClear(lineCount, result.combo)
    vibrate([0, 18, 40, 22])

    const L = renderer.layout
    renderer.popup(`+${result.gained}`, L.gridX + L.gridPx / 2, L.gridY + L.gridPx / 2)
    if (result.combo > 1) {
      renderer.popup(
        `COMBO x${result.combo}`,
        L.gridX + L.gridPx / 2,
        L.gridY + L.gridPx / 2 + L.cell,
        COLORS.accent,
      )
    }
  }

  if (result.gameOver) {
    playGameOver()
    vibrate([0, 60, 80, 60])
  }
}

const onResize = (): void => renderer.resize()
window.addEventListener('resize', onResize)
window.addEventListener('orientationchange', onResize)
window.visualViewport?.addEventListener('resize', onResize)

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  renderer.draw(game, drag.state, dt)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// Debug handle: lets playtest tooling drive the board without the UI.
declare global {
  interface Window {
    __game?: Game
    __renderer?: Renderer
  }
}
window.__game = game
window.__renderer = renderer
