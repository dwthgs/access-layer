/**
 * Page translation: the on-device engine against a stand-in Translator, and
 * the Google fallback against a stand-in of Google's website translator.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'
import * as translate from '../src/features/translate'

const settle = async (ms = 250) => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, ms / 5))
}

/** An on-device translator that tags text, so a translation is visible. */
function fakeDevice(options: { available?: string; fail?: boolean; hang?: 'availability' | 'create' | 'translate' } = {}) {
  const never = new Promise<never>(() => undefined)
  const calls: { source: string; target: string; text: string }[] = []
  const created: { sourceLanguage: string; targetLanguage: string }[] = []
  ;(globalThis as { Translator?: unknown }).Translator = {
    availability: vi.fn(async () => {
      if (options.hang === 'availability') return never
      return options.available ?? 'available'
    }),
    create: vi.fn(async (opts: { sourceLanguage: string; targetLanguage: string }) => {
      if (options.fail) throw new Error('no model')
      if (options.hang === 'create') return never
      created.push(opts)
      return {
        translate: async (text: string) => {
          if (options.hang === 'translate') return never
          calls.push({ source: opts.sourceLanguage, target: opts.targetLanguage, text })
          return `[${opts.targetLanguage}] ${text}`
        },
        destroy() {},
      }
    }),
  }
  return { calls, created }
}

/**
 * Google's website translator, reduced to what the widget touches: the
 * language list that appears a moment after the script, the class it puts on
 * <html>, and the "show original" button in its bar.
 */
function fakeGoogle(options: { codes?: string[]; swallowFirst?: boolean; stuck?: boolean } = {}) {
  const chosen: string[] = []
  let first = true
  const w = window as unknown as { google?: unknown; __accessLayerGoogleReady?: () => void }
  w.google = {
    translate: {
      TranslateElement: class {
        constructor(public opts: { pageLanguage: string }, id: string) {
          const box = document.getElementById(id)!
          const select = document.createElement('select')
          select.className = 'goog-te-combo'
          box.append(select)
          // The list arrives late, as the real one does.
          setTimeout(() => {
            for (const code of ['', ...(options.codes ?? ['fr', 'es', 'iw', 'tl', 'de'])]) {
              const option = document.createElement('option')
              option.value = code
              option.textContent = code
              select.append(option)
            }
          }, 30)
          select.addEventListener('change', () => {
            if (options.swallowFirst && first) {
              first = false
              return
            }
            chosen.push(select.value)
            document.documentElement.classList.add('translated-ltr')
            document.documentElement.lang = select.value
          })
          const bar = document.createElement('iframe')
          bar.className = 'skiptranslate'
          document.body.append(bar)
          const restore = bar.contentDocument!.createElement('button')
          restore.id = ':1.restore'
          restore.addEventListener('click', () => {
            if (options.stuck) return
            document.documentElement.classList.remove('translated-ltr')
            document.documentElement.lang = this.opts.pageLanguage
            chosen.push('restore')
          })
          bar.contentDocument!.body.append(restore)
        }
      },
    },
  }
  return { chosen }
}

let element: AccessLayerElement

beforeEach(() => {
  localStorage.clear()
  document.documentElement.setAttribute('lang', 'en')
  document.documentElement.className = ''
  document.body.innerHTML = `
    <main>
      <h1>Welcome home</h1>
      <p>Join us <strong>this Sunday</strong> at 10.</p>
      <img src="x.png" alt="The church at dawn">
      <input placeholder="Your name"><input type="submit" value="Send">
      <p translate="no">Brand Name</p>
      <p class="notranslate">Keep me</p>
      <code>let x = 1</code>
      <p>2026</p>
    </main>`
})

