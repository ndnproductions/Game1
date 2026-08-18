import { ITEM_KINDS, BODY_COLORS } from './items'

export const POCKETS = 6
/** Three depth rows: back, middle, front. */
export const ROW_SCALE = [0.7, 0.85, 1]
export const ROW_GROUND = [0.34, 0.62, 0.92]
export const ROW_ALPHA = [0.55, 0.78, 1]
const MERGE_SIZE = 3

export interface CarriedItem {
  kind: number
  hot: boolean
}

export interface Mark {
  id: number
  x: number
  /** 0 = back row (smaller, dimmer), 1 = front row. */
  row: number
  speed: number
  bodyColor: string
  scale: number
  bobPhase: number
  item: CarriedItem | null
  /** Counts up once lifted, so the figure can react before walking off. */
  liftedFor: number
}

export interface LiftFx {
  from: { x: number; y: number }
  toSlot: number
  item: CarriedItem
  t: number
}

export type GameOverReason = 'pockets' | 'suspicion' | null

export interface StepEvents {
  merged: { kind: number; hot: boolean; slots: number[]; points: number } | null
  busted: GameOverReason
}

const BEST_KEY = 'sticky-fingers.best'

export class StickyGame {
  marks: Mark[] = []
  pockets: (CarriedItem | null)[] = new Array(POCKETS).fill(null)
  suspicion = 0
  score = 0
  best = readBest()
  elapsed = 0
  over: GameOverReason = null
  bribeUsed = false
  lifts: LiftFx[] = []

  private nextId = 1
  private spawnTimer = 0.6

  reset(): void {
    this.marks = []
    this.pockets = new Array(POCKETS).fill(null)
    this.suspicion = 0
    this.score = 0
    this.elapsed = 0
    this.over = null
    this.bribeUsed = false
    this.lifts = []
    this.nextId = 1
    this.spawnTimer = 0.6
  }

  /** Difficulty ramps over roughly ninety seconds, then holds. */
  private get heat(): number {
    return Math.min(1, this.elapsed / 90)
  }

  private get kindsInPlay(): number {
    return Math.min(ITEM_KINDS.length, 4 + Math.floor(this.heat * 3))
  }

  private get spawnInterval(): number {
    return 0.85 - this.heat * 0.45
  }

  private get walkSpeed(): number {
    return 58 + this.heat * 70
  }

  step(dt: number, viewWidth: number): StepEvents {
    const events: StepEvents = { merged: null, busted: null }
    if (this.over) return events

    this.elapsed += dt

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval * (0.75 + Math.random() * 0.5)
      if (this.marks.length < 16) this.spawn(viewWidth)
    }

    for (const m of this.marks) {
      m.x -= m.speed * dt
      m.bobPhase += dt * (m.speed / 18)
      if (m.item === null) m.liftedFor += dt
    }
    this.marks = this.marks.filter((m) => m.x > -120)

    for (const fx of this.lifts) fx.t += dt * 3.2
    this.lifts = this.lifts.filter((fx) => fx.t < 1)

    // Held contraband is the main clock; merging is what buys it back.
    let held = 0
    for (const p of this.pockets) if (p?.hot) held++
    this.suspicion += held * 0.055 * dt
    this.suspicion -= 0.012 * dt
    this.suspicion = Math.max(0, this.suspicion)

    if (this.suspicion >= 1) {
      this.suspicion = 1
      this.over = 'suspicion'
      events.busted = 'suspicion'
    }

