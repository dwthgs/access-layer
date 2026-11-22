/**
 * Tiles with more than on and off show their steps as bars,
 * and every active tile shows a check. Checked by what is actually painted.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

const widget = (page: Page) => page.locator('access-layer')
const tile = (page: Page, name: string) =>
  widget(page).getByRole('button', { name: new RegExp(`^${name}(,|$)`) })

/** For each bar: is it painted in the accent colour? */
async function painted(button: Locator): Promise<boolean[]> {
  return button.locator('.mla-step').evaluateAll((steps) => {
    const accent = getComputedStyle(steps[0]!.closest('.mla-tile')!.querySelector('.mla-tile-check')!).backgroundColor
    return steps.map((step) => getComputedStyle(step).backgroundColor === accent)
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await widget(page).locator('.mla-trigger').click()
})

test('Contrast steps through its options, filling a bar each time', async ({ page }) => {
  const contrast = tile(page, 'Contrast')
  await expect(contrast.locator('.mla-step')).toHaveCount(3)
  // No bars until the tile is used.
  await expect(contrast.locator('.mla-steps')).toBeHidden()

  await contrast.click()
  await expect(contrast.locator('.mla-tile-label')).toHaveText('Invert colors')
  expect(await painted(contrast)).toEqual([true, false, false])

  await contrast.click()
  await expect(contrast.locator('.mla-tile-label')).toHaveText('Dark contrast')
  expect(await painted(contrast)).toEqual([true, true, false])

  await contrast.click()
  await expect(contrast.locator('.mla-tile-label')).toHaveText('Light contrast')
  expect(await painted(contrast)).toEqual([true, true, true])

  await contrast.click()
  await expect(contrast.locator('.mla-tile-label')).toHaveText('Contrast')
  await expect(contrast.locator('.mla-steps')).toBeHidden()
})

test('bars appear only once a tile is used, without the tile changing size', async ({ page }) => {
  const spacing = tile(page, 'Text spacing')
  // In view first: the click would otherwise scroll the panel and move the tile.
  await spacing.scrollIntoViewIfNeeded()
  const before = await spacing.boundingBox()
  await expect(spacing.locator('.mla-steps')).toBeHidden()
  await spacing.click()
  await expect(spacing.locator('.mla-steps')).toBeVisible()
  expect(await spacing.boundingBox()).toEqual(before)
})

test('on/off tiles keep their name and have no bars', async ({ page }) => {
  for (const name of ['Dictionary', 'Tooltips', 'Hide images']) {
    const toggle = tile(page, name)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle.locator('.mla-tile-label')).toHaveText(name)
    await expect(toggle.locator('.mla-steps')).toHaveCount(0)
    await expect(toggle.locator('.mla-tile-check')).toHaveCSS('opacity', '1')
  }
})

test('Line height changes the spacing from the very first step', async ({ page }) => {
  const paragraph = page.locator('main p').first()
  const spacing = () =>
    paragraph.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize))
  const original = await spacing()
  const button = tile(page, 'Line height')
  const expected = [1.5, 1.75, 2]
  for (const [index, factor] of expected.entries()) {
    await button.click()
    await expect(button.locator('.mla-tile-label')).toHaveText(`Line height ${factor}\u00d7`)
    expect(await spacing()).toBeCloseTo(original * factor, 1)
    expect(await painted(button)).toEqual(expected.map((_, i) => i <= index))
  }
  await button.click()
  await expect(button.locator('.mla-tile-label')).toHaveText('Line height')
  expect(await spacing()).toBeCloseTo(original, 2)
})

test('Bigger text fills a bar per level', async ({ page }) => {
  const bigger = tile(page, 'Bigger text')
  await expect(bigger.locator('.mla-step')).toHaveCount(4)
  await bigger.click()
  await bigger.click()
  await expect(bigger).toHaveAccessibleName('Bigger text, Level 2 of 4')
  expect(await painted(bigger)).toEqual([true, true, false, false])
})

test('an active tile shows the check, an inactive one does not', async ({ page }) => {
  const saturation = tile(page, 'Saturation')
  const check = saturation.locator('.mla-tile-check')
  await expect(check).toHaveCSS('opacity', '0')
  await saturation.click()
  await expect(saturation).toHaveAttribute('aria-pressed', 'true')
  await expect(check).toHaveCSS('opacity', '1')
  await expect(saturation.locator('.mla-tile-label')).toHaveText('Low saturation')

  const tooltips = tile(page, 'Tooltips')
  await tooltips.click()
  await expect(tooltips.locator('.mla-tile-check')).toHaveCSS('opacity', '1')
  await expect(tooltips.locator('.mla-steps')).toHaveCount(0)
})

