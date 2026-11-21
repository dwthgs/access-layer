/**
 * The dictionary as a visitor uses it: switch it on in the panel, then
 * double-click a word to read its definition, or drag-select one and press
 * Define.
 */
import { expect, test, type Page, type Route } from '@playwright/test'

const API = '**/api/rest_v1/page/definition/**'

function definition(text: string, partOfSpeech = 'Noun') {
  return { en: [{ partOfSpeech, definitions: [{ definition: text }] }] }
}

/** Answer lookups from a table of words; anything else is a 404. */
async function serve(page: Page, entries: Record<string, unknown>): Promise<string[]> {
  const requested: string[] = []
  await page.route(API, (route: Route) => {
    const word = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '')
    requested.push(word)
    const body = entries[word]
    return body
      ? route.fulfill({ json: body })
      : route.fulfill({ status: 404, json: { title: 'Not found.' } })
  })
  return requested
}

/** Where the first occurrence of `word` in the main content sits, scrolled into view. */
async function wordBox(page: Page, word: string) {
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
      range.startContainer.parentElement?.scrollIntoView({ block: 'center' })
      const rect = range.getBoundingClientRect()
      return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 }
    }
    return null
  }, word)
  if (!box) throw new Error(`"${word}" is not on the page`)
  return box
}

async function doubleClickWord(page: Page, word: string): Promise<void> {
  const box = await wordBox(page, word)
  await page.mouse.dblclick((box.left + box.right) / 2, box.y)
}

/** Select `word` by dragging across it, the path that shows the Define button. */
async function dragSelectWord(page: Page, word: string): Promise<void> {
  const box = await wordBox(page, word)
  await page.mouse.move(box.left + 1, box.y)
  await page.mouse.down()
  await page.mouse.move(box.right - 1, box.y, { steps: 5 })
  await page.mouse.up()
}

const widget = (page: Page) => page.locator('access-layer')
const defineButton = (page: Page) => widget(page).locator('.mla-dict-trigger')
const popover = (page: Page) => widget(page).locator('.mla-dict-popover')
/** The "paragraph (noun): A passage." line. */
const line = (page: Page) => popover(page).locator('.mla-dict-definition')
const status = (page: Page) => popover(page).locator('.mla-dict-body')

async function switchOnDictionary(page: Page): Promise<void> {
  await widget(page).locator('.mla-trigger').click()
  await widget(page).getByRole('button', { name: /Dictionary/ }).click()
  await page.keyboard.press('Escape')
}

/** The everyday path: double-click, and the definition opens. */
async function lookUp(page: Page, word: string): Promise<void> {
  await doubleClickWord(page, word)
  await expect(popover(page)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await switchOnDictionary(page)
})

test('opens the definition on double-click, without a Define button', async ({ page }) => {
  const requested = await serve(page, { paragraph: definition('A passage of <i>text</i>.') })
  await doubleClickWord(page, 'paragraph')
  await expect(popover(page)).toBeVisible()
  await expect(defineButton(page)).toBeHidden()
  await expect(line(page)).toHaveText('paragraph (noun): A passage of text.')
  await expect(popover(page).locator('.mla-dict-term')).toHaveText('paragraph (noun)')
  expect(requested).toEqual(['paragraph'])
})

test('double-clicking another word replaces the definition', async ({ page }) => {
  await serve(page, { paragraph: definition('A passage.'), exists: definition('To be.', 'Verb') })
  await lookUp(page, 'paragraph')
  await expect(line(page)).toContainText(': A passage.')
  await doubleClickWord(page, 'exists')
  await expect(line(page)).toContainText(': To be.')
})

test('a drag-selected word gets a Define button, and no request until it is pressed', async ({ page }) => {
  const requested = await serve(page, { paragraph: definition('A passage.') })
  await dragSelectWord(page, 'paragraph')
  await expect(defineButton(page)).toBeVisible()
  await expect(popover(page)).toBeHidden()
  expect(requested).toEqual([])
  await defineButton(page).click()
  await expect(line(page)).toContainText(': A passage.')
  expect(requested).toEqual(['paragraph'])
})

test('looks up a sentence-initial word in lower case', async ({ page }) => {
  const requested = await serve(page, { this: definition('The thing here.', 'Determiner') })
  await lookUp(page, 'This')
  await expect(line(page)).toContainText(': The thing here.')
  expect(requested[0]).toBe('this')
})

