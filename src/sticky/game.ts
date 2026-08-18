import { ITEM_KINDS, BODY_COLORS } from './items'

export const POCKETS = 6
/** Three depth rows: back, middle, front. */
export const ROW_SCALE = [0.7, 0.85, 1]
export const ROW_GROUND = [0.34, 0.62, 0.92]
export const ROW_ALPHA = [0.55, 0.78, 1]

export const ORDER_COUNT = 3

/** How aware a mark is of their own pockets right now. */
export type Awareness = 'distracted' | 'neutral' | 'alert'

/**
 * Suspicion charged for lifting, by how much attention the mark is paying.
 * A clean lift off a distracted mark pays suspicion back, so waiting for the
 * right moment is an active play rather than merely a cheaper one.
 */
const LIFT_COST: Record<Awareness, number> = {
  distracted: -0.015,
  neutral: 0.035,
  alert: 0.26,
}

const DITCH_COST = 0.07
const ORDER_RELIEF = 0.22

export interface CarriedItem {
  kind: number
  hot: boolean
}

export interface Mark {
  id: number
  x: number
  row: number
  speed: number
  bodyColor: string
  scale: number
  bobPhase: number
  item: CarriedItem | null
  awareness: Awareness
  awarenessTimer: number
}

export interface Order {
  id: number
  kind: number
  need: number
}

export interface LiftFx {
  from: { x: number; y: number }
  toSlot: number
  item: CarriedItem
  t: number
}

export type GameOverReason = 'suspicion' | null

export interface FilledOrder {
  kind: number
  need: number
  points: number
  hotCount: number
  slots: number[]
}

export interface LiftResult {
  filled: FilledOrder | null
  cost: number
  awareness: Awareness
  junk: boolean
}

const BEST_KEY = 'sticky-fingers.best'

export class StickyGame {
  marks: Mark[] = []
  pockets: (CarriedItem | null)[] = new Array(POCKETS).fill(null)
  orders: Order[] = []
  suspicion = 0
  score = 0
  best = readBest()
  elapsed = 0
  over: GameOverReason = null
  bribeUsed = false
  lifts: LiftFx[] = []

  private nextId = 1
  private nextOrderId = 1
  private spawnTimer = 0.5

