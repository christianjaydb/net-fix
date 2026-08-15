import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  // viteSingleFile inlines all JS/CSS into a single dist/index.html.
  // This means the built file also opens correctly via a plain
  // double-click (file://) — Vite's default multi-file module output
  // only works when served over http(s), not from disk directly.
  plugins: [react(), viteSingleFile()],
})
