/**
 * Tooltips.
 *
 * Surfaces the text a screen reader would announce — alt text, aria-label,
 * title — for sighted users who cannot resolve a small or ambiguous icon.
 * Bound to focus as well as hover so it is reachable from the keyboard.
 */

import { accessibleText, h, isOurs } from '../util/dom'
import type { FeatureContext } from './context'

let tip: HTMLElement | null = null
let current: Element | null = null

const CANDIDATE = 'img[alt], [aria-label], [title], a[href], button, [role="button"], input, svg'

function describe(el: Element): string {
  const explicit =
    el.getAttribute('aria-label') ??
    el.getAttribute('title') ??
    (el instanceof HTMLImageElement ? el.alt : null)
  if (explicit?.trim()) return explicit.trim()
  const derived = accessibleText(el)
  return derived.length > 0 && derived.length <= 160 ? derived : ''
}

function show(target: Element): void {
  if (!tip || target === current) return
  const text = describe(target)
  if (!text) {
    hide()
    return
  }
  current = target
  tip.textContent = text
  tip.classList.add('is-visible')

  const rect = target.getBoundingClientRect()
  const tipRect = tip.getBoundingClientRect()
  const gap = 10
  let top = rect.bottom + gap
  if (top + tipRect.height > innerHeight - 8) top = Math.max(8, rect.top - tipRect.height - gap)
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - tipRect.width / 2),
    Math.max(8, innerWidth - tipRect.width - 8),
  )
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
}

function hide(): void {
  current = null
  tip?.classList.remove('is-visible')
}

function onPointerOver(event: Event): void {
  const target = event.target
  if (!(target instanceof Element) || isOurs(target)) return
  const match = target.closest(CANDIDATE)
  if (match) show(match)
  else hide()
}

function onFocusIn(event: FocusEvent): void {
  const target = event.target
  if (!(target instanceof Element) || isOurs(target)) return
  show(target.closest(CANDIDATE) ?? target)
}

export function enable(ctx: FeatureContext): void {
  teardown()
  tip = h('div', { class: 'mla-tooltip', role: 'tooltip', 'aria-hidden': 'true' })
  ctx.layer.append(tip)
  document.addEventListener('pointerover', onPointerOver, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('pointerleave', hide, true)
  addEventListener('scroll', hide, { passive: true, capture: true })
}

export function teardown(): void {
  document.removeEventListener('pointerover', onPointerOver, true)
  document.removeEventListener('focusin', onFocusIn, true)
  document.removeEventListener('pointerleave', hide, true)
  removeEventListener('scroll', hide, true)
  tip?.remove()
  tip = null
  current = null
}
