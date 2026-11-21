/** Small DOM helpers shared by the panel and the feature modules. */

export type El = HTMLElement

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, unknown>> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue
    if (key === 'class') el.className = String(value)
    else if (key === 'text') el.textContent = String(value)
    else if (key === 'html') el.innerHTML = String(value)
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener)
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value as object)
    } else {
      el.setAttribute(key, value === true ? '' : String(value))
    }
  }
  for (const child of children) {
    el.append(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return el
}

/**
 * Write or remove an attribute in one call, so callers stay branch-free.
 *
 * Only `null`, `undefined` and `false` remove. An empty string is a real
 * value: `data-mla-links=""` is how a valueless flag attribute is written,
 * and the page stylesheet selects on its presence.
 */
export function attr(
  el: Element,
  name: string,
  value: string | null | false | undefined,
): void {
  if (value === null || value === undefined || value === false) el.removeAttribute(name)
  else el.setAttribute(name, value)
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): ((...args: A) => void) & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
  }
  return wrapped
}

/** Rendered and not visibility-hidden. Layout-free, so it works in tests. */
export function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected || el.hidden) return false
  if (el.getClientRects().length === 0) return false
  return getComputedStyle(el).visibility !== 'hidden'
}

/** Elements the widget must never touch, wherever it walks the document. */
export function isOurs(node: Node): boolean {
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement
  return !!el?.closest?.('access-layer')
}

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'PATH', 'CANVAS',
  'VIDEO', 'AUDIO', 'ACCESS-LAYER', 'HEAD', 'META', 'LINK', 'TITLE', 'BR', 'HR',
])

/**
 * Every element under `<body>` a text-level adjustment may legitimately
 * rewrite. Skips our own UI, non-rendered nodes and anything inside an
 * element that has no business being restyled.
 */
export function walkTextElements(root: ParentNode = document.body): HTMLElement[] {
  if (!root) return []
  const out: HTMLElement[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement
      if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT
      if (el.tagName === 'ACCESS-LAYER') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  if (root instanceof HTMLElement && !SKIP_TAGS.has(root.tagName)) out.push(root)
  let current = walker.nextNode()
  while (current) {
    out.push(current as HTMLElement)
    current = walker.nextNode()
  }
  return out
}

/** The accessible-ish name of an element, good enough to read aloud. */
export function accessibleText(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria?.trim()) return aria.trim()
  const labelledby = el.getAttribute('aria-labelledby')
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
    if (text) return text
  }
  if (el instanceof HTMLImageElement && el.alt.trim()) return el.alt.trim()
  if (el instanceof HTMLInputElement) {
    const label = el.labels?.[0]?.textContent?.trim()
    if (label) return label
    if (el.placeholder) return el.placeholder
    if (el.value && el.type === 'submit') return el.value
  }
  const title = el.getAttribute('title')
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  return text || title?.trim() || ''
}
