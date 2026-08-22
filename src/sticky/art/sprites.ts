/**
 * Character sprites, produced outside the code (see docs/art-brief.md) and
 * dropped into src/sticky/assets/characters/. Vite inlines them into the
 * bundle as data URIs, so the shipped game stays a single file.
 *
 * The game renders a sprite when one exists for an archetype and falls back
 * to the procedural figure when it does not — so the build is never broken
 * by missing art, and art lands without touching game code.
 */
export type Archetype = 'tourist' | 'suit' | 'grandma' | 'jogger' | 'guard'

/** Cast that walks the street. The guard stays out of the crowd for now. */
export const WALKING_CAST: Archetype[] = ['tourist', 'suit', 'grandma', 'jogger']

const files = import.meta.glob('../assets/characters/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

interface Sprite {
  img: HTMLImageElement
  ready: boolean
}

const sprites = new Map<string, Sprite>()

for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop()?.replace(/\.(png|webp)$/, '')
  if (!name) continue
  const img = new Image()
  const sprite: Sprite = { img, ready: false }
  img.onload = () => {
    sprite.ready = true
  }
  img.src = url
  sprites.set(name, sprite)
}

/** The sprite for an archetype, or null while missing or still decoding. */
export function getSprite(id: Archetype): Sprite | null {
  const sprite = sprites.get(id)
  return sprite && sprite.ready ? sprite : null
}

export function spriteCount(): number {
  return sprites.size
}
