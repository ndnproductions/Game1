export interface Cell {
  x: number
  y: number
}

export interface Piece {
  /** Index into the shape table this piece was minted from. */
  shape: number
  cells: Cell[]
  w: number
  h: number
  /** Index into the block palette. */
  color: number
}

interface ShapeDef {
  art: string[]
  weight: number
}

/**
 * Block Blast never rotates a piece once it is in the tray, so every
 * orientation we want to appear has to be its own entry here.
 */
const SHAPES: ShapeDef[] = [
  // singles and lines
  { art: ['X'], weight: 5 },
  { art: ['XX'], weight: 5 },
  { art: ['X', 'X'], weight: 5 },
  { art: ['XXX'], weight: 5 },
  { art: ['X', 'X', 'X'], weight: 5 },
  { art: ['XXXX'], weight: 3 },
  { art: ['X', 'X', 'X', 'X'], weight: 3 },
  { art: ['XXXXX'], weight: 1 },
  { art: ['X', 'X', 'X', 'X', 'X'], weight: 1 },

  // solid blocks
  { art: ['XX', 'XX'], weight: 5 },
  { art: ['XXX', 'XXX', 'XXX'], weight: 1 },
  { art: ['XXX', 'XXX'], weight: 2 },
  { art: ['XX', 'XX', 'XX'], weight: 2 },

  // small corners
  { art: ['XX', 'X.'], weight: 4 },
  { art: ['XX', '.X'], weight: 4 },
  { art: ['X.', 'XX'], weight: 4 },
  { art: ['.X', 'XX'], weight: 4 },

  // big corners
  { art: ['X..', 'X..', 'XXX'], weight: 2 },
  { art: ['XXX', 'X..', 'X..'], weight: 2 },
  { art: ['XXX', '..X', '..X'], weight: 2 },
  { art: ['..X', '..X', 'XXX'], weight: 2 },

  // tees
  { art: ['XXX', '.X.'], weight: 2 },
  { art: ['.X.', 'XXX'], weight: 2 },
  { art: ['X.', 'XX', 'X.'], weight: 2 },
  { art: ['.X', 'XX', '.X'], weight: 2 },

  // skews
  { art: ['.XX', 'XX.'], weight: 2 },
  { art: ['XX.', '.XX'], weight: 2 },
  { art: ['X.', 'XX', '.X'], weight: 2 },
  { art: ['.X', 'XX', 'X.'], weight: 2 },
]

const PALETTE_SIZE = 7

function parse(art: string[]): { cells: Cell[]; w: number; h: number } {
  const cells: Cell[] = []
  for (let y = 0; y < art.length; y++) {
    for (let x = 0; x < art[y].length; x++) {
      if (art[y][x] === 'X') cells.push({ x, y })
    }
  }
  return {
    cells,
    w: Math.max(...art.map((row) => row.length)),
    h: art.length,
  }
}

const PARSED = SHAPES.map((s) => parse(s.art))

const TOTAL_WEIGHT = SHAPES.reduce((sum, s) => sum + s.weight, 0)

export function randomPiece(): Piece {
  let roll = Math.random() * TOTAL_WEIGHT
  let index = 0
  for (let i = 0; i < SHAPES.length; i++) {
    roll -= SHAPES[i].weight
    if (roll <= 0) {
      index = i
      break
    }
  }
  const { cells, w, h } = PARSED[index]
  return {
    shape: index,
    cells,
    w,
    h,
    color: Math.floor(Math.random() * PALETTE_SIZE),
  }
}

export function cellCount(piece: Piece): number {
  return piece.cells.length
}
