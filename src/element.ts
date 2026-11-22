/**
 * `<access-layer>` — the custom element that hosts the whole widget.
 *
 * A custom element with a shadow root buys two things that matter more than
 * any feature: the panel cannot be restyled by the host page's CSS, and the
 * host page's aggressive `!important` rules (including the ones this widget
 * itself injects) cannot reach in. Everything else here is configuration
 * plumbing and the open/close lifecycle.
 */

import { icon } from './icons'
import { Controller } from './controller'
import * as dictionary from './features/dictionary'
import * as pageStructure from './features/pageStructure'
import * as translate from './features/translate'
import { buildPanel, type PanelHandles } from './panel'
import { parsePosition } from './state'
import { assetCss } from './styles/assets'
import { JUMP_CSS, PANEL_CSS } from './styles/panel'
import { PAGE_CSS } from './styles/page'
import { enforceContrast, parseColor, toCss, type RGB } from './util/contrast'
import { debounce, isVisible } from './util/dom'
import { adopt, drop, sheet } from './util/sheets'

/** Shared by every widget the page mounts; built on first use. */
let panelSheet: CSSStyleSheet | null = null
/**
 * The widget whose controller drives the page. The features are shared, so a
 * new widget finishes a removed one's pending teardown before it sets up.
 */
let owner: AccessLayerElement | null = null

/** Where the button sits. The `mobile-` ones apply below 768 px. */
const PLACEMENT = ['position', 'mobile-position', 'offset-x', 'offset-y', 'mobile-offset-x', 'mobile-offset-y', 'preview']

const WHITE: RGB = [255, 255, 255]
/** The darkest pale fill the accent is drawn on as text (`#dfe6fb`). */
const PALE_FILL: RGB = [223, 230, 251]

export class AccessLayerElement extends HTMLElement {
  private controller!: Controller
  private panel!: PanelHandles
  private unsubscribe?: () => void
  private lastLang = ''
  private isOpen = false
  /** Whatever had focus when the panel opened, so focus can go back to it. */
  private opener: HTMLElement | null = null
  /** Highlight links, fonts and the other page-wide rules. */
  private pageSheet: CSSStyleSheet | null = null
  /** Set up and working; false until connected and again after a removal. */
  private live = false
  private langObserver: MutationObserver | null = null
  private triggerObserver: MutationObserver | null = null
  private readonly checkTriggers = debounce(() => this.syncTriggers(), 120)
  private narrow: MediaQueryList | null = null

  /** Apply the position and offsets for this screen width. `preview="mobile"` or `"desktop"` picks one regardless of width. */
  private readonly syncPlacement = (): void => {
    const forced = this.getAttribute('preview')
    const mobile = forced ? forced === 'mobile' : !!this.narrow?.matches
    const read = (name: string) => (mobile && this.getAttribute(`mobile-${name}`)) || this.getAttribute(name)
    this.controller.setDefaultPosition(parsePosition(read('position')))
    for (const axis of ['x', 'y']) {
      const pixels = read(`offset-${axis}`)
      // Without the attribute, the page's own `--mla-offset-*` rule or the default applies.
      if (pixels && /^\d{1,3}$/.test(pixels)) this.style.setProperty(`--mla-offset-${axis}`, `${pixels}px`)
      else this.style.removeProperty(`--mla-offset-${axis}`)
    }
  }

  static get observedAttributes(): string[] {
    return ['color', 'statement-url', 'statement-text', 'trigger', 'trigger-id', 'button-icon', 'button-size', ...PLACEMENT]
  }

