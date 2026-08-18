# Game1

Two mobile-first prototypes exploring the same question: what makes a casual
puzzle game hold someone. See [`docs/PLAN.md`](docs/PLAN.md) for the
monetization strategy and [`docs/research.html`](docs/research.html) for the
market research the current design is built on.

## Sticky Fingers — the active prototype

A stage-based pickpocket game. Each stage is a job: a list of goods to lift
off a moving crowd before one shared clock runs out.

| Element | Spec |
|---|---|
| Job list | 2–4 lines, each "steal N of a kind" |
| Stage clock | One timer for the whole stage, sized to the list |
| Coat | 6 pockets; a full run of one kind stashes and frees them |
| Junk | Anything not owed to the job — it only clogs pockets |
| Awareness | Marks cycle distracted / neutral / alert; a clean lift *lowers* suspicion, a spotted one costs heavily |
| Ditch | Tap a pocket to dump an item for a suspicion charge |
| Failure | The clock runs out, or suspicion fills |
| Fail offer | "Bribe the guard" — +15s, keep your haul, once per stage |

There is no score. Progression is the stage number.

```sh
npm run dev                    # block puzzle
GAME=sticky npm run dev        # sticky fingers
npm run build:sticky           # typecheck + production build
npm run build:artifact:sticky  # single self-contained HTML file
```

### Difficulty

`stagePlan()` grows the list by roughly one piece per stage rather than by
whole lines, so no stage doubles the one before it, while the seconds allowed
per piece tighten from 9.0 downward. The crowd gets warier throughout — fewer
distracted marks, more alert ones, more hot goods.

The list saturates at sixteen pieces around stage 19. Past that the squeeze
moves onto the coat: pockets are sewn shut, six down to five at stage 20 and
four at stage 30. A stash run stays at three, so a smaller coat jams far more
often on a spread of kinds that never completes a run — and paying a ditch to
break out is what makes the late game bite. `lateHeat` also keeps thinning the
useful goods on the street and raising the share of alert marks until stage 40.

Bot clear rates: 100% through stage 19 (stages 1–7 are a deliberate free
onboarding ramp), 80–90% across the five-pocket tier, 70% at stage 30, 40% at
stage 40 and 10% at stage 50. The curve keeps descending rather than
plateauing.

## Block Roguelite — parked

The earlier Block Blast-style prototype: 8×8 board, three-piece tray,
drag-to-place, row and column clearing. Complete and playable, but it was a
clone without a hook, which is why the work moved to Sticky Fingers.

## Layout

| Path | Role |
|---|---|
| `src/sticky/` | Sticky Fingers — game logic, renderer, input |
| `src/core/` | Block puzzle logic — grid, pieces, state machine |
| `src/render/`, `src/input/` | Block puzzle renderer and drag handling |
| `src/audio.ts` | Oscillator-based sound, shared, no assets |
| `scripts/build-artifact.mjs` | Inlines a build into one self-contained page |

Game logic is kept free of rendering and input in both, so a hook can be
swapped without touching presentation.