afterEach(async () => {
  unmount()
  await translate.teardown()
  sessionStorage.clear()
  delete (window as { google?: unknown }).google
  document.documentElement.className = ''
  document.documentElement.removeAttribute('lang')
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('languages', () => {
  it("offers UserWay's list, each in its own language", () => {
    expect(translate.LANGUAGES.length).toBeGreaterThanOrEqual(40)
    expect(translate.findLanguage('fr')?.name).toBe('Français')
    expect(translate.findLanguage('am')?.name).toBe('አማርኛ')
    expect(translate.findLanguage('ko')?.name).toBe('한국어')
  })

  it('has no duplicates', () => {
    const codes = translate.LANGUAGES.map((language) => language.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('treats regional variants as the same language, except Chinese scripts', () => {
    expect(translate.sameLanguage('en-US', 'en')).toBe(true)
    expect(translate.sameLanguage('es', 'en')).toBe(false)
    expect(translate.sameLanguage('zh-CN', 'zh-TW')).toBe(false)
  })

  it('only sends text that has letters in it', () => {
    expect(translate.translatable('Hello')).toBe(true)
    expect(translate.translatable('2026 · 10:00')).toBe(false)
    expect(translate.translatable('   ')).toBe(false)
  })

  it('lists them in the panel, each as "Native (English)"', () => {
    element = mount()
    ;(element.shadowRoot!.querySelector('.mla-lang-toggle') as HTMLButtonElement).click()
    const names = Array.from(element.shadowRoot!.querySelectorAll('.mla-lang-name'), (n) => n.textContent)
    expect(names[0]).toBe('English')
    expect(names).toContain('Français (French)')
    expect(names).toContain('Català (Catalan)')
    expect(element.shadowRoot!.querySelector('#mla-lang-opt-ar')?.getAttribute('lang')).toBe('ar')
  })
})

describe('on the device', () => {
  it('translates the page, not just the widget', async () => {
    const device = fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(document.querySelector('h1')?.textContent).toBe('[fr] Welcome home')
    expect(device.created[0]).toEqual(expect.objectContaining({ sourceLanguage: 'en', targetLanguage: 'fr' }))
  })

  it('translates alt text, placeholders and button labels', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('[fr] The church at dawn')
    expect(document.querySelector('input')?.getAttribute('placeholder')).toBe('[fr] Your name')
    expect((document.querySelector('input[type=submit]') as HTMLInputElement).value).toBe('[fr] Send')
  })

  it('keeps the spaces around inline text', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(document.querySelector('main p')?.innerHTML).toBe('[fr] Join us <strong>[fr] this Sunday</strong> [fr] at 10.')
  })

  it("leaves alone what should not be translated, and the widget itself", async () => {
    const device = fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    const sent = device.calls.map((call) => call.text)
    expect(sent).not.toContain('Brand Name')
    expect(sent).not.toContain('Keep me')
    expect(sent).not.toContain('let x = 1')
    expect(sent).not.toContain('2026')
    expect(element.getAttribute('translate')).toBe('no')
    expect(element.shadowRoot!.querySelector('.mla-title')?.textContent).toBe('Accessibility menu')
  })

  it('sets the page language, so screen readers use the right voice', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(document.documentElement.lang).toBe('fr')
  })

  it('puts the page back exactly with Automatic', async () => {
    fakeDevice()
    const before = document.body.innerHTML
    element = mount()
    const widgetless = () => document.querySelector('main')!.outerHTML
    const original = widgetless()
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(widgetless()).not.toBe(original)
    element.settings.set({ lang: null })
    await settle()
    expect(widgetless()).toBe(original)
    expect(document.documentElement.lang).toBe('en')
    expect(before).toContain('Welcome home')
  })

  it('switches from one language to another from the original, not from the translation', async () => {
    const device = fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    element.settings.set({ lang: 'de' })
    await settle()
    expect(document.querySelector('h1')?.textContent).toBe('[de] Welcome home')
    expect(device.calls.filter((call) => call.target === 'de').every((call) => !call.text.startsWith('['))).toBe(true)
  })

  it('does nothing when the chosen language is the page language', async () => {
    const device = fakeDevice()
    element = mount()
    element.settings.set({ lang: 'en' })
    await settle()
    expect(device.created).toHaveLength(0)
    expect(document.querySelector('h1')?.textContent).toBe('Welcome home')
  })

  it('translates content that arrives later', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    const late = document.createElement('p')
    late.textContent = 'See you soon'
    document.querySelector('main')!.append(late)
    await settle(400)
    expect(late.textContent).toBe('[fr] See you soon')
  })

  it('translates text the page changes after translation', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    const heading = document.querySelector('h1')!
    heading.firstChild!.textContent = 'New heading'
    await settle(400)
    expect(heading.textContent).toBe('[fr] New heading')
  })

  it('translates the same string once', async () => {
    const device = fakeDevice()
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<p>Amen</p><p>Amen</p><p>Amen</p>')
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(device.calls.filter((call) => call.text === 'Amen')).toHaveLength(1)
  })

  it('reports progress and then where it was translated', async () => {
    fakeDevice()
    element = mount()
    const seen: string[] = []
    translate.onStatus((status) => seen.push(status.state))
    element.settings.set({ lang: 'fr' })
    await settle()
    expect(seen).toContain('working')
    expect(translate.getStatus()).toEqual({ state: 'done', engine: 'device' })
    const line = element.shadowRoot!.querySelector('.mla-translate-status')!
    expect(line.textContent).toBe('Page translated on this device.')
  })

  it('stays translated across a reload', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    unmount()
    await translate.teardown()
    expect(document.querySelector('h1')?.textContent).toBe('Welcome home')
    element = mount()
    await settle()
    expect(document.querySelector('h1')?.textContent).toBe('[fr] Welcome home')
  })
  it('stays translated when the widget is removed and promptly re-inserted', async () => {
    // Regression: the removal's restore was still running when the new
    // setup asked for French, so the page ended up untranslated.
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    element.remove()
    await Promise.resolve()
    await Promise.resolve()
    document.body.append(element)
    await settle()
    expect(document.querySelector('h1')?.textContent).toBe('[fr] Welcome home')
  })
})

