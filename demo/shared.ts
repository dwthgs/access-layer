/**
 * Helpers shared by the landing page and the developer console: syntax
 * highlighting for the snippets, copy buttons, the toast, scroll reveals and
 * the sticky nav. Nothing here touches the widget; each page drives that.
 */

import { ICONS } from '../src/icons'

export { ICONS }

export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T =>
  root.querySelector<T>(selector) as T

export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector))

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** True while the visitor has asked for less motion, by OS setting or the widget. */
export function motionReduced(): boolean {
  return (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.hasAttribute('data-mla-nomotion')
  )
}

// ------------------------------------------------------------- highlighting
const TOKENS: [string, string][] = [
  ['com', String.raw`<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*`],
  ['str', String.raw`"[^"\n]*"|'[^'\n]*'|\x60[^\x60]*\x60`],
  ['tag', String.raw`<\/?[a-zA-Z][\w-]*|\/?>`],
  ['kw', String.raw`\b(?:import|from|export|default|const|let|return|function|await|async|new|true|false|null|if)\b`],
  ['prop', String.raw`--[\w-]+`],
  ['attr', String.raw`\b[a-zA-Z][\w-]*(?==)`],
  ['num', String.raw`\b\d+(?:\.\d+)?(?:px|ms|s|%)?\b`],
]
const TOKEN_RE = new RegExp(TOKENS.map(([name, re]) => `(?<${name}>${re})`).join('|'), 'g')

/** A deliberately small highlighter: HTML, JS and CSS snippets only. */
export function highlight(code: string): string {
  let out = ''
  let last = 0
  for (const match of code.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0
    out += escapeHtml(code.slice(last, index))
    const kind = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0]
    out += `<span class="tok-${kind}">${escapeHtml(match[0])}</span>`
    last = index + match[0].length
  }
  return out + escapeHtml(code.slice(last))
}

// ---------------------------------------------------------------- clipboard
const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>'

/** The icon and labels inside a `.copy` button, for a button already in the page. */
export const COPY_CONTENT = `${COPY_ICON}<span class="idle">Copy</span><span class="ok">Copied</span>`

export function copyButtonHtml(): string {
  return `<button type="button" class="copy">${COPY_CONTENT}</button>`
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older Safari, or a page without clipboard permission.
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;opacity:0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/**
 * Any `.copy` button copies the text of its `data-copy` target, or failing
 * that the `<pre>` in the same `.code` block.
 */
export function wireCopyButtons(): void {
  document.addEventListener('click', async (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.copy')
    if (!button) return
    const source = button.dataset.copy
      ? document.querySelector(button.dataset.copy)
      : button.closest('.code')?.querySelector('pre')
    const text = source instanceof HTMLTextAreaElement ? source.value : source?.textContent ?? ''
    if (!(await writeClipboard(text.trim()))) return
    button.setAttribute('data-copied', '')
    toast('Copied to clipboard')
    setTimeout(() => button.removeAttribute('data-copied'), 1600)
  })
}

// -------------------------------------------------------------------- toast
let toastTimer = 0
export function toast(message: string): void {
  let el = document.querySelector<HTMLElement>('.toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    el.setAttribute('role', 'status')
    document.body.append(el)
  }
  el.innerHTML = `${ICONS.check ?? ''}<span></span>`
  el.querySelector('span')!.textContent = message
  // Re-trigger the entrance when toasts arrive back to back.
  el.removeAttribute('data-show')
  void el.offsetWidth
  el.setAttribute('data-show', '')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el?.removeAttribute('data-show'), 2200)
}

// ------------------------------------------------------------------ reveals
export function revealOnScroll(): void {
  const items = $$('.reveal')
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.setAttribute('data-in', ''))
    return
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.setAttribute('data-in', '')
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  items.forEach((el) => observer.observe(el))
}

export function stickyNav(): void {
  const nav = $('.site-nav')
  if (!nav) return
  const sync = () => nav.toggleAttribute('data-scrolled', scrollY > 8)
  addEventListener('scroll', sync, { passive: true })
  sync()
}
