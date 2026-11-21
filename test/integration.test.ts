/**
 * Host-app integration: the host's own trigger buttons, a site-chosen
 * position, and following the page's language.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'

const settle = () => new Promise((resolve) => setTimeout(resolve, 200))

function floating(element: AccessLayerElement): HTMLButtonElement {
  return element.shadowRoot?.querySelector('.mla-trigger') as HTMLButtonElement
}
function panelOpen(element: AccessLayerElement): boolean {
  return !!element.shadowRoot?.querySelector('.mla-panel')?.hasAttribute('data-open')
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('lang')
  document.body.innerHTML = '<main><p>Content</p></main>'
})

afterEach(() => {
  unmount()
  document.documentElement.removeAttribute('lang')
})

describe('position', () => {
  it('honours the site default on first load', () => {
    // Regression: an attribute set before connection arrived before the shadow
    // root existed and was dropped, so the widget always sat bottom-left.
    const element = mount({ position: 'bottom-right' })
    expect(floating(element).dataset.pos).toBe('bottom-right')
    expect(element.shadowRoot?.querySelector('.mla-panel')?.getAttribute('data-side')).toBe('right')
  })

  it("lets the visitor's own choice beat the site default", () => {
    const first = mount({ position: 'bottom-right' })
    first.settings.set({ position: 'top-left' })
    unmount()
    const again = mount({ position: 'bottom-right' })
    expect(floating(again).dataset.pos).toBe('top-left')
  })

  it('uses the mobile position and offsets on a narrow screen', () => {
    // `preview` picks the device, as the console's preview does.
    const element = mount({ position: 'bottom-right', attributes: { 'mobile-position': 'top-left', 'offset-x': '40', 'mobile-offset-x': '8', preview: 'mobile' } })
    expect(floating(element).dataset.pos).toBe('top-left')
    expect(element.style.getPropertyValue('--mla-offset-x')).toBe('8px')
    element.setAttribute('preview', 'desktop')
    expect(floating(element).dataset.pos).toBe('bottom-right')
    expect(element.style.getPropertyValue('--mla-offset-x')).toBe('40px')
  })

  it('falls back to the desktop position and leaves offsets to the page when none are set', () => {
    const element = mount({ position: 'bottom-right', attributes: { preview: 'mobile', 'offset-y': 'calc(1px)' } })
    expect(floating(element).dataset.pos).toBe('bottom-right')
    expect(element.style.getPropertyValue('--mla-offset-x')).toBe('')
    expect(element.style.getPropertyValue('--mla-offset-y')).toBe('')
  })

  it('reads every setting from the script tag', async () => {
    document.body.insertAdjacentHTML('beforeend', '<script data-access-layer data-position="top-right" data-button-size="large" data-disabled-tools="dictionary" data-no-profiles></script>')
    vi.resetModules()
    await import('../src/index')
    const element = document.querySelector('access-layer')!
    expect(element.getAttribute('position')).toBe('top-right')
    expect(element.getAttribute('button-size')).toBe('large')
    expect(element.getAttribute('disabled-tools')).toBe('dictionary')
    expect(element.hasAttribute('no-profiles')).toBe(true)
    expect(element.hasAttribute('no-skip-link')).toBe(false)
  })

  it('ignores a position it does not recognise', () => {
    const element = mount({ position: 'somewhere' })
    expect(floating(element).dataset.pos).toBe('bottom-left')
  })
})

describe('language', () => {
  const title = (element: AccessLayerElement) =>
    element.shadowRoot?.querySelector('.mla-title')?.textContent

  it('starts in the page language', () => {
    // Regression: the stored default was 'en', so detection never ran.
    document.documentElement.lang = 'es-ES'
    const element = mount()
    expect(title(element)).toBe('Menú de accesibilidad')
  })

  it('follows the page when the host app switches locale', async () => {
    document.documentElement.lang = 'en'
    const element = mount()
    expect(title(element)).toBe('Accessibility menu')
    document.documentElement.lang = 'es'
    await settle()
    expect(title(element)).toBe('Menú de accesibilidad')
  })

  it("keeps the visitor's explicit choice when the page changes", async () => {
    document.documentElement.lang = 'en'
    const element = mount()
    element.settings.set({ lang: 'en' })
    document.documentElement.lang = 'es'
    await settle()
    expect(title(element)).toBe('Accessibility menu')
  })

  it('goes back to following the page when set to automatic', async () => {
    document.documentElement.lang = 'es'
    const element = mount()
    element.settings.set({ lang: 'en' })
    expect(title(element)).toBe('Accessibility menu')
    // The page's own language heads the list and means "as the page is".
    ;(element.shadowRoot?.querySelector('.mla-lang-toggle') as HTMLButtonElement).click()
    ;(element.shadowRoot?.querySelector('[role="option"]') as HTMLElement).click()
    expect(element.settings.state.lang).toBeNull()
    expect(title(element)).toBe('Menú de accesibilidad')
  })
})

describe('host-app triggers', () => {
  function addButton(id: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.id = id
    button.type = 'button'
    button.textContent = 'Accessibility Tools'
    document.body.append(button)
    return button
  }

  it('hides the floating button while a host trigger is visible', () => {
    addButton('accessLayerButton')
    const element = mount({ trigger: '#accessLayerButton' })
    expect(floating(element).hidden).toBe(true)
  })

  it('brings the floating button back when no host trigger exists', () => {
    // A layout without the host's nav must never leave the tools unreachable.
    const element = mount({ trigger: '#accessLayerButton' })
    expect(floating(element).hidden).toBe(false)
  })

  it('reacts when the host trigger appears or is hidden later', async () => {
    const element = mount({ trigger: '#accessLayerButton' })
    expect(floating(element).hidden).toBe(false)
    const button = addButton('accessLayerButton')
    await settle()
    expect(floating(element).hidden).toBe(true)
    button.hidden = true
    await settle()
    expect(floating(element).hidden).toBe(false)
  })

  it('returns focus from Page structure to the floating button once the host trigger is hidden', async () => {
    const button = addButton('accessLayerButton')
    const element = mount({ trigger: '#accessLayerButton' })
    button.focus()
    button.click()
    const tiles = Array.from(element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.mla-tile'))
    tiles.find((tile) => tile.textContent?.includes('Page structure'))!.click()
    expect(element.shadowRoot!.activeElement?.classList.contains('mla-struct-tab')).toBe(true)
    // A desktop-only host button, hidden by a resize while the dialog is open.
    button.hidden = true
    await settle()
    element.shadowRoot!.querySelector<HTMLButtonElement>('.mla-struct-close')!.click()
    expect(element.shadowRoot!.activeElement).toBe(floating(element))
  })

  it('opens and closes from any matching host button, including late ones', () => {
    const element = mount({ trigger: '#expanded, #collapsed' })
    const collapsed = addButton('collapsed')
    collapsed.click()
    expect(panelOpen(element)).toBe(true)
    collapsed.click()
    expect(panelOpen(element)).toBe(false)
  })

  it('reports its state to assistive technology on the host button', () => {
    const button = addButton('accessLayerButton')
    const element = mount({ trigger: '#accessLayerButton' })
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.click()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    element.close()
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('returns focus to the host button that opened it', () => {
    const button = addButton('accessLayerButton')
    const element = mount({ trigger: '#accessLayerButton' })
    button.focus()
    button.click()
    expect(panelOpen(element)).toBe(true)
    element.close()
    expect(document.activeElement).toBe(button)
  })

  it('returns focus to whatever was focused when opened by keyboard shortcut', () => {
    const field = document.createElement('input')
    document.body.append(field)
    const element = mount()
    field.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', ctrlKey: true, bubbles: true }))
    expect(panelOpen(element)).toBe(true)
    element.close()
    expect(document.activeElement).toBe(field)
  })

  it("hides the floating button outright with trigger='none'", () => {
    const element = mount({ trigger: 'none' })
    expect(floating(element).hidden).toBe(true)
  })

  it('survives an invalid selector', () => {
    const element = mount({ trigger: '###not a selector' })
    expect(floating(element).hidden).toBe(false)
    expect(() => document.body.click()).not.toThrow()
  })
})
