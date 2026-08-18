# Block Roguelite

Mobile-first block-puzzle prototype — the Block Blast core loop, built as the
foundation for a roguelite upgrade layer. See [`docs/PLAN.md`](docs/PLAN.md)
for the product and monetization strategy.

## Running it

```sh
npm install
npm run dev      # dev server with hot reload
npm run build    # typecheck + production build into dist/
```

## What's implemented

- 8×8 board, three-piece tray, drag-to-place with no rotation
- Snap-to-cell placement, clamped at the edges so near-misses still land
- Row and column clearing with a combo multiplier
- Live highlight of any line the current drag would complete
- Game over when no tray piece fits anywhere
- Clear bursts, screen shake, score popups, procedural audio, haptics
- High score persisted to `localStorage`

## Layout

| Path | Role |
|---|---|
| `src/core/` | Pure game logic — grid, pieces, state machine. No rendering. |
| `src/render/` | Canvas renderer, layout maths, palette |
| `src/input/` | Pointer drag handling |
| `src/audio.ts` | Oscillator-based sound, no assets |

The core is deliberately free of rendering and input concerns so alternate
hooks can be tested against the same validated loop.

## Not built yet

The roguelite upgrade draft, the run economy, and permanent perks — these are
phase 3 in the plan.
