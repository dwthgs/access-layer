/**
 * Every profile, clicked from the panel, measured on the page.
 *
 * Each test checks the effect a visitor would notice (the spinner stops, the
 * text grows, the page is read aloud), not merely that a setting flipped,
 * and that switching the profile off puts the page back exactly as it was.
 */
import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    __spoken: string[]
  }
}

const widget = (page: Page) => page.locator('access-layer')
/** A profile card by its accessible name, as a screen-reader user finds it. */
const card = (page: Page, name: string) => widget(page).getByRole('button', { name, exact: true })

/** Everything the profiles can change, measured from the rendered page. */
async function measure(page: Page) {
  return page.evaluate(async () => {
    const p = document.querySelector('main p') as HTMLElement
    const faint = document.querySelector('.faint') as HTMLElement
    const link = document.querySelector('main a[href]') as HTMLElement
    const spinner = document.querySelector('.spinner') as HTMLElement
    const shadow = document.querySelector('access-layer')!.shadowRoot!
    const visible = (selector: string) => {
      const el = shadow.querySelector(selector) as HTMLElement | null
      return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0
    }
    const ps = getComputedStyle(p)
    const before = getComputedStyle(spinner).transform
    await new Promise((resolve) => setTimeout(resolve, 250))
    const after = getComputedStyle(spinner).transform
    const linkStyle = getComputedStyle(link)
    return {
      filter: getComputedStyle(document.documentElement).filter,
      spinning: before !== after,
      fontSize: parseFloat(ps.fontSize),
      fontFamily: ps.fontFamily,
      letterSpacing: ps.letterSpacing,
      lineRatio: parseFloat(ps.lineHeight) / parseFloat(ps.fontSize),
      textAlign: ps.textAlign,
      faintColor: getComputedStyle(faint).color,
      linkLook: [linkStyle.outlineStyle, linkStyle.backgroundColor, linkStyle.textDecorationLine].join('|'),
      cursor: [document.documentElement, document.body, p].map((el) => getComputedStyle(el).cursor).join('|'),
      mask: visible('.mla-mask'),
      guide: visible('.mla-guide'),
    }
  })
}

test.beforeEach(async ({ page }) => {
  // A recording speech engine: headless browsers have no voices to listen to.
  await page.addInitScript(() => {
    window.__spoken = []
    class Utterance {
      lang = ''
      rate = 1
      onstart?: () => void
      onend?: () => void
      onerror?: () => void
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak(u: Utterance) {
          window.__spoken.push(u.text)
          setTimeout(() => u.onend?.(), 10)
        },
        cancel() {},
        getVoices: () => [],
        speaking: false,
      },
    })
  })
  await page.route('**/api/rest_v1/page/definition/**', (route) =>
    route.fulfill({ json: { en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'A passage.' }] }] } }),
  )
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await widget(page).locator('.mla-trigger').click()
  await widget(page).locator('.mla-profiles-toggle').click()
})

test('lists the eight profiles in order', async ({ page }) => {
  await expect(widget(page).locator('.mla-profile-name')).toHaveText([
    'Low vision',
    'Dyslexia',
    'Colour blindness',
    'Focus',
    'Cognitive',
    'Reduce motion',
    'Mobility',
    'Read aloud',
  ])
})

