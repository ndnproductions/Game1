# Art drop

Put raw character generations here — one image per cast member, named
`tourist`, `suit`, `grandma`, `jogger`, or `guard` (`.png`, `.jpg`, or
`.webp`).

Easiest way: on github.com, open this folder on the working branch, then
**Add file → Upload files**, drag the images in, and commit.

Generate against a **flat magenta (#FF00FF) background with no shadow** so
the cutout is clean (a flat white background also works). Prompts live in
`docs/art-brief.md`.

Then `python3 scripts/cutout.py --all` keys out the background, trims,
scales everyone to a common height, and writes game-ready sprites into
`src/sticky/assets/characters/` — the next build picks them up
automatically.
