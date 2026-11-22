/**
 * Accessibility profiles: named presets that switch on a coherent set of
 * adjustments at once, for people who know what they need but not which of
 * seventeen toggles delivers it.
 *
 * A profile is a patch, not a mode. Applying one starts from the defaults so
 * profiles never stack into a contradictory state, and touching any
 * individual control afterwards simply clears the profile label.
 */

import type { MessageKey } from './i18n'
import { DEFAULT_STATE, LEGACY_PROFILES, type State } from './state'

export interface Profile {
  id: string
  labelKey: MessageKey
  hintKey: MessageKey
  icon: string
  patch: Partial<State>
}

/**
 * "Read aloud" is speech for sighted visitors. It is not offered as a profile
 * for blind visitors: it talks over the screen reader they already use (#12).
 */
export const PROFILES: Profile[] = [
  {
    id: 'vision',
    labelKey: 'profileVision',
    hintKey: 'profileVisionHint',
    icon: 'eye',
    patch: { textScale: 2, smartContrast: true, highlightLinks: true },
  },
  {
    id: 'dyslexia',
    labelKey: 'profileDyslexia',
    hintKey: 'profileDyslexiaHint',
    icon: 'dyslexia',
    patch: { font: 'dyslexic', letterSpacing: 1, lineHeight: 1, textAlign: 'left', cursor: 'guide' },
  },
  {
    id: 'colorBlind',
    labelKey: 'profileColorBlind',
    hintKey: 'profileColorBlindHint',
    icon: 'saturation',
    patch: { saturation: 'high', smartContrast: true },
  },
  {
    id: 'focus',
    labelKey: 'profileFocus',
    hintKey: 'profileFocusHint',
    icon: 'target',
    patch: { cursor: 'mask', pauseAnimations: true, saturation: 'low' },
  },
  {
    id: 'cognitive',
    labelKey: 'profileCognitive',
    hintKey: 'profileCognitiveHint',
    icon: 'puzzle',
    patch: { cursor: 'guide', highlightLinks: true, pauseAnimations: true, dictionary: true },
  },
  {
    id: 'motion',
    labelKey: 'profileMotion',
    hintKey: 'profileMotionHint',
    icon: 'brain',
    patch: { pauseAnimations: true, saturation: 'low' },
  },
  {
    id: 'motor',
    labelKey: 'profileMobility',
    hintKey: 'profileMobilityHint',
    icon: 'wheelchair',
    patch: { cursor: 'big', highlightLinks: true, pauseAnimations: true },
  },
  {
    id: 'readAloud',
    labelKey: 'profileReadAloud',
    hintKey: 'profileReadAloudHint',
    icon: 'audio',
    patch: { screenReader: true, tooltips: true },
  },
]

/** Build the full state a profile represents, preserving widget preferences. */
export function applyProfile(current: State, id: string | null): State {
  // Old ids still work, for embedders' code written before the rename.
  const profile = PROFILES.find((entry) => entry.id === (LEGACY_PROFILES[id ?? ''] ?? id))
  const base: State = {
    ...DEFAULT_STATE,
    lang: current.lang,
    position: current.position,
    oversized: current.oversized,
    readerRate: current.readerRate,
  }
  if (!profile) return { ...base, profile: null }
  return { ...base, ...profile.patch, profile: profile.id }
}
