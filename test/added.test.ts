/**
 * Content added after a feature runs is handled on its own, never by
 * re-walking the whole page (#4), and inherited sizes are not scaled twice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'

const idle = () => new Promise((resolve) => setTimeout(resolve, 400))
let element: AccessLayerElement

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<main style="font-size: 16px; line-height: 1.5"><p id="p">Hello</p></main>'
  element = mount()
})

afterEach(() => {
  unmount()
  vi.restoreAllMocks()
})

const add = (html: string, parent = document.getElementById('p')!) => {
  const holder = document.createElement('div')
  holder.innerHTML = html
  const added = holder.firstElementChild as HTMLElement
  parent.append(added)
  return added
}

describe('content added later', () => {
  it('gets Bigger Text once, not on top of what it inherits', async () => {
    element.settings.set({ textScale: 2 }) // 1.3×
    expect(getComputedStyle(document.getElementById('p')!).fontSize).toBe('20.8px')
    const inherits = add('<span>new</span>')
    await idle()
    expect(getComputedStyle(inherits).fontSize).toBe('20.8px')
    // An element with its own size is checked in e2e/tiles.spec.ts: happy-dom
    // lets an inherited !important beat an element's own size.
    expect(getComputedStyle(document.getElementById('p')!).fontSize).toBe('20.8px')
  })

  it('gets Line height once, not on top of what it inherits', async () => {
    element.settings.set({ lineHeight: 1 }) // 1.5×
    const inherits = add('<span>new</span>')
    await idle()
    expect(parseFloat(inherits.style.getPropertyValue('line-height'))).toBe(2.25) // 1.5 × 1.5, not 1.5 × 2.25
  })

  it('is measured on its own, not by re-walking the page', async () => {
    const main = document.querySelector('main')!
    for (let i = 0; i < 500; i++) add(`<p>Paragraph ${i} with <a href="#">a link</a>.</p>`, main)
    element.settings.set({ textScale: 2, lineHeight: 1, smartContrast: true })
    await idle()
    const spy = vi.spyOn(window, 'getComputedStyle')
    add('<span>one new line</span>')
    await idle()
    // A few calls per feature for the one element and its ancestors, against
    // thousands for a full pass over 1,000 elements.
    expect(spy.mock.calls.length).toBeLessThan(40)
  })

  it('does not re-run Bigger Text when only the height changes', async () => {
    element.settings.set({ textScale: 2 })
    const spy = vi.spyOn(window, 'getComputedStyle')
    dispatchEvent(new Event('resize'))
    await idle()
    expect(spy).not.toHaveBeenCalled()
  })

  it('re-measures Bigger Text from the page sizes when the width changes', async () => {
    const happyDOM = (window as unknown as { happyDOM: { setViewport(size: { width: number }): void } }).happyDOM
    const width = innerWidth
    const breakpoint = document.createElement('style')
    breakpoint.textContent = `@media (min-width: ${width + 100}px) { #p { font-size: 20px } }`
    document.head.append(breakpoint)
    try {
      element.settings.set({ textScale: 2 }) // 1.3×
      expect(getComputedStyle(document.getElementById('p')!).fontSize).toBe('20.8px')
      happyDOM.setViewport({ width: width + 200 })
      dispatchEvent(new Event('resize'))
      await idle()
      expect(getComputedStyle(document.getElementById('p')!).fontSize).toBe('26px')
    } finally {
      breakpoint.remove()
      happyDOM.setViewport({ width })
    }
  })

  it('ignores changes inside the widget', async () => {
    element.settings.set({ textScale: 2, lineHeight: 1, smartContrast: true })
    await idle()
    const spy = vi.spyOn(window, 'getComputedStyle')
    element.open()
    element.settings.set({ oversized: true })
    await idle()
    const fromPage = spy.mock.calls.filter(([el]) => !(el as Element).closest('access-layer') && el.getRootNode() === document)
    expect(fromPage).toHaveLength(0)
  })
})
