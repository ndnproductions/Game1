/**
 * Inlines the Vite build into a single self-contained page suitable for
 * publishing, where external script requests are blocked.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const TITLE = process.env.TITLE ?? 'Blockwright'

const html = readFileSync(join(DIST, 'index.html'), 'utf8')

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
if (!styleMatch) throw new Error('no <style> block found in dist/index.html')

const assets = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js'))
if (assets.length !== 1) throw new Error(`expected exactly one JS asset, got ${assets.length}`)

const js = readFileSync(join(DIST, 'assets', assets[0]), 'utf8')
// A literal closing tag inside the source would end the inline script early.
const safeJs = js.replaceAll('</script>', '<\\/script>')

const out = `<title>${TITLE}</title>
<style>
${styleMatch[1].trim()}
</style>
<canvas id="game"></canvas>
<script type="module">
${safeJs}
</script>
`

writeFileSync(join(DIST, 'artifact.html'), out)
console.log(`dist/artifact.html  ${(out.length / 1024).toFixed(1)} kB`)
