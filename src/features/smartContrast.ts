/**
 * Smart Contrast.
 *
 * Walks every element that renders its own text, works out the colour it is
 * actually drawn against, and darkens or lightens the text just enough to
 * clear the WCAG 1.4.3 threshold. Hue is preserved where it can be, so brand
 * colours stay recognisable rather than collapsing to black.
 *
 * This is deliberately conservative: an element whose background cannot be
 * determined (an image, a gradient, a translucent layer) is left alone
 * instead of being guessed at and made worse.
 */

import { contrastRatio, enforceContrast, parseColor, toCss, type RGB } from '../util/contrast'
import { watchAdded } from '../util/added'
import { walkTextElements } from '../util/dom'

const TARGET_NORMAL = 4.5
const TARGET_LARGE = 3
const PAGE_DEFAULT: RGB = [255, 255, 255]

const originals = new WeakMap<HTMLElement, { value: string; priority: string }>()
let touched: HTMLElement[] = []
let stopWatching: (() => void) | null = null

/** True when the element renders at least one non-empty text node itself. */
function hasOwnText(el: HTMLElement): boolean {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true
  }
  return false
}

/** The first opaque background colour up the ancestor chain. */
function effectiveBackground(el: HTMLElement): RGB | null {
  let current: HTMLElement | null = el
  while (current) {
    const style = getComputedStyle(current)
    if (style.backgroundImage !== 'none') return null
    const colour = parseColor(style.backgroundColor)
    if (colour) return colour
    current = current.parentElement
  }
  return PAGE_DEFAULT
}

function restore(): void {
  for (const el of touched) {
    const original = originals.get(el)
    el.style.removeProperty('color')
    if (original?.value) el.style.setProperty('color', original.value, original.priority)
    originals.delete(el)
  }
  touched = []
}

/** Fix the elements not fixed yet. */
function check(elements: HTMLElement[]): void {
  for (const el of elements) {
    if (originals.has(el) || !hasOwnText(el)) continue

    const style = getComputedStyle(el)
    const foreground = parseColor(style.color)
    if (!foreground) continue

    const background = effectiveBackground(el)
    if (!background) continue

    const sizePx = parseFloat(style.fontSize)
    const weight = Number(style.fontWeight) || 400
    const isLarge = sizePx >= 24 || (sizePx >= 18.66 && weight >= 700)
    const target = isLarge ? TARGET_LARGE : TARGET_NORMAL

    if (contrastRatio(foreground, background) >= target) continue

    originals.set(el, {
      value: el.style.getPropertyValue('color'),
      priority: el.style.getPropertyPriority('color'),
    })
    el.style.setProperty('color', toCss(enforceContrast(foreground, background, target)), 'important')
    touched.push(el)
  }
}

export function apply(): void {
  restore()
  check(walkTextElements())
  stopWatching ??= watchAdded(check)
}

export function teardown(): void {
  stopWatching?.()
  stopWatching = null
  restore()
}
