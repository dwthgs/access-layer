/**
 * The widget's own UI must pass WCAG 2.2 AA with the colour a site gives it,
 * including #0574F2, which is too light for white text (#6).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function openWith(page: Page, colour: string) {
  await page.route('**/demo/fixture.html', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace('data-color="#0574F2"', `data-color="${colour}"`)
    await route.fulfill({ response, body })
  })
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.locator('access-layer .mla-trigger').click()
  await expect(page.locator('access-layer .mla-panel')).toHaveAttribute('data-open', '')
}

for (const colour of ['#0574F2', '#0b5cd8', '#7fb3ff']) {
  test(`the open panel passes colour contrast with ${colour}`, async ({ page }) => {
    await openWith(page, colour)
    // Show the selected-language colours too.
    await page.locator('access-layer .mla-lang-toggle').click()
    const results = await new AxeBuilder({ page }).include('access-layer').withRules(['color-contrast']).analyze()
    expect(results.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary}`))).toEqual([])
  })
}
