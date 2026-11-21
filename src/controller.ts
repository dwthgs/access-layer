/**
 * The single place that turns state into changes on the page.
 *
 * Purely visual adjustments become `data-mla-*` attributes on `<html>` and
 * are handled entirely by the injected stylesheet, which is what lets them
 * survive a client-side route change without any re-application. Only the
 * features that genuinely need script — measuring text, measuring contrast,
 * speech, overlays that track the pointer — get an enable/disable call, and
 * those are diffed so nothing is torn down and rebuilt on an unrelated change.
 */

import * as cursorOverlays from './features/cursorOverlays'
import * as dictionary from './features/dictionary'
import * as screenReader from './features/screenReader'
import * as smartContrast from './features/smartContrast'
import * as lineHeight from './features/lineHeight'
import * as pauseMedia from './features/pauseMedia'
import * as textScale from './features/textScale'
import * as translate from './features/translate'
import * as tooltips from './features/tooltips'
import type { FeatureContext } from './features/context'
import { detectLanguage, interpolate, messagesFor, type MessageKey, type Messages } from './i18n'
import { applyProfile } from './profiles'
import * as skipLink from './skipLink'
import { attr } from './util/dom'
import { DEFAULT_STATE, clear, load, save, type Position, type State } from './state'

export interface ControllerOptions {
  persist?: boolean
  disabledTools?: readonly string[]
  profiles?: boolean
  defaultLanguage?: string
  shadow: ShadowRoot
  layer: HTMLElement
  /** Set false when the host page already has a skip link of its own. */
  skipLink?: boolean
  /** Where the site wants the widget until the visitor moves it. */
  defaultPosition?: Position | null
}

export class Controller {
  state: State
  private readonly persist: boolean
  private readonly disabledTools: ReadonlySet<string>
  readonly profilesEnabled: boolean
  private readonly defaultLanguage: string
  private readonly shadow: ShadowRoot
  private layer: HTMLElement
  private readonly wantSkipLink: boolean
  private defaultPosition: Position
  private messages: Messages
  private applied: Partial<State> = {}
  private listeners = new Set<(state: State) => void>()

  constructor(options: ControllerOptions) {
    this.persist = options.persist !== false
    this.disabledTools = new Set(options.disabledTools || [])
    this.profilesEnabled = options.profiles !== false
    this.defaultLanguage = options.defaultLanguage || ''
    this.shadow = options.shadow
    this.layer = options.layer
    this.wantSkipLink = options.skipLink !== false
    this.defaultPosition = options.defaultPosition ?? 'bottom-left'
    this.state = this.persist ? load() : { ...DEFAULT_STATE }
    this.messages = messagesFor(this.language)
  }

  // ---------------------------------------------- choices vs site defaults
  /** The visitor's chosen language, or the page's when they have not chosen. */
  get language(): string {
    return this.state.lang ?? (this.defaultLanguage || detectLanguage())
  }

  /** The visitor's chosen position, or the site's default when they have not. */
  get position(): Position {
    return this.state.position ?? this.defaultPosition
  }

  setDefaultPosition(position: Position | null): void {
    this.defaultPosition = position ?? 'bottom-left'
    this.notify()
  }

  /** Re-read the page language, for when the host app switches locale. */
  refreshLanguage(): void {
    this.messages = messagesFor(this.language)
    this.apply()
    this.notify()
  }

  // ------------------------------------------------------------ translation
  t = (key: MessageKey, vars?: Record<string, string | number>): string => {
    const value = this.messages[key] ?? key
    return vars ? interpolate(value, vars) : value
  }

