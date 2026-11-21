/**
 * Dictionary.
 *
 * Double-click a word and its definition opens straight away. Select a word
 * any other way (dragging, Shift+arrows) and a Define button appears next to
 * it instead. This is the one feature that leaves the browser: it calls
 * Wiktionary with the selected word and nothing else, only on one of those
 * explicit actions, and only while the feature is switched on. The endpoint
 * is configurable so a property can point it at its own proxy.
 */

import { h } from '../util/dom'
import { icon } from '../icons'
import { cancelSpeech, speakSequence, speechSupported } from '../util/speech'
import {
  letters,
  lookupCandidates,
  mergeFormOf,
  normalize,
  primaryLanguage,
  senses,
  type Entry,
  type Sense,
} from './dictionaryData'
import type { FeatureContext } from './context'

/**
 * Wiktionary via the Wikimedia REST API: it sends `Access-Control-Allow-Origin`,
 * needs no key, and runs on infrastructure with real uptime. The obvious
 * alternative, dictionaryapi.dev, is a free community service that was
 * returning a Cloudflare 522 when this was written; it still works if you set
 * `dictionary-url` to it, because responses are matched by shape, not by host.
 */
export const DEFAULT_ENDPOINT = 'https://en.wiktionary.org/api/rest_v1/page/definition/'

/**
 * A lookup that never resolves would leave the popover on "Looking up…" with
 * no way back, so every request gets a deadline and reports failure instead.
 */
export const REQUEST_TIMEOUT_MS = 8000

/**
 * Wiktionary leaves roughly one request in four hanging with no answer
 * (measured September 2026), while a fresh request for the same word answers
 * in half a second. So a request that has not answered by this point is
 * hedged with a second one, and whichever answers first wins.
 */
export const HEDGE_AFTER_MS = 1500

/** Most requests one lookup of one spelling may make, hedges and retries included. */
export const MAX_ATTEMPTS = 3

let endpoint = DEFAULT_ENDPOINT
let ctxRef: FeatureContext | null = null
let button: HTMLButtonElement | null = null
let popover: HTMLElement | null = null
/** The search box at the top of the popover, and the part below it that changes. */
let input: HTMLInputElement | null = null
let body: HTMLElement | null = null
let pending: AbortController | null = null
/** Where the looked-up word sits, kept so the popover can be re-placed. */
let anchor: DOMRect | null = null
/** Which of Read or Spell is speaking, so its button can show it and stop it. */
let speaking: 'read' | 'spell' | null = null

/** Longest text the search box will look up. */
const MAX_QUERY = 60

export function configure(url: string): void {
  endpoint = url
}

