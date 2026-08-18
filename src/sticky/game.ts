import { ITEM_KINDS, BODY_COLORS } from './items'

/** Coat slots drawn on screen. Late stages sew some of them shut. */
export const MAX_POCKETS = 6
const MIN_POCKETS = 4
/** Three depth rows: back, middle, front. */
export const ROW_SCALE = [0.7, 0.85, 1]
export const ROW_GROUND = [0.34, 0.62, 0.92]
export const ROW_ALPHA = [0.55, 0.78, 1]

/**
 * Most a single stash can carry, which also caps how many pockets one kind can
 * hog. Held at three even as the coat shrinks: a small coat jams often on a
 * spread of kinds that never reaches a full run, and paying a ditch to break
 * out of that is exactly what makes the late stages bite.
 */
const STASH_SIZE = 3
const BRIBE_SECONDS = 15

export type Awareness = 'distracted' | 'neutral' | 'alert'

/**
 * Suspicion charged for lifting, by how much attention the mark is paying.
 * A clean lift off a distracted mark pays suspicion back, so waiting for the
 * right moment is an active play rather than merely a cheaper one.
 */
const LIFT_COST: Record<Awareness, number> = {
  distracted: -0.015,
  neutral: 0.035,
  alert: 0.2,
}

const DITCH_COST = 0.07
const STASH_RELIEF = 0.2

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

/** One line of the job: steal this many of this kind. */
export interface Goal {
  kind: number
  need: number
  secured: number
}

export interface LiftFx {
  from: { x: number; y: number }
  toSlot: number
  item: CarriedItem
  t: number
}

export interface Stashed {
  kind: number
  count: number
  slots: number[]
  goalComplete: boolean
}

export type Phase = 'playing' | 'caught' | 'cleared'
export type CaughtReason = 'time' | 'suspicion' | null

export interface LiftResult {
  stashed: Stashed | null
  awareness: Awareness
  junk: boolean
}

export interface StepEvents {
  caught: CaughtReason
  cleared: boolean
}

const BEST_KEY = 'sticky-fingers.stage'

/**
 * Stage 1 is a tutorial-shaped job. The list grows by roughly one piece a
 * stage rather than by whole lines, so the jump from one job to the next is
 * never a doubling, and the time allowance per piece tightens steadily.
 *
 * The list saturates at sixteen pieces around stage 19. Past that the job
 * stops growing and the squeeze moves onto the coat instead: pockets get sewn
 * shut, which tightens the one constraint the whole design turns on.
 */
export function stagePlan(stage: number): {
  counts: number[]
  items: number
  seconds: number
  pockets: number
} {
  const kinds = Math.min(4, 2 + Math.floor((stage - 1) / 4))
  const target = Math.min(4 * kinds, 4 + Math.floor((stage - 1) * 0.8))

  const counts: number[] = []
  for (let i = 0; i < kinds; i++) {
    const left = target - counts.reduce((a, b) => a + b, 0)
    counts.push(Math.max(2, Math.min(4, Math.round(left / (kinds - i)))))
  }

  const items = counts.reduce((a, b) => a + b, 0)
  const secondsPerItem = stage <= 19
    ? 9 - (stage - 1) * 0.25
    : Math.max(3.2, 4.5 - (stage - 19) * 0.04)

  const pockets = stage >= 30 ? MIN_POCKETS : stage >= 20 ? 5 : MAX_POCKETS

  return { counts, items, seconds: Math.round(items * secondsPerItem), pockets }
}

export class StickyGame {
  stage = 1
  bestStage = readBest()
  goals: Goal[] = []
  marks: Mark[] = []
  pockets: (CarriedItem | null)[] = new Array(MAX_POCKETS).fill(null)
  lifts: LiftFx[] = []
  suspicion = 0
  timeLeft = 0
  timeLimit = 0
  phase: Phase = 'playing'
  caughtReason: CaughtReason = null
  bribeUsed = false

  private nextId = 1
  private spawnTimer = 0.4

  constructor() {
    this.startStage(1)
  }

