/**
 * Content a page adds after a tool is on gets the tool too, measured on its
 * own and not by re-walking the page (#4).
 */
import { expect, test, type Page } from '@playwright/test'

type Settings = { set(patch: Record<string, unknown>): void }

async function open(page: Page) {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.locator('access-layer .mla-trigger').waitFor()
}

const set = (page: Page, patch: Record<string, unknown>) =>
  page.evaluate((patch) => (document.querySelector('access-layer') as unknown as { settings: Settings }).settings.set(patch), patch)

/** Add markup to <main> and return the computed values asked for, once the tools have caught up. */
async function addAndRead(page: Page, html: string, property: 'fontSize' | 'color') {
  await page.evaluate((html) => document.querySelector('main')!.insertAdjacentHTML('beforeend', html), html)
  await page.waitForTimeout(500)
  return page.evaluate((property) =>
    Array.from(document.querySelectorAll('[data-added]'), (el) => getComputedStyle(el)[property]), property)
}

test('Bigger text scales added content once, including content with its own size', async ({ page }) => {
  await open(page)
  await page.evaluate(() => document.querySelector('main')!.setAttribute('style', 'font-size: 16px'))
  await set(page, { textScale: 2 }) // 1.3×
  const sizes = await addAndRead(page,
    '<p data-added>inherits</p><p data-added style="font-size: 10px">own size</p><p><span data-added>nested</span></p>',
    'fontSize')
  // 16 × 1.3 and 10 × 1.3; scaling twice would give 27.04px. Engines round sizes slightly differently.
  const expected = [20.8, 13, 20.8]
  sizes.forEach((size, i) => expect(parseFloat(size)).toBeCloseTo(expected[i]!, 1))
})

test('Smart contrast fixes added text', async ({ page }) => {
  await open(page)
  await set(page, { smartContrast: true })
  const [colour] = await addAndRead(page, '<p data-added style="color: rgb(221, 221, 221); background: #fff">faint</p>', 'color')
  expect(colour).not.toBe('rgb(221, 221, 221)')
})

test('adding one element does not re-measure the page', async ({ page }) => {
  await open(page)
  await page.evaluate(() => {
    const main = document.querySelector('main')!
    for (let i = 0; i < 2000; i++) main.insertAdjacentHTML('beforeend', `<p>Paragraph ${i} with <a href="#">a link</a>.</p>`)
  })
  await set(page, { textScale: 2, lineHeight: 1, smartContrast: true })
  await page.waitForTimeout(500)
  const calls = await page.evaluate(async () => {
    let count = 0
    const original = window.getComputedStyle
    window.getComputedStyle = (...args) => {
      count++
      return original(...args)
    }
    document.querySelector('main p')!.insertAdjacentHTML('beforeend', '<span>one new line</span>')
    await new Promise((resolve) => setTimeout(resolve, 500))
    window.getComputedStyle = original
    return count
  })
  expect(calls).toBeLessThan(40) // a full pass would be well over 4,000
})
