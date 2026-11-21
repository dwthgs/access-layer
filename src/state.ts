/**
 * Every user-adjustable setting, the defaults, and how they survive a reload.
 *
 * The whole state is one plain object persisted under a single localStorage
 * key. Keeping it flat means `applyState` can diff nothing and simply write
 * the current values onto `<html>` as data attributes on every change, which
 * is what makes the widget survive client-side route changes for free.
 */

export type TextScale = 0 | 1 | 2 | 3 | 4
export type Step = 0 | 1 | 2 | 3
export type TextAlign = null | 'left' | 'center' | 'right' | 'justify'
export type ContrastMode = null | 'invert' | 'dark' | 'light'
export type Saturation = null | 'low' | 'high' | 'mono'
export type FontMode = null | 'dyslexic' | 'legible'
export type CursorMode = null | 'big' | 'mask' | 'guide'
export const POSITIONS = [
  'bottom-left',
  'bottom-right',
  'top-left',
  'top-right',
  'middle-left',
  'middle-right',
] as const

export function parsePosition(value: string | null | undefined): Position | null {
  return (POSITIONS as readonly string[]).includes(value ?? '') ? (value as Position) : null
}

export type Position =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'

export interface State {
  textScale: TextScale
  lineHeight: Step
  letterSpacing: Step
  textAlign: TextAlign
  contrast: ContrastMode
  saturation: Saturation
  smartContrast: boolean
  highlightLinks: boolean
  hideImages: boolean
  pauseAnimations: boolean
  font: FontMode
  cursor: CursorMode
  tooltips: boolean
  screenReader: boolean
  /** Speech rate multiplier for the screen reader. */
  readerRate: number
  dictionary: boolean
  oversized: boolean
  profile: string | null
  /** Null until the visitor moves the widget; the site's default applies. */
  position: Position | null
  /** Null until the visitor picks a language; the page's language applies. */
  lang: string | null
}

export const DEFAULT_STATE: State = {
  textScale: 0,
  lineHeight: 0,
  letterSpacing: 0,
  textAlign: null,
  contrast: null,
  saturation: null,
  smartContrast: false,
  highlightLinks: false,
  hideImages: false,
  pauseAnimations: false,
  font: null,
  cursor: null,
  tooltips: false,
  screenReader: false,
  readerRate: 1,
  dictionary: false,
  oversized: false,
  profile: null,
  position: null,
  lang: null,
}

export const STORAGE_KEY = 'access-layer:v1'

/** True when the user has changed anything at all. Drives the reset button. */
export function isPristine(state: State): boolean {
  return (Object.keys(DEFAULT_STATE) as (keyof State)[]).every((key) => {
    // Position is a preference about the widget, not an adjustment to the
    // page. Language counts: Reset has to be able to stop a translation.
    if (key === 'position') return true
    return state[key] === DEFAULT_STATE[key]
  })
}

export function load(): State {
  const seeded = seedFromSystem()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seeded
    const parsed = JSON.parse(raw) as Partial<State>
    return sanitize({ ...seeded, ...parsed })
  } catch {
    return seeded
  }
}

export function save(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode, blocked storage, quota. The widget still works for this
    // page view; only persistence is lost, so there is nothing to report.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* see save() */
  }
}

/**
 * A first-time visitor who has already told their operating system they want
 * less motion gets animations paused without having to find the widget.
 */
function seedFromSystem(): State {
  const state = { ...DEFAULT_STATE }
  if (typeof matchMedia !== 'function') return state
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.pauseAnimations = true
    }
  } catch {
    /* matchMedia can throw on very old engines */
  }
  return state
}

const RANGES = {
  textScale: [0, 1, 2, 3, 4],
  lineHeight: [0, 1, 2, 3],
  letterSpacing: [0, 1, 2, 3],
  textAlign: [null, 'left', 'center', 'right', 'justify'],
  contrast: [null, 'invert', 'dark', 'light'],
  saturation: [null, 'low', 'high', 'mono'],
  font: [null, 'dyslexic', 'legible'],
  cursor: [null, 'big', 'mask', 'guide'],
  readerRate: [0.75, 1, 1.5],
  position: [
    null,
    'bottom-left',
    'bottom-right',
    'top-left',
    'top-right',
    'middle-left',
    'middle-right',
  ],
} as const

/** Storage is user-writable, so never trust what comes back out of it. */
export function sanitize(input: Partial<State>): State {
  const out = { ...DEFAULT_STATE }
  for (const key of Object.keys(DEFAULT_STATE) as (keyof State)[]) {
    const value = input[key]
    if (value === undefined) continue
    const allowed = (RANGES as Record<string, readonly unknown[]>)[key]
    if (allowed) {
      if (allowed.includes(value)) (out as Record<string, unknown>)[key] = value
      continue
    }
    if (typeof DEFAULT_STATE[key] === 'boolean' && typeof value === 'boolean') {
      ;(out as Record<string, unknown>)[key] = value
      continue
    }
    if (key === 'lang' && (value === null || typeof value === 'string')) out.lang = value
    if (key === 'profile' && (value === null || typeof value === 'string')) {
      out.profile = value as string | null
    }
  }
  return out
}
