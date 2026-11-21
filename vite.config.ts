import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const EXTENSION: Record<string, string> = {
  es: 'js',
  umd: 'umd.cjs',
  iife: 'iife.js',
}

export default defineConfig({
  build: {
    target: 'es2019',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AccessLayer',
      formats: ['es', 'umd', 'iife'],
      // The IIFE build is the drop-in <script> tag every property loads; the
      // ES and UMD builds are for apps that would rather import it.
      fileName: (format) => `access-layer.${EXTENSION[format] ?? `${format}.js`}`,
    },
    sourcemap: true,
  },
  server: { open: '/' },
  test: {
    environment: 'happy-dom',
    // Unit tests never reach the network: the Google translator fallback is
    // exercised with a stand-in, and in the browser tests with a route.
    environmentOptions: {
      happyDOM: { settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true } },
    },
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
})
