import type { StickyGame, Mark, CarriedItem, Awareness } from './game'
import { POCKETS, ORDER_COUNT, ROW_GROUND, ROW_ALPHA } from './game'
import { ITEM_KINDS } from './items'

export interface Layout {
  w: number
  h: number
  pad: number
  headerH: number
  ordersY: number
  orderH: number
  orderW: number
  laneY: number
  laneH: number
  pocketY: number
  pocketH: number
  pocketW: number
  pocketGap: number
  bubbleR: number
}

export interface Button {
  id: 'bribe' | 'again'
  x: number
  y: number
  w: number
  h: number
}

const C = {
  bg: '#0d1018',
  bgGlow: '#171d2b',
  street: '#141a26',
  slot: '#1c2333',
  text: '#ffffff',
  dim: '#8a93ad',
  gold: '#ffd93d',
  hot: '#ff5c7a',
  safe: '#4ade80',
  junk: '#5a6377',
}

/** Head colour tells you the whole risk story at a glance. */
const HEAD_COLOR: Record<Awareness, string | null> = {
  distracted: C.safe,
  neutral: null,
  alert: C.hot,
}

interface Popup { x: number; y: number; text: string; color: string; t: number }
interface Flash { slot: number; t: number }

export function computeLayout(w: number, h: number): Layout {
  const pad = Math.min(w, h) * 0.04
  const headerH = Math.max(148, h * 0.235)
  const orderH = Math.max(46, headerH * 0.29)
  const orderW = (w - pad * 2 - pad * 0.4 * (ORDER_COUNT - 1)) / ORDER_COUNT
  const ordersY = headerH - orderH - pad * 0.5
  const pocketH = Math.max(84, h * 0.115)
  const pocketY = h - pocketH - pad * 1.5
  const laneY = headerH
  const laneH = Math.max(120, pocketY - laneY - pad * 1.2)
  const pocketGap = pad * 0.45
  const pocketW = (w - pad * 2 - pocketGap * (POCKETS - 1)) / POCKETS

  return { w, h, pad, headerH, ordersY, orderH, orderW, laneY, laneH,
           pocketY, pocketH, pocketW, pocketGap,
           bubbleR: Math.min(laneH * 0.062, w * 0.078) }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  layout: Layout
  buttons: Button[] = []

  private popups: Popup[] = []
  private flashes: Flash[] = []
  private shakeAmount = 0

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

  popup(text: string, x: number, y: number, color = C.gold): void {
    this.popups.push({ text, x, y, color, t: 0 })
  }

  flash(slots: number[]): void {
    for (const slot of slots) this.flashes.push({ slot, t: 0 })
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(this.shakeAmount + amount, 20)
  }

  groundY(row: number): number {
    const L = this.layout
    return L.laneY + L.laneH * ROW_GROUND[row]
  }

  figureH(mark: Mark): number {
    return this.layout.laneH * 0.2 * mark.scale
  }

  bubblePos(mark: Mark): { x: number; y: number; r: number } {
    const bob = Math.sin(mark.bobPhase) * 2.5 * mark.scale
    const gy = this.groundY(mark.row) + bob
    const r = this.layout.bubbleR * mark.scale
    return { x: mark.x, y: gy - this.figureH(mark) - r * 1.35, r }
  }

  orderRect(i: number): { x: number; y: number; w: number; h: number } {
    const L = this.layout
    return { x: L.pad + i * (L.orderW + L.pad * 0.4), y: L.ordersY, w: L.orderW, h: L.orderH }
  }

  pocketRect(slot: number): { x: number; y: number; w: number; h: number } {
    const L = this.layout
    return { x: L.pad + slot * (L.pocketW + L.pocketGap), y: L.pocketY, w: L.pocketW, h: L.pocketH }
  }

  draw(game: StickyGame, dt: number): void {
    const { ctx } = this

    for (const p of this.popups) p.t += dt * 1.15
    this.popups = this.popups.filter((p) => p.t < 1)
    for (const f of this.flashes) f.t += dt * 2.6
    this.flashes = this.flashes.filter((f) => f.t < 1)
    this.shakeAmount *= Math.pow(0.002, dt)
    if (this.shakeAmount < 0.15) this.shakeAmount = 0

    ctx.save()
    if (this.shakeAmount > 0) {
      ctx.translate((Math.random() - 0.5) * this.shakeAmount, (Math.random() - 0.5) * this.shakeAmount)
    }

    this.drawBackground()
    this.drawHeader(game)
    this.drawOrders(game)

    const sorted = [...game.marks].sort((a, b) => a.row - b.row)
    for (const m of sorted) this.drawMark(m, game)

    this.drawLifts(game)
    this.drawPockets(game)
    this.drawPopups()

    ctx.restore()

    this.buttons = []
    if (game.over) this.drawGameOver(game)
  }

  private drawBackground(): void {
    const { ctx } = this
    const L = this.layout
    const g = ctx.createLinearGradient(0, 0, 0, L.h)
    g.addColorStop(0, C.bgGlow)
    g.addColorStop(0.55, C.bg)
    g.addColorStop(1, C.bg)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L.w, L.h)

    for (const row of [0, 1, 2]) {
      const y = this.groundY(row)
      const next = row < 2 ? this.groundY(row + 1) : L.pocketY
      ctx.fillStyle = C.street
      ctx.globalAlpha = 0.35 + row * 0.25
      ctx.fillRect(0, y, L.w, (next - y) * 0.55)
      ctx.globalAlpha = 1
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + row * 0.02})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(L.w, y + 0.5)
      ctx.stroke()
    }
  }

  private drawHeader(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout
    const top = L.pad * 0.5

    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = C.dim
    ctx.font = `600 ${Math.round(L.headerH * 0.09)}px system-ui, sans-serif`
    ctx.fillText(`BEST ${game.best}`, L.pad, top + L.headerH * 0.11)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.text
    ctx.font = `800 ${Math.round(L.headerH * 0.22)}px system-ui, sans-serif`
    ctx.fillText(String(game.score), L.w / 2, top + L.headerH * 0.145)

    const barY = top + L.headerH * 0.3
    const barH = Math.max(9, L.headerH * 0.075)
    const barW = L.w - L.pad * 2
    ctx.fillStyle = C.slot
    roundRect(ctx, L.pad, barY, barW, barH, barH / 2)
    ctx.fill()

    const s = game.suspicion
    if (s > 0.012) {
      ctx.fillStyle = `hsl(${55 - s * 55} 90% ${58 - s * 10}%)`
      roundRect(ctx, L.pad, barY, Math.max(barH, barW * s), barH, barH / 2)
      ctx.fill()
    }

    ctx.textAlign = 'left'
    ctx.fillStyle = s > 0.75 ? C.hot : C.dim
    ctx.font = `600 ${Math.round(L.headerH * 0.075)}px system-ui, sans-serif`
    ctx.fillText('SUSPICION', L.pad, barY + barH + L.headerH * 0.085)

    ctx.textAlign = 'right'
    ctx.fillStyle = game.freePockets === 0 ? C.hot : C.dim
    ctx.fillText(`${game.freePockets} FREE`, L.w - L.pad, barY + barH + L.headerH * 0.085)
  }

  /** The fence's list. Anything not on it is dead weight in your coat. */
  private drawOrders(game: StickyGame): void {
    const { ctx } = this

    for (let i = 0; i < game.orders.length; i++) {
      const o = game.orders[i]
      const r = this.orderRect(i)
      const kind = ITEM_KINDS[o.kind]
      const have = game.progress(o)
      const done = have >= o.need

      const left = game.timeLeft(o)
      const urgent = left < 0.28
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 95)

      ctx.fillStyle = urgent ? `rgba(60,24,32,${0.5 + pulse * 0.35})` : C.slot
      roundRect(ctx, r.x, r.y, r.w, r.h, r.h * 0.24)
      ctx.fill()
      ctx.strokeStyle = done ? C.safe : urgent ? C.hot : kind.color
      ctx.lineWidth = done || urgent ? 3 : 1.5
      roundRect(ctx, r.x, r.y, r.w, r.h, r.h * 0.24)
      ctx.stroke()

      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.round(r.h * 0.46)}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.fillText(kind.glyph, r.x + r.w * 0.11, r.y + r.h * 0.44)

      ctx.fillStyle = have > 0 ? C.text : C.dim
      ctx.font = `800 ${Math.round(r.h * 0.34)}px system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(`${have}/${o.need}`, r.x + r.w * 0.89, r.y + r.h * 0.44)

      // Countdown along the bottom of the chip.
      const barH = Math.max(4, r.h * 0.1)
      const barY = r.y + r.h - barH - r.h * 0.12
      const barX = r.x + r.w * 0.1
      const barW = r.w * 0.8
      ctx.fillStyle = 'rgba(255,255,255,0.09)'
      roundRect(ctx, barX, barY, barW, barH, barH / 2)
      ctx.fill()
      if (left > 0) {
        ctx.fillStyle = urgent
          ? `rgba(255,92,122,${0.65 + pulse * 0.35})`
          : left < 0.5 ? C.gold : C.safe
        roundRect(ctx, barX, barY, Math.max(barH, barW * left), barH, barH / 2)
        ctx.fill()
      }
    }
  }

  private drawMark(mark: Mark, game: StickyGame): void {
    const { ctx } = this
    const bob = Math.sin(mark.bobPhase) * 2.5 * mark.scale
    const gy = this.groundY(mark.row) + bob
    const fh = this.figureH(mark)
    const bw = fh * 0.42
    const headR = fh * 0.17
    const headY = gy - fh * 0.36 - fh * 0.46 - headR * 0.85

    ctx.save()
    ctx.globalAlpha = ROW_ALPHA[mark.row]

    ctx.fillStyle = mark.bodyColor
    const legH = fh * 0.36
    const swing = Math.sin(mark.bobPhase) * bw * 0.18
    roundRect(ctx, mark.x - bw * 0.32 + swing, gy - legH, bw * 0.26, legH, bw * 0.13)
    ctx.fill()
    roundRect(ctx, mark.x + bw * 0.06 - swing, gy - legH, bw * 0.26, legH, bw * 0.13)
    ctx.fill()

    const torsoH = fh * 0.46
    roundRect(ctx, mark.x - bw / 2, gy - legH - torsoH, bw, torsoH, bw * 0.28)
    ctx.fill()

    if (mark.awareness === 'alert') {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 110)
      ctx.strokeStyle = `rgba(255,92,122,${0.3 + pulse * 0.5})`
      ctx.lineWidth = headR * 0.4
      ctx.beginPath()
      ctx.arc(mark.x, headY, headR * (1.7 + pulse * 0.2), 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = HEAD_COLOR[mark.awareness] ?? mark.bodyColor
    ctx.beginPath()
    ctx.arc(mark.x, headY, headR, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    if (mark.item) this.drawBubble(mark, mark.item, game.isWanted(mark.item.kind))
  }

  private drawBubble(mark: Mark, item: CarriedItem, wanted: boolean): void {
    const { ctx } = this
    const { x, y, r } = this.bubblePos(mark)
    const kind = ITEM_KINDS[item.kind]
    const t = performance.now() / 1000

    // Junk is drawn washed out on purpose: knowing what to ignore is the skill.
    ctx.save()
    ctx.globalAlpha = wanted ? 1 : 0.4

    if (item.hot && wanted) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5)
      ctx.strokeStyle = `rgba(255,92,122,${0.35 + pulse * 0.5})`
      ctx.lineWidth = r * 0.22
      ctx.beginPath()
      ctx.arc(x, y, r * (1.2 + pulse * 0.09), 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(12,16,26,0.92)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = !wanted ? C.junk : item.hot ? C.hot : kind.color
    ctx.lineWidth = Math.max(2, r * (wanted ? 0.16 : 0.09))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${Math.round(r * 1.15)}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`
    ctx.fillText(kind.glyph, x, y + r * 0.06)
    ctx.restore()
  }

  private drawLifts(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout
    for (const fx of game.lifts) {
      const to = this.pocketRect(fx.toSlot)
      const p = fx.t
      const x = fx.from.x + (to.x + to.w / 2 - fx.from.x) * p
      const arc = Math.sin(p * Math.PI) * L.laneH * 0.18
      const y = fx.from.y + (to.y + to.h / 2 - fx.from.y) * p - arc
      const r = L.bubbleR * (1 - p * 0.35)
      const kind = ITEM_KINDS[fx.item.kind]

      ctx.globalAlpha = 1 - p * 0.25
      ctx.fillStyle = 'rgba(12,16,26,0.95)'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = fx.item.hot ? C.hot : kind.color
      ctx.lineWidth = Math.max(2, r * 0.14)
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.round(r * 1.15)}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.fillText(kind.glyph, x, y + r * 0.06)
      ctx.globalAlpha = 1
    }
  }

  private drawPockets(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = C.dim
    ctx.font = `600 ${Math.round(L.pocketH * 0.16)}px system-ui, sans-serif`
    ctx.fillText('COAT — TAP TO DITCH', L.pad, L.pocketY - L.pad * 0.62)

    for (let slot = 0; slot < POCKETS; slot++) {
      const r = this.pocketRect(slot)
      const item = game.pockets[slot]

      ctx.fillStyle = C.slot
      roundRect(ctx, r.x, r.y, r.w, r.h, r.w * 0.24)
      ctx.fill()

      if (item) {
        const wanted = game.isWanted(item.kind)
        const kind = ITEM_KINDS[item.kind]
        ctx.strokeStyle = !wanted ? C.junk : item.hot ? C.hot : kind.color
        ctx.lineWidth = Math.max(2, r.w * 0.06)
        roundRect(ctx, r.x, r.y, r.w, r.h, r.w * 0.24)
        ctx.stroke()

        ctx.save()
        ctx.globalAlpha = wanted ? 1 : 0.4
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `${Math.round(Math.min(r.w, r.h) * 0.5)}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`
        ctx.fillText(kind.glyph, r.x + r.w / 2, r.y + r.h * 0.46)
        ctx.restore()

        if (!wanted) {
          ctx.fillStyle = C.junk
          ctx.textAlign = 'center'
          ctx.font = `700 ${Math.round(r.h * 0.16)}px system-ui, sans-serif`
          ctx.fillText('JUNK', r.x + r.w / 2, r.y + r.h * 0.85)
        }
      }

      const flash = this.flashes.find((f) => f.slot === slot)
      if (flash) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - flash.t) * 0.75})`
        roundRect(ctx, r.x, r.y, r.w, r.h, r.w * 0.24)
        ctx.fill()
      }
    }
  }

  private drawPopups(): void {
    const { ctx } = this
    const L = this.layout
    for (const p of this.popups) {
      ctx.globalAlpha = 1 - p.t * p.t
      ctx.fillStyle = p.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `800 ${Math.round(L.pocketH * (0.34 + p.t * 0.1))}px system-ui, sans-serif`
      ctx.fillText(p.text, p.x, p.y - p.t * L.pocketH * 0.9)
      ctx.globalAlpha = 1
    }
  }

  private drawGameOver(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout

    ctx.fillStyle = 'rgba(6,8,14,0.88)'
    ctx.fillRect(0, 0, L.w, L.h)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = C.hot
    ctx.font = `900 ${Math.round(L.w * 0.13)}px system-ui, sans-serif`
    ctx.fillText('CAUGHT', L.w / 2, L.h * 0.27)

    ctx.fillStyle = C.dim
    ctx.font = `500 ${Math.round(L.w * 0.042)}px system-ui, sans-serif`
    ctx.fillText('They were watching you.', L.w / 2, L.h * 0.34)

    ctx.fillStyle = C.text
    ctx.font = `800 ${Math.round(L.w * 0.17)}px system-ui, sans-serif`
    ctx.fillText(String(game.score), L.w / 2, L.h * 0.45)

    const bw = Math.min(L.w - L.pad * 2, 330)
    const bh = Math.max(56, L.h * 0.075)
    let y = L.h * 0.58

    if (!game.bribeUsed) {
      const x = L.w / 2 - bw / 2
      ctx.fillStyle = C.gold
      roundRect(ctx, x, y, bw, bh, bh * 0.28)
      ctx.fill()
      ctx.fillStyle = '#231c00'
      ctx.font = `800 ${Math.round(bh * 0.3)}px system-ui, sans-serif`
      ctx.fillText('BRIBE THE GUARD', L.w / 2, y + bh * 0.38)
      ctx.font = `600 ${Math.round(bh * 0.2)}px system-ui, sans-serif`
      ctx.fillText('Empty the coat · once per run', L.w / 2, y + bh * 0.72)
      this.buttons.push({ id: 'bribe', x, y, w: bw, h: bh })
      y += bh + L.pad
    }

    const x2 = L.w / 2 - bw / 2
    ctx.strokeStyle = '#3a4257'
    ctx.lineWidth = 2
    roundRect(ctx, x2, y, bw, bh, bh * 0.28)
    ctx.stroke()
    ctx.fillStyle = C.text
    ctx.font = `700 ${Math.round(bh * 0.28)}px system-ui, sans-serif`
    ctx.fillText('RUN IT AGAIN', L.w / 2, y + bh / 2)
    this.buttons.push({ id: 'again', x: x2, y, w: bw, h: bh })
  }
}
