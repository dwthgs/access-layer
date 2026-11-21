/**
 * Read and Spell in the dictionary popover, in a real browser.
 *
 * Headless browsers often have no voices, so real speech cannot be asserted
 * on. Instead a recording engine replaces the Web Speech API before the page
 * loads: it "speaks" each utterance for a fixed time, firing start and end
 * like the real thing, and logs what it was asked to say.
 */
import { expect, test, type Page } from '@playwright/test'

const API = '**/api/rest_v1/page/definition/**'
const SPEAK_MS = 300

declare global {
  interface Window {
    __speech: { text: string; lang: string; rate: number; event: 'start' | 'end' | 'cancel' }[]
  }
}

async function installRecordingSpeech(page: Page): Promise<void> {
  await page.addInitScript((speakMs: number) => {
    window.__speech = []
    type Fake = { text: string; lang: string; rate: number; onstart?: () => void; onend?: () => void; onerror?: (e: unknown) => void }
    let queue: Fake[] = []
    let timer: ReturnType<typeof setTimeout> | undefined
    const log = (u: Fake, event: 'start' | 'end' | 'cancel') =>
      window.__speech.push({ text: u.text, lang: u.lang, rate: u.rate, event })
    const next = () => {
      const u = queue[0]
      if (!u || timer) return
      log(u, 'start')
      u.onstart?.()
      timer = setTimeout(() => {
        timer = undefined
        queue.shift()
        log(u, 'end')
        u.onend?.()
        next()
      }, speakMs)
    }
    class Utterance {
      lang = ''
      rate = 1
      onstart?: () => void
      onend?: () => void
      onerror?: (e: unknown) => void
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak(u: Fake) {
          queue.push(u)
          next()
        },
        cancel() {
          clearTimeout(timer)
          timer = undefined
          const dropped = queue
          queue = []
          for (const u of dropped) {
            log(u, 'cancel')
            u.onerror?.({ error: 'interrupted' })
          }
        },
        get speaking() {
          return queue.length > 0
        },
        getVoices: () => [],
      },
    })
  }, SPEAK_MS)
}

const widget = (page: Page) => page.locator('access-layer')
const popover = (page: Page) => widget(page).locator('.mla-dict-popover')
const readButton = (page: Page) => popover(page).getByRole('button', { name: /Read the word/ })
const spellButton = (page: Page) => popover(page).getByRole('button', { name: /Spell the word/ })

const said = (page: Page) =>
  page.evaluate(() => window.__speech.filter((e) => e.event === 'end').map((e) => e.text))

async function openDefinition(page: Page, word: string): Promise<void> {
  const box = await page.evaluate((target) => {
    const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
    const pattern = new RegExp(`\\b${target}\\b`)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const match = pattern.exec(node.textContent ?? '')
      if (!match) continue
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + target.length)
      const rect = range.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    return null
  }, word)
  if (!box) throw new Error(`"${word}" is not on the page`)
  await page.mouse.dblclick(box.x, box.y)
  await expect(popover(page).locator('.mla-dict-definition')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await installRecordingSpeech(page)
  await page.route(API, (route) =>
    route.fulfill({
      json: {
        en: [
          { partOfSpeech: 'Noun', definitions: [{ definition: 'A passage of text.' }] },
          { partOfSpeech: 'Verb', definitions: [{ definition: 'To divide into paragraphs.' }] },
        ],
      },
    }),
  )
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await widget(page).locator('.mla-trigger').click()
  await widget(page).getByRole('button', { name: /Dictionary/ }).click()
  await page.keyboard.press('Escape')
  await openDefinition(page, 'paragraph')
})

test('shows Read and Spell in the popover', async ({ page }) => {
  await expect(readButton(page)).toHaveText('Read')
  await expect(spellButton(page)).toHaveText('Spell')
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('Read speaks the word, its part of speech and the definition showing', async ({ page }) => {
  await readButton(page).click()
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  expect(await said(page)).toEqual(['paragraph', 'noun', 'A passage of text.'])

  await popover(page).getByRole('button', { name: 'Next definition' }).click()
  await readButton(page).click()
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  expect((await said(page)).slice(3)).toEqual(['paragraph', 'verb', 'To divide into paragraphs.'])
})

test('Spell says each letter in lower case, and shows nothing extra', async ({ page }) => {
  const before = await popover(page).boundingBox()
  await spellButton(page).click()
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'true')
  // No big letters drawn while spelling: the popover keeps its size.
  expect(await popover(page).boundingBox()).toEqual(before)
  await expect(popover(page).locator('.mla-dict-letter')).toHaveCount(0)
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  expect(await said(page)).toEqual(['p', 'a', 'r', 'a', 'g', 'r', 'a', 'p', 'h'])
})

test('Spell never says "capital" for a word that starts a sentence', async ({ page }) => {
  await page.route(API, (route) =>
    route.fulfill({ json: { en: [{ partOfSpeech: 'Determiner', definitions: [{ definition: 'The thing here.' }] }] } }),
  )
  await openDefinition(page, 'This')
  await spellButton(page).click()
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  expect(await said(page)).toEqual(['t', 'h', 'i', 's'])
})

test('pressing again stops', async ({ page }) => {
  await spellButton(page).click()
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'true')
  await spellButton(page).click()
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'false')
  const events = await page.evaluate(() => window.__speech)
  expect(events.some((e) => e.event === 'cancel')).toBe(true)
  expect(events.filter((e) => e.event === 'end').length).toBeLessThan(9)
})

test('switching from Read to Spell hands over cleanly', async ({ page }) => {
  await readButton(page).click()
  await spellButton(page).click()
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  expect((await said(page)).slice(-2)).toEqual(['p', 'h'])
})

test('closing the popover stops speaking', async ({ page }) => {
  await readButton(page).click()
  await page.keyboard.press('Escape')
  await expect(popover(page)).toBeHidden()
  const pending = await page.evaluate(() => window.speechSynthesis.speaking)
  expect(pending).toBe(false)
})

test('is operable from the keyboard', async ({ page, browserName }) => {
  await readButton(page).focus()
  await page.keyboard.press('Enter')
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'true')
  if (browserName === 'webkit') {
    // WebKit only tabs to buttons with macOS "Full Keyboard Access" on, which
    // the test browser does not have; Chromium and Firefox check the order.
    await spellButton(page).focus()
  } else {
    await page.keyboard.press('Tab')
  }
  await expect(spellButton(page)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(spellButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(readButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('names letters in the page language, reads definitions in English', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'es'))
  await openDefinition(page, 'paragraph')
  // The accessible names are Spanish now, so find the buttons by role in the UI.
  const spell = popover(page).locator('[data-action="spell"]')
  const read = popover(page).locator('[data-action="read"]')
  await expect(spell).toHaveText('Deletrear')
  await expect(spell).toHaveAccessibleName('Deletrear la palabra en voz alta, letra por letra')
  await expect(read).toHaveText('Leer')
  await spell.click()
  await expect(spell).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  await read.click()
  await expect(read).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
  const events = await page.evaluate(() => window.__speech.filter((e) => e.event === 'end'))
  expect(events.slice(0, 9).every((e) => e.lang === 'es')).toBe(true)
  expect(events.slice(9).every((e) => e.lang === 'en')).toBe(true)
})
