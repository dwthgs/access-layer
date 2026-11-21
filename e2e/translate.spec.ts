/**
 * Picking a language translates the page, as UserWay does. Both engines are
 * replaced with stand-ins so the suite is deterministic offline; set
 * TRANSLATE_LIVE=1 to add a test against Google's real website translator.
 */
import { expect, test, type Page } from '@playwright/test'

const widget = (page: Page) => page.locator('access-layer')
const toggle = (page: Page) => widget(page).locator('.mla-lang-toggle')

/** Open the list, search for the language, and click it, as a visitor would. */
async function pick(page: Page, native: string) {
  if ((await toggle(page).getAttribute('aria-expanded')) !== 'true') await toggle(page).click()
  await widget(page).getByRole('combobox').fill(native)
  await widget(page).getByRole('option', { name: new RegExp(`^${native}( \\(|$)`) }).click()
}
/** The page's own language, first in the list: puts the original back. */
const restore = (page: Page) => pick(page, 'English')
const status = (page: Page) => widget(page).locator('.mla-translate-status')
const heading = (page: Page) => page.getByRole('heading', { level: 2 }).first()

/** A browser translator that tags text, or one that never answers. */
async function deviceTranslator(page: Page, mode: 'works' | 'hangs' | 'absent') {
  await page.addInitScript((mode) => {
    if (mode === 'absent') {
      Object.defineProperty(window, 'Translator', { value: undefined, configurable: true })
      return
    }
    const never = new Promise(() => undefined)
    Object.defineProperty(window, 'Translator', {
      configurable: true,
      value: {
        availability: () => (mode === 'hangs' ? never : Promise.resolve('available')),
        create: async ({ targetLanguage }: { targetLanguage: string }) => ({
          translate: async (text: string) => `«${targetLanguage}» ${text}`,
          destroy() {},
        }),
      },
    })
  }, mode)
}

/** Google's website translator, answered by a stand-in script. */
async function fakeGoogle(page: Page): Promise<{ loads: () => number }> {
  let loads = 0
  await page.route('https://translate.google.com/translate_a/element.js*', (route) => {
    loads++
    return route.fulfill({
      contentType: 'text/javascript',
      body: `
        window.google = { translate: { TranslateElement: function (opts, id) {
          var box = document.getElementById(id)
          var select = document.createElement('select'); select.className = 'goog-te-combo'; box.appendChild(select)
          setTimeout(function () { ['', 'es', 'fr', 'de', 'iw'].forEach(function (c) { var o = document.createElement('option'); o.value = c; select.appendChild(o) }) }, 50)
          var originals = new Map()
          select.addEventListener('change', function () {
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
            var n
            while ((n = walker.nextNode())) {
              if (!n.data.trim() || n.parentElement.closest('.notranslate, script, style, access-layer')) continue
              if (!originals.has(n)) originals.set(n, n.data)
              n.data = '{' + select.value + '} ' + originals.get(n)
            }
            document.documentElement.classList.add('translated-ltr')
            document.documentElement.lang = select.value
            document.body.style.top = '40px'
          })
          var bar = document.createElement('iframe'); bar.className = 'skiptranslate'; bar.style.height = '40px'; document.body.prepend(bar)
          var restore = bar.contentDocument.createElement('button'); restore.id = ':1.restore'
          restore.addEventListener('click', function () {
            originals.forEach(function (text, node) { node.data = text }); originals.clear()
            document.documentElement.classList.remove('translated-ltr')
            document.documentElement.lang = opts.pageLanguage
          })
          bar.contentDocument.body.appendChild(restore)
        } } }
        window.__accessLayerGoogleReady && window.__accessLayerGoogleReady()
      `,
    })
  })
  return { loads: () => loads }
}

/** A site that sets the Google fallback explicitly; it is also the default. */
async function googleSite(page: Page) {
  await page.route('**/demo/fixture.html', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace('data-access-layer ', 'data-access-layer data-translate-fallback="google" ')
    await route.fulfill({ response, body })
  })
}

/** A site that turns the Google fallback off, as a checkout page should. */
async function noGoogleSite(page: Page) {
  await page.route('**/demo/fixture.html', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace('data-access-layer ', 'data-access-layer data-translate-fallback="off" ')
    await route.fulfill({ response, body })
  })
}

async function open(page: Page) {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await widget(page).locator('.mla-trigger').click()
}

