import { withAlpha } from './palette'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; max: number
  size: number; color: string
  gravity: number
  spin: number
}

/** Small pooled emitter for stash bursts, confetti and impact sparks. */
export class Particles {
  private items: Particle[] = []

  get count(): number {
    return this.items.length
  }

  burst(x: number, y: number, color: string, n = 14, power = 1): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = (60 + Math.random() * 190) * power
      this.items.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60 * power,
        life: 0, max: 0.45 + Math.random() * 0.45,
        size: 2 + Math.random() * 3.4,
        color, gravity: 620, spin: 0,
      })
    }
  }

  /** Confetti rain for a cleared stage. */
  confetti(w: number, colors: string[], n = 70): void {
    for (let i = 0; i < n; i++) {
      this.items.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 220,
        vx: (Math.random() - 0.5) * 90,
        vy: 120 + Math.random() * 210,
        life: 0, max: 2.4 + Math.random() * 1.4,
        size: 3.5 + Math.random() * 4.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 110, spin: Math.random() * 8 - 4,
      })
    }
  }

  step(dt: number): void {
    for (const p of this.items) {
      p.life += dt
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 1 - Math.min(1, dt * 1.2)
    }
    this.items = this.items.filter((p) => p.life < p.max)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const p of this.items) {
      const k = 1 - p.life / p.max
      ctx.fillStyle = withAlpha(p.color, Math.max(0, k))
      if (p.spin !== 0) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.life * p.spin)
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  clear(): void {
    this.items = []
  }
}
