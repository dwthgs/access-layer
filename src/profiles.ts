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
import { DEFAULT_STATE, type State } from './state'

export interface Profile {
  id: string
  labelKey: MessageKey
  hintKey: MessageKey
  icon: string
  patch: Partial<State>
}

/**
 * The same eight profiles, in the same order, as UserWay, so visitors moving
 * between sites find what they know. Ids of the original six are unchanged,
 * so a profile saved in a visitor's browser still resolves.
 *
 * One exception: UserWay's "Blind" is called "Read aloud" here (id `blind`
 * kept). Its speech is a reading aid for sighted visitors; offered to blind
 * visitors, it talks over the screen reader they already use (#12).
 */
export const PROFILES: Profile[] = [
  {
    id: 'motor',
    labelKey: 'profileMotor',
    hintKey: 'profileMotorHint',
    icon: 'wheelchair',
    patch: { cursor: 'big', highlightLinks: true, pauseAnimations: true },
  },
  {
    id: 'blind',
    labelKey: 'profileReadAloud',
    hintKey: 'profileReadAloudHint',
    icon: 'audio',
    patch: { screenReader: true, tooltips: true },
  },
  {
    id: 'colorBlind',
    labelKey: 'profileColorBlind',
    hintKey: 'profileColorBlindHint',
    icon: 'saturation',
    patch: { saturation: 'high', smartContrast: true },
  },
  {
    id: 'dyslexia',
    labelKey: 'profileDyslexia',
    hintKey: 'profileDyslexiaHint',
    icon: 'dyslexia',
    patch: { font: 'dyslexic', letterSpacing: 1, lineHeight: 1, textAlign: 'left', cursor: 'guide' },
  },
  {
    id: 'vision',
    labelKey: 'profileVision',
    hintKey: 'profileVisionHint',
    icon: 'eye',
    patch: { textScale: 2, smartContrast: true, highlightLinks: true },
  },
  {
    id: 'cognitive',
    labelKey: 'profileCognitive',
    hintKey: 'profileCognitiveHint',
    icon: 'puzzle',
    patch: { cursor: 'guide', highlightLinks: true, pauseAnimations: true, dictionary: true },
  },
  {
    id: 'seizure',
    labelKey: 'profileSeizure',
    hintKey: 'profileSeizureHint',
    icon: 'brain',
    patch: { pauseAnimations: true, saturation: 'low' },
  },
  {
    id: 'adhd',
    labelKey: 'profileAdhd',
    hintKey: 'profileAdhdHint',
    icon: 'target',
    patch: { cursor: 'mask', pauseAnimations: true, saturation: 'low' },
  },
]

/** Build the full state a profile represents, preserving widget preferences. */
export function applyProfile(current: State, id: string | null): State {
  const profile = PROFILES.find((entry) => entry.id === id)
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
