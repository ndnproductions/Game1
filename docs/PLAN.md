# Game 1 — Product & Monetization Plan

**Owner:** Neil
**Budget:** 5–10 hrs/week (evenings + weekends)
**Route:** Build prototype → submit to hyper-casual/hybrid-casual publishers
**Target submission date:** ~7 weeks from kickoff

---

## 1. Strategy

### Why the publisher route

A new mobile game with no ad budget gets effectively zero organic installs.
The App Store does not surface unknown indie games. The top-grossing casual
games win because their publishers pay **$2–5 per install** and recover
**$6–10** over each player's lifetime. That machine — not the game — is the
product.

Publishers (Voodoo, Homa, Supersonic, CrazyLabs, Rollic) solve exactly the
problem a solo dev cannot: they spend their own money testing your prototype
with real ad traffic, and if the metrics clear their bar they publish it,
run all user acquisition, and pay 20–50% revenue share.

**You supply the fun. They supply the distribution.**

### Odds, honestly

Roughly 1 in 20–50 submitted prototypes gets picked up. That is fine, because
each prototype is 3–5 weeks at this pace and every rejection returns real
test data. The plan is a series of shots, not one.

### What changed in this market

Hyper-casual contracted hard in 2022–23. Publishers no longer chase cheap
installs alone — they want **hybrid-casual**: a casual core loop wrapped in
progression and retention mechanics. The bar is higher than the 2019 gold
rush. Our design reflects that.

---

## 2. The game

### Core loop (Block Blast DNA)

| Element | Spec |
|---|---|
| Grid | 8×8 |
| Tray | 3 pieces offered at a time |
| Placement | Drag onto grid, snap to cells |
| Rotation | **None** — this is deliberate, matches Block Blast |
| Clearing | Any full row or column clears |
| Refill | New 3 pieces once tray empties |
| Game over | No tray piece fits anywhere on the grid |
| Scoring | Multi-line clears and consecutive clears build a combo multiplier |

This loop is proven, satisfying, and buildable solo. It is the foundation.

### The hook: a roguelite upgrade layer

Every N points, the run pauses and offers **1 of 3 upgrades**. Examples:

- Diagonal lines now clear
- Bombs clear a 3×3 area
- One free tray reroll per run
- Single-cell pieces appear more often
- Every 4th clear scores double

The run ends, you bank a soft currency, and you spend it on permanent
starting perks for future runs.

**Why this hook:** it is Block Blast's feel with Balatro's progression. It
answers "why not just play Block Blast" in one sentence, it produces the
absurd chain-clear moments that make good ad creative, and the meta-progression
is precisely the retention depth hybrid-casual publishers now demand.

### Rewarded-ad placements (natural, not intrusive)

- Continue after game over — once per run
- Reroll the upgrade choices
- 2× the currency banked at the end of a run

### Deliberately out of scope for v1

No accounts. No backend. No multiplayer. No daily login calendar. No live ops.
Anything on this list at 5–10 hrs/week means never shipping.

---

## 3. Roadmap

| Phase | Weeks | Hours | Deliverable |
|---|---|---|---|
| Core loop | 1–2 | ~15 | Grid, pieces, drag-and-drop, line clear, scoring, game over |
| Juice pass | 3 | ~8 | Particles, screen shake, sound, combo popups, haptics |
| Roguelite layer | 4–5 | ~15 | Upgrade draft, run economy, permanent perks |
| Tune + capture | 6 | ~8 | Balance pass, record 15s gameplay video |
| Submit | 7 | — | Voodoo, Homa, Supersonic, CrazyLabs |

**The juice pass is not optional polish.** It is the single thing separating a
prototype that tests well from one that dies in review. Publishers judge feel
in the first ten seconds.

### Build order rationale

The core engine is built **separately from the hook**, so alternate hooks can
be swapped onto the same validated core cheaply. If hook #1 tests poorly, hook
#2 costs a weekend instead of a month. This is the actual hyper-casual playbook.

---

## 4. Publisher submission

| Publisher | Portal |
|---|---|
| Voodoo | publishing.voodoo.io |
| Homa | Homa Lab |
| Supersonic | supersonic.com (Unity-owned) |
| CrazyLabs | TAKEOFF program |

### What they measure

- **CPI** — cost per install, ideally under ~$0.50
- **D1 retention** — 40%+ for hybrid-casual
- **Session length** and sessions per day

Submit to several in parallel. Non-exclusive until someone offers terms.

---

## 5. Costs

| Item | Cost |
|---|---|
| Unity | Free under $200k revenue |
| Publisher submission | Free |
| Apple Developer Program | $99/yr — **only if self-publishing later** |
| Google Play | $25 one-time — **only if self-publishing later** |

Nothing needs to be paid before submission.

---

## 6. Fallback

If no publisher bites, the same game wraps for mobile-web portals
(Poki, CrazyGames, GameDistribution), whose traffic is majority mobile
phones. Smaller money — $50–2,000 — but it arrives in weeks and the work
still earns.