function selectedWord(): { word: string; rect: DOMRect } | null {
  const selection = getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const raw = selection.toString().trim()
  // One word only. A whole sentence is a translation request, not a lookup.
  if (!raw || /\s/.test(raw) || raw.length > 40) return null
  const word = raw.replace(/[^\p{L}\p{M}'-]/gu, '')
  if (word.length < 2) return null
  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { word, rect }
}

/**
 * Put `el` next to the selection, below it by preference and above it when
 * there is no room, then clamp it inside the viewport on both axes. Without
 * the vertical clamp a selection near the bottom of a tall page can push the
 * popover off-screen, where it is visible to nothing but the DOM.
 */
function place(el: HTMLElement, rect: DOMRect): void {
  const own = el.getBoundingClientRect()
  const gap = 8
  const preferred =
    rect.bottom + gap + own.height > innerHeight ? rect.top - own.height - gap : rect.bottom + gap
  const maxTop = Math.max(gap, innerHeight - own.height - gap)
  const top = Math.min(Math.max(gap, preferred), maxTop)
  const maxLeft = Math.max(gap, innerWidth - own.width - gap)
  const left = Math.min(Math.max(gap, rect.left), maxLeft)
  el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
}

function hideAll(): void {
  stopSpeaking()
  button?.classList.remove('is-visible')
  popover?.classList.remove('is-visible')
  pending?.abort()
  pending = null
}

/** True for events that started on the Define button or inside the popover. */
function fromOwnUi(event: Event): boolean {
  const path = event.composedPath()
  return (!!button && path.includes(button)) || (!!popover && path.includes(popover))
}

function onSelectionSettled(event?: Event): void {
  if (!button) return
  // Escape closes from anywhere, including with focus on Read or Spell, so
  // it is checked before the guard below.
  if (event instanceof KeyboardEvent && event.key === 'Escape') {
    hideAll()
    return
  }
  // Clicking inside the popover (its scrollbar, its text, its close button)
  // collapses the page selection; without this guard that closed the popover
  // the moment anyone tried to scroll or read it.
  if (event && fromOwnUi(event)) return
  const found = selectedWord()
  if (!found) {
    hideAll()
    return
  }
  anchor = found.rect
  // The second mouseup of a double-click is as explicit as pressing Define,
  // so skip the button and open the definition. A triple-click selects the
  // whole paragraph and has already been turned away by selectedWord().
  if (event instanceof MouseEvent && event.detail === 2) {
    button.classList.remove('is-visible')
    void lookup(found.word)
    return
  }
  button.dataset.word = found.word
  button.classList.add('is-visible')
  place(button, found.rect)
}

async function lookup(word: string, { typed = false } = {}): Promise<void> {
  if (!popover || !body || !input || !ctxRef) return
  const t = ctxRef.t
  stopSpeaking()
  syncers.clear()
  // Leave what the visitor typed alone; otherwise show the word they picked.
  if (!typed) input.value = word
  showStatus(t('dictionaryLoading'))
  popover.classList.add('is-visible')
  reposition()

  pending?.abort()
  const controller = new AbortController()
  pending = controller
  let timedOut = false
  const deadline = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const lang = primaryLanguage(document.documentElement.lang)
    let unreachable = false
    for (const candidate of lookupCandidates(word)) {
      const result = await fetchEntry(candidate, lang, controller.signal)
      if (pending !== controller) return
      if (result === 'failed') unreachable = true
      if (typeof result === 'string') continue

      let shown = result
      // "plural of invitation" tells the reader nothing; show invitation's
      // meaning instead, as long as that word can be fetched.
      if (result.formOf) {
        const base = await fetchEntry(result.formOf, lang, controller.signal).catch((error) => {
          // Still show "plural of invitation" if only the second request
          // fails; but a timeout or a newer lookup must still stop here.
          if ((error as Error)?.name === 'AbortError') throw error
          return 'failed' as const
        })
        if (pending !== controller) return
        if (typeof base !== 'string') shown = mergeFormOf(result, base)
      }
      render(candidate, shown)
      return
    }
    showStatus(t(unreachable ? 'dictionaryError' : 'dictionaryNotFound'))
  } catch (error) {
    // A deliberate abort (a new lookup, or the panel closing) is not an error
    // worth reporting; a timeout is the one abort the user needs told about.
    if ((error as Error)?.name === 'AbortError' && !timedOut) return
    showStatus(t('dictionaryError'))
  } finally {
    clearTimeout(deadline)
    if (pending === controller) pending = null
    reposition()
  }
}

/**
 * One request. 404 means "no such entry", so the caller may try another
 * spelling; any other failure (a 5xx, a rate limit) is the service failing,
 * and the visitor should hear that rather than that the word does not exist.
 */
async function fetchEntry(
  word: string,
  lang: string,
  signal: AbortSignal,
): Promise<Entry | 'missing' | 'failed'> {
  const response = await resilientFetch(endpoint + encodeURIComponent(word), signal)
  if (!response.ok) return response.status === 404 ? 'missing' : 'failed'
  const entry = normalize(await response.json(), word, lang)
  return entry && entry.meanings.length > 0 ? entry : 'missing'
}

/**
 * `fetch`, hedged against hangs and retried on failure.
 *
 * - No answer after HEDGE_AFTER_MS: start another request alongside it.
 * - A network error, or a status other than 2xx or 404: start another at once.
 * - The first 2xx or 404 wins, and the others are cancelled.
 * - After MAX_ATTEMPTS, the last failure is what the caller gets.
 *
 * Hedges skip the HTTP cache: a browser may hold a second identical request
 * behind the first one's cache entry, which would hedge nothing.
 */
function resilientFetch(url: string, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const attempts: AbortController[] = []
    let inFlight = 0
    let settled = false
    let hedge: ReturnType<typeof setTimeout> | undefined
    let lastFailure: Response | Error | null = null

    const abortAll = () => {
      clearTimeout(hedge)
      for (const attempt of attempts) attempt.abort()
    }
    // The caller's signal (a timeout, a newer lookup) cancels everything,
    // including a winner whose body is still being read.
    signal.addEventListener(
      'abort',
      () => {
        abortAll()
        if (!settled) {
          settled = true
          reject(new DOMException('Aborted', 'AbortError'))
        }
      },
      { once: true },
    )
    if (signal.aborted) return

    const win = (response: Response, winner: AbortController) => {
      settled = true
      clearTimeout(hedge)
      for (const attempt of attempts) if (attempt !== winner) attempt.abort()
      resolve(response)
    }

    const failed = (failure: Response | Error) => {
      lastFailure = failure
      if (attempts.length < MAX_ATTEMPTS) {
        launch()
      } else if (inFlight === 0) {
        settled = true
        clearTimeout(hedge)
        if (lastFailure instanceof Response) resolve(lastFailure)
        else reject(lastFailure)
      }
    }

    const launch = () => {
      if (settled || attempts.length >= MAX_ATTEMPTS) return
      const attempt = new AbortController()
      const first = attempts.length === 0
      attempts.push(attempt)
      inFlight++
      clearTimeout(hedge)
      hedge = setTimeout(launch, HEDGE_AFTER_MS)
      // Through a promise, so a fetch that throws synchronously (some
      // polyfills do) counts as a failed attempt rather than escaping.
      Promise.resolve()
        .then(() =>
          fetch(url, {
            signal: attempt.signal,
            headers: { accept: 'application/json' },
            cache: first ? 'default' : 'no-store',
          }),
        )
        .then(
        (response) => {
          inFlight--
          if (settled) return
          if (response.ok || response.status === 404) win(response, attempt)
          else failed(response)
        },
        (error: unknown) => {
          inFlight--
          if (settled) return
          // A hedge cancelled by a winner, or by the caller, is not a failure.
          if (attempt.signal.aborted) return
          failed(error instanceof Error ? error : new Error(String(error)))
        },
      )
    }

    launch()
  })
}

