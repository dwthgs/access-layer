import type { MessageKey } from '../i18n'
import type { State } from '../state'

/** What every feature module is handed when the controller turns it on. */
export interface FeatureContext {
  /** The widget's shadow root, for UI a feature needs to draw. */
  shadow: ShadowRoot
  /** A pointer-transparent layer inside the shadow root for overlays. */
  layer: HTMLElement
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  getState: () => State
  setState: (patch: Partial<State>) => void
}

export interface Feature {
  enable(ctx: FeatureContext): void
  disable(): void
  /** Optional: re-read the page after it changed under us. */
  refresh?(): void
}