  startStage(stage: number): void {
    this.stage = stage
    const plan = stagePlan(stage)

    // Pick the required kinds from the pool this stage draws on.
    const pool: number[] = []
    for (let k = 0; k < this.kindsInPlay; k++) pool.push(k)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    this.goals = plan.counts.map((need, i) => ({ kind: pool[i % pool.length], need, secured: 0 }))
    this.timeLimit = plan.seconds
    this.timeLeft = plan.seconds
    this.marks = []
    this.pockets = new Array(plan.pockets).fill(null)
    this.lifts = []
    this.suspicion = 0
    this.phase = 'playing'
    this.caughtReason = null
    this.bribeUsed = false
    this.spawnTimer = 0.4
    this.nextId = 1

    if (stage > this.bestStage) {
      this.bestStage = stage
      writeBest(stage)
    }
  }

  retryStage(): void {
    this.startStage(this.stage)
  }

  nextStage(): void {
    this.startStage(this.stage + 1)
  }

  /** 0..1 across the early ramp, used to make the street meaner. */
  private get pressure(): number {
    return Math.min(1, (this.stage - 1) / 14)
  }

  /**
   * Takes over once `pressure` saturates, so the street keeps getting harder
   * after the job list stops growing. Saturates itself at stage 40, past which
   * only the clock keeps tightening.
   */
  private get lateHeat(): number {
    return Math.min(1, Math.max(0, (this.stage - 19) / 21))
  }

  private get kindsInPlay(): number {
    return Math.min(ITEM_KINDS.length, 4 + Math.floor(this.pressure * 3))
  }

  private get spawnInterval(): number {
    return 0.8 - this.pressure * 0.4
  }

  private get walkSpeed(): number {
    return 58 + this.pressure * 72 + this.lateHeat * 42
  }

  /** A kind still owed to the job. Everything else is dead weight. */
  isWanted(kind: number): boolean {
    return this.goals.some((g) => g.kind === kind && g.secured < g.need)
  }

  countHeld(kind: number): number {
    return this.pockets.reduce((n, p) => n + (p?.kind === kind ? 1 : 0), 0)
  }

  /** How many of this kind make up the next stash run. */
  stashTarget(goal: Goal): number {
    return Math.min(STASH_SIZE, goal.need - goal.secured)
  }

  get freePockets(): number {
    return this.pockets.filter((p) => p === null).length
  }

  get itemsNeeded(): number {
    return this.goals.reduce((n, g) => n + (g.need - g.secured), 0)
  }

  get itemsSecured(): number {
    return this.goals.reduce((n, g) => n + g.secured, 0)
  }

  get itemsTotal(): number {
    return this.goals.reduce((n, g) => n + g.need, 0)
  }

  get timeFraction(): number {
    return this.timeLimit > 0 ? Math.max(0, Math.min(1, this.timeLeft / this.timeLimit)) : 0
  }

  step(dt: number, viewWidth: number): StepEvents {
    if (this.phase !== 'playing') return { caught: null, cleared: false }

    this.timeLeft -= dt

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
    this.suspicion += hot * 0.03 * dt
    this.suspicion -= 0.012 * dt
    this.suspicion = Math.max(0, this.suspicion)

    if (this.suspicion >= 1) {
      this.suspicion = 1
      return this.bustOut('suspicion')
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      return this.bustOut('time')
    }
    return { caught: null, cleared: false }
  }

  private bustOut(reason: CaughtReason): StepEvents {
    this.phase = 'caught'
    this.caughtReason = reason
    return { caught: reason, cleared: false }
  }

  private rollAwareness(m: Mark): void {
    // Crowds get warier stage by stage: fewer easy marks, more heads up. The
    // ramp stays shallow so late stages are tight rather than unplayable.
    const distracted = 0.3 - this.pressure * 0.1 - this.lateHeat * 0.1
    const alert = 0.18 + this.pressure * 0.08 + this.lateHeat * 0.14
    const roll = Math.random()
    if (roll < distracted) {
      m.awareness = 'distracted'
      m.awarenessTimer = 1.2 + Math.random()
    } else if (roll < 1 - alert) {
      m.awareness = 'neutral'
      m.awarenessTimer = 1.5 + Math.random() * 1.5
    } else {
      m.awareness = 'alert'
      m.awarenessTimer = 1 + Math.random() * 0.9
    }
  }

