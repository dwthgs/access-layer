/**
 * The dictionary feature end to end inside the widget: select a word, press
 * Define, and see what the visitor sees. `fetch` is stubbed so these run
 * offline and can simulate the failures the live service produces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'
import { HEDGE_AFTER_MS, MAX_ATTEMPTS, REQUEST_TIMEOUT_MS } from '../src/features/dictionary'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function wiktionary(definition: string, partOfSpeech = 'Noun') {
  return { en: [{ partOfSpeech, definitions: [{ definition }] }] }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Select `word` in the page and let the widget notice, as a mouse would.
 * `clicks: 2` is the second mouseup of a double-click; the default is a
 * drag-selection, which reports no click count.
 */
function select(word: string, clicks = 0): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const index = node.textContent?.indexOf(word) ?? -1
    if (index < 0) continue
    const range = document.createRange()
    range.setStart(node, index)
    range.setEnd(node, index + word.length)
    getSelection()?.removeAllRanges()
    getSelection()?.addRange(range)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, detail: clicks }))
    return
  }
  throw new Error(`"${word}" is not on the page`)
}

function trigger(element: AccessLayerElement): HTMLButtonElement {
  return element.shadowRoot?.querySelector('.mla-dict-trigger') as HTMLButtonElement
}
function popover(element: AccessLayerElement): HTMLElement {
  return element.shadowRoot?.querySelector('.mla-dict-popover') as HTMLElement
}
/** "grace (noun)", the bold part of the definition line. */
function termOf(pop: HTMLElement): string | null | undefined {
  return pop.querySelector('.mla-dict-term')?.textContent
}
/** The definition itself, after "grace (noun): ". */
function definitionOf(pop: HTMLElement): string | undefined {
  const line = pop.querySelector('.mla-dict-definition')?.textContent
  return line?.slice(line.indexOf(': ') + 2)
}
/** The popover's status or definition, without the search box. */
function bodyText(pop: HTMLElement): string | null | undefined {
  return pop.querySelector('.mla-dict-body')?.textContent
}
function isVisible(el: Element | null | undefined): boolean {
  return !!el?.classList.contains('is-visible')
}

async function define(element: AccessLayerElement, word: string): Promise<HTMLElement> {
  select(word)
  trigger(element).click()
  await flush()
  await flush()
  return popover(element)
}

let fetchMock: ReturnType<typeof vi.fn>
let element: AccessLayerElement

beforeEach(() => {
  localStorage.clear()
  document.documentElement.setAttribute('lang', 'en')
  document.body.innerHTML =
    '<main><p>Sanctuary is a word. The grace of NASA and a sanctuary.</p></main>'
  // happy-dom does no layout, so every range measures 0×0, which the feature
  // (correctly) treats as "nothing visible selected". Give it a real box.
  vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 40, y: 40, width: 60, height: 18 }),
  )
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  element = mount()
  element.settings.set({ dictionary: true })
})

afterEach(() => {
  unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('lang')
})

describe('double-clicking a word', () => {
  it('opens the definition without the Define button', async () => {
    fetchMock.mockResolvedValue(json(wiktionary('Free favour.')))
    select('grace', 2)
    expect(isVisible(trigger(element))).toBe(false)
    expect(isVisible(popover(element))).toBe(true)
    expect(bodyText(popover(element))).toBe('Looking up…')
    await flush()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(definitionOf(popover(element))).toBe('Free favour.')
  })

  it('uses the same spelling rules as Define', async () => {
    fetchMock.mockResolvedValue(json(wiktionary('A place of safety.')))
    select('Sanctuary', 2)
    await flush()
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/sanctuary$/)
  })

  it('replaces an open definition with the new word', async () => {
    fetchMock
      .mockResolvedValueOnce(json(wiktionary('Free favour.')))
      .mockResolvedValueOnce(json(wiktionary('A sacred place.')))
    select('grace', 2)
    await flush()
    await flush()
    select('sanctuary', 2)
    await flush()
    await flush()
    expect(definitionOf(popover(element))).toBe('A sacred place.')
  })

  it('does nothing while the feature is off', () => {
    element.settings.set({ dictionary: false })
    select('grace', 2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores a double-click inside the popover', async () => {
    fetchMock.mockResolvedValue(json(wiktionary('Free favour.')))
    select('grace', 2)
    await flush()
    await flush()
    popover(element).querySelector('.mla-dict-definition')?.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, composed: true, detail: 2 }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(isVisible(popover(element))).toBe(true)
  })
})