test('never shows the CSS Wiktionary embeds', async ({ page }) => {
  await serve(page, {
    paragraph: definition('A passage.<style>.mw-parser-output .defdate{font-size:smaller}</style>'),
  })
  await lookUp(page, 'paragraph')
  await expect(line(page)).toContainText(': A passage.')
  await expect(popover(page)).not.toContainText('mw-parser-output')
})

test('says when a word has no entry', async ({ page }) => {
  await serve(page, {})
  await lookUp(page, 'paragraph')
  await expect(status(page)).toHaveText('No definition found.')
})

test('says when the service is down', async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ status: 503, body: 'Service Unavailable' }))
  await lookUp(page, 'paragraph')
  await expect(status(page)).toHaveText('The dictionary could not be reached.')
})

test('says when the network fails', async ({ page }) => {
  await page.route(API, (route) => route.abort('internetdisconnected'))
  await lookUp(page, 'paragraph')
  await expect(status(page)).toHaveText('The dictionary could not be reached.')
})

test('gives up on a request that never answers', async ({ page }) => {
  test.slow()
  await page.route(API, () => {
    /* never fulfilled */
  })
  await lookUp(page, 'paragraph')
  await expect(status(page)).toHaveText('Looking up…')
  await expect(status(page)).toHaveText('The dictionary could not be reached.', { timeout: 12_000 })
})

test('recovers when the first request hangs, as Wiktionary sometimes does', async ({ page }) => {
  let calls = 0
  await page.route(API, (route) => {
    calls++
    if (calls === 1) return // left hanging, never answered
    return route.fulfill({ json: definition('A passage.') })
  })
  const started = Date.now()
  await lookUp(page, 'paragraph')
  await expect(line(page)).toHaveText('paragraph (noun): A passage.')
  expect(calls).toBe(2)
  // Well inside the 8-second deadline the visitor used to sit through.
  expect(Date.now() - started).toBeLessThan(5_000)
})

test('recovers from a server error', async ({ page }) => {
  let calls = 0
  await page.route(API, (route) =>
    ++calls === 1
      ? route.fulfill({ status: 503, body: 'Service Unavailable' })
      : route.fulfill({ json: definition('A passage.') }),
  )
  await lookUp(page, 'paragraph')
  await expect(line(page)).toHaveText('paragraph (noun): A passage.')
})

test('stays open while the visitor reads and clicks inside it', async ({ page }) => {
  await serve(page, { paragraph: definition('A long definition. '.repeat(12)) })
  await lookUp(page, 'paragraph')
  await line(page).click()
  await expect(popover(page)).toBeVisible()
  // Selecting the definition's text, to copy it, must not close it either.
  await line(page).dblclick()
  await expect(popover(page)).toBeVisible()
})

test('closes on Escape and on a click elsewhere on the page', async ({ page }) => {
  await serve(page, { paragraph: definition('A passage.') })
  await lookUp(page, 'paragraph')
  await page.keyboard.press('Escape')
  await expect(popover(page)).toBeHidden()

  await lookUp(page, 'paragraph')
  await page.locator('header h1').click()
  await expect(popover(page)).toBeHidden()
})

test('looks up a word typed in the search box', async ({ page }) => {
  const requested = await serve(page, {
    paragraph: definition('A passage.'),
    invitation: definition('The act of inviting.'),
  })
  await lookUp(page, 'paragraph')
  const box = popover(page).getByRole('searchbox', { name: 'Word to look up' })
  await expect(box).toHaveValue('paragraph')
  await box.fill('Invitation')
  await box.press('Enter')
  await expect(line(page)).toHaveText('invitation (noun): The act of inviting.')
  await expect(box).toHaveValue('Invitation')
  await expect(box).toBeFocused()
  expect(requested).toEqual(['paragraph', 'invitation'])
})

test('the magnifier button searches too', async ({ page }) => {
  await serve(page, { paragraph: definition('A passage.'), grace: definition('Favour.') })
  await lookUp(page, 'paragraph')
  await popover(page).getByRole('searchbox').fill('grace')
  await popover(page).getByRole('button', { name: 'Look up' }).click()
  await expect(line(page)).toHaveText('grace (noun): Favour.')
})

