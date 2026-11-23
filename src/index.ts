/**
 * Entry point.
 *
 * Registers `<access-layer>` and, unless told otherwise, mounts one for you, so
 * the minimum integration on any property is a single script tag with no
 * accompanying code:
 *
 *   <script src="/access-layer.iife.js" defer
 *           data-color="#1742C9" data-position="bottom-left"></script>
 *
 * Apps that would rather place the element themselves set `data-auto="false"`
 * and render `<access-layer>` wherever they like.
 */

import { AccessLayerElement } from './element'

export { AccessLayerElement }
export { Controller } from './controller'
export { PROFILES } from './profiles'
export { DEFAULT_STATE, STORAGE_KEY, type State } from './state'

const TAG = 'access-layer'

export function define(): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(TAG)) customElements.define(TAG, AccessLayerElement)
}

export function mount(options: MountOptions = {}): AccessLayerElement {
  define()
  const existing = document.querySelector<AccessLayerElement>(TAG)
  if (existing) return existing

  const element = document.createElement(TAG) as AccessLayerElement
  if (options.color) element.setAttribute('color', options.color)
  if (options.position) element.setAttribute('position', options.position)
  if (options.fontsUrl) element.setAttribute('fonts-url', options.fontsUrl)
  if (options.statementUrl) element.setAttribute('statement-url', options.statementUrl)
  if (options.dictionaryUrl) element.setAttribute('dictionary-url', options.dictionaryUrl)
  if (options.skipLink === false) element.setAttribute('no-skip-link', '')
  if (options.trigger) element.setAttribute('trigger', options.trigger)
  if (options.triggerId) element.setAttribute('trigger-id', options.triggerId)
  if (options.translateFallback) element.setAttribute('translate-fallback', options.translateFallback)
  if (options.translateUrl) element.setAttribute('translate-url', options.translateUrl)
  for (const [name, value] of Object.entries(options.attributes ?? {})) element.setAttribute(name, value)
  document.body.append(element)
  return element
}

export function unmount(): void {
  document.querySelector(TAG)?.remove()
}

export interface MountOptions {
  color?: string
  position?: string
  fontsUrl?: string
  statementUrl?: string
  dictionaryUrl?: string
  /** Set false when the host page already provides a skip link. */
  skipLink?: boolean
  /**
   * CSS selector for the host app's own button(s) that open the panel. While
   * any of them is visible the floating button hides; when none is (another
   * layout, a collapsed menu, a phone) the floating button comes back, so the
   * tools are never unreachable. `none` hides the floating button outright.
   */
  trigger?: string
  triggerId?: string
  /**
   * Where the browser cannot translate on the device, visitors translate with
   * Google by default. It sends the page's text to Google once the visitor picks
   * a language, so set `off` on checkout and account pages.
   */
  translateFallback?: 'google' | 'off'
  /**
   * Your endpoint for Google's paid Cloud Translation API, which keeps the
   * API key on your server. Used instead of the free translator; see README
   * "Page translation".
   */
  translateUrl?: string
  /** Any other `<access-layer>` attributes, by name. */
  attributes?: Record<string, string>
}

/** Settings the script tag passes through as attributes of the same name: `data-button-size="large"`. */
const PASSED = ['mobile-position', 'offset-x', 'offset-y', 'mobile-offset-x', 'mobile-offset-y', 'button-icon', 'button-size', 'profile-colors', 'default-language', 'disabled-tools', 'statement-text', 'no-skip-link', 'no-profiles']

function optionsFromScript(): MountOptions | null {
  const script =
    document.currentScript instanceof HTMLScriptElement
      ? document.currentScript
      : document.querySelector<HTMLScriptElement>('script[data-access-layer]')
  const data = script?.dataset
  if (data?.auto === 'false') return null
  return {
    color: data?.color,
    position: data?.position,
    fontsUrl: data?.fontsUrl,
    statementUrl: data?.statementUrl,
    dictionaryUrl: data?.dictionaryUrl,
    skipLink: data?.skipLink !== 'false',
    trigger: data?.trigger,
    triggerId: data?.triggerId,
    translateFallback: data?.translateFallback === 'off' ? 'off' : undefined,
    translateUrl: data?.translateUrl,
    attributes: Object.fromEntries(PASSED.flatMap(name => { const value = script?.getAttribute(`data-${name}`); return value == null ? [] : [[name, value]] })),
  }
}

function autoMount(): void {
  const options = optionsFromScript()
  if (!options) {
    define()
    return
  }
  const start = () => mount(options)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}

if (typeof document !== 'undefined') autoMount()