describe('the Define button, for a word selected by dragging', () => {
  it('appears for a single selected word', () => {
    select('grace')
    expect(isVisible(trigger(element))).toBe(true)
    expect(trigger(element).dataset.word).toBe('grace')
  })

  it('does not appear for a phrase', () => {
    select('a word')
    expect(isVisible(trigger(element))).toBe(false)
  })

  it('does not appear while the feature is off', () => {
    element.settings.set({ dictionary: false })
    select('grace')
    expect(trigger(element)).toBeNull()
  })

  it('makes no request until it is pressed', () => {
    select('grace')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('looking a word up', () => {
  it('shows the definition, as text', async () => {
    fetchMock.mockResolvedValue(json(wiktionary('Free <b>favour</b> from God.')))
    const pop = await define(element, 'grace')
    expect(isVisible(pop)).toBe(true)
    expect(termOf(pop)).toBe('grace (noun)')
    expect(definitionOf(pop)).toBe('Free favour from God.')
    expect(pop.querySelector('b')).toBeNull()
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://en.wiktionary.org/api/rest_v1/page/definition/grace',
    )
  })

  it('looks a capitalised word up in lower case first', async () => {
    // Regression: "Sanctuary" at the start of a sentence was a 404.
    fetchMock.mockResolvedValue(json(wiktionary('A place of safety.')))
    const pop = await define(element, 'Sanctuary')
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/sanctuary$/)
    expect(termOf(pop)).toBe('sanctuary (noun)')
  })

  it('falls back to the original spelling for a proper noun', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json(wiktionary('A place in England.', 'Proper noun')))
    const pop = await define(element, 'Sanctuary')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/\/Sanctuary$/)
    expect(definitionOf(pop)).toBe('A place in England.')
  })

  it('keeps an acronym as written', async () => {
    fetchMock.mockResolvedValue(json(wiktionary('A space agency.', 'Proper noun')))
    await define(element, 'NASA')
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/NASA$/)
  })

  it('never shows the stylesheet Wiktionary embeds', async () => {
    fetchMock.mockResolvedValue(
      json(wiktionary('As an object.<style>.mw-parser-output .defdate{font-size:smaller}</style>')),
    )
    const pop = await define(element, 'grace')
    expect(bodyText(pop)).not.toContain('mw-parser-output')
    expect(definitionOf(pop)).toBe('As an object.')
  })

  it('says so when no spelling has an entry', async () => {
    fetchMock.mockResolvedValue(json({}, 404))
    const pop = await define(element, 'Sanctuary')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(bodyText(pop)).toBe('No definition found.')
  })

  it('reports an outage as an outage, not as a missing word', async () => {
    fetchMock.mockResolvedValue(json({}, 503))
    const pop = await define(element, 'grace')
    expect(bodyText(pop)).toBe('The dictionary could not be reached.')
  })

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const pop = await define(element, 'grace')
    expect(bodyText(pop)).toBe('The dictionary could not be reached.')
  })

  it('treats an unreadable response as not found', async () => {
    fetchMock.mockResolvedValue(json({ unexpected: true }))
    const pop = await define(element, 'grace')
    expect(bodyText(pop)).toBe('No definition found.')
  })

  it('gives up after the deadline instead of loading forever', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    )
    select('grace')
    trigger(element).click()
    expect(bodyText(popover(element))).toBe('Looking up…')
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 10)
    expect(bodyText(popover(element))).toBe('The dictionary could not be reached.')
  })

  it('shows only the newest lookup when two overlap', async () => {
    let releaseFirst: (response: Response) => void = () => {}
    fetchMock
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            releaseFirst = resolve
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          }),
      )
      .mockResolvedValueOnce(json(wiktionary('A sacred place.')))
    select('grace')
    trigger(element).click()
    const pop = await define(element, 'sanctuary')
    releaseFirst(json(wiktionary('Stale definition.')))
    await flush()
    expect(definitionOf(pop)).toBe('A sacred place.')
  })
})

