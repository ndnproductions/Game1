export type Rng = () => number

/**
 * mulberry32 — small, fast, and bit-identical on every platform, which is what
 * lets the daily puzzle be derived from the date instead of fetched from a server.
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(items: readonly T[], rand: Rng): T {
  return items[Math.floor(rand() * items.length)]
}

export function shuffled<T>(items: readonly T[], rand: Rng): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}