  connectedCallback(): void {
    // Moved rather than removed: everything is still set up.
    if (this.live) return
    if (owner && owner !== this && !owner.isConnected) owner.teardown()
    owner = this
    this.live = true

    // Re-inserted after a removal: the shadow root stays, and build()
    // replaces its contents.
    if (!this.shadowRoot) {
      // Never translated by a page translator (ours or the browser's own):
      // the widget's labels come from its own translations.
      this.setAttribute('translate', 'no')
      this.classList.add('notranslate')
      this.attachShadow({ mode: 'open' }).adoptedStyleSheets = [(panelSheet ??= sheet(PANEL_CSS))]
    }
    const shadow = this.shadowRoot!
    this.pageSheet = sheet(assetCss({ fontsUrl: this.getAttribute('fonts-url') ?? undefined }) + PAGE_CSS + JUMP_CSS)
    adopt(document, this.pageSheet)

    this.controller = new Controller({
      persist: !this.hasAttribute('preview'),
      disabledTools: (this.getAttribute('disabled-tools') || '').split(',').filter(Boolean),
      profiles: !this.hasAttribute('no-profiles'),
      defaultLanguage: this.getAttribute('default-language') || '',
      shadow,
      layer: document.createElement('div'),
      skipLink: !this.hasAttribute('no-skip-link'),
    })
    // Read here rather than in attributeChangedCallback: attributes set
    // before the element is connected arrive before the controller exists.
    this.narrow = matchMedia('(max-width: 767px)')
    this.narrow.addEventListener('change', this.syncPlacement)
    this.syncPlacement()

    // Always set, so a remount without the attribute does not inherit the
    // previous element's proxy.
    dictionary.configure(this.getAttribute('dictionary-url') || dictionary.DEFAULT_ENDPOINT)
    // Google is the fallback unless the site turns it off, as checkout pages should.
    translate.configure({
      google: this.getAttribute('translate-fallback') !== 'off',
      cloudUrl: this.getAttribute('translate-url') || undefined,
    })

    this.build()
    this.controller.apply()

    document.addEventListener('keydown', this.onKeydown, true)
    document.addEventListener('click', this.onDocumentClick)
    this.watchPageLanguage()
    this.setupTriggers()
  }

  disconnectedCallback(): void {
    // A move (keep-alive, teleport, list reorder) disconnects and reconnects
    // in the same task. Wait a microtask and tear down only if it stayed out.
    queueMicrotask(() => {
      if (!this.isConnected) this.teardown()
    })
  }

  private teardown(): void {
    if (!this.live) return
    this.live = false
    if (owner === this) owner = null
    this.isOpen = false
    this.opener = null
    document.removeEventListener('keydown', this.onKeydown, true)
    document.removeEventListener('click', this.onDocumentClick)
    removeEventListener('resize', this.checkTriggers)
    this.narrow?.removeEventListener('change', this.syncPlacement)
    this.checkTriggers.cancel()
    this.langObserver?.disconnect()
    this.triggerObserver?.disconnect()
    this.unsubscribe?.()
    pageStructure.close()
    this.controller?.destroy()
    if (this.pageSheet) drop(document, this.pageSheet)
  }

  attributeChangedCallback(name: string): void {
    if (!this.live) return
    if (name === 'color') this.syncAccent()
    if (PLACEMENT.includes(name)) this.syncPlacement()
    if (name === 'button-icon' || name === 'button-size') this.syncButton()
    if (name === 'statement-url' || name === 'statement-text') this.syncStatementLink()
    if (name === 'trigger' || name === 'trigger-id') this.setupTriggers()
  }

  /** Render, or re-render after a language change. */
  private build(): void {
    const shadow = this.shadowRoot
    if (!shadow) return

    const wasOpen = this.isOpen
    const opener = this.opener
    // A rebuild replaces every control, so remember which one had focus and
    // give focus to its replacement; otherwise a keyboard user who just
    // picked a language is dropped at the top of the document.
    const refocus = focusKey(shadow.activeElement)
    this.panel?.root.remove()
    this.unsubscribe?.()
    this.isOpen = false

    this.panel = buildPanel(this.controller, {
      onToggle: () => this.toggle(),
      onClose: () => this.close(),
    })
    shadow.append(this.panel.root)

    // The feature overlays draw into this layer, so keep the controller's
    // reference pointing at the live node after every rebuild, and move any
    // overlay that is already on into it.
    this.controller.setLayer(this.panel.layer)

    this.lastLang = this.controller.language
    this.syncButton()
    this.syncAccent()
    this.syncStatementLink()
    this.panel.update()

    this.unsubscribe = this.controller.subscribe(() => {
      if (this.controller.language !== this.lastLang) {
        this.build()
        return
      }
      this.toggleAttribute('data-oversized', this.controller.state.oversized)
      this.panel.update()
    })

    this.toggleAttribute('data-oversized', this.controller.state.oversized)
    if (this.triggerObserver) this.syncTriggers()
    if (wasOpen) this.open(opener)
    if (refocus) shadow.querySelector<HTMLElement>(refocus)?.focus()
  }