describe('the Google fallback', () => {
  const script = () => document.querySelector(`script[src="${translate.GOOGLE_SCRIPT}"]`)

  beforeEach(() => {
    delete (globalThis as { Translator?: unknown }).Translator
    // The visitor has already agreed this session; asking is tested below.
  })

  it('is used where the browser has no translator', async () => {
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(google.chosen).toEqual(['fr'])
    expect(translate.getStatus()).toEqual({ state: 'done', engine: 'google' })
    expect(element.shadowRoot!.querySelector('.mla-translate-status')?.textContent).toBe('Page translated by Google.')
  })

  it('is used when the device translator never answers', async () => {
    // Regression: a browser whose Translator.availability() never settled
    // left the page untranslated, with no message, forever.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fakeDevice({ hang: 'availability' })
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await vi.advanceTimersByTimeAsync(translate.DEVICE_CHECK_TIMEOUT_MS + 1500)
    vi.useRealTimers()
    await settle(600)
    expect(google.chosen).toEqual(['fr'])
  })

  it('is used when the device translator stops answering mid-way', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fakeDevice({ hang: 'translate' })
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await vi.advanceTimersByTimeAsync(translate.DEVICE_CHECK_TIMEOUT_MS * 2 + 1500)
    vi.useRealTimers()
    await settle(600)
    expect(google.chosen).toEqual(['fr'])
    expect(document.querySelector('h1')?.textContent).toBe('Welcome home')
  })

  it('is used when the model download stalls', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fakeDevice({ hang: 'create' })
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await vi.advanceTimersByTimeAsync(translate.DEVICE_STALL_TIMEOUT_MS + 1500)
    vi.useRealTimers()
    await settle(600)
    expect(google.chosen).toEqual(['fr'])
  })

  it('is used when the device cannot translate this pair', async () => {
    fakeDevice({ available: 'unavailable' })
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(google.chosen).toEqual(['fr'])
  })

  it("maps to Google's own codes", async () => {
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'he' })
    await settle(600)
    element.settings.set({ lang: 'fil' })
    await settle(600)
    expect(google.chosen.filter((code) => code !== 'restore')).toEqual(['iw', 'tl'])
  })

  it('is not loaded until a visitor picks a language', async () => {
    fakeGoogle()
    element = mount({ translateFallback: 'google' })
    await settle()
    expect(script()).toBeNull()
    expect(document.getElementById('access-layer-google-translate')).toBeNull()
  })

  it('chooses again when Google swallows the first choice', async () => {
    const google = fakeGoogle({ swallowFirst: true })
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(3500)
    expect(google.chosen).toEqual(['fr'])
    expect(translate.getStatus().state).toBe('done')
  })

  it("restores the original with Google's own button", async () => {
    const google = fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    element.settings.set({ lang: null })
    await settle(600)
    expect(google.chosen).toEqual(['fr', 'restore'])
    expect(document.documentElement.classList.contains('translated-ltr')).toBe(false)
    expect(document.documentElement.lang).toBe('en')
  })

  it('keeps Google away from code, and takes the mark off afterwards', async () => {
    fakeGoogle()
    element = mount({ translateFallback: 'google' })
    const code = document.querySelector('code')!
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(code.classList.contains('notranslate')).toBe(true)
    element.settings.set({ lang: null })
    await settle(600)
    expect(code.classList.contains('notranslate')).toBe(false)
    expect(document.querySelector('.notranslate')?.textContent).toBe('Keep me') // the page's own mark stays
  })

  it("hides Google's bar and keeps the page from being pushed down", async () => {
    fakeGoogle()
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    const css = Array.from(document.adoptedStyleSheets, (each) => Array.from(each.cssRules, (rule) => rule.cssText).join('\n')).join('\n')
    expect(document.querySelectorAll('style')).toHaveLength(0)
    expect(css).toContain('iframe.skiptranslate')
    expect(css).toContain('top: 0px !important') // as the browser reads `top: 0` back
  })

  it('says so when the language is not offered', async () => {
    fakeGoogle({ codes: ['de'] })
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(translate.getStatus()).toEqual({ state: 'failed' })
    expect(element.shadowRoot!.querySelector('.mla-translate-status')?.textContent).toBe(
      'This page could not be translated right now.',
    )
  })
})

