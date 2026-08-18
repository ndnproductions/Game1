import { defineConfig } from 'vite'

// Two independent games live in this repo; build one at a time so each
// produces a single self-contained bundle with no shared chunks.
const game = process.env.GAME === 'sticky' ? 'sticky' : 'block'

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: game === 'sticky' ? 'dist-sticky' : 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: game === 'sticky' ? 'sticky.html' : 'index.html',
    },
  },
})