    return events
  }

  /**
   * Spawns are deliberately biased toward what is already in the coat. Pure
   * random makes matches too rare to chase, which turns the game into waiting;
   * seeding completers and pair-starters is what manufactures the near-miss
   * the whole genre runs on.
   */
  private pickKind(): number {
    const kinds = this.kindsInPlay
    const counts = new Map<number, number>()
    for (const p of this.pockets) {
      if (p && p.kind < kinds) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1)
    }

    const roll = Math.random()
    const pool = (n: number): number[] =>
      [...counts].filter(([, c]) => c === n).map(([k]) => k)

    if (roll < 0.28) {
      const completers = pool(2)
      if (completers.length) return completers[Math.floor(Math.random() * completers.length)]
    }
    if (roll < 0.5) {
      const starters = pool(1)
      if (starters.length) return starters[Math.floor(Math.random() * starters.length)]
    }
    return Math.floor(Math.random() * kinds)
  }

  private spawn(viewWidth: number): void {
    const row = Math.floor(Math.random() * 3)
    const kind = this.pickKind()
    // Hot items are worth double but burn the suspicion clock while held.
    const hot = Math.random() < 0.1 + this.heat * 0.14
    const scale = ROW_SCALE[row]

    this.marks.push({
      id: this.nextId++,
      x: viewWidth + 60,
      row,
      // Distant rows walk slower, so the crowd reads as having depth.
      speed: this.walkSpeed * (0.9 + Math.random() * 0.25) * (0.72 + row * 0.14),
      bodyColor: BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)],
      scale,
      bobPhase: Math.random() * Math.PI * 2,
      item: { kind, hot },
      liftedFor: 0,
    })
  }

  get freePockets(): number {
    return this.pockets.filter((p) => p === null).length
  }

  /**
   * Takes the item off a mark and into the coat. Returns what happened so the
   * renderer and audio can react; a null result means the lift was refused.
   */
  lift(mark: Mark, fromX: number, fromY: number): StepEvents | null {
    if (this.over || !mark.item) return null
    if (this.freePockets === 0) return null

    const item = mark.item
    mark.item = null

    const slot = this.pockets.indexOf(null)
    this.pockets[slot] = item
    this.sortPockets()
    this.lifts.push({ from: { x: fromX, y: fromY }, toSlot: slot, item, t: 0 })

    this.suspicion = Math.min(1, this.suspicion + 0.018)

    const events: StepEvents = { merged: null, busted: null }
    const merged = this.resolveMerge()
    if (merged) {
      events.merged = merged
      this.score += merged.points
      if (this.score > this.best) {
        this.best = this.score
        writeBest(this.best)
      }
      // Offloading is relief: it is the only meaningful way to buy back time.
      this.suspicion = Math.max(0, this.suspicion - 0.16)
    } else if (this.freePockets === 0) {
      this.over = 'pockets'
      events.busted = 'pockets'
    }

    return events
  }

  /** Grouping by kind is what makes "two of three" visible at a glance. */
  private sortPockets(): void {
    const items = this.pockets.filter((p): p is CarriedItem => p !== null)
    items.sort((a, b) => a.kind - b.kind || Number(b.hot) - Number(a.hot))
    this.pockets = [
      ...items,
      ...new Array(POCKETS - items.length).fill(null),
    ] as (CarriedItem | null)[]
  }

  private resolveMerge(): StepEvents['merged'] {
    const counts = new Map<number, number[]>()
    this.pockets.forEach((p, i) => {
      if (!p) return
      const list = counts.get(p.kind) ?? []
      list.push(i)
      counts.set(p.kind, list)
    })

    for (const [kind, slots] of counts) {
      if (slots.length < MERGE_SIZE) continue
      const taken = slots.slice(0, MERGE_SIZE)
      const anyHot = taken.some((i) => this.pockets[i]?.hot)
      for (const i of taken) this.pockets[i] = null
      this.sortPockets()
      const points = Math.round((100 + this.heat * 120) * (anyHot ? 2 : 1))
      return { kind, hot: anyHot, slots: taken, points }
    }
    return null
  }

  /** The fail offer, in fiction: clears the coat and calms the street. */
  bribe(): boolean {
    if (!this.over || this.bribeUsed) return false
    this.bribeUsed = true
    this.pockets = new Array(POCKETS).fill(null)
    this.suspicion = Math.min(this.suspicion, 0.35)
    this.over = null
    return true
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    // Blocked storage just means the best score does not persist.
  }
}
