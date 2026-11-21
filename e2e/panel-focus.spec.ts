/**
 * The panel is a non-modal dialog (#8): it says so (aria-modal="false"), Tab
 * and Shift+Tab move on to the page instead of half-trapping focus, and
 * Escape closes it from anywhere and returns focus to what opened it.
 */
import { expect, test, type Page } from '@playwright/test'

const panel = (page: Page) => page.locator('access-layer .mla-panel')
const trigger = (page: Page) => page.locator('access-layer .mla-trigger')
const focusedInWidget = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector('access-layer')!
    return document.activeElement === host ? host.shadowRoot!.activeElement?.className ?? '' : null
  })

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await trigger(page).focus()
  await page.keyboard.press('Enter')
  await expect(panel(page)).toHaveAttribute('data-open', '')
})

test('says it is not modal, and opens with focus on the panel', async ({ page }) => {
  await expect(panel(page)).toHaveAttribute('aria-modal', 'false')
  expect(await focusedInWidget(page)).toContain('mla-panel')
})

test('Shift+Tab from the panel goes back to the button, as in any non-modal panel', async ({ page, browserName }) => {
  await page.keyboard.press('Shift+Tab')
  // WebKit on macOS tabs only to form fields by default, so it skips the button.
  if (browserName === 'webkit') expect((await focusedInWidget(page)) ?? '').not.toContain('mla-panel')
  else expect(await focusedInWidget(page)).toContain('mla-trigger')
})

test('Escape closes it after tabbing out to the page, and focus returns to the button', async ({ page }) => {
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab') // now on the page
  expect(await focusedInWidget(page)).toBeNull()
  await page.keyboard.press('Escape')
  await expect(panel(page)).not.toHaveAttribute('data-open', '')
  expect(await focusedInWidget(page)).toContain('mla-trigger')
})
