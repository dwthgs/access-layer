/**
 * Page Structure.
 *
 * Lists the page's headings, landmarks and links in a dialog and jumps to any
 * of them. Choosing an entry scrolls it into view *and* moves real focus to
 * it, adding a temporary tabindex when the target is not focusable, so a
 * keyboard user carries on from the right place rather than from the top.
 */

import { accessibleText, h, isOurs, isVisible } from '../util/dom'
import type { FeatureContext } from './context'

type Tab = 'headings' | 'landmarks' | 'links'

const LANDMARK_SELECTOR = [
  'main', 'nav', 'header', 'footer', 'aside', 'form[aria-label]', 'section[aria-label]',
  '[role="main"]', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[role="complementary"]', '[role="search"]', '[role="region"][aria-label]',
].join(',')

interface Entry {
  label: string
  detail: string
  el: HTMLElement
}

function visible(el: HTMLElement): boolean {
  if (isOurs(el)) return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  return getComputedStyle(el).visibility !== 'hidden'
}

function collect(tab: Tab, t: FeatureContext['t']): Entry[] {
  const untitled = t('structureUntitled')
  if (tab === 'headings') {
    return Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,[role="heading"]'))
      .filter(visible)
      .map((el) => ({
        label: accessibleText(el) || untitled,
        detail: (el.getAttribute('aria-level') ?? el.tagName.replace('H', '')).toString(),
        el,
      }))
  }
  if (tab === 'landmarks') {
    return Array.from(document.querySelectorAll<HTMLElement>(LANDMARK_SELECTOR))
      .filter(visible)
      .map((el) => ({
        label:
          el.getAttribute('aria-label')?.trim() ||
          el.getAttribute('role') ||
          el.tagName.toLowerCase(),
        detail: el.tagName.toLowerCase(),
        el,
      }))
  }
  return Array.from(document.querySelectorAll<HTMLElement>('a[href]'))
    .filter(visible)
    .map((el) => ({
      label: accessibleText(el) || (el as HTMLAnchorElement).href,
      detail: new URL((el as HTMLAnchorElement).href, location.href).host === location.host ? '' : '↗',
      el,
    }))
    .filter((entry) => entry.label.trim().length > 0)
    .slice(0, 300)
}

function jumpTo(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center', behavior: 'auto' })
  if (el.tabIndex < 0) {
    el.setAttribute('tabindex', '-1')
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true })
  }
  el.focus({ preventScroll: true })
  el.classList.add('mla-jump-target')
  setTimeout(() => el.classList.remove('mla-jump-target'), 1600)
}

let dialog: HTMLElement | null = null
/** What had focus before the dialog opened, so closing it can go back there. */
let returnTo: HTMLElement | null = null

export function open(ctx: FeatureContext): void {
  close()
  const active = ctx.shadow.activeElement ?? document.activeElement
  returnTo = active instanceof HTMLElement ? active : null
  let tab: Tab = 'headings'

  const list = h('ul', { class: 'mla-struct-list' })
  // Plain toggle buttons: tab roles would promise arrow keys and tab panels.
  const tabsBar = h('div', { class: 'mla-struct-tabs', role: 'group', 'aria-label': ctx.t('pageStructure') })

  const paint = () => {
    const entries = collect(tab, ctx.t)
    list.replaceChildren()
    if (entries.length === 0) {
      list.append(h('li', { class: 'mla-struct-empty', text: ctx.t('structureEmpty') }))
      return
    }
    for (const entry of entries) {
      list.append(
        h('li', {}, [
          h('button', {
            class: 'mla-struct-item',
            type: 'button',
            'data-level': entry.detail,
            onclick: () => {
              close()
              jumpTo(entry.el)
            },
          }, [
            entry.detail ? h('span', { class: 'mla-struct-badge', text: entry.detail }) : '',
            h('span', { class: 'mla-struct-label', text: entry.label }),
          ]),
        ]),
      )
    }
  }

  const tabs: [Tab, string][] = [
    ['headings', ctx.t('structureHeadings')],
    ['landmarks', ctx.t('structureLandmarks')],
    ['links', ctx.t('structureLinks')],
  ]
  for (const [key, label] of tabs) {
    tabsBar.append(
      h('button', {
        class: 'mla-struct-tab',
        type: 'button',
        'aria-pressed': key === tab ? 'true' : 'false',
        text: label,
        onclick: (event: Event) => {
          tab = key
          for (const node of Array.from(tabsBar.children)) {
            node.setAttribute('aria-pressed', node === event.currentTarget ? 'true' : 'false')
          }
          paint()
        },
      }),
    )
  }

  dialog = h('div', {
    class: 'mla-struct',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-label': ctx.t('pageStructure'),
  }, [
    h('div', { class: 'mla-struct-head' }, [
      h('h2', { class: 'mla-struct-title', text: ctx.t('pageStructure') }),
      h('button', {
        class: 'mla-struct-close',
        type: 'button',
        'aria-label': ctx.t('closeMenu'),
        text: '×',
        onclick: () => close(),
      }),
    ]),
    tabsBar,
    list,
  ])

  paint()
  ctx.layer.append(dialog)
  dialog.querySelector<HTMLElement>('.mla-struct-tab')?.focus()
}

/**
 * Closes the dialog. If focus was in it, focus goes back to what opened it,
 * or to the floating button, instead of falling to <body> and the top of the
 * page.
 */
export function close(): void {
  if (!dialog) return
  const root = dialog.getRootNode() as ShadowRoot | Document
  const hadFocus = dialog.contains(root.activeElement)
  dialog.remove()
  dialog = null
  // The opener may have been hidden meanwhile (a desktop-only host button
  // after a resize): then the floating button, as the panel does.
  if (hadFocus) {
    const floating = root.querySelector<HTMLElement>('.mla-trigger')
    ;[returnTo, floating].find((el): el is HTMLElement => !!el && isVisible(el))?.focus()
  }
  returnTo = null
}

export function isOpen(): boolean {
  return dialog !== null
}
