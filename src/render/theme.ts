import { GRID_SIZE } from '../core/grid'

export const COLORS = {
  bg: '#12121f',
  bgGlow: '#1b1b32',
  slot: '#1e1e33',
  slotEdge: '#26264180',
  text: '#ffffff',
  textDim: '#8b8bb0',
  accent: '#ffd93d',
  ghost: '#ffffff',
  danger: '#ff5c7a',
}

/** [base, highlight] per block colour. */
export const BLOCKS: [string, string][] = [
  ['#ff5c7a', '#ff8fa3'],
  ['#ffa63d', '#ffc178'],
  ['#ffd93d', '#ffe783'],
  ['#4ade80', '#86efac'],
  ['#38bdf8', '#7dd3fc'],
  ['#818cf8', '#a5b4fc'],
  ['#c084fc', '#d8b4fe'],
]

export interface Layout {
  w: number
  h: number
  pad: number
  headerY: number
  headerH: number
  cell: number
  gridPx: number
  gridX: number
  gridY: number
  trayY: number
  trayH: number
  trayCell: number
  slotW: number
}

export function computeLayout(w: number, h: number): Layout {
  const pad = Math.min(w, h) * 0.035

  // The board is almost always width-limited on a phone, so size it first and
  // derive everything else from the resulting cell size.
  const gridPx = Math.max(80, Math.min(w - pad * 2, h * 0.62))
  const cell = gridPx / GRID_SIZE

  const headerY = pad * 0.6
  const headerH = Math.max(60, Math.min(h * 0.13, cell * 2.3))

  // The tray sits low, in the thumb zone, rather than floating mid-screen.
  const trayH = cell * 3.4
  const trayY = h - trayH - pad * 1.2

  // Leftover height goes mostly below the board, which keeps the grid within
  // comfortable reach instead of stranding it in the vertical centre.
  const slack = Math.max(0, trayY - (headerY + headerH) - gridPx)
  const gridY = headerY + headerH + slack * 0.42

  return {
    w,
    h,
    pad,
    headerY,
    headerH,
    cell,
    gridPx,
    gridX: (w - gridPx) / 2,
    gridY,
    trayY,
    trayH,
    trayCell: cell * 0.66,
    slotW: w / 3,
  }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
