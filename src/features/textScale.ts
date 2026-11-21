/**
 * Bigger Text.
 *
 * Scaling `html { font-size }` only works on sites that size everything in
 * `rem`, and a global `font-size: X !important` would flatten every heading
 * to body size. So this measures each element's own computed size and
 * multiplies it, which preserves the page's typographic hierarchy and works
 * whether the site uses rem, em or px.
 *
 * The cost is that inline sizes override the site's own media queries, so a
 * change of viewport width re-runs the whole pass from the restored baseline.
 * Content added later is measured on its own.
 */

import { watchAdded } from '../util/added'
import { debounce, walkTextElements } from '../util/dom'

const SCALES = [1, 1.15, 1.3, 1.5, 1.75] as const

interface Original {
  value: string
  priority: string
}

const originals = new WeakMap<HTMLElement, Original>()
/** Each scaled element's own size before scaling, in px. */
const base = new WeakMap<HTMLElement, number>()
let touched: HTMLElement[] = []
let level = 0
let stopWatching: (() => void) | null = null
let width = 0

const reapply = debounce(() => apply(level), 250)

/** Only a width change can move a breakpoint; mobile toolbars change height. */
function onResize(): void {
  if (innerWidth === width) return
  width = innerWidth
  reapply()
}

function restore(): void {
  for (const el of touched) {
    const original = originals.get(el)
    el.style.removeProperty('font-size')
    if (original && original.value) {
      el.style.setProperty('font-size', original.value, original.priority)
    }
    originals.delete(el)
  }
  touched = []
}

function scaled(el: HTMLElement): string {
  return `${((base.get(el) ?? 0) * (SCALES[level] ?? 1)).toFixed(2)}px`
}

/** Scale the elements not scaled yet. */
function scale(elements: HTMLElement[]): void {
  // Two passes on purpose. Writing a parent's font-size changes what
  // getComputedStyle reports for any child sized in `em`, so every original
  // has to be measured before the first write lands.
  const measured: [HTMLElement, number][] = []
  for (const el of elements) {
    if (originals.has(el)) continue
    const size = parseFloat(getComputedStyle(el).fontSize)
    if (!Number.isFinite(size) || size <= 0) continue
    measured.push([el, size])
  }

  for (const [el, size] of measured) {
    originals.set(el, {
      value: el.style.getPropertyValue('font-size'),
      priority: el.style.getPropertyPriority('font-size'),
    })
    base.set(el, size)
    el.style.setProperty('font-size', scaled(el), 'important')
    touched.push(el)
  }
}

/**
 * New content inherits sizes its ancestors already have scaled. Put the
 * nearest scaled ancestor of each new element back to its own size while
 * measuring, so nothing is scaled twice.
 */
function scaleAdded(elements: HTMLElement[]): void {
  const held = new Set<HTMLElement>()
  for (const el of elements) {
    let ancestor = el.parentElement
    while (ancestor && !originals.has(ancestor)) ancestor = ancestor.parentElement
    if (ancestor) held.add(ancestor)
  }
  for (const el of held) el.style.setProperty('font-size', `${base.get(el)}px`, 'important')
  scale(elements)
  for (const el of held) el.style.setProperty('font-size', scaled(el), 'important')
}

export function apply(next: number): void {
  level = Math.max(0, Math.min(SCALES.length - 1, Math.round(next)))
  restore()

  if ((SCALES[level] ?? 1) === 1) {
    stopObserving()
    return
  }

  scale(walkTextElements())
  startObserving()
}

function startObserving(): void {
  if (stopWatching) return
  stopWatching = watchAdded(scaleAdded)
  width = innerWidth
  addEventListener('resize', onResize, { passive: true })
}

function stopObserving(): void {
  stopWatching?.()
  stopWatching = null
  removeEventListener('resize', onResize)
  reapply.cancel()
}

export function teardown(): void {
  stopObserving()
  restore()
  level = 0
}

export const LEVELS = SCALES.length - 1
