import { StickyGame } from './game'
import type { Mark, LiftResult, ExpiredOrder, FilledOrder } from './game'
import { POCKETS } from './game'
import { Renderer } from './render'
import { ITEM_KINDS } from './items'
import {
  unlockAudio, playPickUp, playClear, playInvalid, playGameOver, vibrate,
} from '../audio'

const canvas = document.getElementById('game') as HTMLCanvasElement | null
if (!canvas) throw new Error('#game canvas missing')

const game = new StickyGame()
const renderer = new Renderer(canvas)

function bust(): void {
  playGameOver()
  vibrate([0, 70, 90, 70])
  renderer.shake(16)
}

function reportLift(result: LiftResult, at: { x: number; y: number }): void {
  if (result.awareness === 'alert') {
    renderer.popup('SPOTTED', at.x, at.y, '#ff5c7a')
    renderer.shake(11)
    playInvalid()
    vibrate([0, 40, 30, 40])
  } else {
    playPickUp()
    vibrate(8)
    if (result.awareness === 'distracted') renderer.popup('CLEAN', at.x, at.y, '#4ade80')
  }

  if (result.junk) renderer.popup('JUNK', at.x, at.y + 26, '#8a93ad')

  if (result.filled) reportFill(result.filled)
}

function reportFill(filled: FilledOrder): void {
  renderer.flash(filled.slots)
  renderer.shake(filled.hotCount ? 9 : 5)
  playClear(filled.hotCount ? 3 : 2, 0)
  vibrate([0, 16, 36, 20])
  const L = renderer.layout
  renderer.popup(
    `+${filled.points}`,
    L.w / 2, L.pocketY - L.pad * 2,
    filled.hotCount ? '#ff5c7a' : '#ffd93d',
  )
}

function reportExpiry(e: ExpiredOrder): void {
  const L = renderer.layout
  const kind = ITEM_KINDS[e.kind]
  renderer.shake(e.stranded > 0 ? 10 : 4)
  playInvalid()
  vibrate(e.stranded > 0 ? [0, 45, 40, 45] : 22)
  renderer.popup(
    e.stranded > 0 ? `${kind.glyph} GONE — ${e.stranded} WASTED` : `${kind.glyph} GONE`,
    L.w / 2,
    L.ordersY + L.orderH * 1.9,
    '#ff5c7a',
  )
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

function pickPocket(x: number, y: number): number | null {
  for (let slot = 0; slot < POCKETS; slot++) {
    const r = renderer.pocketRect(slot)
    if (x > r.x && x < r.x + r.w && y > r.y - r.h * 0.25 && y < r.y + r.h) return slot
  }
  return null
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

  const slot = pickPocket(e.clientX, e.clientY)
  if (slot !== null) {
    const dropped = game.ditch(slot)
    if (dropped) {
      const r = renderer.pocketRect(slot)
      renderer.popup('DITCHED', r.x + r.w / 2, r.y - r.h * 0.4, '#8a93ad')
      playInvalid()
      vibrate(18)
      if (game.over) bust()
    }
    return
  }

  const mark = pickMark(e.clientX, e.clientY)
  if (!mark) return

  const b = renderer.bubblePos(mark)
  const result = game.lift(mark, b.x, b.y)

  if (!result) {
    playInvalid()
    vibrate(30)
    renderer.shake(6)
    renderer.popup('COAT FULL', b.x, b.y, '#ff5c7a')
    return
  }

  reportLift(result, b)
  if (game.over) bust()
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
  for (const e of events.expired) reportExpiry(e)
  for (const f of events.filled) reportFill(f)
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
