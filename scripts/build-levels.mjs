// Bakes a level pack. Puzzle generation is far too slow to run on a phone at
// launch, so levels ship as data; only the daily puzzle is generated on device.
//
//   node --experimental-strip-types scripts/build-levels.mjs [count] [outfile]

import { writeFileSync } from 'node:fs'
import { buildLevel, specFor } from '../src/sunspot/curve.ts'

const count = Number(process.argv[2] ?? 120)
const outfile = process.argv[3] ?? 'src/sunspot/levels.json'

const started = Date.now()
const levels = []
const tally = {}
const sizes = {}

for (let level = 1; level <= count; level++) {
  const p = buildLevel(level)
  tally[p.tier] = (tally[p.tier] ?? 0) + 1
  sizes[p.n] = (sizes[p.n] ?? 0) + 1
  levels.push({
    level,
    n: p.n,
    tier: p.tier,
    chapter: specFor(level).chapter,
    // Beams as one letter per square, which keeps the pack small and readable.
    regions: p.regions.map((row) => row.map((g) => String.fromCharCode(65 + g)).join('')),
    solution: p.solution,
    score: p.score,
    steps: p.steps,
  })
  if (level % 20 === 0) process.stdout.write(`  ${level}/${count}\n`)
}

writeFileSync(outfile, JSON.stringify({ version: 1, levels }, null, 0) + '\n')

const kb = (JSON.stringify(levels).length / 1024).toFixed(1)
console.log(`\n${count} levels -> ${outfile}  (${kb} KB, ${((Date.now() - started) / 1000).toFixed(1)}s)`)
console.log(`tiers: ${JSON.stringify(tally)}`)
console.log(`sizes: ${JSON.stringify(sizes)}`)
