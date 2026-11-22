/**
 * The language picker: the current language with its
 * code badge as a disclosure header, and under it a searchable list.
 *
 * The page's own language heads the list and stands for "as the page is":
 * picking it stores `lang: null`, which puts the original page back. Any
 * other pick translates the page (features/translate.ts).
 *
 * Keyboard: the search box is a combobox over the list, so typing filters,
 * the arrow keys move, Enter picks and Escape clears the search, then closes.
 */

import type { Controller } from './controller'
import {
  badgeFor,
  displayName,
  findLanguage,
  LANGUAGES,
  matches,
  pageLanguage,
  sameLanguage,
  type Language,
} from './features/translate'
import { icon } from './icons'
import { h } from './util/dom'

export interface LanguagePicker {
  root: HTMLElement
  update(): void
}

const ENGLISH = LANGUAGES[0]!

export function buildLanguagePicker(controller: Controller): LanguagePicker {
  const t = controller.t

  /** The page's own language, first in the list. */
  const home = (): Language => findLanguage(pageLanguage()) ?? ENGLISH
  const current = (): Language => findLanguage(controller.state.lang) ?? home()

  const ordered = (): Language[] => {
    const first = home()
    const rest = LANGUAGES.filter((language) => language !== first).sort((a, b) =>
      displayName(a).localeCompare(displayName(b)),
    )
    return [first, ...rest]
  }

  // ------------------------------------------------------------- header
  const headBadge = h('span', { class: 'mla-lang-badge' })
  const headName = h('span', { class: 'mla-lang-current' })
  const toggle = h('button', {
    class: 'mla-lang-toggle',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'mla-lang-panel',
    onclick: () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'),
  }, [
    headBadge,
    headName,
    h('span', { class: 'mla-profiles-caret', html: icon('caret') }),
  ]) as HTMLButtonElement

  // ------------------------------------------------------------- search
  const search = h('input', {
    class: 'mla-lang-input',
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: t('languageSearch'),
    'aria-label': t('languageSearch'),
    'aria-autocomplete': 'list',
    'aria-expanded': 'true',
    'aria-controls': 'mla-lang-options',
    oninput: () => {
      render()
      activate(0)
    },
    onkeydown: (event: KeyboardEvent) => onKey(event),
  }) as HTMLInputElement

  const list = h('ul', {
    class: 'mla-lang-options',
    id: 'mla-lang-options',
    role: 'listbox',
    'aria-label': t('language'),
  })
  const empty = h('p', { class: 'mla-lang-empty', text: t('languageNone') })
  empty.hidden = true

  const panel = h('div', { class: 'mla-collapse mla-lang-panel', id: 'mla-lang-panel' }, [
    h('div', { class: 'mla-lang-search' }, [search, h('span', { class: 'mla-lang-search-icon', html: icon('search') })]),
    list,
    empty,
  ])

  const root = h('section', { class: 'mla-lang', 'aria-label': t('language') }, [toggle, panel])

  // ------------------------------------------------------------ options
  let shown: Language[] = []
  let active = -1

  function render(): void {
    const selected = current()
    shown = ordered().filter((language) => matches(language, search.value))
    list.replaceChildren(
      ...shown.map((language, index) =>
        h('li', {
          class: 'mla-lang-option',
          id: `mla-lang-opt-${language.code}`,
          role: 'option',
          lang: language.code,
          'aria-selected': language === selected ? 'true' : 'false',
          onclick: () => choose(language),
          onmousemove: () => {
            list.removeAttribute('data-keyboard')
            if (active !== index) activate(index, false)
          },
        }, [
          h('span', { class: 'mla-lang-badge', 'aria-hidden': 'true', text: badgeFor(language) }),
          h('span', { class: 'mla-lang-name', text: displayName(language) }),
          h('span', { class: 'mla-lang-check', 'aria-hidden': 'true', html: icon('check') }),
        ]),
      ),
    )
    empty.hidden = shown.length > 0
    active = -1
    search.removeAttribute('aria-activedescendant')
  }

  function activate(index: number, scroll = true): void {
    const items = Array.from(list.children) as HTMLElement[]
    items[active]?.classList.remove('is-active')
    if (items.length === 0) {
      active = -1
      search.removeAttribute('aria-activedescendant')
      return
    }
    active = (index + items.length) % items.length
    const item = items[active]!
    item.classList.add('is-active')
    search.setAttribute('aria-activedescendant', item.id)
    if (scroll) item.scrollIntoView?.({ block: 'nearest' })
  }

  function choose(language: Language): void {
    // The page's own language means "as the page is": no translation.
    const lang = sameLanguage(language.code, pageLanguage()) ? null : language.code
    setOpen(false)
    toggle.focus()
    if (lang !== controller.state.lang) controller.set({ lang })
  }

  function onKey(event: KeyboardEvent): void {
    // The highlight ring is for keyboard users; a mouse user sees hover.
    if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') {
      list.setAttribute('data-keyboard', '')
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      activate(active + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      activate(active < 0 ? -1 : active - 1)
    } else if (event.key === 'Home' && event.ctrlKey) {
      event.preventDefault()
      activate(0)
    } else if (event.key === 'End' && event.ctrlKey) {
      event.preventDefault()
      activate(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const language = shown[active] ?? (shown.length === 1 ? shown[0] : undefined)
      if (language) choose(language)
    } else if (event.key === 'Escape') {
      // Handled here, so the panel itself stays open.
      event.stopPropagation()
      if (search.value) {
        search.value = ''
        render()
      } else {
        setOpen(false)
        toggle.focus()
      }
    }
  }

  function setOpen(open: boolean): void {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    panel.toggleAttribute('data-open', open)
    // Tells the widget's own Escape handler to leave this to us.
    panel.toggleAttribute('data-mla-own-escape', open)
    if (open) {
      list.removeAttribute('data-keyboard')
      search.value = ''
      render()
      const selected = shown.indexOf(current())
      if (selected >= 0) activate(selected)
      search.focus()
    }
  }

  function update(): void {
    const language = current()
    headBadge.textContent = badgeFor(language)
    headName.textContent = displayName(language)
    toggle.setAttribute('aria-label', `${t('language')}: ${displayName(language)}`)
    if (panel.hasAttribute('data-open')) render()
  }

  update()
  return { root, update }
}