describe('Google is the fallback, and translates as soon as a language is picked', () => {
  const script = () => document.querySelector(`script[src="${translate.GOOGLE_SCRIPT}"]`)
  const line = () => element.shadowRoot!.querySelector('.mla-translate-status')!

  beforeEach(() => {
    delete (globalThis as { Translator?: unknown }).Translator
  })

  it('translates with Google by default', async () => {
    const google = fakeGoogle()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(google.chosen).toEqual(['fr'])
    expect(translate.getStatus()).toEqual({ state: 'done', engine: 'google' })
  })

  it('is off where the site turns it off', async () => {
    fakeGoogle()
    element = mount({ translateFallback: 'off' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(script()).toBeNull()
    expect(translate.getStatus()).toEqual({ state: 'unavailable' })
    expect(line().textContent).toBe('This browser cannot translate this page.')
  })

  it('switches straight to the next language picked', async () => {
    const google = fakeGoogle()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle(600)
    element.settings.set({ lang: 'de' })
    await settle(600)
    expect(google.chosen.filter((code) => code !== 'restore')).toEqual(['fr', 'de'])
  })

  it('loads nothing from Google until a language is picked', async () => {
    fakeGoogle()
    element = mount()
    await settle(600)
    expect(script()).toBeNull()
    expect(document.getElementById('access-layer-google-translate')).toBeNull()
  })

  it('Reset puts the page back', async () => {
    const google = fakeGoogle()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle(600)
    element.settings.reset()
    await settle(600)
    expect(element.settings.state.lang).toBeNull()
    expect(google.chosen).toEqual(['fr', 'restore'])
    expect(document.documentElement.classList.contains('translated-ltr')).toBe(false)
  })
})

describe('when Google will not put the original back', () => {
  beforeEach(() => {
    delete (globalThis as { Translator?: unknown }).Translator
  })

  it('never reloads the page itself, and offers the visitor a reload instead', async () => {
    fakeGoogle({ stuck: true })
    element = mount({ translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    const reloads: string[] = []
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => void reloads.push('reload'))
    element.settings.set({ lang: null })
    await settle(3800)
    expect(reloads).toEqual([])
    expect(translate.getStatus()).toEqual({ state: 'reload' })
    const offer = Array.from(element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.mla-translate-action')).find(
      (b) => b.textContent === 'Reload the page',
    )!
    expect(offer.hidden).toBe(false)
    offer.click()
    expect(reloads).toEqual(['reload'])
    reload.mockRestore()
  })
})

describe('on the device, over a long session (#13)', () => {
  it('still puts back a node the page took out and put back later', async () => {
    fakeDevice()
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle()
    const heading = document.querySelector('h1')!
    expect(heading.textContent).toBe('[fr] Welcome home')
    heading.remove()
    await settle(400)
    document.querySelector('main')!.prepend(heading)
    await settle(400)
    element.settings.set({ lang: null })
    await settle()
    expect(heading.textContent).toBe('Welcome home')
  })

  it('lets go of removed content even when nothing is added', async () => {
    // Collection cannot be forced in a test, so count the engine's checks for
    // it. happy-dom uses WeakRef too; only calls from the engine count.
    const Real = WeakRef
    let checks = 0
    vi.stubGlobal('WeakRef', class<T extends WeakKey> extends Real<T> {
      override deref() {
        if (new Error().stack?.includes('src/features/translate.ts')) checks++
        return super.deref()
      }
    })
    try {
      fakeDevice()
      element = mount()
      element.settings.set({ lang: 'fr' })
      await settle()
      checks = 0
      document.querySelector('main')!.replaceChildren()
      await settle(400)
      expect(checks).toBeGreaterThan(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps only the most recent translations for reuse', async () => {
    const device = fakeDevice()
    document.querySelector('main')!.innerHTML = Array.from(
      { length: translate.CACHE_LIMIT + 1 },
      (_, i) => `<p>Line number ${i}</p>`,
    ).join('')
    element = mount()
    element.settings.set({ lang: 'fr' })
    await settle(1500)
    const asked = (text: string) => device.calls.filter((call) => call.text === text).length
    expect(asked('Line number 0')).toBe(1)
    // The oldest string has gone from the cache, so meeting it again asks the
    // translator again; a recent one is still remembered.
    document.querySelector('main')!.insertAdjacentHTML('beforeend', `<p>Line number 0</p><p>Line number ${translate.CACHE_LIMIT}</p>`)
    await settle(600)
    expect(asked('Line number 0')).toBe(2)
    expect(asked(`Line number ${translate.CACHE_LIMIT}`)).toBe(1)
  })
})

describe("the site's Cloud Translation endpoint", () => {
  const url = 'https://access-layer.example.test/api/widget/site-1/translate'
  const script = () => document.querySelector(`script[src="${translate.GOOGLE_SCRIPT}"]`)

  /** The endpoint, tagging text as the fake device does, and every request it got. */
  function fakeEndpoint(options: { status?: number } = {}) {
    const requests: { source: string; target: string; q: string[] }[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      expect(String(input)).toBe(url)
      const body = JSON.parse(String(init!.body)) as { source: string; target: string; q: string[] }
      requests.push(body)
      if (options.status) return new Response('{}', { status: options.status })
      return Response.json({ translations: body.q.map((text) => `[${body.target}] ${text}`) })
    })
    return { requests }
  }

  beforeEach(() => {
    delete (globalThis as { Translator?: unknown }).Translator
  })

  it('translates the page in one request, never loading free Google', async () => {
    const endpoint = fakeEndpoint()
    element = mount({ translateUrl: url })
    element.settings.set({ lang: 'he' })
    await settle(600)
    expect(endpoint.requests).toHaveLength(1)
    expect(endpoint.requests[0]).toMatchObject({ source: 'en', target: 'iw' })
    expect(endpoint.requests[0]!.q).toContain('Welcome home')
    expect(endpoint.requests[0]!.q).not.toContain('Brand Name')
    expect(document.querySelector('h1')?.textContent).toBe('[iw] Welcome home')
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('[iw] The church at dawn')
    expect(translate.getStatus()).toEqual({ state: 'done', engine: 'google' })
    expect(script()).toBeNull()
  })

  it('splits a long page into several requests', async () => {
    const endpoint = fakeEndpoint()
    document.querySelector('main')!.append(
      ...Array.from({ length: 250 }, (_, i) => Object.assign(document.createElement('p'), { textContent: `Line ${i}` })),
    )
    element = mount({ translateUrl: url })
    element.settings.set({ lang: 'fr' })
    await settle(800)
    expect(endpoint.requests.length).toBeGreaterThan(2)
    for (const request of endpoint.requests) expect(request.q.length).toBeLessThanOrEqual(translate.CLOUD_BATCH)
    expect(document.querySelector('main p:last-child')?.textContent).toBe('[fr] Line 249')
  })

  it('puts the page back exactly with Automatic', async () => {
    fakeEndpoint()
    const before = document.body.innerHTML
    element = mount({ translateUrl: url })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    element.settings.set({ lang: null })
    await settle(600)
    element.remove()
    await Promise.resolve() // teardown waits a microtask, in case the widget is only being moved
    expect(document.body.innerHTML).toBe(before)
  })

  it('leaves the page alone and says so when the endpoint fails', async () => {
    fakeEndpoint({ status: 502 })
    element = mount({ translateUrl: url })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(translate.getStatus()).toEqual({ state: 'failed' })
    expect(document.querySelector('h1')?.textContent).toBe('Welcome home')
  })

  it('never falls back to the free translator, even where the site also turned it on', async () => {
    fakeEndpoint({ status: 502 })
    fakeGoogle()
    element = mount({ translateUrl: url, translateFallback: 'google' })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(translate.getStatus()).toEqual({ state: 'failed' })
    expect(script()).toBeNull()
    expect(document.documentElement.classList.contains('translated-ltr')).toBe(false)
  })

  it('is not used where the device can translate', async () => {
    const endpoint = fakeEndpoint()
    fakeDevice()
    element = mount({ translateUrl: url })
    element.settings.set({ lang: 'fr' })
    await settle(600)
    expect(endpoint.requests).toEqual([])
    expect(translate.getStatus()).toEqual({ state: 'done', engine: 'device' })
  })
})