  private syncButton(): void {
    const name = this.getAttribute('button-icon') || 'accessibility'
    this.panel.trigger.innerHTML = icon(['accessibility', 'wheelchair', 'eye'].includes(name) ? name : 'accessibility')
    const size = ({ small: 44, medium: 56, large: 68 } as Record<string, number>)[this.getAttribute('button-size') || '']
    // A base size rather than the effective one, so the visitor's Oversized
    // widget setting can still enlarge it.
    if (size) this.style.setProperty('--mla-trigger-base', `${size}px`)
    else this.style.removeProperty('--mla-trigger-base')
  }

  /**
   * The site's colour, made readable (WCAG 1.4.3): white text sits on it, so
   * a colour too light for that is darkened just enough; and it is used as
   * text on the panel's pale fills, which takes a little more.
   */
  private syncAccent(): void {
    const colour = this.getAttribute('color')
    const accent = colour ? this.resolveColour(colour) : null
    if (!accent) {
      this.style.removeProperty('--mla-accent')
      this.style.removeProperty('--mla-accent-text')
      return
    }
    // Always opaque: a translucent fill would not have the contrast measured.
    this.style.setProperty('--mla-accent', toCss(enforceContrast(accent, WHITE)))
    this.style.setProperty('--mla-accent-text', toCss(enforceContrast(accent, PALE_FILL)))
  }

