import { P, withAlpha, roundRect, font } from './palette'

/** A raised panel: soft drop shadow, vertical gradient, lit top edge. */
export function panel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  opts: { tint?: string; strength?: number; edge?: string } = {},
): void {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = h * 0.35
  ctx.shadowOffsetY = h * 0.1

  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, opts.tint ?? P.panelHi)
  g.addColorStop(1, P.panel)
  ctx.fillStyle = g
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = opts.edge ?? P.panelEdge
  ctx.lineWidth = 1.5
  roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r)
  ctx.stroke()

  // Highlight along the top lip only.
  ctx.beginPath()
  ctx.moveTo(x + r, y + 1.25)
  ctx.lineTo(x + w - r, y + 1.25)
  ctx.strokeStyle = withAlpha('#ffffff', 0.09 * (opts.strength ?? 1))
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

/** Rounded meter with an inset track and a glossed fill. */
export function meter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  frac: number, color: string, glow = false,
): void {
  ctx.save()
  ctx.fillStyle = P.sunk
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#000000', 0.5)
  ctx.lineWidth = 1
  ctx.stroke()

  const fw = Math.max(h, w * Math.max(0, Math.min(1, frac)))
  if (frac > 0.004) {
    if (glow) {
      ctx.shadowColor = color
      ctx.shadowBlur = h * 0.9
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, withAlpha('#ffffff', 0.35))
    g.addColorStop(0.35, color)
    g.addColorStop(1, color)
    ctx.fillStyle = g
    roundRect(ctx, x, y, fw, h, h / 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = withAlpha('#ffffff', 0.22)
    roundRect(ctx, x + h * 0.22, y + h * 0.17, Math.max(0, fw - h * 0.44), h * 0.26, h * 0.13)
    ctx.fill()
  }
  ctx.restore()
}

/** The loot token. Deliberately the most saturated thing on screen. */
export function lootBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  glyph: string, color: string,
  opts: { wanted: boolean; hot: boolean; time: number },
): void {
  ctx.save()

  if (opts.wanted) {
    const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.1)
    glow.addColorStop(0, withAlpha(color, 0.34))
    glow.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = glow
    ctx.fillRect(x - r * 2.1, y - r * 2.1, r * 4.2, r * 4.2)
  } else {
    ctx.globalAlpha = 0.42
  }

  if (opts.hot && opts.wanted) {
    const pulse = 0.5 + 0.5 * Math.sin(opts.time * 5)
    ctx.strokeStyle = withAlpha(P.danger, 0.35 + pulse * 0.5)
    ctx.lineWidth = r * 0.16
    ctx.beginPath()
    ctx.arc(x, y, r * (1.24 + pulse * 0.1), 0, Math.PI * 2)
    ctx.stroke()
  }

  const disc = ctx.createLinearGradient(0, y - r, 0, y + r)
  disc.addColorStop(0, '#1b2440')
  disc.addColorStop(1, '#0a0f1c')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = opts.wanted ? color : P.junk
  ctx.lineWidth = Math.max(1.5, r * (opts.wanted ? 0.15 : 0.09))
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  if (opts.wanted) {
    ctx.strokeStyle = withAlpha('#ffffff', 0.5)
    ctx.lineWidth = Math.max(1, r * 0.09)
    ctx.beginPath()
    ctx.arc(x, y, r * 0.99, Math.PI * 1.15, Math.PI * 1.72)
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = font.glyph(r * 1.12)
  ctx.fillText(glyph, x, y + r * 0.06)
  ctx.restore()
}

export interface ButtonBox { x: number; y: number; w: number; h: number }

export function button(
  ctx: CanvasRenderingContext2D,
  box: ButtonBox, label: string, sub: string | null, primary: boolean,
): void {
  const { x, y, w, h } = box
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (primary) {
    ctx.shadowColor = withAlpha(P.gold, 0.45)
    ctx.shadowBlur = h * 0.5
    ctx.shadowOffsetY = h * 0.08
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#ffe08a')
    g.addColorStop(1, '#f0a92b')
    ctx.fillStyle = g
    roundRect(ctx, x, y, w, h, h * 0.3)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    ctx.fillStyle = withAlpha('#ffffff', 0.4)
    roundRect(ctx, x + h * 0.18, y + h * 0.12, w - h * 0.36, h * 0.24, h * 0.12)
    ctx.fill()
    ctx.fillStyle = '#2a1d00'
  } else {
    ctx.fillStyle = withAlpha('#ffffff', 0.05)
    roundRect(ctx, x, y, w, h, h * 0.3)
    ctx.fill()
    ctx.strokeStyle = P.panelEdge
    ctx.lineWidth = 2
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, h * 0.3)
    ctx.stroke()
    ctx.fillStyle = P.text
  }

  ctx.font = font.ui(700, h * (sub ? 0.29 : 0.3))
  ctx.fillText(label, x + w / 2, y + (sub ? h * 0.38 : h / 2))
  if (sub) {
    ctx.globalAlpha = 0.72
    ctx.font = font.ui(600, h * 0.19)
    ctx.fillText(sub, x + w / 2, y + h * 0.72)
  }
  ctx.restore()
}

export function label(
  ctx: CanvasRenderingContext2D, text: string,
  x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left',
): void {
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.font = font.ui(700, size)
  ctx.fillText(text, x, y)
}