describe('the popover', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(json(wiktionary('Free favour.')))
  })

  it('stays open when clicked inside', async () => {
    // Regression: a click in the popover collapsed the page selection, and
    // the mouseup that followed closed the popover before it could be read.
    const pop = await define(element, 'grace')
    getSelection()?.removeAllRanges()
    pop.querySelector('.mla-dict-definition')?.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, composed: true }),
    )
    expect(isVisible(pop)).toBe(true)
  })

  it('closes on Escape', async () => {
    const pop = await define(element, 'grace')
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
    expect(isVisible(pop)).toBe(false)
  })

  it('closes when the selection goes away', async () => {
    const pop = await define(element, 'grace')
    getSelection()?.removeAllRanges()
    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(isVisible(pop)).toBe(false)
  })

  it('is removed when the feature is switched off', async () => {
    await define(element, 'grace')
    element.settings.set({ dictionary: false })
    expect(popover(element)).toBeNull()
    expect(trigger(element)).toBeNull()
  })
})

describe('after the page language changes', () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

  it('still offers Define, in the new language', async () => {
    // Regression: the panel rebuild on a language change replaced the overlay
    // layer and left the dictionary drawing into the detached old one, so it
    // disappeared on any site that sets <html lang> after load.
    document.documentElement.setAttribute('lang', 'es')
    await settle()
    select('grace')
    expect(trigger(element)?.isConnected).toBe(true)
    expect(isVisible(trigger(element))).toBe(true)
    expect(trigger(element).textContent).toBe('Definir')
  })

  it('still looks words up', async () => {
    fetchMock.mockResolvedValue(json(wiktionary('Free favour.')))
    document.documentElement.setAttribute('lang', 'es')
    await settle()
    const pop = await define(element, 'grace')
    expect(pop.isConnected).toBe(true)
    expect(definitionOf(pop)).toBe('Free favour.')
  })

  it('keeps tooltips and the reading mask in the live layer too', async () => {
    element.settings.set({ tooltips: true, cursor: 'mask' })
    document.documentElement.setAttribute('lang', 'es')
    await settle()
    expect(element.shadowRoot?.querySelector('.mla-tooltip')?.isConnected).toBe(true)
    expect(element.shadowRoot?.querySelector('.mla-mask')?.isConnected).toBe(true)
    expect(element.shadowRoot?.querySelectorAll('.mla-dict-trigger')).toHaveLength(1)
  })
})

describe('configuration', () => {
  it('uses the endpoint from dictionary-url', async () => {
    unmount()
    element = mount({ dictionaryUrl: 'https://proxy.example/define/' })
    element.settings.set({ dictionary: true })
    fetchMock.mockResolvedValue(json(wiktionary('Free favour.')))
    await define(element, 'grace')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://proxy.example/define/grace')
  })
})

/**
 * A stand-in for the Web Speech API that queues utterances and lets a test
 * play them one at a time. `cancel()` fires `error` on everything still
 * queued, as Chrome does, which is what the generation guard exists for.
 */
class FakeUtterance {
  rate = 1
  lang = ''
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {}
}

function fakeSpeech() {
  const synth = {
    queue: [] as FakeUtterance[],
    spoken: [] as FakeUtterance[],
    cancels: 0,
    speak(utterance: FakeUtterance) {
      synth.queue.push(utterance)
    },
    cancel() {
      synth.cancels++
      const dropped = synth.queue
      synth.queue = []
      for (const utterance of dropped) utterance.onerror?.({ error: 'interrupted' })
    },
    /** Start the next utterance; pass `finish: false` to leave it mid-speech. */
    play(finish = true): FakeUtterance {
      const utterance = synth.queue[0]
      if (!utterance) throw new Error('nothing queued')
      utterance.onstart?.()
      if (finish) {
        synth.queue.shift()
        synth.spoken.push(utterance)
        utterance.onend?.()
      }
      return utterance
    },
    getVoices: () => [],
    playAll() {
      while (synth.queue.length) synth.play()
    },
  }
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  return synth
}