  /** Any CSS colour (names, hsl() too), as the browser computes it. */
  private resolveColour(colour: string): RGB | null {
    const probe = document.createElement('i')
    probe.style.color = colour
    if (!probe.style.color) return null
    this.shadowRoot!.append(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()
    return parseColor(computed)
  }

  private syncStatementLink(): void {
    const url = this.getAttribute('statement-url')
    const link = this.shadowRoot?.querySelector<HTMLAnchorElement>('[data-mla-statement]')
    if (!link) return
    if (url) {
      link.href = url
      link.textContent = this.getAttribute('statement-text') || this.controller.t('statement')
      link.hidden = false
    } else {
      link.hidden = true
    }
  }

  // ------------------------------------------------------------- language
  /**
   * Host apps switch locale by changing `<html lang>`. Follow it unless the
   * visitor has picked a language in the panel, which always wins.
   */
  private watchPageLanguage(): void {
    this.langObserver = new MutationObserver(() => {
      if (this.controller.state.lang !== null) return
      if (this.controller.language !== this.lastLang) this.controller.refreshLanguage()
    })
    this.langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    })
  }

  // ------------------------------------------------------------- triggers
  /** `null` for the default floating button only; `'none'` for no button. */
  private get triggerSetting(): string | null {
    const id = this.getAttribute('trigger-id')
    if (id) return `#${CSS.escape(id)}`
    const value = this.getAttribute('trigger')?.trim()
    return value ? value : null
  }

  private externalTriggers(): HTMLElement[] {
    // A direct lookup, so the mutation observer below stays cheap on large pages.
    const id = this.getAttribute('trigger-id')
    if (id) {
      const el = document.getElementById(id)
      return el ? [el] : []
    }
    const selector = this.triggerSetting
    if (!selector || selector === 'none') return []
    try {
      return Array.from(document.querySelectorAll<HTMLElement>(selector))
    } catch {
      // An invalid selector must not take the page down with it.
      return []
    }
  }

  private setupTriggers(): void {
    this.triggerObserver?.disconnect()
    this.triggerObserver = null
    removeEventListener('resize', this.checkTriggers)

    const setting = this.triggerSetting
    if (setting && setting !== 'none') {
      // The host app's buttons come and go with layouts, collapsed menus and
      // breakpoints. Watch for that so the floating button can step in the
      // moment none of them is on screen, and step aside when one returns.
      this.triggerObserver = new MutationObserver(this.checkTriggers)
      this.triggerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        // An ID only matters for `trigger-id`, which is looked up directly.
        attributeFilter: this.getAttribute('trigger-id') ? ['id'] : ['class', 'style', 'hidden'],
      })
      addEventListener('resize', this.checkTriggers, { passive: true })
    }
    this.syncTriggers()
  }

  /** Show the floating button only when no host trigger is reachable. */
  private syncTriggers(): void {
    const setting = this.triggerSetting
    const external = this.externalTriggers()
    const hideFloating = !!this.getAttribute('trigger-id') || setting === 'none' || external.some(isVisible)
    if (this.panel.trigger.hidden !== hideFloating) this.panel.trigger.hidden = hideFloating
    for (const el of external) {
      if (el.getAttribute('aria-haspopup') !== 'dialog') el.setAttribute('aria-haspopup', 'dialog')
      const expanded = this.isOpen ? 'true' : 'false'
      if (el.getAttribute('aria-expanded') !== expanded) el.setAttribute('aria-expanded', expanded)
    }
  }

  private onDocumentClick = (event: MouseEvent): void => {
    const setting = this.triggerSetting
    if (!setting || setting === 'none') return
    const target = event.target
    if (!(target instanceof Element)) return
    let match: Element | null = null
    try {
      match = target.closest(setting)
    } catch {
      return
    }
    if (!(match instanceof HTMLElement)) return
    if (match instanceof HTMLAnchorElement) event.preventDefault()
    if (this.isOpen) this.close()
    else this.open(match)
  }

  // ------------------------------------------------------------ open/close
  private onKeydown = (event: KeyboardEvent): void => {
    // The physical key: on a Mac, Option + A arrives as the character å.
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === 'KeyA') {
      // In the page's own editors Alt + A types that character: leave it to them.
      // The whole composed path, so a textbox host whose editing happens in
      // its own shadow root counts too; never the widget's own fields.
      const path = event.composedPath()
      if (!path.includes(this) && path.some((node) => node instanceof Element && editable(node))) return
      event.preventDefault()
      this.toggle()
      return
    }
    if (event.key === 'Escape') {
      // A part of the panel with its own Escape (the open language list)
      // handles it: first it clears the search, then it closes the list.
      const origin = event.composedPath()[0]
      if (origin instanceof Element && origin.closest('[data-mla-own-escape]')) return
      if (pageStructure.isOpen()) {
        pageStructure.close()
        return
      }
      if (this.isOpen) this.close()
    }
  }

  /** The element focus should return to, captured at the moment of opening. */
  private currentFocus(): HTMLElement | null {
    const inside = this.shadowRoot?.activeElement
    if (inside instanceof HTMLElement) return inside
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    if (active === this || active === document.body || active === document.documentElement) {
      return null
    }
    return active
  }

  open(opener?: HTMLElement | null): void {
    if (this.isOpen) return
    this.opener = opener ?? this.currentFocus()
    this.panel.panel.setAttribute('data-open', '')
    this.panel.trigger.setAttribute('aria-expanded', 'true')
    this.isOpen = true
    this.syncTriggers()
    // The panel itself carries the dialog's name, so assistive technology
    // announces what opened before the visitor starts tabbing. It is not
    // modal: Tab moves on to the page, and Escape closes it from anywhere.
    this.panel.panel.focus()
  }

  close(): void {
    const wasOpen = this.isOpen
    this.panel.panel.removeAttribute('data-open')
    this.panel.trigger.setAttribute('aria-expanded', 'false')
    this.isOpen = false
    this.syncTriggers()
    if (!wasOpen) return
    // Return focus to whatever opened the panel, per the dialog pattern: the
    // host app's own button, or the floating one.
    const candidates = [this.opener, this.panel.trigger]
    this.opener = null
    const target = candidates.find(
      (el): el is HTMLElement => el instanceof HTMLElement && isVisible(el),
    )
    target?.focus()
  }

  toggle(): void {
    if (this.isOpen) this.close()
    else this.open()
  }

  /** Read-only access for host apps that want to drive the widget. */
  get settings(): Controller {
    return this.controller
  }
}

/** Text the visitor can type into: a field, a rich-text editor, a custom textbox. */
function editable(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return !NOT_TYPED.has(el.type)
  return el.matches('[contenteditable]:not([contenteditable="false"]), [role="textbox"]')
}

const NOT_TYPED = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

/** A selector that finds the same control in a rebuilt panel. */
function focusKey(el: Element | null): string | null {
  if (!(el instanceof HTMLElement)) return null
  if (el.id) return `#${CSS.escape(el.id)}`
  for (const name of ['data-profile', 'data-action', 'data-position']) {
    const value = el.getAttribute(name)
    if (value) return `[${name}="${CSS.escape(value)}"]`
  }
  const stable = ['mla-lang-toggle', 'mla-trigger', 'mla-profiles-toggle', 'mla-icon-btn', 'mla-reset']
  const cls = stable.find((name) => el.classList.contains(name))
  return cls ? `.${cls}` : null
}

