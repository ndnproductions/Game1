import { StickyGame } from './game'
import type { Mark } from './game'
import { Renderer } from './render'
import { ITEM_KINDS } from './items'
import {
  unlockAudio, playPickUp, playClear, playInvalid, playGameOver, vibrate,
} from '../audio'

const canvas = document.getElementById('game') as HTMLCanvasElement | null
if (!canvas) throw new Error('#game canvas missing')

const game = new StickyGame()
const renderer = new Renderer(canvas)

function handleMerge(merged: NonNullable<ReturnType<StickyGame['lift']>>['merged']): void {
  if (!merged) return
  renderer.flash(merged.slots)
  renderer.shake(merged.hot ? 9 : 5)
  playClear(merged.hot ? 3 : 2, 0)
  vibrate([0, 16, 36, 20])

  const L = renderer.layout
  const label = merged.hot ? `+${merged.points} HOT` : `+${merged.points}`
  renderer.popup(label, L.w / 2, L.pocketY - L.pad * 2, merged.hot ? '#ff5c7a' : '#ffd93d')
}

function bust(): void {
  playGameOver()
  vibrate([0, 70, 90, 70])
  renderer.shake(16)
}

/** Front-row marks win ties, since they are the ones under the finger. */
function pickMark(x: number, y: number): Mark | null {
  let best: Mark | null = null
  let bestScore = -Infinity

  for (const m of game.marks) {
    if (!m.item) continue
    const b = renderer.bubblePos(m)
    const dx = x - b.x
    const dy = y - b.y
    const slop = b.r * 1.55
    if (dx * dx + dy * dy > slop * slop) continue

    const score = m.row * 1000 - Math.hypot(dx, dy)
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  unlockAudio()

  if (game.over) {
    const hit = renderer.buttons.find(
      (b) => e.clientX > b.x && e.clientX < b.x + b.w && e.clientY > b.y && e.clientY < b.y + b.h,
    )
    if (hit?.id === 'bribe') {
      game.bribe()
      playPickUp()
    } else if (hit?.id === 'again') {
      game.reset()
    }
    return
  }

  const mark = pickMark(e.clientX, e.clientY)
  if (!mark) return

  const b = renderer.bubblePos(mark)
  const events = game.lift(mark, b.x, b.y)

  if (!events) {
    playInvalid()
    vibrate(30)
    renderer.shake(6)
    renderer.popup('NO ROOM', b.x, b.y, '#ff5c7a')
    return
  }

  playPickUp()
  vibrate(9)
  handleMerge(events.merged)
  if (events.busted) bust()
})

const onResize = (): void => renderer.resize()
window.addEventListener('resize', onResize)
window.addEventListener('orientationchange', onResize)
window.visualViewport?.addEventListener('resize', onResize)

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now

  const events = game.step(dt, renderer.layout.w)
  if (events.busted) bust()

  renderer.draw(game, dt)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

declare global {
  interface Window {
    __sticky?: StickyGame
    __stickyRenderer?: Renderer
    __itemKinds?: typeof ITEM_KINDS
  }
}
window.__sticky = game
window.__stickyRenderer = renderer
window.__itemKinds = ITEM_KINDS