describe('read and spell', () => {
  let synth: ReturnType<typeof fakeSpeech>

  const action = (kind: 'read' | 'spell') =>
    popover(element).querySelector(`[data-action="${kind}"]`) as HTMLButtonElement
  const pressed = (kind: 'read' | 'spell') => action(kind).getAttribute('aria-pressed')
  const page = (which: 'previous' | 'next') =>
    popover(element).querySelector(`[data-page="${which}"]`) as HTMLButtonElement

  beforeEach(() => {
    synth = fakeSpeech()
    // A fresh Response per call: a body can only be read once.
    fetchMock.mockImplementation(async () =>
      json({
        en: [
          { partOfSpeech: 'Noun', definitions: [{ definition: 'Free favour.' }, { definition: 'Elegance.' }] },
          { partOfSpeech: 'Verb', definitions: [{ definition: 'To adorn.' }] },
        ],
      }),
    )
  })

  it('offers both, labelled for assistive technology', async () => {
    await define(element, 'grace')
    expect(action('read').textContent).toBe('Read')
    expect(action('read').getAttribute('aria-label')).toBe('Read the word and its definitions aloud')
    expect(action('spell').textContent).toBe('Spell')
    expect(action('spell').getAttribute('aria-label')).toBe('Spell the word aloud, letter by letter')
    expect(pressed('read')).toBe('false')
    expect(pressed('spell')).toBe('false')
  })

  it('leaves them out where the browser cannot speak', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    const pop = await define(element, 'grace')
    expect(pop.querySelector('.mla-dict-action')).toBeNull()
    expect(definitionOf(pop)).toBe('Free favour.')
  })

  describe('Read', () => {
    it('reads the word, its part of speech and the definition on screen', async () => {
      await define(element, 'grace')
      action('read').click()
      expect(pressed('read')).toBe('true')
      synth.playAll()
      expect(synth.spoken.map((u) => u.text)).toEqual(['grace', 'noun', 'Free favour.'])
      expect(pressed('read')).toBe('false')
    })

    it('reads whichever sense is showing', async () => {
      await define(element, 'grace')
      page('next').click()
      page('next').click()
      action('read').click()
      synth.playAll()
      expect(synth.spoken.map((u) => u.text)).toEqual(['grace', 'verb', 'To adorn.'])
    })

    it('reads English definitions with an English voice on any page', async () => {
      document.documentElement.setAttribute('lang', 'es')
      await new Promise((resolve) => setTimeout(resolve, 50))
      await define(element, 'grace')
      action('read').click()
      expect(synth.queue.every((u) => u.lang === 'en')).toBe(true)
    })

    it("follows the visitor's reading speed", async () => {
      element.settings.set({ readerRate: 1.5 })
      await define(element, 'grace')
      action('read').click()
      expect(synth.queue[0]?.rate).toBe(1.5)
    })

    it('stops when pressed again', async () => {
      await define(element, 'grace')
      action('read').click()
      synth.play(false)
      action('read').click()
      expect(synth.cancels).toBeGreaterThan(0)
      expect(synth.queue).toHaveLength(0)
      expect(pressed('read')).toBe('false')
    })
  })

  describe('Spell', () => {
    it('says each letter in lower case, and nothing else', async () => {
      await define(element, 'grace')
      action('spell').click()
      expect(pressed('spell')).toBe('true')
      synth.playAll()
      expect(synth.spoken.map((u) => u.text)).toEqual(['g', 'r', 'a', 'c', 'e'])
      expect(pressed('spell')).toBe('false')
    })

    it('never says "capital", even for a capitalised word', async () => {
      // Engines announce an upper-case letter as "capital S". The visitor
      // double-clicked a word that starts a sentence; that is not spelling.
      fetchMock.mockImplementation(async () => json({}, 404))
      fetchMock
        .mockImplementationOnce(async () => json({}, 404))
        .mockImplementationOnce(async () => json(wiktionary('A place in England.', 'Proper noun')))
      await define(element, 'Sanctuary')
      action('spell').click()
      const said = synth.queue.map((u) => u.text)
      expect(said.join('')).toBe('sanctuary')
      expect(said.every((letter) => letter === letter.toLowerCase())).toBe(true)
    })

    it('draws nothing extra on screen while spelling', async () => {
      await define(element, 'grace')
      const before = popover(element).innerHTML
      action('spell').click()
      synth.play(false)
      expect(popover(element).querySelector('.mla-dict-letters, .mla-dict-letter')).toBeNull()
      expect(popover(element).innerHTML.replace(/aria-pressed="\w+"/g, '')).toBe(
        before.replace(/aria-pressed="\w+"/g, ''),
      )
    })

    it('is a little slower than reading', async () => {
      await define(element, 'grace')
      action('spell').click()
      expect(synth.queue[0]?.rate).toBeCloseTo(0.85)
    })

    it('names the letters in the page language', async () => {
      document.documentElement.setAttribute('lang', 'es')
      await new Promise((resolve) => setTimeout(resolve, 50))
      await define(element, 'grace')
      expect(action('spell').textContent).toBe('Deletrear')
      expect(action('read').textContent).toBe('Leer')
      action('spell').click()
      expect(synth.queue.every((u) => u.lang === 'es')).toBe(true)
    })

    it('names punctuation that engines would skip', async () => {
      document.querySelector('main')?.insertAdjacentHTML('beforeend', '<p>A well-known phrase.</p>')
      await define(element, 'well-known')
      action('spell').click()
      expect(synth.queue.map((u) => u.text).slice(0, 5)).toEqual(['w', 'e', 'l', 'l', 'hyphen'])
    })
  })

  it('switching from Read to Spell leaves Spell in charge', async () => {
    // Cancelling Read fires its utterances' error events; without the
    // generation guard those reset the button state of the Spell just started.
    await define(element, 'grace')
    action('read').click()
    synth.play(false)
    action('spell').click()
    expect(pressed('read')).toBe('false')
    expect(pressed('spell')).toBe('true')
    expect(synth.queue.map((u) => u.text)).toEqual(['g', 'r', 'a', 'c', 'e'])
  })

  it('Escape closes the popover and stops speech with focus on Read', async () => {
    // Regression: the guard that ignores events from inside the popover also
    // swallowed Escape, so it did nothing once focus was on Read or Spell.
    await define(element, 'grace')
    action('read').click()
    synth.play(false)
    action('read').dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, composed: true }),
    )
    expect(isVisible(popover(element))).toBe(false)
    expect(synth.queue).toHaveLength(0)
  })

  it('stops speaking when the page changes', async () => {
    await define(element, 'grace')
    action('read').click()
    synth.play(false)
    page('next').click()
    expect(synth.queue).toHaveLength(0)
    expect(pressed('read')).toBe('false')
  })

  it('stops speaking when another word is looked up', async () => {
    await define(element, 'grace')
    action('spell').click()
    await define(element, 'sanctuary')
    expect(synth.queue).toHaveLength(0)
    expect(pressed('spell')).toBe('false')
  })

  it('stops speaking when the dictionary is switched off', async () => {
    await define(element, 'grace')
    action('read').click()
    element.settings.set({ dictionary: false })
    expect(synth.queue).toHaveLength(0)
  })
})

