/**
 * "Skip to main content".
 *
 * WCAG 2.4.1 wants a way past repeated navigation, and most of the apps this
 * widget is going into do not have one. It is injected as the first thing in
 * the body so it is the first stop for the Tab key, and it is only visible
 * once focused.
 */

const TARGETS = ['#main', '#main-content', 'main', '[role="main"]', '#content', '#app']

let link: HTMLAnchorElement | null = null

function findTarget(): HTMLElement | null {
  for (const selector of TARGETS) {
    const found = document.querySelector<HTMLElement>(selector)
    if (found) return found
  }
  return null
}

export function install(label: string): void {
  remove()
  // A page that already offers one does not need ours competing with it.
  if (document.querySelector('a[href^="#"].skip-link, a[href^="#"][class*="skip" i]')) return

  link = document.createElement('a')
  link.className = 'mla-skip-link'
  link.href = '#'
  link.textContent = label
  link.addEventListener('click', (event) => {
    event.preventDefault()
    const target = findTarget()
    if (!target) return
    if (target.tabIndex < 0) {
      target.setAttribute('tabindex', '-1')
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    }
    target.focus({ preventScroll: false })
    target.scrollIntoView({ block: 'start' })
  })
  document.body.prepend(link)
}

export function remove(): void {
  link?.remove()
  link = null
}