test('the header collapses and expands the list', async ({ page }) => {
  const toggle = widget(page).locator('.mla-profiles-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(card(page, 'Read aloud')).toBeHidden()
  await toggle.click()
  await expect(card(page, 'Read aloud')).toBeVisible()
})

test('the info button explains what each profile turns on', async ({ page }) => {
  const info = widget(page).getByRole('button', { name: 'What each profile turns on' })
  await expect(widget(page).locator('.mla-profile-info')).toBeHidden()
  await info.click()
  await expect(info).toHaveAttribute('aria-expanded', 'true')
  await expect(widget(page).locator('.mla-profile-info dt')).toHaveCount(8)
  await expect(widget(page).locator('.mla-profile-info')).toContainText('Reading mask, no animation, muted colour')
})

test('each card describes itself to screen readers', async ({ page }) => {
  await expect(card(page, 'Reduce motion')).toHaveAccessibleDescription('No animation, muted colour')
})

test('Mobility: big cursor, highlighted links, animation stopped', async ({ page }) => {
  const base = await measure(page)
  expect(base.spinning).toBe(true)
  await card(page, 'Mobility').click()
  const on = await measure(page)
  // On the page background as well as on the text.
  expect(on.cursor.split('|').every((value) => value.includes('url('))).toBe(true)
  expect(on.linkLook).not.toBe(base.linkLook)
  expect(on.spinning).toBe(false)
})

test('Read aloud: reads what is clicked aloud, and shows button descriptions', async ({ page }) => {
  await card(page, 'Read aloud').click()
  await page.keyboard.press('Escape')
  await page.locator('main p').first().click()
  await expect.poll(() => page.evaluate(() => window.__spoken.join(' '))).toContain('This paragraph exists')
  await page.getByRole('button', { name: 'Save the current draft' }).hover()
  await expect(widget(page).locator('.mla-tooltip')).toHaveText('Save the current draft')
})

test('Colour blindness: stronger colour and corrected contrast', async ({ page }) => {
  const base = await measure(page)
  await card(page, 'Colour blindness').click()
  const on = await measure(page)
  expect(on.filter).toContain('saturate(2)')
  expect(on.faintColor).not.toBe(base.faintColor)
})

test('Dyslexia: dyslexia font, wider spacing, taller lines, reading guide', async ({ page }) => {
  const base = await measure(page)
  await card(page, 'Dyslexia').click()
  const on = await measure(page)
  expect(on.fontFamily).not.toBe(base.fontFamily)
  expect(on.fontFamily.toLowerCase()).toMatch(/opendyslexic|comic sans/)
  expect(on.letterSpacing).not.toBe(base.letterSpacing)
  expect(on.lineRatio).toBeCloseTo(base.lineRatio * 1.5, 1)
  expect(on.textAlign).toBe('left')
  expect(on.guide).toBe(true)
})

test('Low vision: bigger text, corrected contrast, highlighted links', async ({ page }) => {
  const base = await measure(page)
  await card(page, 'Low vision').click()
  const on = await measure(page)
  expect(on.fontSize).toBeGreaterThan(base.fontSize * 1.2)
  expect(on.faintColor).not.toBe(base.faintColor)
  expect(on.linkLook).not.toBe(base.linkLook)
})

test('Cognitive: reading guide, links, no animation, dictionary', async ({ page }) => {
  const base = await measure(page)
  await card(page, 'Cognitive').click()
  const on = await measure(page)
  expect(on.guide).toBe(true)
  expect(on.linkLook).not.toBe(base.linkLook)
  expect(on.spinning).toBe(false)
  await page.keyboard.press('Escape')
  await page.getByRole('heading', { name: 'Readable content' }).dblclick({ position: { x: 20, y: 12 } })
  await expect(widget(page).locator('.mla-dict-definition')).toContainText('A passage.')
})

test('Reduce motion: animation stopped, colour muted', async ({ page }) => {
  await card(page, 'Reduce motion').click()
  const on = await measure(page)
  expect(on.spinning).toBe(false)
  expect(on.filter).toContain('saturate(0.5)')
})

test('Focus: reading mask, animation stopped, colour muted', async ({ page }) => {
  await card(page, 'Focus').click()
  const on = await measure(page)
  expect(on.mask).toBe(true)
  expect(on.spinning).toBe(false)
  expect(on.filter).toContain('saturate(0.5)')
})

for (const name of [
  'Low vision', 'Dyslexia', 'Colour blindness', 'Focus', 'Cognitive',
  'Reduce motion', 'Mobility', 'Read aloud',
]) {
  test(`${name}: switching it off puts the page back`, async ({ page }) => {
    const base = await measure(page)
    const button = card(page, name)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button.locator('.mla-profile-check')).toBeVisible()
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    const off = await measure(page)
    // The spinner's angle differs from moment to moment; whether it spins must not.
    expect(off).toEqual(base)
  })
}

test('choosing another profile replaces the first rather than stacking', async ({ page }) => {
  await card(page, 'Focus').click()
  await card(page, 'Low vision').click()
  await expect(card(page, 'Focus')).toHaveAttribute('aria-pressed', 'false')
  await expect(card(page, 'Low vision')).toHaveAttribute('aria-pressed', 'true')
  const on = await measure(page)
  expect(on.mask).toBe(false)
  expect(on.filter).not.toContain('saturate')
})

test('touching a single tile afterwards clears the profile mark', async ({ page }) => {
  await card(page, 'Mobility').click()
  await widget(page).getByRole('button', { name: /^Tooltips/ }).click()
  await expect(card(page, 'Mobility')).toHaveAttribute('aria-pressed', 'false')
})

test('a profile survives a reload', async ({ page }) => {
  await card(page, 'Reduce motion').click()
  await page.reload()
  const after = await measure(page)
  expect(after.spinning).toBe(false)
  expect(after.filter).toContain('saturate(0.5)')
  await widget(page).locator('.mla-trigger').click()
  await widget(page).locator('.mla-profiles-toggle').click()
  await expect(card(page, 'Reduce motion')).toHaveAttribute('aria-pressed', 'true')
})
