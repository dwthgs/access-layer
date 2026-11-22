/**
 * The language picker: a header with the current
 * language, and a searchable list that works from the keyboard.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'
import * as translate from '../src/features/translate'

let element: AccessLayerElement
const $ = <T extends Element = HTMLElement>(selector: string) =>
  element.shadowRoot!.querySelector(selector) as T
const $$ = (selector: string) => Array.from(element.shadowRoot!.querySelectorAll<HTMLElement>(selector))
const toggle = () => $<HTMLButtonElement>('.mla-lang-toggle')
const search = () => $<HTMLInputElement>('.mla-lang-input')
const names = () => $$('.mla-lang-name').map((n) => n.textContent)
const type = (text: string) => {
  search().value = text
  search().dispatchEvent(new Event('input'))
}
const key = (name: string, init: KeyboardEventInit = {}) =>
  search().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, composed: true, ...init }))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.setAttribute('lang', 'en')
  document.body.innerHTML = '<main><h1>Welcome</h1></main>'
  element = mount()
})

afterEach(async () => {
  unmount()
  await translate.teardown()
  document.documentElement.removeAttribute('lang')
})

describe('the header', () => {
  it('shows the current language with its code badge', () => {
    expect($('.mla-lang-toggle .mla-lang-badge').textContent).toBe('EN')
    expect($('.mla-lang-current').textContent).toBe('English')
    expect(toggle().getAttribute('aria-label')).toBe('Language: English')
  })

  it('follows the choice', () => {
    element.settings.set({ lang: 'ca' })
    expect($('.mla-lang-toggle .mla-lang-badge').textContent).toBe('CA')
    expect($('.mla-lang-current').textContent).toBe('Català (Catalan)')
  })

  it('shows the page language when nothing is chosen', async () => {
    unmount()
    document.documentElement.setAttribute('lang', 'es')
    element = mount()
    expect($('.mla-lang-current').textContent).toBe('Español (Spanish)')
  })

  it('opens and closes the list', () => {
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect($('.mla-lang-panel').hasAttribute('data-open')).toBe(false)
    toggle().click()
    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect($('.mla-lang-panel').hasAttribute('data-open')).toBe(true)
    toggle().click()
    expect($('.mla-lang-panel').hasAttribute('data-open')).toBe(false)
  })
})

describe('the list', () => {
  beforeEach(() => toggle().click())

  it("starts with the page's own language, then the rest in order", () => {
    const list = names()
    expect(list[0]).toBe('English')
    const rest = list.slice(1) as string[]
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)))
    expect(list).toHaveLength(translate.LANGUAGES.length)
  })

  it('marks the chosen language', () => {
    const selected = $$('[role="option"][aria-selected="true"]')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.querySelector('.mla-lang-name')?.textContent).toBe('English')
  })

  it('translates the page to what is picked', () => {
    $('#mla-lang-opt-fr').click()
    expect(element.settings.state.lang).toBe('fr')
    expect($('.mla-lang-panel').hasAttribute('data-open')).toBe(false)
  })

  it("puts the original back when the page's own language is picked", () => {
    element.settings.set({ lang: 'fr' })
    toggle().click()
    $('#mla-lang-opt-en').click()
    expect(element.settings.state.lang).toBeNull()
  })
})

describe('search', () => {
  beforeEach(() => toggle().click())

  it('is focused when the list opens', () => {
    expect(element.shadowRoot!.activeElement).toBe(search())
    expect(search().placeholder).toBe('Search language')
  })

  it('matches the native name, the English name or the code', () => {
    type('catal')
    expect(names()).toEqual(['Català (Catalan)'])
    type('german')
    expect(names()).toEqual(['Deutsch (German)'])
    type('ko')
    expect(names()).toContain('한국어 (Korean)')
  })

  it('ignores accents and case', () => {
    type('ESPANOL')
    expect(names()).toEqual(['Español (Spanish)'])
    type('tieng viet')
    expect(names()).toEqual(['Tiếng Việt (Vietnamese)'])
  })

  it('says so when nothing matches', () => {
    type('klingon')
    expect(names()).toEqual([])
    expect($('.mla-lang-empty').hidden).toBe(false)
    type('')
    expect($('.mla-lang-empty').hidden).toBe(true)
  })
})

describe('keyboard', () => {
  beforeEach(() => toggle().click())

  const activeName = () =>
    element.shadowRoot!.getElementById(search().getAttribute('aria-activedescendant') ?? '')
      ?.querySelector('.mla-lang-name')?.textContent

  it('is a combobox over a listbox', () => {
    expect(search().getAttribute('role')).toBe('combobox')
    expect(search().getAttribute('aria-controls')).toBe('mla-lang-options')
    expect($('#mla-lang-options').getAttribute('role')).toBe('listbox')
  })

  it('starts on the chosen language and moves with the arrows', () => {
    expect(activeName()).toBe('English')
    key('ArrowDown')
    expect(activeName()).toBe(names()[1])
    key('ArrowUp')
    expect(activeName()).toBe('English')
    key('ArrowUp') // wraps to the end
    expect(activeName()).toBe(names()[names().length - 1])
  })

  it('picks with Enter', () => {
    type('francais')
    key('Enter')
    expect(element.settings.state.lang).toBe('fr')
  })

  it('Escape clears the search, then closes the list, without closing the panel', () => {
    element.open()
    if (!$('.mla-lang-panel').hasAttribute('data-open')) toggle().click()
    type('fr')
    key('Escape')
    expect(search().value).toBe('')
    expect($('.mla-lang-panel').hasAttribute('data-open')).toBe(true)
    key('Escape')
    expect($('.mla-lang-panel').hasAttribute('data-open')).toBe(false)
    expect($('.mla-panel').hasAttribute('data-open')).toBe(true)
  })

  it('shows the focus ring only once the arrow keys are used', () => {
    expect($('#mla-lang-options').hasAttribute('data-keyboard')).toBe(false)
    key('ArrowDown')
    expect($('#mla-lang-options').hasAttribute('data-keyboard')).toBe(true)
  })
})

describe('focus', () => {
  it('stays on the picker after a language is chosen, though the panel is rebuilt', () => {
    // Regression: the rebuild threw away the focused control, so a keyboard
    // user who picked a language was dropped at the top of the document.
    element.open()
    toggle().click()
    type('francais')
    key('Enter')
    expect(element.settings.state.lang).toBe('fr')
    expect(element.shadowRoot!.activeElement).toBe(toggle())
    expect(toggle().getAttribute('aria-label')).toBe('Language: Français (French)')
  })
})
