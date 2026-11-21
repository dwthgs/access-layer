/**
 * Line Height.
 *
 * Three steps, 1.5×, 1.75× and 2× the page's own spacing, as UserWay does
 * them. A fixed value such as `line-height: 1.6 !important` does nothing on a
 * page that is already set at 1.6 (and tightens one set looser), so this
 * measures each element's own line height and multiplies it instead.
 *
 * The result is written as a unitless ratio, so it keeps scaling correctly
 * when Bigger Text changes the font size underneath it.
 */

import { watchAdded } from '../util/added'
import { walkTextElements } from '../util/dom'

export const FACTORS = [1, 1.5, 1.75, 2] as const

/** What browsers render for `line-height: normal`, near enough for every common font. */
const NORMAL_RATIO = 1.2

interface Original {
  value: string
  priority: string
}

const originals = new WeakMap<HTMLElement, Original>()
/** Each element's own ratio before the change. */
const base = new WeakMap<HTMLElement, number>()
let touched: HTMLElement[] = []
let level = 0
let stopWatching: (() => void) | null = null

function restore(): void {
  for (const el of touched) {
    const original = originals.get(el)
    el.style.removeProperty('line-height')
    if (original && original.value) {
      el.style.setProperty('line-height', original.value, original.priority)
    }
    originals.delete(el)
  }
  touched = []
}

/** An element's line height as a multiple of its font size. */
export function lineHeightRatio(lineHeight: string, fontSize: string): number | null {
  const size = parseFloat(fontSize)
  if (!Number.isFinite(size) || size <= 0) return null
  if (lineHeight === 'normal' || lineHeight === '') return NORMAL_RATIO
  const value = parseFloat(lineHeight)
  if (!Number.isFinite(value) || value <= 0) return null
  // Computed styles report px; a bare number is already a ratio.
  return lineHeight.endsWith('px') ? value / size : value
}

function spaced(el: HTMLElement): string {
  return ((base.get(el) ?? NORMAL_RATIO) * (FACTORS[level] ?? 1)).toFixed(3)
}

/** Space the elements not spaced yet. */
function space(elements: HTMLElement[]): void {
  // Measure everything before writing anything: a parent's new line height
  // is inherited by children that do not set their own, and would be
  // measured, and multiplied, a second time.
  const measured: [HTMLElement, number][] = []
  for (const el of elements) {
    if (originals.has(el)) continue
    const style = getComputedStyle(el)
    const ratio = lineHeightRatio(style.lineHeight, style.fontSize)
    if (ratio !== null) measured.push([el, ratio])
  }

  for (const [el, ratio] of measured) {
    originals.set(el, {
      value: el.style.getPropertyValue('line-height'),
      priority: el.style.getPropertyPriority('line-height'),
    })
    base.set(el, ratio)
    el.style.setProperty('line-height', spaced(el), 'important')
    touched.push(el)
  }
}

/** As for Bigger Text: hold the nearest spaced ancestor at its own ratio while measuring. */
function spaceAdded(elements: HTMLElement[]): void {
  const held = new Set<HTMLElement>()
  for (const el of elements) {
    let ancestor = el.parentElement
    while (ancestor && !originals.has(ancestor)) ancestor = ancestor.parentElement
    if (ancestor) held.add(ancestor)
  }
  for (const el of held) el.style.setProperty('line-height', String(base.get(el)), 'important')
  space(elements)
  for (const el of held) el.style.setProperty('line-height', spaced(el), 'important')
}

export function apply(next: number): void {
  level = Math.max(0, Math.min(FACTORS.length - 1, Math.round(next)))
  restore()

  if ((FACTORS[level] ?? 1) === 1) {
    stopObserving()
    return
  }

  space(walkTextElements())
  stopWatching ??= watchAdded(spaceAdded)
}

function stopObserving(): void {
  stopWatching?.()
  stopWatching = null
}

export function teardown(): void {
  stopObserving()
  restore()
  level = 0
}