describe('paging through senses', () => {
  const page = (which: 'previous' | 'next') =>
    popover(element).querySelector(`[data-page="${which}"]`) as HTMLButtonElement
  const counter = () => popover(element).querySelector('.mla-dict-count')?.textContent

  beforeEach(() => {
    fetchMock.mockImplementation(async () =>
      json({
        en: [
          { partOfSpeech: 'Pronoun', definitions: [{ definition: 'The thing here.' }] },
          { partOfSpeech: 'Adjective', definitions: [{ definition: 'Being present.' }, { definition: 'Just mentioned.' }] },
        ],
      }),
    )
  })

  it('shows one sense at a time, with its own part of speech', async () => {
    const pop = await define(element, 'grace')
    expect(counter()).toBe('1 of 3')
    expect(termOf(pop)).toBe('grace (pronoun)')
    expect(definitionOf(pop)).toBe('The thing here.')
    page('next').click()
    expect(counter()).toBe('2 of 3')
    expect(termOf(pop)).toBe('grace (adjective)')
    expect(definitionOf(pop)).toBe('Being present.')
    page('next').click()
    expect(definitionOf(pop)).toBe('Just mentioned.')
    page('previous').click()
    expect(definitionOf(pop)).toBe('Being present.')
  })

  it('disables the arrows at either end', async () => {
    await define(element, 'grace')
    expect(page('previous').disabled).toBe(true)
    expect(page('next').disabled).toBe(false)
    page('next').click()
    page('next').click()
    expect(page('next').disabled).toBe(true)
    expect(page('previous').disabled).toBe(false)
  })

  it('labels the arrows and counter for assistive technology, in the page language', async () => {
    await define(element, 'grace')
    expect(page('previous').getAttribute('aria-label')).toBe('Previous definition')
    expect(page('next').getAttribute('aria-label')).toBe('Next definition')
    document.documentElement.setAttribute('lang', 'es')
    await new Promise((resolve) => setTimeout(resolve, 50))
    await define(element, 'grace')
    expect(counter()).toBe('1 de 3')
    expect(page('next').getAttribute('aria-label')).toBe('Definición siguiente')
  })

  it('has no pager for a word with a single sense', async () => {
    fetchMock.mockImplementation(async () => json(wiktionary('Only one.')))
    const pop = await define(element, 'grace')
    expect(pop.querySelector('.mla-dict-pager')).toBeNull()
  })

  it('stops at ten senses', async () => {
    fetchMock.mockImplementation(async () =>
      json({ en: [{ partOfSpeech: 'Noun', definitions: Array.from({ length: 25 }, (_, i) => ({ definition: `Sense ${i + 1}.` })) }] }),
    )
    await define(element, 'grace')
    expect(counter()).toBe('1 of 10')
  })

  it('starts again at the first sense for a new word', async () => {
    await define(element, 'grace')
    page('next').click()
    await define(element, 'sanctuary')
    expect(counter()).toBe('1 of 3')
  })
})