test.describe('on the device', () => {
  test.beforeEach(async ({ page }) => {
    await deviceTranslator(page, 'works')
    await fakeGoogle(page)
    await open(page)
  })

  test('translates the page when a language is picked', async ({ page }) => {
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('«fr» Readable content')
    await expect(status(page)).toHaveText('Page translated on this device.')
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('fr')
  })

  test('the picker is labelled for assistive technology', async ({ page }) => {
    await expect(toggle(page)).toHaveAccessibleName('Language: English')
    await toggle(page).click()
    await expect(widget(page).getByRole('combobox')).toHaveAccessibleName('Search language')
    await expect(widget(page).getByRole('listbox')).toHaveAccessibleName('Language')
  })

  test('can be used with the keyboard alone', async ({ page }) => {
    await toggle(page).focus()
    await page.keyboard.press('Enter')
    await expect(widget(page).getByRole('combobox')).toBeFocused()
    await page.keyboard.type('deut')
    await page.keyboard.press('Enter')
    await expect(heading(page)).toHaveText('«de» Readable content')
    await expect(toggle(page)).toBeFocused()
    await expect(toggle(page)).toHaveAccessibleName('Language: Deutsch (German)')
  })

  test('looks like UserWay: badge and name in the header, search, then the list', async ({ page }) => {
    await expect(toggle(page).locator('.mla-lang-badge')).toHaveText('EN')
    await toggle(page).click()
    await expect(widget(page).getByRole('combobox')).toHaveAttribute('placeholder', 'Search language')
    const first = widget(page).getByRole('option').first()
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await expect(first.locator('.mla-lang-check')).toBeVisible()
    await expect(widget(page).getByRole('option', { name: 'Català (Catalan)' })).toBeVisible()
  })

  test('leaves the widget in its own language', async ({ page }) => {
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('«fr» Readable content')
    await expect(widget(page).locator('.mla-title')).toHaveText('Accessibility menu')
  })

  test('translates the widget too where it has that language', async ({ page }) => {
    await pick(page, 'Español')
    await expect(heading(page)).toHaveText('«es» Readable content')
    await expect(widget(page).locator('.mla-title')).toHaveText('Menú de accesibilidad')
  })

  test('Automatic puts the original page back', async ({ page }) => {
    const before = await page.locator('main').innerHTML()
    await pick(page, 'Deutsch')
    await expect(heading(page)).toHaveText('«de» Readable content')
    await restore(page)
    await expect(heading(page)).toHaveText('Readable content')
    expect(await page.locator('main').innerHTML()).toBe(before)
  })

  test('keeps the page translated on the next visit', async ({ page }) => {
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('«fr» Readable content')
    await page.reload()
    await expect(heading(page)).toHaveText('«fr» Readable content')
  })

  test('translates content that loads later', async ({ page }) => {
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('«fr» Readable content')
    await page.evaluate(() => {
      const p = document.createElement('p')
      p.id = 'late'
      p.textContent = 'Welcome back'
      document.querySelector('main')!.prepend(p)
    })
    await expect(page.locator('#late')).toHaveText('«fr» Welcome back')
  })

  test('never sends Google anything', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('«fr» Readable content')
    expect(requests.some((url) => url.includes('google'))).toBe(false)
  })
})

test.describe('with Google', () => {
  test('is the fallback where the browser has no translator', async ({ page }) => {
    await deviceTranslator(page, 'absent')
    const google = await fakeGoogle(page)
    await googleSite(page)
    await open(page)
    expect(google.loads()).toBe(0) // nothing loads until a language is picked
    await pick(page, 'Español')
    await expect(heading(page)).toHaveText('{es} Readable content')
    await expect(status(page)).toHaveText('Página traducida por Google.')
    expect(google.loads()).toBe(1)
  })

  test("hides Google's bar and does not push the page down", async ({ page }) => {
    await deviceTranslator(page, 'absent')
    await fakeGoogle(page)
    await googleSite(page)
    await open(page)
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('{fr} Readable content')
    await expect(page.locator('iframe.skiptranslate')).toBeHidden()
    expect(await page.evaluate(() => getComputedStyle(document.body).top)).toBe('0px')
  })

  test('keeps code samples as they are', async ({ page }) => {
    await deviceTranslator(page, 'absent')
    await fakeGoogle(page)
    await googleSite(page)
    await open(page)
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('{fr} Readable content')
    await expect(page.locator('main code').first()).toHaveText('font-size: 20px !important')
  })

  test('Automatic restores the original', async ({ page }) => {
    await deviceTranslator(page, 'absent')
    await fakeGoogle(page)
    await googleSite(page)
    await open(page)
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('{fr} Readable content')
    await restore(page)
    await expect(heading(page)).toHaveText('Readable content')
    expect(await page.evaluate(() => document.documentElement.className)).toBe('')
  })

  test('takes over when the browser translator never answers', async ({ page }) => {
    await deviceTranslator(page, 'hangs')
    await fakeGoogle(page)
    await googleSite(page)
    await open(page)
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('{fr} Readable content', { timeout: 10_000 })
    await expect(status(page)).toHaveText('Page translated by Google.')
  })

  test('the real Google translator, end to end', async ({ page }) => {
    test.skip(!process.env.TRANSLATE_LIVE, 'set TRANSLATE_LIVE=1 to use the live service')
    test.slow()
    await deviceTranslator(page, 'absent')
    await googleSite(page)
    await open(page)
    await pick(page, 'Español')
    await expect(heading(page)).toHaveText(/contenido/i, { timeout: 20_000 })
    await expect(page.locator('iframe.skiptranslate').first()).toBeHidden()
    await restore(page)
    await expect(heading(page)).toHaveText('Readable content', { timeout: 10_000 })
  })

  test('is never loaded where the site turns it off', async ({ page }) => {
    await deviceTranslator(page, 'absent')
    const google = await fakeGoogle(page)
    await noGoogleSite(page)
    await open(page)
    await pick(page, 'Français')
    await expect(status(page)).toHaveText('This browser cannot translate this page.')
    expect(google.loads()).toBe(0)
  })

  test('keeps the page translated on the next visit, in a new session', async ({ page, context }) => {
    await deviceTranslator(page, 'absent')
    const google = await fakeGoogle(page)
    await googleSite(page)
    await open(page)
    await pick(page, 'Français')
    await expect(heading(page)).toHaveText('{fr} Readable content')
    const saved = await page.evaluate(() => localStorage.getItem('access-layer:v1'))
    const next = await context.newPage() // a new tab: its own session, same saved settings
    await deviceTranslator(next, 'absent')
    const nextGoogle = await fakeGoogle(next)
    await googleSite(next)
    await next.addInitScript((value) => localStorage.setItem('access-layer:v1', value!), saved)
    await next.goto('/demo/fixture.html')
    await expect(heading(next)).toHaveText('{fr} Readable content')
    expect(nextGoogle.loads()).toBe(1)
    expect(google.loads()).toBe(1)
  })
})