function reposition(): void {
  if (popover && anchor) place(popover, anchor)
}

function showStatus(text: string): void {
  body?.replaceChildren(h('p', { class: 'mla-dict-status', text }))
}

/**
 * One sense at a time, set out the way UserWay does it:
 * "**this (pronoun)**: The thing, item, etc. being indicated." with Read and
 * Spell below and, when there is more than one sense, "‹ 1 of 10 ›" beside them.
 */
function render(word: string, entry: Entry | null): void {
  if (!body || !ctxRef) return
  const pages = entry ? senses(entry) : []
  if (!entry || pages.length === 0) {
    showStatus(ctxRef.t('dictionaryNotFound'))
    return
  }
  const t = ctxRef.t
  const headword = entry.word || word
  let index = 0

  const definition = h('p', { class: 'mla-dict-definition' })
  const counter = h('span', { class: 'mla-dict-count' })
  const previous = h('button', {
    class: 'mla-dict-page',
    type: 'button',
    'data-page': 'previous',
    'aria-label': t('dictionaryPrevious'),
    html: icon('chevron'),
    onclick: () => show(index - 1),
  }) as HTMLButtonElement
  const next = h('button', {
    class: 'mla-dict-page',
    type: 'button',
    'data-page': 'next',
    'aria-label': t('dictionaryNext'),
    html: icon('chevron'),
    onclick: () => show(index + 1),
  }) as HTMLButtonElement

  const current = (): Sense => pages[index] ?? pages[0]!

  function show(to: number): void {
    index = Math.min(Math.max(0, to), pages.length - 1)
    stopSpeaking()
    const sense = current()
    const term = sense.partOfSpeech ? `${headword} (${sense.partOfSpeech})` : headword
    // textContent, never innerHTML: the definition arrived over the network.
    definition.replaceChildren(h('strong', { class: 'mla-dict-term', text: term }), `: ${sense.definition}`)
    counter.textContent = t('dictionaryCount', { n: index + 1, total: pages.length })
    previous.disabled = index === 0
    next.disabled = index === pages.length - 1
  }

  const row = h('div', { class: 'mla-dict-actions' })
  if (speechSupported()) row.append(...speechControls(headword, current))
  if (pages.length > 1) {
    row.append(h('div', { class: 'mla-dict-pager' }, [previous, counter, next]))
  }
  body.replaceChildren(definition, row)
  show(0)
}

// ------------------------------------------------------------ read & spell

/**
 * The definitions come from English Wiktionary, so they are in English
 * whatever the page language; read them with an English voice. A custom
 * endpoint is assumed to answer in the page's language.
 */
function readingLanguage(): string {
  return endpoint.includes('en.wiktionary.org') ? 'en' : pageLanguage()
}

/** Letters are named in the visitor's own language: "ge", not "jee", in Spanish. */
function pageLanguage(): string {
  return document.documentElement.lang || navigator.language || 'en'
}

