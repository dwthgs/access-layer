/**
 * Reading Mask and Reading Guide.
 *
 * Both follow the pointer, and both also follow keyboard focus so they are
 * usable without a mouse. The mask dims everything outside a horizontal band;
 * the guide is a single ruled line. They live in the widget's shadow root, on
 * a pointer-transparent layer, so nothing on the page below becomes unclickable.
 */

import { h } from '../util/dom'
import type { FeatureContext } from './context'

const BAND_HEIGHT = 130

let mask: HTMLElement | null = null
let guide: HTMLElement | null = null
let frame = 0
let pointerY = -1

function schedule(render: () => void): void {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    render()
  })
}

function onPointerMove(event: PointerEvent | MouseEvent): void {
  pointerY = event.clientY
  schedule(render)
}

function onFocus(event: FocusEvent): void {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const rect = target.getBoundingClientRect()
  pointerY = rect.top + rect.height / 2
  schedule(render)
}

function render(): void {
  if (pointerY < 0) return
  if (mask) {
    const top = Math.max(0, pointerY - BAND_HEIGHT / 2)
    mask.style.setProperty('--mla-band-top', `${top}px`)
    mask.style.setProperty('--mla-band-height', `${BAND_HEIGHT}px`)
  }
  if (guide) {
    guide.style.transform = `translateY(${Math.round(pointerY)}px)`
  }
}

function listen(): void {
  addEventListener('pointermove', onPointerMove, { passive: true })
  addEventListener('mousemove', onPointerMove, { passive: true })
  addEventListener('focusin', onFocus, true)
}

function unlisten(): void {
  removeEventListener('pointermove', onPointerMove)
  removeEventListener('mousemove', onPointerMove)
  removeEventListener('focusin', onFocus, true)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

export function enableMask(ctx: FeatureContext): void {
  teardown()
  mask = h('div', { class: 'mla-mask', 'aria-hidden': 'true' })
  ctx.layer.append(mask)
  if (pointerY < 0) pointerY = innerHeight / 2
  listen()
  render()
}

export function enableGuide(ctx: FeatureContext): void {
  teardown()
  guide = h('div', { class: 'mla-guide', 'aria-hidden': 'true' })
  ctx.layer.append(guide)
  if (pointerY < 0) pointerY = innerHeight / 2
  listen()
  render()
}

export function teardown(): void {
  unlisten()
  mask?.remove()
  guide?.remove()
  mask = null
  guide = null
}
