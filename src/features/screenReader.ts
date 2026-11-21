/**
 * Screen Reader.
 *
 * Reads the element under the pointer-click or the keyboard focus aloud using
 * the browser's own speech synthesis. This is a reading aid for people who
 * can see the page but find reading it hard; it is not a replacement for
 * NVDA, JAWS or VoiceOver, and the README says so plainly.
 *
 * Clicks are observed, never intercepted, so links and buttons keep working.
 */

import { accessibleText, isOurs } from '../util/dom'
import { localVoice, speechSupported } from '../util/speech'
import type { FeatureContext } from './context'

let ctxRef: FeatureContext | null = null
let speaking: Element | null = null

export const supported = speechSupported

function markSpeaking(el: Element | null): void {
  speaking?.removeAttribute('data-mla-speaking')
  speaking = el
  el?.setAttribute('data-mla-speaking', '')
}

export function speak(text: string, rate: number, el: Element | null = null): void {
  if (!supported() || !text.trim()) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000))
  utterance.rate = rate
  utterance.lang = document.documentElement.lang || navigator.language || 'en'
  utterance.voice = localVoice(utterance.lang) ?? null
  utterance.onend = () => markSpeaking(null)
  utterance.onerror = () => markSpeaking(null)
  markSpeaking(el)
  speechSynthesis.speak(utterance)
}

export function stop(): void {
  if (supported()) speechSynthesis.cancel()
  markSpeaking(null)
}

function readFrom(target: EventTarget | null): void {
  if (!(target instanceof Element) || isOurs(target) || !ctxRef) return
  // Read the smallest block that actually carries the text, so clicking a
  // paragraph reads the paragraph rather than the whole section it sits in.
  const block = target.closest(
    'p, li, h1, h2, h3, h4, h5, h6, a, button, label, td, th, figcaption, blockquote, [role="button"], [role="link"]',
  )
  const el = block ?? target
  const text = accessibleText(el)
  if (text) speak(text, ctxRef.getState().readerRate, el)
}

function onClick(event: MouseEvent): void {
  readFrom(event.target)
}

function onFocusIn(event: FocusEvent): void {
  readFrom(event.target)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') stop()
}

export function enable(ctx: FeatureContext): void {
  teardown()
  ctxRef = ctx
  document.documentElement.setAttribute('data-mla-reader', '')
  document.addEventListener('click', onClick, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('keydown', onKeydown, true)
}

export function teardown(): void {
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('focusin', onFocusIn, true)
  document.removeEventListener('keydown', onKeydown, true)
  document.documentElement.removeAttribute('data-mla-reader')
  stop()
  ctxRef = null
}
