/** Closing Page Structure returns focus to what opened it, not to <body> (#9). */
import { expect, test, type Page } from '@playwright/test'

const widget = (page: Page) => page.locator('access-layer')
const dialog = (page: Page) => widget(page).locator('.mla-struct')
const focused = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector('access-layer')!
    const el = document.activeElement === host ? host.shadowRoot!.activeElement : document.activeElement
    return el ? `${el.tagName.toLowerCase()}.${el.className}` : 'none'
  })

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await widget(page).locator('.mla-trigger').focus()
  await page.keyboard.press('Enter')
  await widget(page).getByRole('button', { name: 'Page structure' }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toBeVisible()
})

test('Escape closes it and focus goes back to the accessibility button', async ({ page }) => {
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  expect(await focused(page)).toContain('mla-trigger')
})

test('the close button does the same', async ({ page }) => {
  await dialog(page).locator('.mla-struct-close').focus()
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toHaveCount(0)
  expect(await focused(page)).toContain('mla-trigger')
})

test('picking an entry moves focus to it on the page', async ({ page }) => {
  await dialog(page).locator('.mla-struct-item button, .mla-struct-list button').first().focus()
  await page.keyboard.press('Enter')
  await expect(dialog(page)).toHaveCount(0)
  expect(await focused(page)).toMatch(/^h[1-6]\./)
})