describe('the search box', () => {
  const input = () => popover(element).querySelector('.mla-dict-input') as HTMLInputElement
  const search = (text: string) => {
    input().value = text
    ;(popover(element).querySelector('.mla-dict-search') as HTMLFormElement).requestSubmit()
  }

  beforeEach(() => {
    fetchMock.mockImplementation(async (url: string) =>
      json(wiktionary(`Meaning of ${decodeURIComponent(url.split('/').pop() ?? '')}.`)),
    )
  })

  it('shows the word that was picked', async () => {
    await define(element, 'Sanctuary')
    expect(input().value).toBe('Sanctuary')
    expect(input().getAttribute('aria-label')).toBe('Word to look up')
  })

  it('looks up whatever is typed', async () => {
    await define(element, 'grace')
    search('Invitation')
    await flush()
    await flush()
    expect(fetchMock.mock.lastCall?.[0]).toMatch(/\/invitation$/)
    expect(definitionOf(popover(element))).toBe('Meaning of invitation.')
    expect(input().value).toBe('Invitation')
  })

  it('ignores an empty search', async () => {
    await define(element, 'grace')
    const calls = fetchMock.mock.calls.length
    search('   ')
    await flush()
    expect(fetchMock.mock.calls.length).toBe(calls)
  })

  it('stays open while the visitor types in it', async () => {
    await define(element, 'grace')
    getSelection()?.removeAllRanges()
    input().dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true, composed: true }))
    input().dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }))
    expect(isVisible(popover(element))).toBe(true)
  })
})

