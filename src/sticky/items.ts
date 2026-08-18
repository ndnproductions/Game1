import type { IconId } from './art/icons'

export interface ItemKind {
  id: number
  icon: IconId
  label: string
  /** Ring colour around the item bubble. */
  color: string
}

/** Ordered easiest-to-read first; the pool grows into this list as heat rises. */
export const ITEM_KINDS: ItemKind[] = [
  { id: 0, icon: 'watch', label: 'Watch', color: '#ffd166' },
  { id: 1, icon: 'purse', label: 'Purse', color: '#ff6b8a' },
  { id: 2, icon: 'phone', label: 'Phone', color: '#4cc9f0' },
  { id: 3, icon: 'ring', label: 'Ring', color: '#b18cf0' },
  { id: 4, icon: 'keys', label: 'Keys', color: '#52d9a8' },
  { id: 5, icon: 'shades', label: 'Shades', color: '#ff9f45' },
  { id: 6, icon: 'camera', label: 'Camera', color: '#8ecae6' },
]

/** Muted so the crowd stays background and the loot reads as foreground. */
export const BODY_COLORS = [
  '#3c4257', '#4a3f52', '#33454e', '#4b4536', '#3f4a3d', '#4d3a3a', '#37405c',
]
