export interface ItemKind {
  id: number
  glyph: string
  label: string
  /** Ring colour around the item bubble. */
  color: string
}

/** Ordered easiest-to-read first; the pool grows into this list as heat rises. */
export const ITEM_KINDS: ItemKind[] = [
  { id: 0, glyph: '⌚', label: 'Watch', color: '#ffd93d' },
  { id: 1, glyph: '👛', label: 'Purse', color: '#ff5c7a' },
  { id: 2, glyph: '📱', label: 'Phone', color: '#38bdf8' },
  { id: 3, glyph: '💍', label: 'Ring', color: '#c084fc' },
  { id: 4, glyph: '🔑', label: 'Keys', color: '#4ade80' },
  { id: 5, glyph: '🕶️', label: 'Shades', color: '#ffa63d' },
  { id: 6, glyph: '📷', label: 'Camera', color: '#818cf8' },
]

/** Muted so the crowd stays background and the loot reads as foreground. */
export const BODY_COLORS = [
  '#3c4257', '#4a3f52', '#33454e', '#4b4536', '#3f4a3d', '#4d3a3a', '#37405c',
]