function speechControls(word: string, current: () => Sense): HTMLButtonElement[] {
  const t = ctxRef!.t

  const control = (kind: 'read' | 'spell', text: string, label: string) =>
    h(
      'button',
      {
        class: `mla-dict-action mla-dict-action-${kind}`,
        type: 'button',
        'data-action': kind,
        'aria-label': label,
        'aria-pressed': 'false',
        onclick: () => (speaking === kind ? stopSpeaking() : start(kind)),
      },
      [h('span', { class: 'mla-dict-action-icon', html: icon('audio') }), h('span', { text })],
    ) as HTMLButtonElement

  const readButton = control('read', t('dictionaryRead'), t('dictionaryReadLabel'))
  const spellButton = control('spell', t('dictionarySpell'), t('dictionarySpellLabel'))

  function start(kind: 'read' | 'spell'): void {
    const rate = ctxRef?.getState().readerRate ?? 1
    const done = () => {
      speaking = null
      sync()
    }
    speaking = kind
    sync()
    if (kind === 'read') {
      const sense = current()
      speakSequence(
        [word, sense.partOfSpeech, sense.definition].map((text) => ({ text })),
        { rate, lang: readingLanguage(), onend: done },
      )
      return
    }
    // One utterance per letter, so each is said on its own with a natural
    // pause between them, a little slower than reading.
    speakSequence(
      letters(word).map((letter) => ({ text: letterName(letter) })),
      { rate: rate * 0.85, lang: pageLanguage(), onend: done },
    )
  }

  function sync(): void {
    readButton.setAttribute('aria-pressed', speaking === 'read' ? 'true' : 'false')
    spellButton.setAttribute('aria-pressed', speaking === 'spell' ? 'true' : 'false')
  }
  syncers.add(sync)

  return [readButton, spellButton]
}

/**
 * What to say for one letter. Always lower case: speech engines announce an
 * upper-case letter as "capital T", which is noise when spelling a word that
 * merely starts a sentence. Punctuation by name, because engines skip it.
 */
export function letterName(letter: string, t?: FeatureContext['t']): string {
  const translate = t ?? ctxRef?.t
  if (letter === "'" || letter === '\u2019') return translate?.('spellApostrophe') ?? 'apostrophe'
  if (letter === '-') return translate?.('spellHyphen') ?? 'hyphen'
  return letter.toLocaleLowerCase()
}

/** Resets for the controls currently on screen, run when speech stops. */
const syncers = new Set<() => void>()

function stopSpeaking(): void {
  if (speaking) cancelSpeech()
  speaking = null
  for (const sync of syncers) sync()
}

export function enable(ctx: FeatureContext): void {
  teardown()
  ctxRef = ctx
  button = h('button', {
    class: 'mla-dict-trigger',
    type: 'button',
    text: ctx.t('dictionaryDefine'),
    onclick: (event: Event) => {
      event.preventDefault()
      const word = button?.dataset.word
      button?.classList.remove('is-visible')
      if (word) {
        anchor = selectedWord()?.rect ?? anchor
        void lookup(word)
      }
    },
  }) as HTMLButtonElement
  input = h('input', {
    class: 'mla-dict-input',
    type: 'search',
    maxlength: String(MAX_QUERY),
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-label': ctx.t('dictionarySearchLabel'),
  }) as HTMLInputElement
  const form = h(
    'form',
    {
      class: 'mla-dict-search',
      role: 'search',
      onsubmit: (event: Event) => {
        event.preventDefault()
        const query = input?.value.trim().replace(/\s+/g, ' ') ?? ''
        if (query) void lookup(query, { typed: true })
      },
    },
    [
      input,
      h('button', {
        class: 'mla-dict-go',
        type: 'submit',
        'aria-label': ctx.t('dictionaryLookUp'),
        html: icon('search'),
      }),
    ],
  )
  body = h('div', { class: 'mla-dict-body', 'aria-live': 'polite' })
  popover = h('div', { class: 'mla-dict-popover', role: 'dialog', 'aria-label': ctx.t('dictionary') }, [
    form,
    body,
  ])
  ctx.layer.append(button, popover)

  document.addEventListener('mouseup', onSelectionSettled)
  document.addEventListener('keyup', onSelectionSettled)
  addEventListener('scroll', onScroll, { passive: true, capture: true })
}

/**
 * The page scrolling away from the word closes the popover, except while the
 * visitor is typing in it: on a phone, focusing the box raises the keyboard,
 * which scrolls the page, and would close the popover under their fingers.
 */
function onScroll(): void {
  const focused = ctxRef?.shadow.activeElement
  if (focused && popover?.contains(focused)) return
  hideAll()
}

export function teardown(): void {
  document.removeEventListener('mouseup', onSelectionSettled)
  document.removeEventListener('keyup', onSelectionSettled)
  removeEventListener('scroll', onScroll, true)
  pending?.abort()
  pending = null
  anchor = null
  stopSpeaking()
  syncers.clear()
  button?.remove()
  popover?.remove()
  button = null
  popover = null
  input = null
  body = null
  ctxRef = null
}