describe('words that only point at another word', () => {
  beforeEach(() => {
    document.querySelector('main')?.insertAdjacentHTML('beforeend', '<p>Send the invitations.</p>')
  })

  const formOf = (target: string, partOfSpeech = 'Noun') => ({
    en: [
      {
        partOfSpeech,
        definitions: [
          {
            definition: `<span class="form-of-definition use-with-mention">plural of <span class="form-of-definition-link"><i><a rel="mw:WikiLink" href="/wiki/${target}#English" title="${target}">${target}</a></i></span></span>`,
          },
        ],
      },
    ],
  })

  it('shows the base word\'s meaning, as UserWay does', async () => {
    fetchMock
      .mockImplementationOnce(async () => json(formOf('invitation')))
      .mockImplementationOnce(async () => json(wiktionary('The act of inviting.')))
    const pop = await define(element, 'invitations')
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/\/invitation$/)
    expect(termOf(pop)).toBe('invitations (noun)')
    expect(definitionOf(pop)).toBe('The act of inviting.')
  })

  it('falls back to "plural of" when the base word cannot be fetched', async () => {
    fetchMock
      .mockImplementation(async () => {
        throw new TypeError('Failed to fetch')
      })
      .mockImplementationOnce(async () => json(formOf('invitation')))
    const pop = await define(element, 'invitations')
    await flush()
    await flush()
    expect(definitionOf(pop)).toBe('plural of invitation')
  })
})

describe('an unreliable service', () => {
  const hang = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })

  it('hedges a request that hangs, and shows the one that answers', async () => {
    // Wiktionary leaves about one request in four hanging; a second answers.
    vi.useFakeTimers()
    const signals: AbortSignal[] = []
    fetchMock
      .mockImplementationOnce((url: string, init: RequestInit) => {
        signals.push(init.signal!)
        return hang(url, init)
      })
      .mockImplementationOnce(async () => json(wiktionary('Free favour.')))
    select('grace')
    trigger(element).click()
    await vi.advanceTimersByTimeAsync(HEDGE_AFTER_MS - 10)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(20)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[1]?.cache).toBe('no-store')
    await vi.advanceTimersByTimeAsync(0)
    expect(definitionOf(popover(element))).toBe('Free favour.')
    // The stuck request is cancelled once the hedge wins.
    expect(signals[0]?.aborted).toBe(true)
  })

  it('does not hedge a request that answers promptly', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(async () => json(wiktionary('Free favour.')))
    select('grace')
    trigger(element).click()
    await vi.advanceTimersByTimeAsync(HEDGE_AFTER_MS * 3)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries a server error at once', async () => {
    fetchMock
      .mockImplementationOnce(async () => json({}, 503))
      .mockImplementationOnce(async () => json(wiktionary('Free favour.')))
    const pop = await define(element, 'grace')
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(definitionOf(pop)).toBe('Free favour.')
  })

  it('retries a network error at once', async () => {
    fetchMock
      .mockImplementationOnce(async () => {
        throw new TypeError('Failed to fetch')
      })
      .mockImplementationOnce(async () => json(wiktionary('Free favour.')))
    const pop = await define(element, 'grace')
    await flush()
    expect(definitionOf(pop)).toBe('Free favour.')
  })

  it(`gives up after ${MAX_ATTEMPTS} attempts`, async () => {
    fetchMock.mockImplementation(async () => json({}, 503))
    const pop = await define(element, 'grace')
    await flush()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS)
    expect(bodyText(pop)).toBe('The dictionary could not be reached.')
  })

  it('never retries a 404, which is an answer', async () => {
    fetchMock.mockImplementation(async () => json({}, 404))
    await define(element, 'grace')
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cancels every attempt when the popover closes', async () => {
    vi.useFakeTimers()
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      signals.push(init.signal!)
      return hang(url, init)
    })
    select('grace')
    trigger(element).click()
    await vi.advanceTimersByTimeAsync(HEDGE_AFTER_MS * 2 + 10)
    expect(signals).toHaveLength(MAX_ATTEMPTS)
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
    expect(signals.every((signal) => signal.aborted)).toBe(true)
    await vi.advanceTimersByTimeAsync(HEDGE_AFTER_MS * 3)
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS)
  })
})