test('the state survives a reload', async ({ page }) => {
  await tile(page, 'Text align').click()
  await tile(page, 'Text align').click()
  await page.reload()
  await widget(page).locator('.mla-trigger').click()
  const align = tile(page, 'Text align')
  await expect(align.locator('.mla-tile-label')).toHaveText('Align center')
  expect(await painted(align)).toEqual([true, true, false, false])
})

test('the bars sit under the label, inside the tile', async ({ page }) => {
  const cursor = tile(page, 'Cursor')
  const box = (await cursor.boundingBox())!
  const label = (await cursor.locator('.mla-tile-label').boundingBox())!
  const steps = (await cursor.locator('.mla-steps').boundingBox())!
  expect(steps.y).toBeGreaterThan(label.y + label.height - 1)
  expect(steps.x).toBeGreaterThan(box.x)
  expect(steps.x + steps.width).toBeLessThan(box.x + box.width)
  expect(steps.y + steps.height).toBeLessThan(box.y + box.height)
})

/** What a visitor could see change, measured from the rendered page. */
async function looks(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const pick = (el: Element | null, props: string[]) => {
      if (!el) return ''
      const style = getComputedStyle(el)
      return props.map((prop) => style.getPropertyValue(prop)).join(';')
    }
    const spinner = document.querySelector('.spinner')!
    const a = getComputedStyle(spinner).transform
    await new Promise((resolve) => setTimeout(resolve, 200))
    const spinning = a !== getComputedStyle(spinner).transform
    const shadow = document.querySelector('access-layer')!.shadowRoot!
    const overlays = ['.mla-mask', '.mla-guide', '.mla-struct']
      .map((selector) => {
        const el = shadow.querySelector(selector) as HTMLElement | null
        return el ? `${selector}:${el.getBoundingClientRect().height > 0}` : ''
      })
      .join(',')
    return JSON.stringify({
      html: pick(document.documentElement, ['filter', 'background-color']),
      body: pick(document.body, ['cursor', 'background-color', 'color']),
      p: pick(document.querySelector('main p'), [
        'font-size', 'font-family', 'letter-spacing', 'word-spacing', 'line-height', 'text-align', 'color', 'background-color',
      ]),
      faint: pick(document.querySelector('.faint'), ['color']),
      link: pick(document.querySelector('main a[href]'), ['outline-style', 'background-color', 'text-decoration-line']),
      img: pick(document.querySelector('main img'), ['opacity', 'visibility', 'filter', 'background-image']),
      spinning,
      overlays,
    })
  })
}

const EVERY_STEP: [string, number][] = [
  ['Contrast', 3],
  ['Smart contrast', 1],
  ['Highlight links', 1],
  ['Bigger text', 4],
  ['Text spacing', 3],
  ['Pause animations', 1],
  ['Hide images', 1],
  ['Dyslexia friendly', 2],
  ['Cursor', 3],
  ['Line height', 3],
  ['Text align', 4],
  ['Saturation', 3],
]

for (const [name, steps] of EVERY_STEP) {
  test(`${name}: every step visibly changes the page, and off restores it`, async ({ page }) => {
    await page.keyboard.press('Escape') // measure the page, not the panel
    const base = await looks(page)
    await widget(page).locator('.mla-trigger').click()
    const seen = new Set([base])
    for (let step = 1; step <= steps; step++) {
      await tile(page, name).click()
      await page.keyboard.press('Escape')
      const now = await looks(page)
      expect(now, `${name} step ${step} changed nothing`).not.toBe(base)
      // Each step differs from the one before it, not just from off.
      expect(seen.has(now), `${name} step ${step} looks like an earlier step`).toBe(false)
      seen.add(now)
      await widget(page).locator('.mla-trigger').click()
    }
    await tile(page, name).click() // past the last step: off
    await page.keyboard.press('Escape')
    expect(await looks(page)).toBe(base)
  })
}

test('Page structure opens a list of the headings, landmarks and links', async ({ page }) => {
  await tile(page, 'Page structure').click()
  const dialog = widget(page).getByRole('dialog', { name: 'Page structure' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Readable content')
})

test('Tooltips shows a hidden label on hover', async ({ page }) => {
  await tile(page, 'Tooltips').click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Save the current draft' }).hover()
  await expect(widget(page).locator('.mla-tooltip')).toHaveText('Save the current draft')
})
