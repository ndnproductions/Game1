/**
 * A wet neon night. The crowd reads as backlit silhouettes, the loot is the
 * only saturated thing on screen, and everything else is atmosphere.
 */
export const P = {
  skyTop: '#070a14',
  skyMid: '#101736',
  skyGlow: '#1d2450',
  building: '#080b16',
  buildingFar: '#0c1124',
  window: '#ffca7a',
  windowCool: '#8fb6ff',
  road: '#0b0f1c',
  pavement: '#111728',
  wet: '#16203a',
  lamp: '#ffb457',
  fog: '#33406b',
  rain: '#8ea8d8',

  figure: '#05070e',
  rimNeutral: '#6f93c4',
  rimSafe: '#4ade80',
  rimAlert: '#ff5c7a',

  panel: '#121a2e',
  panelHi: '#1c2742',
  panelEdge: '#28355a',
  sunk: '#0a0f1c',

  text: '#f2f6ff',
  dim: '#8593b5',
  faint: '#5b678a',

  gold: '#ffd166',
  danger: '#ff5c7a',
  safe: '#4ade80',
  junk: '#4d5878',
}

/** Loot colours — the only fully saturated hues in the scene. */
export const LOOT: string[] = [
  '#ffd166', '#ff6b8a', '#4cc9f0', '#b18cf0', '#52d9a8', '#ff9f45', '#8ecae6',
]

export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const font = {
  /** Heavy condensed display, for anything that should feel like a title. */
  display: (px: number): string =>
    `${Math.round(px)}px Anton, Impact, "Arial Narrow", sans-serif`,
  ui: (weight: number, px: number): string =>
    `${weight} ${Math.round(px)}px Outfit, system-ui, -apple-system, sans-serif`,
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Lighten (positive) or darken (negative) a hex colour by a ratio. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number): number => Math.max(0, Math.min(255, Math.round(
    amount >= 0 ? c + (255 - c) * amount : c * (1 + amount),
  )))
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`
}
