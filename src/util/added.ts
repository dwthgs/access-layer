/**
 * Content a page adds after a feature has run (a feed loading more, a
 * notification, a route change) needs the feature applied to it too. Re-running
 * over the whole document for every addition made a busy page recalculate
 * styles several times a second (#4), so this hands over only what is new:
 * the elements in each added subtree, and the parents of added text.
 *
 * Additions are collected and handed over in one batch when the browser is
 * idle. The widget and its skip link are ignored.
 */

import { walkTextElements } from './dom'

const IGNORE = 'access-layer, .mla-skip-link'

function whenIdle(callback: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(callback, { timeout: 300 })
  else setTimeout(callback, 100) // Safari
}

export function watchAdded(onAdded: (elements: HTMLElement[]) => void): () => void {
  /** Added subtrees, walked at flush time. */
  const roots = new Set<HTMLElement>()
  /** Elements that gained text; only the element itself is new to measure. */
  const parents = new Set<HTMLElement>()
  let scheduled = false
  let stopped = false

  const flush = () => {
    scheduled = false
    if (stopped) return
    const elements = new Set<HTMLElement>()
    for (const root of roots) {
      if (root.isConnected) for (const el of walkTextElements(root)) elements.add(el)
    }
    for (const parent of parents) if (parent.isConnected) elements.add(parent)
    roots.clear()
    parents.clear()
    if (elements.size) onAdded([...elements])
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (node instanceof HTMLElement) {
          if (!node.closest(IGNORE)) roots.add(node)
        } else if (node.nodeType === Node.TEXT_NODE && record.target instanceof HTMLElement) {
          if (!record.target.closest(IGNORE)) parents.add(record.target)
        }
      }
    }
    if ((roots.size || parents.size) && !scheduled) {
      scheduled = true
      whenIdle(flush)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    stopped = true
    observer.disconnect()
    roots.clear()
    parents.clear()
  }
}
