/**
 * Translations.
 *
 * English is the source of truth and every other locale is a partial that is
 * merged over it, so a missing string falls back to English instead of
 * rendering an empty control. Locales here are
 * `en` and `es`; adding one is a single new file plus an
 * entry in `LOCALES`.
 */

import { es } from './es'

export const en = {
  title: 'Accessibility menu',
  openMenu: 'Open the accessibility menu',
  closeMenu: 'Close the accessibility menu',
  shortcut: 'Alt + A',
  skipToContent: 'Skip to main content',
  language: 'Language',
  translateWorking: 'Translating the page…',
  translateProgress: 'Preparing the translation… {percent}%',
  translateDoneDevice: 'Page translated on this device.',
  translateDoneGoogle: 'Page translated by Google.',
  translateFailed: 'This page could not be translated right now.',
  translateUnavailable: 'This browser cannot translate this page.',
  translateReload: 'Google could not put the original page back. Reloading the page will; save anything you are typing first.',
  translateReloadButton: 'Reload the page',
  languageSearch: 'Search language',
  languageNone: 'No languages match.',
  languageAuto: 'Automatic (match this page)',

  profiles: 'Accessibility Profiles',
  profilesHint: 'One-click presets that turn on a set of adjustments together.',
  profilesInfo: 'What each profile turns on',
  profileMotor: 'Motor Impaired',
  profileMotorHint: 'Big cursor, highlighted links, no animation',
  profileReadAloud: 'Read aloud',
  profileReadAloudHint: 'Reads aloud what you click or move focus to, shows image and button descriptions. If you use a screen reader, leave this off',
  profileColorBlind: 'Color Blind',
  profileColorBlindHint: 'Stronger colour and smart contrast',
  profileDyslexia: 'Dyslexia',
  profileDyslexiaHint: 'Dyslexia font, wider spacing, reading guide, left-aligned text',
  profileVision: 'Low vision',
  profileVisionHint: 'Larger text, smart contrast, highlighted links',
  profileCognitive: 'Cognitive & Learning',
  profileCognitiveHint: 'Reading guide, highlighted links, no animation, dictionary',
  profileSeizure: 'Seizure & Epileptic',
  profileSeizureHint: 'No animation, muted colour',
  profileAdhd: 'ADHD',
  profileAdhdHint: 'Reading mask, no animation, muted colour',

  sectionVision: 'Vision',
  sectionReading: 'Reading',
  sectionContent: 'Content',
  sectionTools: 'Tools',

  screenReader: 'Screen reader',
  contrast: 'Contrast',
  smartContrast: 'Smart contrast',
  highlightLinks: 'Highlight links',
  biggerText: 'Bigger text',
  textSpacing: 'Text spacing',
  lineHeight: 'Line height',
  textAlign: 'Text align',
  pauseAnimations: 'Pause animations',
  hideImages: 'Hide images',
  dyslexiaFont: 'Dyslexia friendly',
  legibleFont: 'Legible font',
  fontLabel: 'Font',
  cursor: 'Cursor',
  tooltips: 'Tooltips',
  pageStructure: 'Page structure',
  dictionary: 'Dictionary',
  saturation: 'Saturation',
  oversized: 'Oversized widget',

  optionOff: 'Off',
  optionOn: 'On',
  optionInvert: 'Invert',
  optionDark: 'Dark',
  optionLight: 'Light',
  optionLow: 'Low',
  optionHigh: 'High',
  optionMono: 'Monochrome',
  optionBigCursor: 'Big cursor',
  optionReadingMask: 'Reading mask',
  optionReadingGuide: 'Reading guide',
  optionLeft: 'Left',
  optionCenter: 'Center',
  optionRight: 'Right',
  optionJustify: 'Justify',
  optionDefault: 'Default',
  optionSlow: 'Slow',
  optionNormal: 'Normal',
  optionFast: 'Fast',
  readerSpeed: 'Reading speed',

  level: 'Level {n}',
  levelOf: 'Level {n} of {total}',
  stepOf: '{n} of {total}',
  nameInvert: 'Invert colors',
  nameDarkContrast: 'Dark contrast',
  nameLightContrast: 'Light contrast',
  nameLowSaturation: 'Low saturation',
  nameHighSaturation: 'High saturation',
  nameAlignLeft: 'Align left',
  nameAlignCenter: 'Align center',
  nameAlignRight: 'Align right',
  nameJustify: 'Justify',
  decrease: 'Decrease',
  increase: 'Increase',

  reset: 'Reset all accessibility settings',
  moveWidget: 'Move accessibility widget',
  positionBottomLeft: 'Bottom left',
  positionBottomRight: 'Bottom right',
  positionTopLeft: 'Top left',
  positionTopRight: 'Top right',
  positionMiddleLeft: 'Middle left',
  positionMiddleRight: 'Middle right',

  structureHeadings: 'Headings',
  structureLandmarks: 'Landmarks',
  structureLinks: 'Links',
  structureEmpty: 'Nothing of this kind was found on the page.',
  structureUntitled: 'Untitled',

  dictionaryDefine: 'Define',
  dictionaryLoading: 'Looking up…',
  dictionaryNotFound: 'No definition found.',
  dictionaryError: 'The dictionary could not be reached.',
  dictionaryRead: 'Read',
  dictionaryReadLabel: 'Read the word and its definitions aloud',
  dictionarySpell: 'Spell',
  dictionarySpellLabel: 'Spell the word aloud, letter by letter',
  dictionarySearchLabel: 'Word to look up',
  dictionaryLookUp: 'Look up',
  dictionaryPrevious: 'Previous definition',
  dictionaryNext: 'Next definition',
  dictionaryCount: '{n} of {total}',
  spellApostrophe: 'apostrophe',
  spellHyphen: 'hyphen',

  statement: 'Accessibility statement',
  reportProblem: 'Report an accessibility problem',
  poweredBy: 'Accessibility tools by AccessLayer',
  notSupported: 'Your browser does not support this feature.',
} as const

export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>

const LOCALES: Record<string, Partial<Messages>> = { en: {}, es }

export const AVAILABLE_LOCALES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
]

export function messagesFor(lang: string): Messages {
  const base = lang.split('-')[0] ?? 'en'
  return { ...en, ...(LOCALES[base] ?? {}) }
}

/** Resolve the best starting language from the page or the browser. */
export function detectLanguage(): string {
  const fromHtml = document.documentElement.lang?.split('-')[0]
  if (fromHtml && LOCALES[fromHtml]) return fromHtml
  const fromNavigator = navigator.language?.split('-')[0]
  if (fromNavigator && LOCALES[fromNavigator]) return fromNavigator
  return 'en'
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}
