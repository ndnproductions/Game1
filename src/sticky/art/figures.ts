import { P, withAlpha } from './palette'
import type { Awareness } from '../game'

const RIM: Record<Awareness, { color: string; alpha: number }> = {
  distracted: { color: P.rimSafe, alpha: 0.85 },
  neutral: { color: P.rimNeutral, alpha: 0.62 },
  alert: { color: P.rimAlert, alpha: 0.9 },
}

/** Deterministic per-mark look, so a figure never changes as it walks. */
function hash(id: number): number {
  let h = (id * 2654435761) >>> 0
  h ^= h >>> 13
  return (h >>> 0) / 4294967295
}

export interface FigureOpts {
  id: number
  x: number
  groundY: number
  height: number
  walkPhase: number
  awareness: Awareness
  alpha: number
  time: number
}

/**
 * Builds every part of the body into the current path set. Called twice — once
 * offset and filled with the rim colour, once flat — which fakes a backlight
 * far more cheaply than a real light pass.
 */
function silhouette(
  ctx: CanvasRenderingContext2D, o: FigureOpts,
  ox: number, oy: number, fill: string | CanvasGradient,
): void {
  const r = hash(o.id)
  const r2 = hash(o.id * 7 + 13)
  const h = o.height
  const x = o.x + ox
  const gy = o.groundY + oy

  const hasHat = r > 0.62
  const longCoat = r2 > 0.5
  const hasBag = r2 < 0.28

  const shoulder = h * 0.26
  const bodyW = h * 0.37 * (0.9 + r * 0.2)
  const headR = h * 0.118
  const coatBottom = gy - h * (longCoat ? 0.24 : 0.34)
  const swing = Math.sin(o.walkPhase) * h * 0.055

  ctx.fillStyle = fill

  // Legs
  ctx.beginPath()
  ctx.roundRect(x - bodyW * 0.34 + swing, coatBottom, bodyW * 0.28, gy - coatBottom, bodyW * 0.14)
  ctx.roundRect(x + bodyW * 0.06 - swing, coatBottom, bodyW * 0.28, gy - coatBottom, bodyW * 0.14)
  ctx.fill()

  // Coat: shoulders down to a slightly flared hem
  const topY = gy - h + shoulder * 0.42
  ctx.beginPath()
  ctx.moveTo(x - bodyW * 0.42, topY + h * 0.02)
  ctx.quadraticCurveTo(x - bodyW * 0.5, topY - h * 0.02, x, topY - h * 0.03)
  ctx.quadraticCurveTo(x + bodyW * 0.5, topY - h * 0.02, x + bodyW * 0.42, topY + h * 0.02)
  ctx.lineTo(x + bodyW * 0.54, coatBottom)
  ctx.quadraticCurveTo(x, coatBottom + h * 0.02, x - bodyW * 0.54, coatBottom)
  ctx.closePath()
  ctx.fill()

  // Swinging arm on the near side
  ctx.beginPath()
  ctx.roundRect(
    x + bodyW * 0.38 - swing * 0.6, topY + h * 0.06,
    bodyW * 0.2, h * (longCoat ? 0.3 : 0.34), bodyW * 0.1,
  )
  ctx.fill()

  // Head
  const headY = topY - headR * 0.85
  ctx.beginPath()
  ctx.arc(x, headY, headR, 0, Math.PI * 2)
  ctx.fill()

  if (hasHat) {
    ctx.beginPath()
    ctx.roundRect(x - headR * 1.5, headY - headR * 0.72, headR * 3, headR * 0.34, headR * 0.17)
    ctx.roundRect(x - headR * 0.86, headY - headR * 1.62, headR * 1.72, headR * 1.05, headR * 0.2)
    ctx.fill()
  }

  if (hasBag) {
    ctx.beginPath()
    ctx.roundRect(x - bodyW * 0.78, coatBottom - h * 0.1, bodyW * 0.3, h * 0.14, bodyW * 0.07)
    ctx.fill()
  }
}

export function drawFigure(ctx: CanvasRenderingContext2D, o: FigureOpts): void {
  const h = o.height

  ctx.save()
  ctx.globalAlpha = o.alpha

  // Contact shadow
  const sh = ctx.createRadialGradient(o.x, o.groundY, 0, o.x, o.groundY, h * 0.28)
  sh.addColorStop(0, 'rgba(0,0,0,0.5)')
  sh.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sh
  ctx.save()
  ctx.translate(o.x, o.groundY)
  ctx.scale(1, 0.22)
  ctx.beginPath()
  ctx.arc(0, 0, h * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (o.awareness === 'alert') {
    const pulse = 0.5 + 0.5 * Math.sin(o.time * 6)
    const hy = o.groundY - h * 0.9
    const halo = ctx.createRadialGradient(o.x, hy, 0, o.x, hy, h * 0.34)
    halo.addColorStop(0, withAlpha(P.rimAlert, 0.34 + pulse * 0.26))
    halo.addColorStop(1, withAlpha(P.rimAlert, 0))
    ctx.fillStyle = halo
    ctx.fillRect(o.x - h * 0.34, hy - h * 0.34, h * 0.68, h * 0.68)
  }

  // Rim pass, offset up-left toward the street lamps behind the crowd. Kept
  // thin and semi-transparent: it should read as a lit edge, not an outline.
  const rim = RIM[o.awareness]
  const rimW = Math.max(1, h * 0.013)
  ctx.globalAlpha = o.alpha * rim.alpha
  silhouette(ctx, o, -rimW, -rimW * 0.8, rim.color)

  // Body fill lifts very slightly toward the head so it is not flat black.
  ctx.globalAlpha = o.alpha
  const bodyGrad = ctx.createLinearGradient(0, o.groundY - h, 0, o.groundY)
  bodyGrad.addColorStop(0, '#1b2742')
  bodyGrad.addColorStop(1, '#0a1020')
  silhouette(ctx, o, 0, 0, bodyGrad as unknown as string)

  ctx.restore()
}
