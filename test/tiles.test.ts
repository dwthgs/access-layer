/**
 * The panel's tiles: step bars for anything with more than on and off, the
 * option's full name on the tile while it is on, and the check in the corner.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'
import { stepCount } from '../src/panel'

let element: AccessLayerElement

function tile(name: string): HTMLButtonElement {
  const found = Array.from(
    element.shadowRoot?.querySelectorAll<HTMLButtonElement>('.mla-tile') ?? [],
  ).find((button) => {
    const label = button.getAttribute('aria-label') ?? ''
    return label === name || label.startsWith(`${name},`)
  })
  if (!found) throw new Error(`no "${name}" tile`)
  return found
}
const bars = (button: HTMLElement) => button.querySelectorAll('.mla-step').length
const filled = (button: HTMLElement) => button.querySelectorAll('.mla-step[data-on]').length
const label = (button: HTMLElement) => button.querySelector('.mla-tile-label')?.textContent

beforeEach(() => {
  localStorage.clear()
  document.documentElement.setAttribute('lang', 'en')
  document.body.innerHTML = '<main><p>Content</p></main>'
  element = mount()
})

afterEach(() => {
  unmount()
  document.documentElement.removeAttribute('lang')
  for (const attribute of Array.from(document.documentElement.attributes)) {
    if (attribute.name.startsWith('data-mla')) document.documentElement.removeAttribute(attribute.name)
  }
})

describe('step bars', () => {
  it.each([
    ['Bigger text', 4],
    ['Text spacing', 3],
    ['Line height', 3],
    ['Contrast', 3],
    ['Saturation', 3],
    ['Cursor', 3],
    ['Text align', 4],
    ['Dyslexia friendly', 2],
  ])('%s has %i', (name, count) => {
    expect(bars(tile(name))).toBe(count)
  })

  it.each(['Screen reader', 'Smart contrast', 'Highlight links', 'Pause animations', 'Hide images', 'Tooltips', 'Dictionary'])(
    'on/off tile %s has none',
    (name) => {
      expect(tile(name).querySelector('.mla-steps')).toBeNull()
    },
  )

  it('are there only while the tile is on (the stylesheet hides them when off)', () => {
    const css = Array.from(element.shadowRoot!.adoptedStyleSheets, (each) => Array.from(each.cssRules, (rule) => rule.cssText).join('\n')).join('\n')
    expect(css).toContain('.mla-tile:not([aria-pressed="true"]) .mla-steps { visibility: hidden; }')
    expect(tile('Contrast').getAttribute('aria-pressed')).toBe('false')
    tile('Contrast').click()
    expect(tile('Contrast').getAttribute('aria-pressed')).toBe('true')
  })

  it('are hidden from assistive technology, which reads the state from the label', () => {
    expect(tile('Saturation').querySelector('.mla-steps')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('fill one per level for a levelled tile', () => {
    expect(filled(tile('Bigger text'))).toBe(0)
    tile('Bigger text').click()
    expect(filled(tile('Bigger text'))).toBe(1)
    tile('Bigger text').click()
    tile('Bigger text').click()
    expect(filled(tile('Bigger text'))).toBe(3)
    tile('Bigger text').click()
    tile('Bigger text').click() // past the last level: back to off
    expect(filled(tile('Bigger text'))).toBe(0)
  })

  it('fill up to the chosen option, as in UserWay', () => {
    tile('Saturation').click()
    expect(filled(tile('Saturation'))).toBe(1) // Low
    tile('Saturation').click()
    expect(filled(tile('Saturation'))).toBe(2) // High
    tile('Saturation').click()
    expect(filled(tile('Saturation'))).toBe(3) // Monochrome
    tile('Saturation').click()
    expect(filled(tile('Saturation'))).toBe(0) // off
  })

  it('follow settings changed from elsewhere, such as a profile or the API', () => {
    element.settings.set({ contrast: 'light', textScale: 2 })
    expect(filled(tile('Contrast'))).toBe(3)
    expect(filled(tile('Bigger text'))).toBe(2)
    element.settings.reset()
    expect(filled(tile('Contrast'))).toBe(0)
    expect(filled(tile('Bigger text'))).toBe(0)
  })
})

describe('the tile label', () => {
  it("reads the option's full name while it is on", () => {
    expect(label(tile('Saturation'))).toBe('Saturation')
    tile('Saturation').click()
    expect(label(tile('Saturation'))).toBe('Low saturation')
    tile('Saturation').click()
    expect(label(tile('Saturation'))).toBe('High saturation')
    tile('Saturation').click()
    expect(label(tile('Saturation'))).toBe('Monochrome')
    tile('Saturation').click()
    expect(label(tile('Saturation'))).toBe('Saturation')
  })

  it.each([
    [{ contrast: 'invert' }, 'Contrast', 'Invert colors'],
    [{ contrast: 'dark' }, 'Contrast', 'Dark contrast'],
    [{ cursor: 'mask' }, 'Cursor', 'Reading mask'],
    [{ textAlign: 'center' }, 'Text align', 'Align center'],
    [{ font: 'legible' }, 'Dyslexia friendly', 'Legible font'],
  ] as const)('%o shows "%s" as "%s"', (patch, name, shown) => {
    element.settings.set(patch)
    expect(label(tile(name))).toBe(shown)
  })

  it('keeps its name for a levelled tile', () => {
    element.settings.set({ textScale: 3 })
    expect(label(tile('Bigger text'))).toBe('Bigger text')
  })

  it('shows the multiplier on Line height, as UserWay does', () => {
    expect(label(tile('Line height'))).toBe('Line height')
    tile('Line height').click()
    expect(label(tile('Line height'))).toBe('Line height 1.5\u00d7')
    tile('Line height').click()
    expect(label(tile('Line height'))).toBe('Line height 1.75\u00d7')
    tile('Line height').click()
    expect(label(tile('Line height'))).toBe('Line height 2\u00d7')
    expect(tile('Line height').getAttribute('aria-label')).toBe('Line height, 2\u00d7, Level 3 of 3')
    tile('Line height').click()
    expect(label(tile('Line height'))).toBe('Line height')
  })

  it('keeps an on/off tile\'s name when it is switched on', () => {
    // Regression: switching Dictionary on renamed the tile "Normal".
    tile('Dictionary').click()
    expect(label(tile('Dictionary'))).toBe('Dictionary')
    expect(tile('Dictionary').getAttribute('aria-label')).toBe('Dictionary')
    expect(tile('Dictionary').getAttribute('aria-pressed')).toBe('true')
    tile('Tooltips').click()
    expect(label(tile('Tooltips'))).toBe('Tooltips')
  })

  it('announces an on/off tile as On and Off', async () => {
    const live = element.shadowRoot?.querySelector('.mla-sr-only[role="status"]') as HTMLElement
    tile('Dictionary').click()
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(live.textContent).toBe('Dictionary: On')
    tile('Dictionary').click()
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(live.textContent).toBe('Dictionary: Off')
  })

  it('is translated', async () => {
    document.documentElement.setAttribute('lang', 'es')
    await new Promise((resolve) => setTimeout(resolve, 50))
    element.settings.set({ saturation: 'low' })
    expect(label(tile('Saturación'))).toBe('Saturación baja')
    expect(tile('Saturación').getAttribute('aria-label')).toBe('Saturación, Saturación baja, 1 de 3')
  })
})

describe('the accessible name', () => {
  it('starts with the tile name, then the state and step', () => {
    expect(tile('Saturation').getAttribute('aria-label')).toBe('Saturation, Off')
    element.settings.set({ saturation: 'high' })
    // Contains the visible label, so voice control ("click High saturation") works.
    expect(tile('Saturation').getAttribute('aria-label')).toBe('Saturation, High saturation, 2 of 3')
  })

  it('gives a level out of the total for a levelled tile', () => {
    element.settings.set({ textScale: 2 })
    expect(tile('Bigger text').getAttribute('aria-label')).toBe('Bigger text, Level 2 of 4')
  })

  it('is just the name for an on/off tile; aria-pressed carries the state', () => {
    element.settings.set({ hideImages: true })
    expect(tile('Hide images').getAttribute('aria-label')).toBe('Hide images')
    expect(tile('Hide images').getAttribute('aria-pressed')).toBe('true')
  })

  it('reports on and off through aria-pressed', () => {
    expect(tile('Cursor').getAttribute('aria-pressed')).toBe('false')
    element.settings.set({ cursor: 'big' })
    expect(tile('Cursor').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('the check badge', () => {
  it('is on every tile that can be switched on, and decorative', () => {
    const check = tile('Tooltips').querySelector('.mla-tile-check')
    expect(check).toBeTruthy()
    expect(check?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('stepCount', () => {
  it('counts levels, options above off, or nothing for on/off', () => {
    expect(stepCount({ levels: 4 })).toBe(4)
    expect(stepCount({ options: [null, 'a', 'b', 'c'] })).toBe(3)
    expect(stepCount({ options: [false, true] })).toBe(0)
    expect(stepCount({})).toBe(0)
  })
})
