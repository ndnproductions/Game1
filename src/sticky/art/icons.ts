import { shade } from './palette'

export type IconId = 'watch' | 'purse' | 'phone' | 'ring' | 'keys' | 'shades' | 'camera'

/**
 * The loot icons, drawn as paths rather than emoji. Emoji render differently
 * on every platform, go missing on some, and pick up whatever fillStyle was
 * left on the context — all three of which broke them on iOS.
 *
 * Each shape is authored inside a unit box from -0.5 to 0.5 and scaled to the
 * requested size, so line weights stay proportional at any scale.
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  id: IconId, x: number, y: number, size: number, color: string,
): void {
  const dark = shade(color, -0.42)
  const light = shade(color, 0.42)

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size, size)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  switch (id) {
    case 'watch': {
      // Straps run wide and light so the shape does not read as a coin.
      ctx.fillStyle = light
      rr(ctx, -0.19, -0.5, 0.38, 0.32, 0.07)
      rr(ctx, -0.19, 0.18, 0.38, 0.32, 0.07)
      ctx.fillStyle = dark
      circle(ctx, 0, 0, 0.35)
      ctx.fillStyle = color
      circle(ctx, 0, 0, 0.29)
      ctx.fillStyle = shade(color, 0.72)
      circle(ctx, 0, 0, 0.21)
      ctx.strokeStyle = dark
      ctx.lineWidth = 0.045
      ctx.beginPath()
      ctx.moveTo(0, 0); ctx.lineTo(0, -0.15)
      ctx.moveTo(0, 0); ctx.lineTo(0.12, 0.05)
      ctx.stroke()
      break
    }
    case 'purse': {
      ctx.strokeStyle = dark
      ctx.lineWidth = 0.07
      ctx.beginPath()
      ctx.arc(0, -0.08, 0.22, Math.PI, 0)
      ctx.stroke()
      ctx.fillStyle = color
      rr(ctx, -0.42, -0.1, 0.84, 0.55, 0.18)
      ctx.fillStyle = light
      rr(ctx, -0.42, -0.1, 0.84, 0.14, 0.07)
      ctx.fillStyle = dark
      circle(ctx, 0, 0.14, 0.08)
      break
    }
    case 'phone': {
      ctx.fillStyle = dark
      rr(ctx, -0.27, -0.47, 0.54, 0.94, 0.11)
      ctx.fillStyle = color
      rr(ctx, -0.21, -0.38, 0.42, 0.68, 0.05)
      ctx.fillStyle = light
      rr(ctx, -0.21, -0.38, 0.42, 0.24, 0.05)
      ctx.fillStyle = shade(color, -0.1)
      rr(ctx, -0.09, 0.35, 0.18, 0.05, 0.025)
      break
    }
    case 'ring': {
      ctx.strokeStyle = color
      ctx.lineWidth = 0.11
      ctx.beginPath()
      ctx.arc(0, 0.12, 0.3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.moveTo(0, -0.48)
      ctx.lineTo(0.19, -0.28)
      ctx.lineTo(0, -0.08)
      ctx.lineTo(-0.19, -0.28)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = shade(color, 0.75)
      ctx.beginPath()
      ctx.moveTo(0, -0.48); ctx.lineTo(0.19, -0.28); ctx.lineTo(0, -0.28)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'keys': {
      ctx.strokeStyle = color
      ctx.lineWidth = 0.1
      ctx.beginPath()
      ctx.arc(-0.16, -0.22, 0.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-0.02, -0.08)
      ctx.lineTo(0.34, 0.4)
      ctx.stroke()
      ctx.lineWidth = 0.085
      ctx.beginPath()
      ctx.moveTo(0.12, 0.12); ctx.lineTo(0.26, 0.02)
      ctx.moveTo(0.24, 0.28); ctx.lineTo(0.38, 0.18)
      ctx.stroke()
      break
    }
    case 'shades': {
      ctx.fillStyle = color
      rr(ctx, -0.47, -0.16, 0.4, 0.34, 0.14)
      rr(ctx, 0.07, -0.16, 0.4, 0.34, 0.14)
      ctx.strokeStyle = color
      ctx.lineWidth = 0.07
      ctx.beginPath()
      ctx.moveTo(-0.07, -0.06); ctx.lineTo(0.07, -0.06)
      ctx.moveTo(-0.47, -0.1); ctx.lineTo(-0.62, -0.2)
      ctx.moveTo(0.47, -0.1); ctx.lineTo(0.62, -0.2)
      ctx.stroke()
      ctx.fillStyle = light
      rr(ctx, -0.43, -0.12, 0.14, 0.1, 0.05)
      break
    }
    case 'camera': {
      ctx.fillStyle = dark
      rr(ctx, -0.14, -0.44, 0.24, 0.12, 0.04)
      ctx.fillStyle = color
      rr(ctx, -0.48, -0.34, 0.96, 0.7, 0.13)
      ctx.fillStyle = dark
      circle(ctx, 0, 0.01, 0.22)
      ctx.fillStyle = light
      circle(ctx, 0, 0.01, 0.13)
      ctx.fillStyle = light
      circle(ctx, 0.34, -0.22, 0.055)
      break
    }
  }
  ctx.restore()
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
  ctx.fill()
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}
