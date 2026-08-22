# Sticky Fingers — Art Brief & Asset Spec

Why this document exists: the prototype's art was drawn procedurally (shapes
assembled in code). That approach has a hard quality ceiling — no shipped
casual game draws its characters in code. Real games separate **art
production** (artists or AI image tools produce painted raster sprites) from
**rendering** (the engine only displays them). This brief lets any source —
an AI generator, a purchased pack, or a hired artist — produce assets the
game can consume directly.

## Style target

Premium casual, daylight. Reference lane: modern top-grossing casual puzzle
games — soft 3D-render look ("animated-film still"), rounded proportions,
slightly oversized heads, expressive faces, saturated harmonious colors,
crisp silhouettes readable at 120 px tall. NOT: flat geometric vector, stick
figures, silhouettes, night scenes.

## Cast (v1 — five characters)

Each character must read at a glance by silhouette + one prop:

| ID | Character | Key prop | Role in game |
|---|---|---|---|
| `tourist` | Cheerful middle-aged tourist, bucket hat, floral shirt | Camera on neck strap | Common mark |
| `suit` | Young businessman, slim blue suit | Briefcase + gold watch | Common mark |
| `grandma` | Sweet elderly lady, lilac cardigan | Quilted red handbag | Common mark |
| `jogger` | Athletic young woman, sporty outfit | Phone in arm strap | Fast mark |
| `guard` | Burly, slightly comical security guard, navy uniform | Cap, crossed arms | The "bribe the guard" fail offer + alert fiction |

## Asset spec (what the game consumes)

- Full body, 3/4 view facing slightly left (game mirrors for right-walkers)
- Transparent-background PNG, ~700–900 px tall, consistent scale across cast
- Consistent light: warm midday sun from upper left
- One idle pose per character for v1 (walk animation later — the game can
  bob/sway a static sprite convincingly for a prototype)
- Filenames: `assets/characters/<id>.png`
- Later (v2): per-character `_alert` head/pose variant; walk frames or Spine rig

## Environment (v1 — one scene)

Sunny Mediterranean plaza, three layered strips for depth:
`assets/env/sky.png` (buildings + sky), `assets/env/mid.png` (facades),
`assets/env/ground.png` (pavement). Painted in the same style as the cast.

## UI

UI chrome (panels, meters, buttons, goal chips) stays code-drawn — that is
normal practice; casual-game UI is simple rounded shapes. Only ORGANIC art
(people, props, scene) must be raster.

## Ready-to-paste generation prompt (cast, style test)

> Character lineup sheet for a premium casual mobile game called Sticky
> Fingers, a lighthearted pickpocket game set in a sunny Mediterranean city
> plaza. Five characters standing in a relaxed row on a common ground line,
> evenly spaced, full body, each in a 3/4 view facing slightly toward the
> viewer, clear space between them. Left to right: (1) a cheerful
> middle-aged tourist in a bucket hat and floral shirt with a camera on a
> neck strap; (2) a confident young businessman in a slim blue suit carrying
> a leather briefcase, gold wristwatch visible; (3) a sweet elderly
> grandmother in a lilac cardigan holding a quilted red handbag; (4) an
> athletic young woman jogger in a sporty outfit with a phone strapped to
> her arm; (5) a burly, slightly comical security guard in a navy uniform
> and cap, arms crossed. Flat very light warm-grey studio background, soft
> ground shadow under each character, consistent warm midday sun from the
> upper left. Rendered in high-end 3D animated-film style: soft rounded
> stylized proportions, slightly oversized heads and hands, big expressive
> eyes, warm appealing faces, soft global illumination, saturated harmonious
> colors, crisp clean silhouettes — the quality of a top-grossing casual
> puzzle game. No text, no logos, no watermark.

Variants: swap the final style sentence for
- *hand-painted 2D*: "Rendered as polished hand-painted 2D game
  illustration: clean line-free shapes, rich painterly shading with warm
  bounce light and a cool rim light, bold readable silhouettes, expressive
  cartoon faces, vibrant Mediterranean daylight palette."
- *vinyl toy*: "Rendered as stylized collectible vinyl-toy figures: chunky
  simplified rounded forms, matte soft-touch materials, minimal but charming
  facial features, warm pastel daylight palette, soft product-photography
  lighting."

Then per-character production prompts: same character description + "single
character, centered, full body, transparent background" (or remove the
background afterwards).

## Sources (how real games actually do it)

- Royal Match blends Pixar-like animation standards; hundreds of hand-
  finished rooms; small team, heavy investment in core art quality.
- Standard 2D pipeline: concept → paint → export → texture atlas → engine;
  characters animated with Spine/DragonBones skeletal rigs.
- 2025–26: AI image generation is a production standard for
  exploration/variation in mobile studios and the realistic path for solo
  developers; consistency and cutout/packing are the real work (generation
  is ~20% of the effort).
