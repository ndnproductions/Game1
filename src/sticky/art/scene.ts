import { P, withAlpha } from './palette'

interface Lamp { x: number; y: number; r: number }
interface Drop { x: number; y: number; len: number; speed: number; a: number }

/**
 * The street behind the crowd. Everything static is baked into an offscreen
 * canvas once per resize and blitted as a single image each frame; only the
 * fog and rain are redrawn, which keeps the whole backdrop close to free.
 */
export class Scene {
  private backdrop: HTMLCanvasElement | null = null
  private lamps: Lamp[] = []
  private drops: Drop[] = []
  private w = 0
  private h = 0

  build(w: number, h: number, grounds: number[], pocketY: number): void {
    this.w = w
    this.h = h

    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w))
    c.height = Math.max(1, Math.round(h))
    const ctx = c.getContext('2d')
    if (!ctx) return

    const horizon = grounds[0] - (grounds[1] - grounds[0]) * 0.35

    this.sky(ctx, w, horizon)
    this.skyline(ctx, w, horizon, 0.55, P.buildingFar, 0.5)
    this.skyline(ctx, w, horizon, 1, P.building, 0.85)
    this.ground(ctx, w, grounds, pocketY, horizon)

    this.lamps = []
    const lampCount = Math.max(2, Math.round(w / 190))
    for (let i = 0; i < lampCount; i++) {
      const x = (w / lampCount) * (i + 0.5)
      this.lamps.push({ x, y: horizon - 8, r: Math.max(90, w * 0.3) })
    }
    for (const lamp of this.lamps) this.lampGlow(ctx, lamp, grounds, pocketY)

    this.backdrop = c

    this.drops = Array.from({ length: 46 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 8 + Math.random() * 16,
      speed: 260 + Math.random() * 300,
      a: 0.05 + Math.random() * 0.1,
    }))
  }

  private sky(ctx: CanvasRenderingContext2D, w: number, horizon: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, horizon)
    g.addColorStop(0, P.skyTop)
    g.addColorStop(0.6, P.skyMid)
    g.addColorStop(1, P.skyGlow)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, horizon)

    // Light pollution bloom sitting on the horizon line.
    const bloom = ctx.createRadialGradient(w * 0.5, horizon, 0, w * 0.5, horizon, w * 0.8)
    bloom.addColorStop(0, withAlpha(P.lamp, 0.16))
    bloom.addColorStop(1, withAlpha(P.lamp, 0))
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, w, horizon)
  }

  /** A run of blocky towers with lit windows, drawn at a given depth. */
  private skyline(
    ctx: CanvasRenderingContext2D, w: number, horizon: number,
    scale: number, color: string, alpha: number,
  ): void {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color

    let x = -20
    while (x < w + 20) {
      const bw = (34 + Math.random() * 62) * scale
      const bh = (70 + Math.random() * 150) * scale
      const top = horizon - bh
      ctx.fillRect(x, top, bw, bh)

      // Windows: a sparse grid, mostly warm with the occasional cold one.
      const cols = Math.max(1, Math.floor(bw / (9 * scale)))
      const rows = Math.max(1, Math.floor(bh / (13 * scale)))
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          if (Math.random() > 0.28) continue
          const wx = x + 4 * scale + cx * 9 * scale
          const wy = top + 6 * scale + cy * 13 * scale
          if (wy > horizon - 6) continue
          ctx.fillStyle = withAlpha(
            Math.random() > 0.85 ? P.windowCool : P.window,
            (0.1 + Math.random() * 0.5) * alpha,
          )
          ctx.fillRect(wx, wy, 3.4 * scale, 5 * scale)
        }
      }
      ctx.fillStyle = color
      x += bw + 3 * scale
    }
    ctx.restore()
  }

  private ground(
    ctx: CanvasRenderingContext2D, w: number,
    grounds: number[], pocketY: number, horizon: number,
  ): void {
    const g = ctx.createLinearGradient(0, horizon, 0, pocketY)
    g.addColorStop(0, P.road)
    g.addColorStop(0.5, P.pavement)
    g.addColorStop(1, P.road)
    ctx.fillStyle = g
    ctx.fillRect(0, horizon, w, pocketY - horizon + 40)

    // A kerb line per depth row, brighter as it comes forward.
    grounds.forEach((y, i) => {
      const a = 0.05 + i * 0.05
      ctx.fillStyle = withAlpha(P.wet, 0.35 + i * 0.18)
      ctx.fillRect(0, y, w, (i < grounds.length - 1 ? grounds[i + 1] - y : pocketY - y) * 0.5)
      ctx.strokeStyle = withAlpha('#ffffff', a)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(w, y + 0.5)
      ctx.stroke()
    })
  }

  /** Lamp halo plus the smeared reflection it throws down the wet road. */
  private lampGlow(
    ctx: CanvasRenderingContext2D, lamp: Lamp,
    grounds: number[], pocketY: number,
  ): void {
    const halo = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.r)
    halo.addColorStop(0, withAlpha(P.lamp, 0.3))
    halo.addColorStop(0.4, withAlpha(P.lamp, 0.08))
    halo.addColorStop(1, withAlpha(P.lamp, 0))
    ctx.fillStyle = halo
    ctx.fillRect(lamp.x - lamp.r, lamp.y - lamp.r, lamp.r * 2, lamp.r * 2)

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const y of grounds.concat([pocketY])) {
      const rw = lamp.r * 0.34
      const rh = (pocketY - y) * 0.09 + 10
      const smear = ctx.createRadialGradient(lamp.x, y, 0, lamp.x, y, rw)
      smear.addColorStop(0, withAlpha(P.lamp, 0.11))
      smear.addColorStop(1, withAlpha(P.lamp, 0))
      ctx.fillStyle = smear
      ctx.save()
      ctx.translate(lamp.x, y)
      ctx.scale(1, rh / rw)
      ctx.beginPath()
      ctx.arc(0, 0, rw, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }

  draw(ctx: CanvasRenderingContext2D, t: number, dt: number): void {
    if (this.backdrop) ctx.drawImage(this.backdrop, 0, 0, this.w, this.h)

    // Drifting haze between the depth rows, which is what sells the distance.
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const y = this.h * (0.26 + i * 0.14)
      const drift = ((t * (8 + i * 5)) % (this.w + 400)) - 200
      const band = ctx.createLinearGradient(drift - 200, 0, drift + 200, 0)
      band.addColorStop(0, withAlpha(P.fog, 0))
      band.addColorStop(0.5, withAlpha(P.fog, 0.14 - i * 0.03))
      band.addColorStop(1, withAlpha(P.fog, 0))
      ctx.fillStyle = band
      ctx.fillRect(0, y, this.w, this.h * 0.1)
    }
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = P.rain
    ctx.lineWidth = 1
    for (const d of this.drops) {
      d.y += d.speed * dt
      d.x -= d.speed * 0.16 * dt
      if (d.y > this.h) { d.y = -20; d.x = Math.random() * this.w }
      if (d.x < -20) d.x = this.w + 20
      ctx.globalAlpha = d.a
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x + d.len * 0.16, d.y + d.len)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** Vignette, tinted toward red as suspicion climbs. */
  vignette(ctx: CanvasRenderingContext2D, heat: number): void {
    const g = ctx.createRadialGradient(
      this.w / 2, this.h * 0.45, this.h * 0.28,
      this.w / 2, this.h * 0.45, this.h * 0.78,
    )
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, heat > 0.02
      ? `rgba(${Math.round(20 + heat * 120)},0,${Math.round(20 + heat * 30)},${0.5 + heat * 0.28})`
      : 'rgba(0,0,0,0.5)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, this.w, this.h)
  }
}
