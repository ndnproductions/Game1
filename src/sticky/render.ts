import type { StickyGame, Mark, CarriedItem, Goal, Phase } from './game'
import { MAX_POCKETS, ROW_GROUND, ROW_ALPHA } from './game'
import { ITEM_KINDS } from './items'
import { P, LOOT, withAlpha, roundRect, font } from './art/palette'
import { Scene } from './art/scene'
import { drawFigure } from './art/figures'
import { panel, meter, lootBubble, button, label } from './art/ui'
import { drawIcon } from './art/icons'
import { getSprite } from './art/sprites'
import type { ButtonBox } from './art/ui'
import { Particles } from './art/particles'

export interface Layout {
  w: number; h: number; pad: number
  headerH: number; goalsY: number; goalH: number
  laneY: number; laneH: number
  pocketY: number; pocketH: number; pocketW: number; pocketGap: number
  bubbleR: number
}

export interface Button extends ButtonBox {
  id: 'bribe' | 'retry' | 'next'
}

interface Popup { x: number; y: number; text: string; color: string; t: number }
interface Flash { slot: number; t: number }

export function computeLayout(w: number, h: number): Layout {
  const pad = Math.min(w, h) * 0.04
  const headerH = Math.max(190, h * 0.29)
  const goalH = Math.max(48, headerH * 0.24)
  const goalsY = headerH - goalH - pad * 0.55
  const pocketH = Math.max(82, h * 0.115)
  const pocketY = h - pocketH - pad * 1.5
  const laneY = headerH
  const laneH = Math.max(120, pocketY - laneY - pad * 1.2)
  const pocketGap = pad * 0.42
  const pocketW = (w - pad * 2 - pocketGap * (MAX_POCKETS - 1)) / MAX_POCKETS
  return { w, h, pad, headerH, goalsY, goalH, laneY, laneH,
           pocketY, pocketH, pocketW, pocketGap,
           bubbleR: Math.min(laneH * 0.064, w * 0.079) }
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  layout: Layout
  buttons: Button[] = []

  private scene = new Scene()
  private fx = new Particles()
  private popups: Popup[] = []
  private flashes: Flash[] = []
  private shakeAmount = 0
  private time = 0
  private lastPhase: Phase = 'playing'
  private overlay = 0

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
    this.scene.build(w, h, [0, 1, 2].map((r) => this.groundY(r)), this.layout.pocketY)
  }

  popup(text: string, x: number, y: number, color = P.gold): void {
    this.popups.push({ text, x, y, color, t: 0 })
  }

  flash(slots: number[]): void {
    for (const slot of slots) {
      this.flashes.push({ slot, t: 0 })
      const r = this.pocketRect(slot)
      this.fx.burst(r.x + r.w / 2, r.y + r.h / 2, P.gold, 12, 0.9)
    }
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(this.shakeAmount + amount, 22)
  }

  groundY(row: number): number {
    const L = this.layout
    return L.laneY + L.laneH * ROW_GROUND[row]
  }

  figureH(mark: Mark): number {
    return this.layout.laneH * 0.28 * mark.scale
  }

  bubblePos(mark: Mark): { x: number; y: number; r: number } {
    const bob = Math.sin(mark.bobPhase) * 2.5 * mark.scale
    const gy = this.groundY(mark.row) + bob
    const r = this.layout.bubbleR * mark.scale
    // A painted sprite stands taller than the procedural torso metric, so
    // the loot token rides higher to clear the head.
    const top = getSprite(mark.archetype)
      ? this.figureH(mark) * 1.55
      : this.figureH(mark) + r * 0.1
    return { x: mark.x, y: gy - top - r * 0.72, r }
  }

  goalRect(i: number, count: number): ButtonBox {
    const L = this.layout
    const gap = L.pad * 0.38
    const w = (L.w - L.pad * 2 - gap * (count - 1)) / count
    return { x: L.pad + i * (w + gap), y: L.goalsY, w, h: L.goalH }
  }

  pocketRect(slot: number): ButtonBox {
    const L = this.layout
    return { x: L.pad + slot * (L.pocketW + L.pocketGap), y: L.pocketY, w: L.pocketW, h: L.pocketH }
  }

  draw(game: StickyGame, dt: number): void {
    const { ctx } = this
    const L = this.layout
    this.time += dt

    if (game.phase !== this.lastPhase) {
      if (game.phase === 'cleared') this.fx.confetti(L.w, LOOT, 90)
      this.overlay = game.phase === 'playing' ? 0 : 0.001
      this.lastPhase = game.phase
    }
    if (game.phase !== 'playing') this.overlay = Math.min(1, this.overlay + dt * 4.5)

    for (const p of this.popups) p.t += dt * 1.15
    this.popups = this.popups.filter((p) => p.t < 1)
    for (const f of this.flashes) f.t += dt * 2.6
    this.flashes = this.flashes.filter((f) => f.t < 1)
    this.fx.step(dt)
    this.shakeAmount *= Math.pow(0.002, dt)
    if (this.shakeAmount < 0.15) this.shakeAmount = 0

    ctx.save()
    if (this.shakeAmount > 0) {
      ctx.translate((Math.random() - 0.5) * this.shakeAmount, (Math.random() - 0.5) * this.shakeAmount)
    }

    this.scene.draw(ctx, this.time, dt)

    const sorted = [...game.marks].sort((a, b) => a.row - b.row)
    for (const m of sorted) this.drawMark(m, game)

    this.scene.vignette(ctx, game.suspicion)

    this.drawLifts(game)
    this.fx.draw(ctx)
    this.drawHeader(game)
    this.drawGoals(game)
    this.drawPockets(game)
    this.drawPopups()

    ctx.restore()

    this.buttons = []
    if (game.phase === 'caught') this.drawCaught(game)
    else if (game.phase === 'cleared') this.drawCleared(game)
  }

  private drawMark(mark: Mark, game: StickyGame): void {
    const groundY = this.groundY(mark.row) + Math.sin(mark.bobPhase) * 2.5 * mark.scale
    const sprite = getSprite(mark.archetype)

    if (sprite) {
      this.drawSpriteMark(mark, sprite.img, groundY)
    } else {
      drawFigure(this.ctx, {
        id: mark.id,
        x: mark.x,
        groundY,
        height: this.figureH(mark),
        walkPhase: mark.bobPhase,
        awareness: mark.awareness,
        alpha: ROW_ALPHA[mark.row],
        time: this.time,
      })
    }

    if (!mark.item) return
    const b = this.bubblePos(mark)
    const kind = ITEM_KINDS[mark.item.kind]
    lootBubble(this.ctx, b.x, b.y, b.r, kind.icon, kind.color, {
      wanted: game.isWanted(mark.item.kind),
      hot: mark.item.hot,
      time: this.time,
    })
  }

  /**
   * A painted sprite, bottom-anchored on the ground line with a contact
   * shadow and a gentle walk sway. Awareness stays readable as the halo
   * behind the figure, so the art itself never needs recolouring.
   */
  private drawSpriteMark(mark: Mark, img: HTMLImageElement, groundY: number): void {
    const { ctx } = this
    // Sprites include the full body head-to-toe, so they stand taller than
    // the procedural torso metric.
    const h = this.figureH(mark) * 1.55
    const w = h * (img.width / img.height)
    const sway = Math.sin(mark.bobPhase) * 0.045

    ctx.save()
    ctx.globalAlpha = ROW_ALPHA[mark.row]

    const sh = ctx.createRadialGradient(mark.x, groundY, 0, mark.x, groundY, h * 0.24)
    sh.addColorStop(0, 'rgba(0,0,0,0.45)')
    sh.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sh
    ctx.save()
    ctx.translate(mark.x, groundY)
    ctx.scale(1, 0.24)
    ctx.beginPath()
    ctx.arc(0, 0, h * 0.24, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    if (mark.awareness !== 'neutral') {
      const pulse = mark.awareness === 'alert' ? 0.5 + 0.5 * Math.sin(this.time * 6) : 0.35
      const color = mark.awareness === 'alert' ? '255,92,122' : '74,222,128'
      const hy = groundY - h * 0.82
      const halo = ctx.createRadialGradient(mark.x, hy, 0, mark.x, hy, h * 0.3)
      halo.addColorStop(0, `rgba(${color},${0.3 + pulse * 0.3})`)
      halo.addColorStop(1, `rgba(${color},0)`)
      ctx.fillStyle = halo
      ctx.fillRect(mark.x - h * 0.3, hy - h * 0.3, h * 0.6, h * 0.6)
    }

    ctx.translate(mark.x, groundY)
    ctx.rotate(sway)
    ctx.drawImage(img, -w / 2, -h, w, h)
    ctx.restore()
  }

  private drawLifts(game: StickyGame): void {
    const L = this.layout
    for (const fx of game.lifts) {
      const to = this.pocketRect(fx.toSlot)
      const p = fx.t
      const x = fx.from.x + (to.x + to.w / 2 - fx.from.x) * p
      const arc = Math.sin(p * Math.PI) * L.laneH * 0.22
      const y = fx.from.y + (to.y + to.h / 2 - fx.from.y) * p - arc
      const kind = ITEM_KINDS[fx.item.kind]
      lootBubble(this.ctx, x, y, L.bubbleR * (1 - p * 0.3), kind.icon, kind.color,
                 { wanted: true, hot: fx.item.hot, time: this.time })
    }
  }

  private drawHeader(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout
    const top = L.pad * 0.5
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 9)
    const frac = game.timeFraction
    const urgent = frac < 0.2

    ctx.save()
    ctx.textBaseline = 'middle'

    ctx.textAlign = 'left'
    ctx.fillStyle = P.text
    ctx.font = font.display(L.headerH * 0.112)
    ctx.fillText(`STAGE ${game.stage}`, L.pad, top + L.headerH * 0.06)

    label(ctx, `BEST ${game.bestStage}`, L.w - L.pad, top + L.headerH * 0.06,
          L.headerH * 0.058, P.faint, 'right')

    // The clock sits above its own bar rather than inside it, so the fill can
    // never cut through the digits.
    const clockY = top + L.headerH * 0.215
    ctx.textAlign = 'center'
    ctx.font = font.display(L.headerH * 0.175)
    ctx.fillStyle = urgent ? P.danger : P.text
    if (urgent) {
      ctx.shadowColor = P.danger
      ctx.shadowBlur = L.headerH * (0.06 + pulse * 0.1)
    }
    ctx.fillText(clock(game.timeLeft), L.w / 2, clockY)
    ctx.shadowBlur = 0

    const barY = clockY + L.headerH * 0.11
    const barH = Math.max(11, L.headerH * 0.055)
    const barW = L.w - L.pad * 2
    meter(ctx, L.pad, barY, barW, barH, frac,
          urgent ? P.danger : frac < 0.5 ? P.gold : P.safe, urgent)

    const susY = barY + barH + L.headerH * 0.045
    const susH = Math.max(9, L.headerH * 0.042)
    const s = game.suspicion
    meter(ctx, L.pad, susY, barW, susH, s, `hsl(${52 - s * 52} 92% ${60 - s * 12}%)`, s > 0.7)

    const lY = susY + susH + L.headerH * 0.055
    label(ctx, 'SUSPICION', L.pad, lY, L.headerH * 0.052, s > 0.75 ? P.danger : P.faint)
    const free = game.freePockets
    label(ctx, `${free} POCKET${free === 1 ? '' : 'S'} FREE`, L.w - L.pad, lY,
          L.headerH * 0.052, free === 0 ? P.danger : P.faint, 'right')
    ctx.restore()
  }

  private drawGoals(game: StickyGame): void {
    const { ctx } = this
    const count = game.goals.length

    for (let i = 0; i < count; i++) {
      const goal: Goal = game.goals[i]
      const r = this.goalRect(i, count)
      const kind = ITEM_KINDS[goal.kind]
      const done = goal.secured >= goal.need
      const held = game.countHeld(goal.kind)

      panel(ctx, r.x, r.y, r.w, r.h, r.h * 0.26, {
        tint: done ? '#16341f' : undefined,
        edge: done ? withAlpha(P.safe, 0.55) : withAlpha(kind.color, 0.4),
      })

      ctx.save()
      ctx.globalAlpha = done ? 0.5 : 1
      drawIcon(ctx, kind.icon, r.x + r.w * 0.19, r.y + r.h * 0.44, r.h * 0.52, kind.color)
      ctx.restore()

      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = done ? P.safe : P.text
      ctx.font = font.display(r.h * 0.44)
      ctx.fillText(`${goal.secured}/${goal.need}`, r.x + r.w * 0.92, r.y + r.h * 0.43)

      if (!done) {
        const target = game.stashTarget(goal)
        const pipR = r.h * 0.068
        const gap = pipR * 2.7
        const startX = r.x + r.w * 0.92 - (target - 1) * gap
        for (let p = 0; p < target; p++) {
          const filled = p < held
          ctx.beginPath()
          ctx.arc(startX + p * gap, r.y + r.h * 0.79, pipR, 0, Math.PI * 2)
          ctx.fillStyle = filled ? kind.color : withAlpha('#ffffff', 0.14)
          if (filled) { ctx.shadowColor = kind.color; ctx.shadowBlur = pipR * 2.4 }
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
    }
  }

  private drawPockets(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout

    label(ctx, 'COAT — TAP TO DITCH', L.pad, L.pocketY - L.pad * 0.7,
          L.pocketH * 0.155, P.faint)

    for (let slot = 0; slot < MAX_POCKETS; slot++) {
      const r = this.pocketRect(slot)
      const radius = r.w * 0.26

      if (slot >= game.pockets.length) {
        ctx.save()
        ctx.fillStyle = withAlpha('#000000', 0.42)
        roundRect(ctx, r.x, r.y, r.w, r.h, radius)
        ctx.fill()
        ctx.strokeStyle = withAlpha(P.faint, 0.4)
        ctx.lineWidth = Math.max(1.5, r.w * 0.035)
        ctx.setLineDash([r.w * 0.15, r.w * 0.11])
        roundRect(ctx, r.x, r.y, r.w, r.h, radius)
        ctx.stroke()
        ctx.setLineDash([])
        const k = r.w * 0.2
        ctx.beginPath()
        ctx.moveTo(r.x + r.w / 2 - k, r.y + r.h / 2 - k)
        ctx.lineTo(r.x + r.w / 2 + k, r.y + r.h / 2 + k)
        ctx.moveTo(r.x + r.w / 2 + k, r.y + r.h / 2 - k)
        ctx.lineTo(r.x + r.w / 2 - k, r.y + r.h / 2 + k)
        ctx.stroke()
        ctx.restore()
        continue
      }

      const item = game.pockets[slot]

      // Inset well
      ctx.save()
      const well = ctx.createLinearGradient(0, r.y, 0, r.y + r.h)
      well.addColorStop(0, P.sunk)
      well.addColorStop(1, '#131b30')
      ctx.fillStyle = well
      roundRect(ctx, r.x, r.y, r.w, r.h, radius)
      ctx.fill()
      ctx.strokeStyle = withAlpha('#000000', 0.6)
      ctx.lineWidth = 1.5
      roundRect(ctx, r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5, radius)
      ctx.stroke()
      ctx.restore()

      if (item) this.drawPocketItem(item, r, radius, game.isWanted(item.kind))

      const flash = this.flashes.find((f) => f.slot === slot)
      if (flash) {
        ctx.fillStyle = withAlpha('#ffffff', (1 - flash.t) * 0.7)
        roundRect(ctx, r.x, r.y, r.w, r.h, radius)
        ctx.fill()
      }
    }
  }

  private drawPocketItem(item: CarriedItem, r: ButtonBox, radius: number, wanted: boolean): void {
    const { ctx } = this
    const kind = ITEM_KINDS[item.kind]
    const tint = !wanted ? P.junk : item.hot ? P.danger : kind.color

    ctx.save()
    if (wanted) {
      ctx.shadowColor = withAlpha(tint, 0.85)
      ctx.shadowBlur = r.w * 0.3
    }
    ctx.strokeStyle = tint
    ctx.lineWidth = Math.max(2, r.w * 0.06)
    roundRect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, radius)
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = wanted ? 1 : 0.42
    drawIcon(ctx, kind.icon, r.x + r.w / 2, r.y + r.h * 0.44,
             Math.min(r.w, r.h) * 0.56, wanted ? kind.color : P.junk)
    ctx.restore()

    if (!wanted) {
      label(ctx, 'JUNK', r.x + r.w / 2, r.y + r.h * 0.85, r.h * 0.155, P.junk, 'center')
    }
  }

  private drawPopups(): void {
    const { ctx } = this
    const L = this.layout
    ctx.save()
    for (const p of this.popups) {
      const k = 1 - p.t * p.t
      ctx.globalAlpha = k
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = font.display(L.pocketH * (0.4 + p.t * 0.1))
      ctx.shadowColor = withAlpha(p.color, 0.9)
      ctx.shadowBlur = 14
      ctx.fillStyle = p.color
      ctx.fillText(p.text, p.x, p.y - p.t * L.pocketH * 1.0)
    }
    ctx.restore()
  }

  private scrim(): void {
    const { ctx } = this
    const L = this.layout
    ctx.fillStyle = withAlpha('#04060d', 0.9 * this.overlay)
    ctx.fillRect(0, 0, L.w, L.h)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
  }

  private buttonAt(id: Button['id'], y: number, text: string, sub: string | null, primary: boolean): number {
    const L = this.layout
    const w = Math.min(L.w - L.pad * 2, 340)
    const h = Math.max(58, L.h * 0.078)
    const box = { x: L.w / 2 - w / 2, y, w, h }
    button(this.ctx, box, text, sub, primary)
    this.buttons.push({ id, ...box })
    return y + h + L.pad * 0.85
  }

  private drawCaught(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout
    this.scrim()
    ctx.save()
    ctx.globalAlpha = this.overlay
    const rise = (1 - this.overlay) * L.h * 0.05

    ctx.fillStyle = P.danger
    ctx.shadowColor = withAlpha(P.danger, 0.7)
    ctx.shadowBlur = 30
    ctx.font = font.display(L.w * 0.185)
    ctx.fillText('CAUGHT', L.w / 2, L.h * 0.24 + rise)
    ctx.shadowBlur = 0

    ctx.fillStyle = P.dim
    ctx.font = font.ui(500, L.w * 0.042)
    ctx.fillText(game.caughtReason === 'time' ? 'The window closed.' : 'They were watching you.',
                 L.w / 2, L.h * 0.32 + rise)

    ctx.fillStyle = P.text
    ctx.font = font.display(L.w * 0.19)
    ctx.fillText(`${game.itemsSecured}/${game.itemsTotal}`, L.w / 2, L.h * 0.43 + rise)
    label(ctx, `SECURED ON STAGE ${game.stage}`, L.w / 2, L.h * 0.5 + rise, L.w * 0.036, P.faint, 'center')
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = this.overlay
    let y = L.h * 0.59
    if (!game.bribeUsed) y = this.buttonAt('bribe', y, 'BRIBE THE GUARD', '+15 seconds · keep your haul', true)
    this.buttonAt('retry', y, 'RUN IT AGAIN', null, false)
    ctx.restore()
  }

  private drawCleared(game: StickyGame): void {
    const { ctx } = this
    const L = this.layout
    this.scrim()
    ctx.save()
    ctx.globalAlpha = this.overlay
    const rise = (1 - this.overlay) * L.h * 0.05

    ctx.fillStyle = P.safe
    ctx.shadowColor = withAlpha(P.safe, 0.6)
    ctx.shadowBlur = 30
    ctx.font = font.display(L.w * 0.16)
    ctx.fillText(`STAGE ${game.stage}`, L.w / 2, L.h * 0.25 + rise)
    ctx.fillText('CLEAR', L.w / 2, L.h * 0.34 + rise)
    ctx.shadowBlur = 0

    ctx.fillStyle = P.dim
    ctx.font = font.ui(500, L.w * 0.042)
    ctx.fillText(`${game.itemsTotal} pieces, clean away.`, L.w / 2, L.h * 0.43 + rise)

    ctx.fillStyle = P.gold
    ctx.font = font.display(L.w * 0.075)
    ctx.fillText(`${clock(game.timeLeft)} to spare`, L.w / 2, L.h * 0.51 + rise)
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = this.overlay
    this.buttonAt('next', L.h * 0.61, 'NEXT JOB', null, true)
    ctx.restore()
  }
}
