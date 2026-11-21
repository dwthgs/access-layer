import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests against the test fixture page, served by Vite from the TypeScript
 * source. Network calls to the dictionary are intercepted per test so the
 * suite is deterministic offline; `DICTIONARY_LIVE=1` adds one test against
 * the real Wiktionary API.
 */
const PORT = 5179

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --open false`,
    url: `http://localhost:${PORT}/demo/fixture.html`,
    reuseExistingServer: true,
  },
})