  constructor() {
    this.rollOrders()
  }

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
    this.spawnTimer = 0.5
    this.orders = []
    this.rollOrders()
  }

  private get heat(): number {
    return Math.min(1, this.elapsed / 90)
  }

  private get kindsInPlay(): number {
    return Math.min(ITEM_KINDS.length, 5 + Math.floor(this.heat * 2))
  }

  private get spawnInterval(): number {
    return 0.8 - this.heat * 0.42
  }

  private get walkSpeed(): number {
    return 58 + this.heat * 70
  }

  private rollOrders(): void {
    while (this.orders.length < ORDER_COUNT) this.orders.push(this.makeOrder())
  }

  private makeOrder(): Order {
    const taken = new Set(this.orders.map((o) => o.kind))
    const options: number[] = []
    for (let k = 0; k < this.kindsInPlay; k++) if (!taken.has(k)) options.push(k)
    const kind = options.length
      ? options[Math.floor(Math.random() * options.length)]
      : Math.floor(Math.random() * this.kindsInPlay)

    // Bigger orders arrive as the night heats up; they pay more but hog pockets.
    const roll = Math.random() + this.heat * 0.35
    const need = roll > 0.82 ? 4 : roll > 0.45 ? 3 : 2
    return { id: this.nextOrderId++, kind, need }
  }

  /** True when a kind is on the fence's list — anything else is dead weight. */
  isWanted(kind: number): boolean {
    return this.orders.some((o) => o.kind === kind)
  }

  countHeld(kind: number): number {
    return this.pockets.reduce((n, p) => n + (p?.kind === kind ? 1 : 0), 0)
  }

  progress(order: Order): number {
    return Math.min(order.need, this.countHeld(order.kind))
  }

  get freePockets(): number {
    return this.pockets.filter((p) => p === null).length
  }

  step(dt: number, viewWidth: number): { busted: GameOverReason } {
    if (this.over) return { busted: null }

    this.elapsed += dt

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval * (0.75 + Math.random() * 0.5)
      if (this.marks.length < 16) this.spawn(viewWidth)
    }

    for (const m of this.marks) {
      m.x -= m.speed * dt
      m.bobPhase += dt * (m.speed / 18)
      m.awarenessTimer -= dt
      if (m.awarenessTimer <= 0) this.rollAwareness(m)
    }
    this.marks = this.marks.filter((m) => m.x > -120)

    for (const fx of this.lifts) fx.t += dt * 3.2
    this.lifts = this.lifts.filter((fx) => fx.t < 1)

    let hot = 0
    for (const p of this.pockets) if (p?.hot) hot++
    this.suspicion += hot * 0.042 * dt
    this.suspicion -= 0.012 * dt
    this.suspicion = Math.max(0, this.suspicion)

    if (this.suspicion >= 1) {
      this.suspicion = 1
      this.over = 'suspicion'
      return { busted: 'suspicion' }
    }
    return { busted: null }
  }

  private rollAwareness(m: Mark): void {
    const roll = Math.random()
    if (roll < 0.26) {
      m.awareness = 'distracted'
      m.awarenessTimer = 1.2 + Math.random()
    } else if (roll < 0.78) {
      m.awareness = 'neutral'
      m.awarenessTimer = 1.5 + Math.random() * 1.5
    } else {
      m.awareness = 'alert'
      m.awarenessTimer = 1 + Math.random() * 0.9
    }
  }

  private spawn(viewWidth: number): void {
    const row = Math.floor(Math.random() * 3)
    // Weighted so wanted goods appear often enough to chase, while enough junk
    // walks past that grabbing on reflex is punished.
    const wantedKinds = this.orders.map((o) => o.kind)
    const kind = Math.random() < 0.55
      ? wantedKinds[Math.floor(Math.random() * wantedKinds.length)]
      : Math.floor(Math.random() * this.kindsInPlay)
    const hot = Math.random() < 0.1 + this.heat * 0.14

    const m: Mark = {
      id: this.nextId++,
      x: viewWidth + 60,
      row,
      speed: this.walkSpeed * (0.9 + Math.random() * 0.25) * (0.72 + row * 0.14),
      bodyColor: BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)],
      scale: ROW_SCALE[row],
      bobPhase: Math.random() * Math.PI * 2,
      item: { kind, hot },
      awareness: 'neutral',
      awarenessTimer: 0,
    }
    this.rollAwareness(m)
    this.marks.push(m)
  }

  /**
   * Lifts an item into the coat. Returns null when the coat is full — that is
   * a block, not a loss; the way out is to ditch something and eat the cost.
   */
  lift(mark: Mark, fromX: number, fromY: number): LiftResult | null {
    if (this.over || !mark.item) return null
    if (this.freePockets === 0) return null

    const item = mark.item
    mark.item = null

    const slot = this.pockets.indexOf(null)
    this.pockets[slot] = item
    this.sortPockets()
    this.lifts.push({ from: { x: fromX, y: fromY }, toSlot: slot, item, t: 0 })

    const cost = LIFT_COST[mark.awareness]
    this.suspicion = Math.max(0, Math.min(1, this.suspicion + cost))

    const result: LiftResult = {
      filled: this.resolveOrders(),
      cost,
      awareness: mark.awareness,
      junk: !this.isWanted(item.kind),
    }

    if (this.suspicion >= 1) this.over = 'suspicion'
    return result
  }

  /** Dumping dead weight is the only way out of a jammed coat, and it costs. */
  ditch(slot: number): CarriedItem | null {
    if (this.over) return null
    const item = this.pockets[slot]
    if (!item) return null

    this.pockets[slot] = null
    this.sortPockets()
    this.suspicion = Math.min(1, this.suspicion + DITCH_COST)
    if (this.suspicion >= 1) this.over = 'suspicion'
    return item
  }

  private sortPockets(): void {
    const items = this.pockets.filter((p): p is CarriedItem => p !== null)
    items.sort((a, b) => a.kind - b.kind || Number(b.hot) - Number(a.hot))
    this.pockets = [
      ...items,
      ...new Array(POCKETS - items.length).fill(null),
    ] as (CarriedItem | null)[]
  }

  private resolveOrders(): FilledOrder | null {
    for (let i = 0; i < this.orders.length; i++) {
      const order = this.orders[i]
      if (this.countHeld(order.kind) < order.need) continue

      const slots: number[] = []
      let hotCount = 0
      for (let s = 0; s < POCKETS && slots.length < order.need; s++) {
        const p = this.pockets[s]
        if (p?.kind !== order.kind) continue
        slots.push(s)
        if (p.hot) hotCount++
      }
      for (const s of slots) this.pockets[s] = null
      this.sortPockets()

      const points = Math.round(
        order.need * (60 + this.heat * 80) * (1 + 0.5 * hotCount),
      )
      this.score += points
      if (this.score > this.best) {
        this.best = this.score
        writeBest(this.best)
      }
      this.suspicion = Math.max(0, this.suspicion - ORDER_RELIEF)

      this.orders.splice(i, 1)
      this.rollOrders()
      return { kind: order.kind, need: order.need, points, hotCount, slots }
    }
    return null
  }

  bribe(): boolean {
    if (!this.over || this.bribeUsed) return false
    this.bribeUsed = true
    this.pockets = new Array(POCKETS).fill(null)
    this.suspicion = 0.35
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
