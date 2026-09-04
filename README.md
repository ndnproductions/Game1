# Game1

Mobile-first prototypes exploring the same question: what makes a casual puzzle
game hold someone. See [`docs/PLAN.md`](docs/PLAN.md) for the monetization
strategy and [`docs/research.html`](docs/research.html) for the market research.

## Sunspot — the active work

A cozy Queens-style logic puzzle. Eight cats claim eight sunbeams on a grid: one
cat per beam, one per row, one per column, and no two cats in touching squares —
diagonals included. Visual direction and a playable board are in the design
artifact; `src/sunspot/` holds the engine.

The genre is a UI app, not a real-time game, so the build target is Flutter
rather than the Unity route in [`docs/unity.html`](docs/unity.html). None of the
engine below is Flutter-specific — it is plain logic, and the port to Dart is
mechanical.

### The generator is the whole game

Everything that makes this genre good or garbage lives in puzzle quality, and
the constraint is absolute: **the player must never have to guess.** Two
separate gates enforce it.

| Gate | What it proves |
|---|---|
| `solutionsOf()` in `board.ts` | Exhaustive search finds exactly one solution |
| `deduce()` in `solver.ts` | Five human rules alone finish the board |

A puzzle that passes only the first is solvable by brute force and miserable to
play. Both gates must pass or the board is discarded.

### Why generation needs a repair pass

Random beams essentially never produce a unique board. Measured over 3000
randomly grown boards, **not one had a single solution** — every one had three or
more. Generate-and-retry therefore never terminates, which is the trap that
produces the guessing complaints all over this genre's app-store reviews.

So the generator repairs instead of retries. Take an unwanted solution, and move
one of its squares into a beam that same solution already uses. That forces two
cats into one beam and kills that solution outright. Repeat until only the
intended one survives.

### Why there is a second pass after that

Repair stops the instant a board becomes unique — which is exactly the *hardest*
a board can be, because every remaining deduction is load-bearing. Without a
second pass every generated board comes out at the top tier and the game has no
easy levels at all. So `ease()` keeps reshaping past uniqueness, accepting any
move that lowers the difficulty while uniqueness holds.

### The stage ladder

Board size steps 6 → 8 → 10, and each size climbs its own tier ladder before the
next size opens. Jumping to a bigger board is already a step up, so the rules
relax at each size change and then climb again.

| Stages | Chapter | Board | Hardest rule needed |
|---|---|---|---|
| 1–25 | The Sunroom | 6×6 | Only-square, then row-locks-beam |
| 26–90 | The Garden | 8×8 | Row-locks-beam → crowding → paired beams |
| 91+ | The Attic | 10×10 | Row-locks-beam → crowding → paired beams |

Size and deduction depth are the only two levers that genuinely make a board
harder. Blocked squares are the obvious-looking third and they do not work:
removing candidate squares only shrinks the search, so a board with props on it
is strictly *easier* than the same board without them. Props are decoration.
The one mechanic that would genuinely add difficulty is a beam that needs two
cats — worth building for a fourth chapter, not before.

10×10 generation is roughly an order of magnitude slower than 8×8, so
`buildLevel` gives the big boards a smaller ease budget and leans on seed-walking
instead of long hill-climbs.

### Difficulty

The tier is set by the most advanced rule the solve actually needs.

| Tier | Hardest rule required | Typical score |
|---|---|---|
| `gentle` | Only-square | ~8 |
| `warm` | A row locks a beam, or a beam locks a row | ~17 |
| `bright` | Crowding — every square a unit has left touches some square X, so X is out | ~26 |
| `blazing` | Paired beams — k beams confined to k rows consume those rows | ~34 |

One consequence worth knowing: a `gentle` board needs a **one-square beam**,
because `only-square` cannot fire on the opening move without one. That is not a
flaw to design around — it is the genre's standard teaching device. Minimum beam
size is therefore tied to the tier in `MIN_BEAM`.

### Layout

| Path | Role |
|---|---|
| `src/sunspot/types.ts` | Shared types |
| `src/sunspot/rng.ts` | Seeded RNG — identical on every platform, which the daily depends on |
| `src/sunspot/board.ts` | Geometry, connectivity, exhaustive solution counting |
| `src/sunspot/solver.ts` | The five human deduction rules, and difficulty rating |
| `src/sunspot/generator.ts` | Placement, beam growth, repair, ease |
| `src/sunspot/curve.ts` | The stage ladder — sizes, tiers and chapters |
| `src/sunspot/daily.ts` | Daily puzzle derived from the date — no backend, no accounts |
| `src/sunspot/levels.json` | 110 baked levels, verified |

```sh
npm run test:sunspot     # full self-test, including all 365 days of 2026
npm run build:levels     # rebake src/sunspot/levels.json
```

Generation takes ~230ms per board, far too slow to run on a phone at launch, so
levels ship as data. Only the daily puzzle is generated on device.

## Sticky Fingers — parked

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

### Art

Everything is drawn procedurally — no image assets. The street is a baked
offscreen backdrop (skyline, lit windows, lamp haloes, wet reflections) with
drifting fog and rain composited over it, and the crowd are silhouettes lit by
a cheap two-pass rim: the body is filled once offset in the rim colour, then
again flat on top. Rim colour doubles as the awareness tell — green for
distracted, blue for neutral, red for alert. Type is Anton for display and
Outfit for UI, both with real fallback stacks.

Loot is drawn from `art/icons.ts` as canvas paths rather than emoji. Emoji
render differently on every platform, go missing on some, and pick up whatever
`fillStyle` the context was left holding — on iOS all three combined to render
the tokens empty. Each icon is authored in a unit box and scaled, so weights
hold at any size, and junk is drawn grey rather than as a dimmed brand colour.

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

Past stage 19 the time allowance also drops away sharply, settling toward 1.7
seconds a piece (about 27s for a full list) instead of the old 4.5s floor.
Late-stage suspicion drains faster to match, so heat no longer ends every deep
run before the clock gets a chance to.

Bot clear rates run roughly 96–100% through stage 25, then 50–83% from stage
30 on, descending rather than plateauing. Note that a bot taking one action
per second is faster and more accurate than any person, so it is a lower bound
on time pressure — it only starts dying to the clock at stage 50.

## Block Roguelite — parked

The earliest Block Blast-style prototype: 8×8 board, three-piece tray,
drag-to-place, row and column clearing. Complete and playable, but it was a
clone without a hook, which is why the work moved to Sticky Fingers.

## Layout

| Path | Role |
|---|---|
| `src/sunspot/` | Sunspot — puzzle engine, solver, generator |
| `src/sticky/` | Sticky Fingers — game logic, renderer, input |
| `src/sticky/art/` | Palette, street scene, figures, UI chrome, particles |
| `src/core/` | Block puzzle logic — grid, pieces, state machine |
| `src/render/`, `src/input/` | Block puzzle renderer and drag handling |
| `src/audio.ts` | Oscillator-based sound, shared, no assets |
| `scripts/build-artifact.mjs` | Inlines a build into one self-contained page |

Game logic is kept free of rendering and input in both, so a hook can be
swapped without touching presentation.