  // ----------------------------------------------------------------- events
  subscribe(listener: (state: State) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state)
  }

  isToolEnabled(id: string): boolean { return !this.disabledTools.has(id) }

  private restrict(): void {
    for (const key of this.disabledTools) {
      if (key in DEFAULT_STATE) Object.assign(this.state, { [key]: DEFAULT_STATE[key as keyof State] })
    }
    // A profile applies whichever of its tools are enabled, so it stays selected.
    if (!this.profilesEnabled) this.state.profile = null
  }

  // ------------------------------------------------------------------ state
  set(patch: Partial<State>): void {
    const touchesPage = Object.keys(patch).some(
      // Widget preferences, kept by profiles too (applyProfile), not page changes.
      (key) => !['profile', 'position', 'lang', 'oversized', 'readerRate'].includes(key),
    )
    this.state = {
      ...this.state,
      ...patch,
      // Hand-editing any single control means the state no longer matches the
      // preset it came from, so the profile stops claiming to be active.
      ...(touchesPage && !('profile' in patch) ? { profile: null } : {}),
    }
    if ('lang' in patch) this.messages = messagesFor(this.language)
    this.restrict()
    if (this.persist) save(this.state)
    this.apply()
    this.notify()
  }

  setProfile(id: string | null): void {
    this.state = applyProfile(this.state, id)
    this.restrict()
    if (this.persist) save(this.state)
    this.apply()
    this.notify()
  }

  reset(): void {
    const { position } = this.state
    if (this.persist) clear()
    this.state = { ...(this.persist ? load() : DEFAULT_STATE), position }
    // A fresh load re-seeds prefers-reduced-motion; an explicit reset should
    // clear everything the user can see, including that.
    this.state.pauseAnimations = false
    this.restrict()
    if (this.persist) save(this.state)
    this.apply()
    this.notify()
  }

  /**
   * Point the overlay features at a new layer. The panel is rebuilt whenever
   * the language changes, which replaces the layer; features that were already
   * on kept drawing into the old, detached one, so the dictionary's Define
   * button, tooltips and the reading mask silently vanished after a host app
   * set `<html lang>`. Forgetting what was applied for those features makes
   * the next `apply()` mount them afresh, in the live layer and new language.
   */
  setLayer(layer: HTMLElement): void {
    if (layer === this.layer) return
    this.layer = layer
    const applied = { ...this.applied }
    delete applied.cursor
    delete applied.tooltips
    delete applied.dictionary
    this.applied = applied
    this.apply()
  }

  // ------------------------------------------------------------------ apply
  private get context(): FeatureContext {
    return {
      shadow: this.shadow,
      layer: this.layer,
      t: this.t,
      getState: () => this.state,
      setState: (patch) => this.set(patch),
    }
  }

  apply(): void {
    this.restrict()
    const root = document.documentElement
    const s = this.state

    attr(root, 'data-mla-contrast', s.contrast)
    attr(root, 'data-mla-sat', s.saturation)
    attr(root, 'data-mla-links', s.highlightLinks ? '' : null)
    attr(root, 'data-mla-noimg', s.hideImages ? '' : null)
    attr(root, 'data-mla-nomotion', s.pauseAnimations ? '' : null)
    attr(root, 'data-mla-font', s.font)
    attr(root, 'data-mla-lh', s.lineHeight ? String(s.lineHeight) : null)
    attr(root, 'data-mla-ls', s.letterSpacing ? String(s.letterSpacing) : null)
    attr(root, 'data-mla-align', s.textAlign)
    attr(root, 'data-mla-cursor', s.cursor === 'big' ? 'big' : null)

    const previous = this.applied

    if (s.pauseAnimations !== previous.pauseAnimations) {
      if (s.pauseAnimations) pauseMedia.enable()
      else pauseMedia.teardown()
    }

    if (s.lineHeight !== previous.lineHeight) {
      if (s.lineHeight === 0) lineHeight.teardown()
      else lineHeight.apply(s.lineHeight)
    }

    if (s.textScale !== previous.textScale) {
      if (s.textScale === 0) textScale.teardown()
      else textScale.apply(s.textScale)
    }

    if (s.smartContrast !== previous.smartContrast) {
      if (s.smartContrast) smartContrast.apply()
      else smartContrast.teardown()
    } else if (s.smartContrast && s.textScale !== previous.textScale) {
      // Resizing text moves the 1.4.3 large-text boundary, so a correction
      // measured at the old size no longer reflects the right target.
      smartContrast.apply()
    }

    if (s.cursor !== previous.cursor) {
      cursorOverlays.teardown()
      if (s.cursor === 'mask') cursorOverlays.enableMask(this.context)
      if (s.cursor === 'guide') cursorOverlays.enableGuide(this.context)
    }

    if (s.tooltips !== previous.tooltips) {
      if (s.tooltips) tooltips.enable(this.context)
      else tooltips.teardown()
    }

    if (s.screenReader !== previous.screenReader) {
      if (s.screenReader) screenReader.enable(this.context)
      else screenReader.teardown()
    }

    if (s.dictionary !== previous.dictionary) {
      if (s.dictionary) dictionary.enable(this.context)
      else dictionary.teardown()
    }

    // The chosen language translates the page too, not only the widget.
    if (s.lang !== previous.lang) void translate.setTarget(s.lang)

    if (this.wantSkipLink) skipLink.install(this.t('skipToContent'))

    this.applied = { ...s }
  }

  destroy(): void {
    pauseMedia.teardown()
    textScale.teardown()
    lineHeight.teardown()
    smartContrast.teardown()
    cursorOverlays.teardown()
    tooltips.teardown()
    screenReader.teardown()
    dictionary.teardown()
    void translate.teardown()
    skipLink.remove()
    for (const name of [
      'contrast', 'sat', 'links', 'noimg', 'nomotion',
      'font', 'lh', 'ls', 'align', 'cursor', 'reader',
    ]) {
      document.documentElement.removeAttribute(`data-mla-${name}`)
    }
    this.listeners.clear()
  }
}