  private spawn(viewWidth: number): void {
    const row = Math.floor(Math.random() * 3)
    const owed = this.goals.filter((g) => g.secured < g.need).map((g) => g.kind)
    // Enough of what the job needs to be chaseable, enough junk that grabbing
    // on reflex is punished.
    // Late stages thin out the useful goods, so more of the crowd is a decoy.
    const wantedBias = 0.55 - this.lateHeat * 0.2
    const kind = owed.length && Math.random() < wantedBias
      ? owed[Math.floor(Math.random() * owed.length)]
      : Math.floor(Math.random() * this.kindsInPlay)
    const hot = Math.random() < 0.08 + this.pressure * 0.1 + this.lateHeat * 0.1

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
    if (this.phase !== 'playing' || !mark.item) return null
    if (this.freePockets === 0) return null

    const item = mark.item
    mark.item = null

    const slot = this.pockets.indexOf(null)
    this.pockets[slot] = item
    this.sortPockets()
    this.lifts.push({ from: { x: fromX, y: fromY }, toSlot: slot, item, t: 0 })

    this.suspicion = Math.max(0, Math.min(1, this.suspicion + LIFT_COST[mark.awareness]))

    const result: LiftResult = {
      stashed: this.resolveStash(),
      awareness: mark.awareness,
      junk: !this.isWanted(item.kind),
    }

    if (this.suspicion >= 1) this.bustOut('suspicion')
    else if (this.itemsNeeded === 0) this.phase = 'cleared'

    return result
  }

  /** Dumping dead weight is the only way out of a jammed coat, and it costs. */
  ditch(slot: number): CarriedItem | null {
    if (this.phase !== 'playing') return null
    const item = this.pockets[slot]
    if (!item) return null

    this.pockets[slot] = null
    this.sortPockets()
    this.suspicion = Math.min(1, this.suspicion + DITCH_COST)
    if (this.suspicion >= 1) this.bustOut('suspicion')
    return item
  }

  private sortPockets(): void {
    const items = this.pockets.filter((p): p is CarriedItem => p !== null)
    items.sort((a, b) => a.kind - b.kind || Number(b.hot) - Number(a.hot))
    this.pockets = [
      ...items,
      ...new Array(this.pockets.length - items.length).fill(null),
    ] as (CarriedItem | null)[]
  }

  /**
   * Hands a full run of one kind off to the stash, freeing those pockets and
   * crediting the job. Anything held beyond what the job still owes stays put
   * and turns to junk once the line is done — over-collecting has a price.
   */
  private resolveStash(): Stashed | null {
    for (const goal of this.goals) {
      if (goal.secured >= goal.need) continue
      const target = this.stashTarget(goal)
      if (this.countHeld(goal.kind) < target) continue

      const slots: number[] = []
      for (let s = 0; s < this.pockets.length && slots.length < target; s++) {
        if (this.pockets[s]?.kind === goal.kind) slots.push(s)
      }
      for (const s of slots) this.pockets[s] = null
      this.sortPockets()

      goal.secured += target
      this.suspicion = Math.max(0, this.suspicion - STASH_RELIEF)
      return {
        kind: goal.kind,
        count: target,
        slots,
        goalComplete: goal.secured >= goal.need,
      }
    }
    return null
  }

  /** The fail offer, in fiction: buys back time and calms the street. */
  bribe(): boolean {
    if (this.phase !== 'caught' || this.bribeUsed) return false
    this.bribeUsed = true
    this.timeLeft = BRIBE_SECONDS
    this.suspicion = 0.3
    this.phase = 'playing'
    this.caughtReason = null
    return true
  }
}

function readBest(): number {
  try {
    return Math.max(1, Number(localStorage.getItem(BEST_KEY)) || 1)
  } catch {
    return 1
  }
}

function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    // Blocked storage just means progress does not persist.
  }
}
