/**
 * End-to-end-ish checks against a real DOM: mount the element, drive the
 * public API, and assert the page actually changed.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'
import { PANEL_CSS } from '../src/styles/panel'
import { contrastRatio, parseColor } from '../src/util/contrast'

function html(): HTMLElement {
  return document.documentElement
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<main id="main"><h1>Title</h1><p>Body text</p><a href="/x">Link</a></main>'
})

afterEach(() => {
  unmount()
  for (const attribute of Array.from(html().attributes)) {
    if (attribute.name.startsWith('data-mla')) html().removeAttribute(attribute.name)
  }
})

describe('mount', () => {
  it('adds exactly one element however many times it is called', () => {
    const first = mount()
    const second = mount()
    expect(first).toBe(second)
    expect(document.querySelectorAll('access-layer')).toHaveLength(1)
  })

  it('builds a shadow root with a trigger button', () => {
    const element = mount()
    const trigger = element.shadowRoot?.querySelector('.mla-trigger')
    expect(trigger).toBeTruthy()
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('injects the page stylesheet once', () => {
    mount()
    mount()
    expect(document.adoptedStyleSheets).toHaveLength(1)
  })

  it('adds a skip link as the first thing in the body', () => {
    mount()
    expect(document.body.firstElementChild?.classList.contains('mla-skip-link')).toBe(true)
  })

  it('honours no-skip-link', () => {
    mount({ skipLink: false })
    expect(document.querySelector('.mla-skip-link')).toBeNull()
  })
})

describe('settings drive the document', () => {
  let element: AccessLayerElement

  beforeEach(() => {
    element = mount()
  })

  it('writes contrast as an attribute the stylesheet keys off', () => {
    element.settings.set({ contrast: 'dark' })
    expect(html().getAttribute('data-mla-contrast')).toBe('dark')
    element.settings.set({ contrast: null })
    expect(html().hasAttribute('data-mla-contrast')).toBe(false)
  })

  it('maps every simple toggle to its own attribute', () => {
    element.settings.set({
      highlightLinks: true,
      hideImages: true,
      pauseAnimations: true,
      saturation: 'mono',
      font: 'dyslexic',
      lineHeight: 2,
      letterSpacing: 1,
      textAlign: 'left',
      cursor: 'big',
    })
    expect(html().hasAttribute('data-mla-links')).toBe(true)
    expect(html().hasAttribute('data-mla-noimg')).toBe(true)
    expect(html().hasAttribute('data-mla-nomotion')).toBe(true)
    expect(html().getAttribute('data-mla-sat')).toBe('mono')
    expect(html().getAttribute('data-mla-font')).toBe('dyslexic')
    expect(html().getAttribute('data-mla-lh')).toBe('2')
    expect(html().getAttribute('data-mla-ls')).toBe('1')
    expect(html().getAttribute('data-mla-align')).toBe('left')
    expect(html().getAttribute('data-mla-cursor')).toBe('big')
  })

  it('persists across a remount', () => {
    element.settings.set({ contrast: 'light', textScale: 2 })
    unmount()
    const again = mount()
    expect(again.settings.state.contrast).toBe('light')
    expect(again.settings.state.textScale).toBe(2)
  })

  it('reset clears the page attributes', () => {
    element.settings.set({ contrast: 'dark', highlightLinks: true })
    element.settings.reset()
    expect(html().hasAttribute('data-mla-contrast')).toBe(false)
    expect(html().hasAttribute('data-mla-links')).toBe(false)
  })

  it('clears the profile label once a single control is touched', () => {
    element.settings.setProfile('dyslexia')
    expect(element.settings.state.profile).toBe('dyslexia')
    element.settings.set({ highlightLinks: true })
    expect(element.settings.state.profile).toBeNull()
  })

  it('keeps the profile label when only widget preferences change', () => {
    element.settings.setProfile('vision')
    element.settings.set({ position: 'top-right' })
    expect(element.settings.state.profile).toBe('vision')
  })
})

describe('panel', () => {
  it('opens and closes, reporting state to assistive technology', () => {
    const element = mount()
    const trigger = element.shadowRoot?.querySelector('.mla-trigger') as HTMLButtonElement
    const panel = element.shadowRoot?.querySelector('.mla-panel') as HTMLElement

    expect(panel.hasAttribute('data-open')).toBe(false)
    element.open()
    expect(panel.hasAttribute('data-open')).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    element.close()
    expect(panel.hasAttribute('data-open')).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens on Alt+A', () => {
    const element = mount()
    const panel = element.shadowRoot?.querySelector('.mla-panel') as HTMLElement
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', altKey: true, bubbles: true }))
    expect(panel.hasAttribute('data-open')).toBe(true)
  })

  it.each([
    ['a text field', '<input type="text">'],
    ['a textarea', '<textarea></textarea>'],
    ['a rich-text editor', '<div contenteditable="true"><p>post</p></div>'],
    ['a custom textbox', '<div role="textbox" tabindex="0"></div>'],
  ])('leaves Alt+A to %s, where it types a character', (_, markup) => {
    const element = mount()
    const panel = element.shadowRoot?.querySelector('.mla-panel') as HTMLElement
    document.querySelector('main')!.insertAdjacentHTML('beforeend', markup)
    const field = document.querySelector('main')!.lastElementChild!
    const target = field.querySelector('p') ?? field
    const event = new KeyboardEvent('keydown', { code: 'KeyA', altKey: true, bubbles: true, composed: true, cancelable: true })
    target.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(panel.hasAttribute('data-open')).toBe(false)
  })

  it('leaves Alt+A to a custom textbox that edits inside its own shadow root', () => {
    const element = mount()
    const panel = element.shadowRoot?.querySelector('.mla-panel') as HTMLElement
    const host = document.createElement('div')
    host.setAttribute('role', 'textbox')
    const inner = document.createElement('div')
    inner.tabIndex = 0
    host.attachShadow({ mode: 'open' }).append(inner)
    document.querySelector('main')!.append(host)
    const event = new KeyboardEvent('keydown', { code: 'KeyA', altKey: true, bubbles: true, composed: true, cancelable: true })
    inner.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(panel.hasAttribute('data-open')).toBe(false)
  })

  it('still opens on Alt+A from a checkbox or button', () => {
    const element = mount()
    const panel = element.shadowRoot?.querySelector('.mla-panel') as HTMLElement
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<input type="checkbox">')
    document.querySelector('main input')!.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyA', altKey: true, bubbles: true, composed: true }),
    )
    expect(panel.hasAttribute('data-open')).toBe(true)
  })

  it("closes on Alt+A from the panel's own search field", () => {
    const element = mount()
    element.open()
    const search = element.shadowRoot!.querySelector<HTMLInputElement>('.mla-lang-input')!
    search.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', altKey: true, bubbles: true, composed: true }))
    expect(element.shadowRoot!.querySelector('.mla-panel')!.hasAttribute('data-open')).toBe(false)
  })

  it('renders a tile for every tool', () => {
    const element = mount()
    const tiles = element.shadowRoot?.querySelectorAll('.mla-tile') ?? []
    expect(tiles.length).toBe(16)
  })

  it('cycles a multi-state tile through its options and back to off', () => {
    const element = mount()
    const tiles = Array.from(element.shadowRoot?.querySelectorAll<HTMLButtonElement>('.mla-tile') ?? [])
    const contrastTile = tiles.find((tile) => tile.textContent?.includes('Contrast') && !tile.textContent?.includes('Smart'))
    expect(contrastTile).toBeTruthy()
    contrastTile?.click()
    expect(element.settings.state.contrast).toBe('invert')
    contrastTile?.click()
    expect(element.settings.state.contrast).toBe('dark')
    contrastTile?.click()
    expect(element.settings.state.contrast).toBe('light')
    contrastTile?.click()
    expect(element.settings.state.contrast).toBeNull()
  })

  it('re-renders in the chosen language', () => {
    const element = mount()
    element.settings.set({ lang: 'es' })
    const title = element.shadowRoot?.querySelector('.mla-title')
    expect(title?.textContent).toBe('Menú de accesibilidad')
  })

  it('exposes a profile button for each profile', () => {
    const element = mount()
    expect(element.shadowRoot?.querySelectorAll('.mla-profile')).toHaveLength(8)
  })
})

describe('small accessibility fixes (#14)', () => {
  it('keeps the active profile when only the reading speed changes (L-11)', () => {
    const element = mount()
    element.settings.setProfile('blind')
    element.settings.set({ readerRate: 1.5 })
    expect(element.settings.state.profile).toBe('blind')
  })

  it('titles the panel with an h2, not a second h1 for the page (L-16)', () => {
    const element = mount()
    expect(element.shadowRoot!.querySelector('h1')).toBeNull()
    expect(element.shadowRoot!.querySelector('h2.mla-title')).not.toBeNull()
  })

  it('makes the Page structure views toggle buttons, not half-built tabs (L-5)', () => {
    const element = mount()
    element.open()
    Array.from(element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.mla-tile'))
      .find((tile) => tile.textContent?.includes('Page structure'))!
      .click()
    const buttons = Array.from(element.shadowRoot!.querySelectorAll('.mla-struct-tab'))
    expect(buttons).toHaveLength(3)
    expect(element.shadowRoot!.querySelector('[role="tab"], [role="tablist"]')).toBeNull()
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
  })
})

describe('unmount', () => {
  it('leaves no trace on the document', async () => {
    const element = mount()
    element.settings.set({ contrast: 'dark', highlightLinks: true })
    unmount()
    await Promise.resolve() // removal is confirmed a microtask later, so a move is not one
    expect(document.querySelector('access-layer')).toBeNull()
    expect(document.querySelector('.mla-skip-link')).toBeNull()
    expect(html().hasAttribute('data-mla-contrast')).toBe(false)
    expect(document.adoptedStyleSheets).toHaveLength(0)
  })
})

describe('moving and re-inserting (#3)', () => {
  const altA = () => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', altKey: true, bubbles: true }))
  const isOpen = (element: AccessLayerElement) =>
    element.shadowRoot!.querySelector('.mla-panel')!.hasAttribute('data-open')

  it('keeps working when moved to another parent', async () => {
    const element = mount()
    element.settings.set({ highlightLinks: true })
    document.querySelector('main')!.append(element)
    await Promise.resolve()
    expect(html().hasAttribute('data-mla-links')).toBe(true)
    expect(document.adoptedStyleSheets).toHaveLength(1)
    altA()
    expect(isOpen(element)).toBe(true)
  })

  it('sets itself up again when re-inserted after being removed', async () => {
    const element = mount()
    element.settings.set({ highlightLinks: true })
    element.remove()
    await Promise.resolve()
    expect(html().hasAttribute('data-mla-links')).toBe(false)
    expect(document.adoptedStyleSheets).toHaveLength(0)
    document.body.append(element)
    expect(html().hasAttribute('data-mla-links')).toBe(true) // the saved setting comes back
    expect(document.adoptedStyleSheets).toHaveLength(1)
    expect(document.querySelectorAll('.mla-skip-link')).toHaveLength(1)
    expect(element.shadowRoot!.querySelectorAll('.mla-panel')).toHaveLength(1)
    altA()
    expect(isOpen(element)).toBe(true)
  })

  it('lets a new widget replace a removed one in the same task', async () => {
    const first = mount()
    first.settings.set({ highlightLinks: true })
    first.remove()
    const second = mount()
    await Promise.resolve()
    expect(second).not.toBe(first)
    expect(html().hasAttribute('data-mla-links')).toBe(true)
    expect(document.adoptedStyleSheets).toHaveLength(1)
    altA()
    expect(isOpen(second)).toBe(true)
  })
})

describe('under a strict style-src CSP', () => {
  it('adds no <style> elements, which the policy would block', async () => {
    const element = mount()
    element.settings.set({ contrast: 'dark', highlightLinks: true })
    expect(document.querySelectorAll('style')).toHaveLength(0)
    expect(element.shadowRoot!.querySelectorAll('style')).toHaveLength(0)
    expect(element.shadowRoot!.adoptedStyleSheets).toHaveLength(1)
    expect(document.adoptedStyleSheets).toHaveLength(1)
    unmount()
  })
})

describe('keyboard', () => {
  it('focuses the dialog itself when it opens, so its name is announced', () => {
    const element = mount()
    element.open()
    const panel = element.shadowRoot?.querySelector('.mla-panel')
    expect(element.shadowRoot?.activeElement).toBe(panel)
  })

  it('returns focus to the trigger when it closes', () => {
    // Regression: inside a shadow root `document.activeElement` is the host,
    // which cannot hold focus, so restoring "the previously focused element"
    // dropped a keyboard user back to the top of the page.
    const element = mount()
    element.open()
    element.close()
    expect(element.shadowRoot?.activeElement).toBe(
      element.shadowRoot?.querySelector('.mla-trigger'),
    )
  })

  it('closes on Escape', () => {
    const element = mount()
    element.open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    const panel = element.shadowRoot?.querySelector('.mla-panel') as HTMLElement
    expect(panel.hasAttribute('data-open')).toBe(false)
  })

  it('does not steal focus when close is called on an already closed panel', () => {
    const element = mount()
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    element.close()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})

describe('profile cards', () => {
  it('are named by the profile alone, with what it does as the description', () => {
    const element = mount()
    const card = element.shadowRoot?.querySelector('[data-profile="seizure"]') as HTMLButtonElement
    expect(card.textContent).toBe('Seizure & Epileptic')
    const description = element.shadowRoot?.getElementById(card.getAttribute('aria-describedby') ?? '')
    expect(description?.textContent).toBe('No animation, muted colour')
    expect(card.contains(description ?? null)).toBe(false)
  })
})

describe('the configured colour', () => {
  afterEach(() => vi.restoreAllMocks())
  const accent = (element: AccessLayerElement) => element.style.getPropertyValue('--mla-accent')

  it('accepts any CSS colour, not only hex and rgb()', () => {
    // happy-dom reports colours as written; a browser computes them to rgb().
    const computed = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) =>
      (el as HTMLElement).style.color === 'rebeccapurple'
        ? ({ color: 'rgb(102, 51, 153)' } as CSSStyleDeclaration)
        : computed(el, pseudo),
    )
    expect(accent(mount({ color: 'rebeccapurple' }))).toBe('rgb(102, 51, 153)')
  })

  it('falls back to the default only when the colour is invalid', () => {
    expect(accent(mount({ color: 'not-a-colour' }))).toBe('')
  })

  it('fills with an opaque colour that passes against white text', () => {
    const fill = accent(mount({ color: '#767676f2' }))
    expect(fill).toMatch(/^rgb\(/)
    expect(contrastRatio(parseColor(fill)!, [255, 255, 255])).toBeGreaterThanOrEqual(4.5)
  })

  it('does not lighten the Reset button on hover, where white text only just passes', () => {
    const hover = PANEL_CSS.match(/\.mla-reset:hover\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(hover).not.toMatch(/brightness\(\s*(1(\.\d*)?|[2-9])/)
  })
})