test('shows the base word for "plural of"', async ({ page }) => {
  await page.evaluate(() =>
    document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<p>Send the invitations today.</p>'),
  )
  await serve(page, {
    invitations: {
      en: [
        {
          partOfSpeech: 'Noun',
          definitions: [
            {
              definition:
                '<span class="form-of-definition">plural of <span class="form-of-definition-link"><i><a rel="mw:WikiLink" href="/wiki/invitation#English" title="invitation">invitation</a></i></span></span>',
            },
          ],
        },
      ],
    },
    invitation: definition('The act of inviting.'),
  })
  await lookUp(page, 'invitations')
  await expect(line(page)).toHaveText('invitations (noun): The act of inviting.')
})

test('pages through several senses', async ({ page }) => {
  await serve(page, {
    paragraph: {
      en: [
        { partOfSpeech: 'Noun', definitions: [{ definition: 'A passage.' }, { definition: 'A mark.' }] },
        { partOfSpeech: 'Verb', definitions: [{ definition: 'To divide.' }] },
      ],
    },
  })
  await lookUp(page, 'paragraph')
  const previous = popover(page).getByRole('button', { name: 'Previous definition' })
  const next = popover(page).getByRole('button', { name: 'Next definition' })
  const count = popover(page).locator('.mla-dict-count')
  await expect(count).toHaveText('1 of 3')
  await expect(previous).toBeDisabled()
  await next.click()
  await expect(count).toHaveText('2 of 3')
  await expect(line(page)).toHaveText('paragraph (noun): A mark.')
  await next.click()
  await expect(line(page)).toHaveText('paragraph (verb): To divide.')
  await expect(next).toBeDisabled()
  await previous.click()
  await expect(count).toHaveText('2 of 3')
})

test('lays out like UserWay: Read and Spell on the left, the pager on the right', async ({ page }) => {
  await serve(page, {
    paragraph: { en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'A passage.' }, { definition: 'A mark.' }] }] },
  })
  await lookUp(page, 'paragraph')
  const read = await popover(page).locator('[data-action="read"]').boundingBox()
  const spell = await popover(page).locator('[data-action="spell"]').boundingBox()
  const pager = await popover(page).locator('.mla-dict-pager').boundingBox()
  const search = await popover(page).locator('.mla-dict-search').boundingBox()
  const text = await line(page).boundingBox()
  // Search box, then the definition, then one row of controls.
  expect(search!.y).toBeLessThan(text!.y)
  expect(text!.y + text!.height).toBeLessThanOrEqual(read!.y)
  expect(Math.abs(read!.y - spell!.y)).toBeLessThan(2)
  expect(Math.abs(read!.y + read!.height / 2 - (pager!.y + pager!.height / 2))).toBeLessThan(4)
  expect(read!.x).toBeLessThan(spell!.x)
  expect(spell!.x + spell!.width).toBeLessThan(pager!.x)
})

test('keeps working after the site changes the page language', async ({ page }) => {
  // Regression: the panel rebuild on a language change orphaned the Define
  // button, so the dictionary vanished on any site that sets <html lang>.
  await serve(page, { paragraph: definition('A passage.') })
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'es'))
  await lookUp(page, 'paragraph')
  await expect(line(page)).toContainText(': A passage.')
  await page.keyboard.press('Escape')
  await dragSelectWord(page, 'paragraph')
  await expect(defineButton(page)).toHaveText('Definir')
})

test('stays on after a reload', async ({ page }) => {
  await serve(page, { paragraph: definition('A passage.') })
  await page.reload()
  await lookUp(page, 'paragraph')
  await expect(line(page)).toContainText(': A passage.')
})

test('goes away when switched off', async ({ page }) => {
  const requested = await serve(page, {})
  await switchOnDictionary(page) // the tile toggles, so this is "off"
  await doubleClickWord(page, 'paragraph')
  await expect(defineButton(page)).toHaveCount(0)
  await expect(popover(page)).toHaveCount(0)
  expect(requested).toEqual([])
})

test('reaches the real Wiktionary API', async ({ page }) => {
  test.skip(!process.env.DICTIONARY_LIVE, 'set DICTIONARY_LIVE=1 to hit the live service')
  await lookUp(page, 'paragraph')
  await expect(line(page)).toContainText(/passage/i, { timeout: 10_000 })
})
