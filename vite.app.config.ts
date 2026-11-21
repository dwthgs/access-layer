import { defineConfig } from 'vite'
import { resolve } from 'node:path'
// The site is one static directory, so the built widget files go next to the pages.
export default defineConfig({ publicDir: 'dist', build: { outDir: 'dist-app', rollupOptions: { input: {
  preview: resolve('console/preview.html'), console: resolve('console/index.html'), landing: resolve('index.html'), notFound: resolve('404.html'),
} } } })
