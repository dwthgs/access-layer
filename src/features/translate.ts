/**
 * Page translation.
 *
 * Picking a language in the panel translates the page itself, not only
 * the widget. Two engines, tried in order:
 *
 *   1. The browser's own on-device translator (the Translator API, in
 *      current Chrome and Edge). Nothing leaves the device.
 *   2. Google, as soon as the visitor picks a language, unless the embedding
 *      site sets `translate-fallback="off"`. With `translate-url` that is the
 *      site's own endpoint, which calls the paid Cloud Translation API with a key the
 *      visitor never sees; otherwise it is the free website translator.
 *
 * The widget is never translated: it lives in a shadow root, which neither
 * engine walks, and it carries `translate="no"` for good measure. Its own
 * labels follow the chosen language wherever the widget has them.
 */

import { adopt, drop, sheet } from '../util/sheets'
import { primaryLanguage } from './dictionaryData'

export interface Language {
  /** BCP 47, as stored in settings and written to `<html lang>`. */
  code: string
  /** In its own language, so a visitor can find it without reading English. */
  name: string
  /** In English, shown beside the native name and matched by search. */
  english: string
  /** Two letters in the list's round badge; the code's own by default. */
  badge?: string
  /** Google's code where it differs: Hebrew is `iw`, Filipino `tl`. */
  google?: string
  /** The on-device translator's code where it differs. */
  device?: string
}

/** Every language Google translates. English stays first: the picker falls back to it; it sorts the list itself. */
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'it', name: 'Italiano', english: 'Italian' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
  { code: 'nl', name: 'Nederlands', english: 'Dutch' },
  { code: 'pl', name: 'Polski', english: 'Polish' },
  { code: 'ru', name: 'Русский', english: 'Russian' },
  { code: 'uk', name: 'Українська', english: 'Ukrainian' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish' },
  { code: 'el', name: 'Ελληνικά', english: 'Greek' },
  { code: 'cs', name: 'Čeština', english: 'Czech' },
  { code: 'hu', name: 'Magyar', english: 'Hungarian' },
  { code: 'ro', name: 'Română', english: 'Romanian' },
  { code: 'bg', name: 'Български', english: 'Bulgarian' },
  { code: 'hr', name: 'Hrvatski', english: 'Croatian' },
  { code: 'sr', name: 'Српски', english: 'Serbian' },
  { code: 'sk', name: 'Slovenčina', english: 'Slovak' },
  { code: 'sv', name: 'Svenska', english: 'Swedish' },
  { code: 'no', name: 'Norsk', english: 'Norwegian', device: 'nb' },
  { code: 'da', name: 'Dansk', english: 'Danish' },
  { code: 'fi', name: 'Suomi', english: 'Finnish' },
  { code: 'ca', name: 'Català', english: 'Catalan' },
  { code: 'ar', name: 'العربية', english: 'Arabic' },
  { code: 'he', name: 'עברית', english: 'Hebrew', google: 'iw' },
  { code: 'fa', name: 'فارسی', english: 'Persian' },
  { code: 'ur', name: 'اردو', english: 'Urdu' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali' },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil' },
  { code: 'zh-CN', name: '中文（简体）', english: 'Chinese, Simplified', badge: 'ZH', device: 'zh' },
  { code: 'zh-TW', name: '中文（繁體）', english: 'Chinese, Traditional', badge: 'TW', device: 'zh-Hant' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'th', name: 'ไทย', english: 'Thai' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'ms', name: 'Bahasa Melayu', english: 'Malay' },
  { code: 'fil', name: 'Filipino', english: 'Filipino', badge: 'TL', google: 'tl' },
  { code: 'sw', name: 'Kiswahili', english: 'Swahili' },
  { code: 'am', name: 'አማርኛ', english: 'Amharic' },
  { code: 'ti', name: 'ትግርኛ', english: 'Tigrinya' },
  { code: 'so', name: 'Soomaali', english: 'Somali' },
  { code: 'ht', name: 'Kreyòl ayisyen', english: 'Haitian Creole' },
  { code: 'yo', name: 'Yorùbá', english: 'Yoruba' },
  { code: 'ab', name: 'Abkhaz', english: 'Abkhaz' },
  { code: 'ace', name: 'Acehnese', english: 'Acehnese' },
  { code: 'ach', name: 'Acholi', english: 'Acholi' },
  { code: 'af', name: 'Afrikaans', english: 'Afrikaans' },
  { code: 'sq', name: 'Shqip', english: 'Albanian' },
  { code: 'alz', name: 'Alur', english: 'Alur' },
  { code: 'hy', name: 'Հայերեն', english: 'Armenian' },
  { code: 'as', name: 'অসমীয়া', english: 'Assamese' },
  { code: 'awa', name: 'Awadhi', english: 'Awadhi' },
  { code: 'ay', name: 'Aymara', english: 'Aymara' },
  { code: 'az', name: 'Azərbaycan', english: 'Azerbaijani' },
  { code: 'ban', name: 'Balinese', english: 'Balinese' },
  { code: 'bm', name: 'Bamanakan', english: 'Bambara' },
  { code: 'ba', name: 'Башҡорт', english: 'Bashkir' },
  { code: 'eu', name: 'Euskara', english: 'Basque' },
  { code: 'btx', name: 'Batak Karo', english: 'Batak Karo' },
  { code: 'bts', name: 'Batak Simalungun', english: 'Batak Simalungun' },
  { code: 'bbc', name: 'Batak Toba', english: 'Batak Toba' },
  { code: 'be', name: 'Беларуская', english: 'Belarusian' },
  { code: 'bem', name: 'Ichibemba', english: 'Bemba' },
  { code: 'bew', name: 'Betawi', english: 'Betawi' },
  { code: 'bho', name: 'भोजपुरी', english: 'Bhojpuri' },
  { code: 'bik', name: 'Bikol', english: 'Bikol' },
  { code: 'bs', name: 'Bosanski', english: 'Bosnian' },
  { code: 'br', name: 'Brezhoneg', english: 'Breton' },
  { code: 'bua', name: 'Буряад', english: 'Buryat' },
  { code: 'yue', name: '粵語', english: 'Cantonese' },
  { code: 'ceb', name: 'Cebuano', english: 'Cebuano' },
  { code: 'ny', name: 'Chichewa (Nyanja)', english: 'Chichewa (Nyanja)' },
  { code: 'cv', name: 'Чӑваш чӗлхи', english: 'Chuvash' },
  { code: 'co', name: 'Corsican', english: 'Corsican' },
  { code: 'crh', name: 'Crimean Tatar', english: 'Crimean Tatar' },
  { code: 'din', name: 'Dinka', english: 'Dinka' },
  { code: 'dv', name: 'Divehi', english: 'Divehi' },
  { code: 'doi', name: 'डोगरी', english: 'Dogri' },
  { code: 'dov', name: 'Dombe', english: 'Dombe' },
  { code: 'dz', name: 'རྫོང་ཁ', english: 'Dzongkha' },
  { code: 'eo', name: 'Esperanto', english: 'Esperanto' },
  { code: 'et', name: 'Eesti', english: 'Estonian' },
  { code: 'ee', name: 'Eʋegbe', english: 'Ewe' },
  { code: 'fj', name: 'Fijian', english: 'Fijian' },
  { code: 'fr-CA', name: 'Français canadien', english: 'French (Canadian)', badge: 'QC' },
  { code: 'fy', name: 'Frysk', english: 'Frisian' },
  { code: 'ff', name: 'Pulaar', english: 'Fulfulde' },
  { code: 'gaa', name: 'Gã', english: 'Ga' },
  { code: 'gl', name: 'Galego', english: 'Galician' },
  { code: 'lg', name: 'Luganda', english: 'Ganda (Luganda)' },
  { code: 'ka', name: 'ქართული', english: 'Georgian' },
  { code: 'gn', name: 'Guarani', english: 'Guarani' },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'cnh', name: 'Hakha Chin', english: 'Hakha Chin' },
  { code: 'ha', name: 'Hausa', english: 'Hausa' },
  { code: 'haw', name: 'ʻŌlelo Hawaiʻi', english: 'Hawaiian' },
  { code: 'hil', name: 'Hiligaynon', english: 'Hiligaynon' },
  { code: 'hmn', name: 'Hmong', english: 'Hmong' },
  { code: 'hrx', name: 'Hunsrik', english: 'Hunsrik' },
  { code: 'is', name: 'Íslenska', english: 'Icelandic' },
  { code: 'ig', name: 'Igbo', english: 'Igbo' },
  { code: 'ilo', name: 'Iloko', english: 'Iloko' },
  { code: 'ga', name: 'Gaeilge', english: 'Irish' },
  { code: 'jv', name: 'Jawa', english: 'Javanese', google: 'jw' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'pam', name: 'Kapampangan', english: 'Kapampangan' },
  { code: 'kk', name: 'Қазақ тілі', english: 'Kazakh' },
  { code: 'km', name: 'ខ្មែរ', english: 'Khmer' },
  { code: 'cgg', name: 'Rukiga', english: 'Kiga' },
  { code: 'rw', name: 'Ikinyarwanda', english: 'Kinyarwanda' },
  { code: 'ktu', name: 'Kituba', english: 'Kituba' },
  { code: 'gom', name: 'कोंकणी', english: 'Konkani' },
  { code: 'kri', name: 'Krio', english: 'Krio' },
  { code: 'ku', name: 'Kurdî (kurmancî)', english: 'Kurdish (Kurmanji)' },
  { code: 'ckb', name: 'کوردیی ناوەندی', english: 'Kurdish (Sorani)' },
  { code: 'ky', name: 'Кыргызча', english: 'Kyrgyz' },
  { code: 'lo', name: 'ລາວ', english: 'Lao' },
  { code: 'ltg', name: 'Latgalian', english: 'Latgalian' },
  { code: 'la', name: 'Latin', english: 'Latin' },
  { code: 'lv', name: 'Latviešu', english: 'Latvian' },
  { code: 'lij', name: 'Ligure', english: 'Ligurian' },
  { code: 'li', name: 'Limburgan', english: 'Limburgan' },
  { code: 'ln', name: 'Lingála', english: 'Lingala' },
  { code: 'lt', name: 'Lietuvių', english: 'Lithuanian' },
  { code: 'lmo', name: 'Lombard', english: 'Lombard' },
  { code: 'luo', name: 'Dholuo', english: 'Luo' },
  { code: 'lb', name: 'Lëtzebuergesch', english: 'Luxembourgish' },
  { code: 'mk', name: 'Македонски', english: 'Macedonian' },
  { code: 'mai', name: 'मैथिली', english: 'Maithili' },
  { code: 'mak', name: 'Makassar', english: 'Makassar' },
  { code: 'mg', name: 'Malagasy', english: 'Malagasy' },
  { code: 'ms-Arab', name: 'Malay (Jawi)', english: 'Malay (Jawi)', badge: 'JW' },
  { code: 'ml', name: 'മലയാളം', english: 'Malayalam' },
  { code: 'mt', name: 'Malti', english: 'Maltese' },
  { code: 'mi', name: 'Maori', english: 'Maori' },
  { code: 'mr', name: 'मराठी', english: 'Marathi' },
  { code: 'chm', name: 'Meadow Mari', english: 'Meadow Mari' },
  { code: 'mni-Mtei', name: 'Meiteilon (Manipuri)', english: 'Meiteilon (Manipuri)', badge: 'MN' },
  { code: 'min', name: 'Minang', english: 'Minang' },
  { code: 'lus', name: 'Mizo', english: 'Mizo' },
  { code: 'mn', name: 'Монгол', english: 'Mongolian' },
  { code: 'my', name: 'မြန်မာ', english: 'Myanmar (Burmese)' },
  { code: 'nr', name: 'Ndebele (South)', english: 'Ndebele (South)' },
  { code: 'new', name: 'Nepalbhasa (Newari)', english: 'Nepalbhasa (Newari)' },
  { code: 'ne', name: 'नेपाली', english: 'Nepali' },
  { code: 'nso', name: 'Sesotho sa Leboa', english: 'Northern Sotho (Sepedi)' },
  { code: 'nus', name: 'Thok Nath', english: 'Nuer' },
  { code: 'oc', name: 'Occitan', english: 'Occitan' },
  { code: 'or', name: 'ଓଡ଼ିଆ', english: 'Odia (Oriya)' },
  { code: 'om', name: 'Oromoo', english: 'Oromo' },
  { code: 'pag', name: 'Pangasinan', english: 'Pangasinan' },
  { code: 'pap', name: 'Papiamento', english: 'Papiamento' },
  { code: 'ps', name: 'پښتو', english: 'Pashto' },
  { code: 'pt-BR', name: 'Português (Brasil)', english: 'Portuguese (Brazil)', badge: 'BR' },
  { code: 'pt-PT', name: 'Português europeu', english: 'Portuguese (Portugal)' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'pa-Arab', name: 'پنجابی (عربی)', english: 'Punjabi (Shahmukhi)', badge: 'SH' },
  { code: 'qu', name: 'Runasimi', english: 'Quechua' },
  { code: 'rom', name: 'Romani', english: 'Romani' },
  { code: 'rn', name: 'Ikirundi', english: 'Rundi' },
  { code: 'sm', name: 'Samoan', english: 'Samoan' },
  { code: 'sg', name: 'Sängö', english: 'Sango' },
  { code: 'sa', name: 'संस्कृत भाषा', english: 'Sanskrit' },
  { code: 'gd', name: 'Gàidhlig', english: 'Scots Gaelic' },
  { code: 'st', name: 'Sesotho', english: 'Sesotho' },
  { code: 'crs', name: 'Seychellois Creole', english: 'Seychellois Creole' },
  { code: 'shn', name: 'တႆး', english: 'Shan' },
  { code: 'sn', name: 'ChiShona', english: 'Shona' },
  { code: 'scn', name: 'Sicilianu', english: 'Sicilian' },
  { code: 'szl', name: 'Ślōnski', english: 'Silesian' },
  { code: 'sd', name: 'سنڌي', english: 'Sindhi' },
  { code: 'si', name: 'සිංහල', english: 'Sinhala' },
  { code: 'sl', name: 'Slovenščina', english: 'Slovenian' },
  { code: 'su', name: 'Basa Sunda', english: 'Sundanese' },
  { code: 'ss', name: 'Swati', english: 'Swati' },
  { code: 'tg', name: 'Тоҷикӣ', english: 'Tajik' },
  { code: 'tt', name: 'Татар', english: 'Tatar' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu' },
  { code: 'tet', name: 'Tetum', english: 'Tetum' },
  { code: 'ts', name: 'Tsonga', english: 'Tsonga' },
  { code: 'tn', name: 'Setswana', english: 'Tswana' },
  { code: 'tk', name: 'Türkmen dili', english: 'Turkmen' },
  { code: 'ak', name: 'Twi (Akan)', english: 'Twi (Akan)' },
  { code: 'ug', name: 'ئۇيغۇرچە', english: 'Uyghur' },
  { code: 'uz', name: 'O‘zbek', english: 'Uzbek' },
  { code: 'cy', name: 'Cymraeg', english: 'Welsh' },
  { code: 'xh', name: 'IsiXhosa', english: 'Xhosa' },
  { code: 'yi', name: 'ייִדיש', english: 'Yiddish' },
  { code: 'yua', name: 'Yucatec Maya', english: 'Yucatec Maya' },
  { code: 'zu', name: 'IsiZulu', english: 'Zulu' },


]

export type Status =
  | { state: 'idle' }
  | { state: 'working'; engine: 'device' | 'google'; progress?: number }
  | { state: 'done'; engine: 'device' | 'google' }
  | { state: 'failed' }
  /** The device cannot translate this, and the site has turned Google off. */
  | { state: 'unavailable' }
  /** Google would not put the original back; only a reload will, and only the visitor may do that. */
  | { state: 'reload' }

/** "Català (Catalan)"; just "English" where the two are the same. */
export function displayName(language: Language): string {
  return language.name === language.english ? language.name : `${language.name} (${language.english})`
}

export function badgeFor(language: Language): string {
  return (language.badge ?? language.code.split('-')[0] ?? '').slice(0, 2).toUpperCase()
}

/** Folded for matching: case and accents ignored, so "espanol" finds Español. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function matches(language: Language, query: string): boolean {
  const q = fold(query.trim())
  if (!q) return true
  return [language.name, language.english, language.code].some((field) => fold(field).includes(q))
}

export function findLanguage(code: string | null | undefined): Language | undefined {
  if (!code) return undefined
  return (
    LANGUAGES.find((language) => language.code.toLowerCase() === code.toLowerCase()) ??
    LANGUAGES.find((language) => language.code === primaryLanguage(code))
  )
}

/** Same language, ignoring region: `en-US` and `en` need no translation. */
export function sameLanguage(a: string, b: string): boolean {
  const la = findLanguage(a)?.code ?? primaryLanguage(a)
  const lb = findLanguage(b)?.code ?? primaryLanguage(b)
  if (la.startsWith('zh') || lb.startsWith('zh')) return la === lb
  return primaryLanguage(la) === primaryLanguage(lb)
}

// ------------------------------------------------------------------- state

let status: Status = { state: 'idle' }
const listeners = new Set<(status: Status) => void>()
/** The language the page is in now, as far as the engines are concerned. */
let active: string | null = null
/** The page's own language and direction, captured before the first change. */
let original: { lang: string; attr: string | null } | null = null
/** Serialises changes, so a quick second pick waits for the first. */
let queue: Promise<void> = Promise.resolve()
let engineInUse: Engine | null = null
/** On unless the embedding site turns it off, as checkout pages should. */
let googleAllowed = true
/** The site's own Cloud Translation endpoint, which Google is reached through. */
let cloudUrl = ''

export function configure(options: { google: boolean; cloudUrl?: string }): void {
  cloudUrl = options.cloudUrl ?? ''
  googleAllowed = options.google || !!cloudUrl
}

/**
 * Google, through the site's paid endpoint where it has one. A site with a key
 * has chosen not to use the free translator, so it is never the fallback.
 */
const remoteEngine = (): Engine => (cloudUrl ? cloudEngine : googleEngine)

/** Whether Google may be used. If not, says why and loads nothing. */
function googleReady(): boolean {
  if (googleAllowed) return true
  setStatus({ state: 'unavailable' })
  return false
}

function setStatus(next: Status): void {
  status = next
  for (const listener of listeners) listener(status)
}

export function getStatus(): Status {
  return status
}

export function onStatus(listener: (status: Status) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The page's own language: what it was before anything here changed it. */
export function pageLanguage(): string {
  return original?.lang ?? (document.documentElement.getAttribute('lang') || 'en')
}

/**
 * Translate the page into `target`, or put it back with `null` (or with the
 * page's own language). Safe to call on every settings change.
 */
export function setTarget(target: string | null): Promise<void> {
  queue = queue.then(() => change(target)).catch(() => setStatus({ state: 'failed' }))
  return queue
}

async function change(requested: string | null): Promise<void> {
  const source = pageLanguage()
  const target = requested && !sameLanguage(requested, source) ? requested : null
  if (target === active) {
    // Taking back a pick that was waiting on Google clears its message.
    if (target === null) setStatus({ state: 'idle' })
    return
  }

  if (target === null) {
    const back = (await engineInUse?.restore()) ?? true
    restoreHtmlLang()
    active = null
    setStatus(back ? { state: 'idle' } : { state: 'reload' })
    return
  }

  const language = findLanguage(target)
  if (!language) {
    setStatus({ state: 'failed' })
    return
  }

  // Once Google has rewritten the DOM it keeps the page: its rewrite and ours
  // would fight over the same text nodes.
  const onDevice = engineInUse !== googleEngine && (await deviceSupports(source, language))
  if (engineInUse === deviceEngine && !onDevice) {
    await deviceEngine.restore()
    restoreHtmlLang()
    active = null
    engineInUse = null
  }
  if (!engineInUse) {
    if (onDevice) engineInUse = deviceEngine
    else if (googleReady()) engineInUse = remoteEngine()
    else return
  }

  if (!original) {
    original = {
      lang: source,
      attr: document.documentElement.getAttribute('lang'),
    }
  }

  setStatus({ state: 'working', engine: engineInUse.name })
  const progress = (fraction: number) =>
    setStatus({ state: 'working', engine: engineInUse!.name, progress: fraction })
  let ok = await engineInUse.apply(source, language, progress)
  if (!ok && engineInUse === deviceEngine) {
    // The device said it could and then did not: Google, if allowed.
    await deviceEngine.restore()
    engineInUse = null
    active = null
    if (!googleReady()) {
      restoreHtmlLang()
      return
    }
    engineInUse = remoteEngine()
    setStatus({ state: 'working', engine: 'google' })
    ok = await engineInUse.apply(source, language, progress)
  }
  if (!ok) {
    active = null
    setStatus({ state: 'failed' })
    return
  }
  active = language.code
  // Screen readers pick a voice from the page language.
  document.documentElement.setAttribute('lang', language.code)
  setStatus({ state: 'done', engine: engineInUse.name })
}

function restoreHtmlLang(): void {
  if (!original) return
  if (original.attr === null) document.documentElement.removeAttribute('lang')
  else document.documentElement.setAttribute('lang', original.attr)
  original = null
}

/**
 * Forget everything, as a fresh page load would. Queued like a change, so a
 * widget set up while this is still restoring the page translates after it.
 */
export function teardown(): Promise<void> {
  queue = queue
    .then(async () => {
      await engineInUse?.restore()
      engineInUse?.dispose?.()
      restoreHtmlLang()
      engineInUse = null
      active = null
      setStatus({ state: 'idle' })
    })
    .catch(() => undefined)
  return queue
}

/** How many translated strings the on-device engine keeps for reuse. */
export const CACHE_LIMIT = 2000

/**
 * The on-device translator is new, and not every browser that exposes it
 * answers: one we tested never settled `availability()` at all, which left
 * the page waiting forever. Every call to it gets a deadline.
 */
export const DEVICE_CHECK_TIMEOUT_MS = 2500
/** How long a language-model download may go without progress. */
export const DEVICE_STALL_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

// ----------------------------------------------------------------- engines

interface Engine {
  name: 'device' | 'google'
  apply(source: string, target: Language, progress: (fraction: number) => void): Promise<boolean>
  /** False when the original could not be put back. */
  restore(): Promise<boolean>
  dispose?(): void
}

/** Nothing to translate inside these, or translating them would break the page. */
const SKIP = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'SVG', 'MATH', 'ACCESS-LAYER',
])
const ATTRIBUTES = ['alt', 'title', 'placeholder', 'aria-label']

function skipped(el: Element): boolean {
  return (
    SKIP.has(el.tagName.toUpperCase()) ||
    el.getAttribute('translate') === 'no' ||
    el.classList.contains('notranslate') ||
    el.hasAttribute('contenteditable')
  )
}

/** Text worth sending: at least one letter, not just digits, symbols or space. */
export function translatable(text: string): boolean {
  return /\p{L}/u.test(text)
}

// ------------------------------------------------------- on-device engine

interface TextTranslator {
  translate(text: string): Promise<string>
  destroy?(): void
}
interface TranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>
  create(options: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (monitor: EventTarget) => void
  }): Promise<TextTranslator>
}

function translatorApi(): TranslatorStatic | null {
  const api = (globalThis as { Translator?: TranslatorStatic }).Translator
  return api && typeof api.availability === 'function' ? api : null
}

const deviceCode = (language: Language) => language.device ?? language.code

async function deviceSupports(source: string, target: Language): Promise<boolean> {
  const api = translatorApi()
  if (!api) return false
  try {
    const availability = await withTimeout(
      api.availability({
        sourceLanguage: deviceCode(findLanguage(source) ?? { code: primaryLanguage(source), name: '', english: '' }),
        targetLanguage: deviceCode(target),
      }),
      DEVICE_CHECK_TIMEOUT_MS,
    )
    return availability !== 'unavailable'
  } catch {
    return false
  }
}

/** The device's translator for this pair, once it has proved it answers. */
async function openDevice(source: string, target: Language, progress: (fraction: number) => void): Promise<TextTranslator> {
  const api = translatorApi()
  if (!api) throw new Error('no translator')
  // The language model downloads once, on first use, which can take a
  // while; what must not happen is a download that stops moving.
  const translator = await new Promise<TextTranslator>((resolve, reject) => {
    let stall = setTimeout(() => reject(new Error('stalled')), DEVICE_STALL_TIMEOUT_MS)
    api
      .create({
        sourceLanguage: deviceCode(findLanguage(source) ?? { code: primaryLanguage(source), name: '', english: '' }),
        targetLanguage: deviceCode(target),
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            clearTimeout(stall)
            stall = setTimeout(() => reject(new Error('stalled')), DEVICE_STALL_TIMEOUT_MS)
            const loaded = (event as Event & { loaded?: number }).loaded
            if (typeof loaded === 'number') progress(loaded)
          })
        },
      })
      .then(
        (created) => {
          clearTimeout(stall)
          resolve(created)
        },
        (error: unknown) => {
          clearTimeout(stall)
          reject(error)
        },
      )
  })
  // A translator that never answers is as bad as none: prove this one
  // does before touching the page.
  await withTimeout(translator.translate('Hello'), DEVICE_CHECK_TIMEOUT_MS * 2)
  return translator
}

/**
 * Translates text nodes and a few attributes one string at a time, keeping
 * every original so the page can be put back exactly. New content (a route
 * change in an app, a list that loads more) is translated as it arrives.
 * `workers` is how many strings may wait on the translator at once.
 */
function textEngine(
  name: Engine['name'],
  open: (source: string, target: Language, progress: (fraction: number) => void) => Promise<TextTranslator>,
  workers: number,
): Engine {
  // Weak, so text and elements the page drops (an infinite feed, a route
  // change) can be collected while the page stays translated (#13). A node
  // the page puts back later still has its original.
  let texts = new WeakMap<Text, { original: string; translated: string }>()
  let attributes = new WeakMap<Element, Map<string, { original: string; translated: string }>>()
  /** Every node changed, for putBack(); weak for the same reason. */
  let changed = new Set<WeakRef<Text | Element>>()
  let tracked = new WeakSet<Text | Element>()
  let translator: TextTranslator | null = null
  let cache = new Map<string, Promise<string>>()
  let observer: MutationObserver | null = null
  let pendingRoots = new Set<Node>()
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  let generation = 0

  function collect(root: Node, out: { texts: Text[]; attrs: [Element, string][] }): void {
    if (root instanceof Text) {
      const parent = root.parentElement
      if (parent && !parent.closest('access-layer') && !isInsideSkipped(parent)) out.texts.push(root)
      return
    }
    if (!(root instanceof Element) && !(root instanceof DocumentFragment) && !(root instanceof Document)) return
    if (root instanceof Element && (skipped(root) || isInsideSkipped(root))) return
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node instanceof Element) return skipped(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    if (root instanceof Element) collectAttributes(root, out)
    let node = walker.nextNode()
    while (node) {
      if (node instanceof Text) out.texts.push(node)
      else if (node instanceof Element) collectAttributes(node, out)
      node = walker.nextNode()
    }
  }

  function isInsideSkipped(el: Element): boolean {
    for (let current: Element | null = el; current; current = current.parentElement) {
      if (skipped(current)) return true
    }
    return false
  }

  function collectAttributes(el: Element, out: { attrs: [Element, string][] }): void {
    for (const name of ATTRIBUTES) {
      const value = el.getAttribute(name)
      if (value && translatable(value)) out.attrs.push([el, name])
    }
    const input = el as HTMLInputElement
    if (el.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(input.type) && translatable(input.value)) {
      out.attrs.push([el, 'value'])
    }
  }

  function track(node: Text | Element): void {
    if (tracked.has(node)) return
    tracked.add(node)
    changed.add(new WeakRef(node))
  }

  /** Drop references to nodes that have been collected. */
  function prune(): void {
    for (const ref of changed) if (!ref.deref()) changed.delete(ref)
  }

  /** Most recently used strings; the oldest go once there are too many. */
  function translateString(text: string): Promise<string> {
    let hit = cache.get(text)
    if (hit) {
      cache.delete(text)
    } else {
      hit = translator!.translate(text)
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
      // A string that failed (a dropped connection) is asked for again later.
      hit.catch(() => cache.delete(text))
    }
    cache.set(text, hit)
    return hit
  }

  /** Keep the whitespace around a string; only its words are translated. */
  async function translatePadded(text: string): Promise<string> {
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!
    const core = match[2] ?? ''
    if (!translatable(core)) return text
    return `${match[1]}${await translateString(core)}${match[3]}`
  }

  async function translateRoots(roots: Node[], progress?: (fraction: number) => void): Promise<void> {
    const mine = generation
    const found = { texts: [] as Text[], attrs: [] as [Element, string][] }
    for (const root of roots) collect(root, found)
    const jobs: (() => Promise<void>)[] = []

    for (const node of found.texts) {
      const known = texts.get(node)
      // Already ours and unchanged: nothing to do.
      if (known && node.data === known.translated) continue
      const source = node.data
      if (!translatable(source)) continue
      jobs.push(async () => {
        const translated = await translatePadded(source)
        if (mine !== generation || node.data !== source) return
        texts.set(node, { original: source, translated })
        track(node)
        node.data = translated
      })
    }
    for (const [el, name] of found.attrs) {
      const source = name === 'value' ? (el as HTMLInputElement).value : el.getAttribute(name) ?? ''
      const known = attributes.get(el)?.get(name)
      if (known && source === known.translated) continue
      jobs.push(async () => {
        const translated = await translatePadded(source)
        if (mine !== generation) return
        let map = attributes.get(el)
        if (!map) attributes.set(el, (map = new Map()))
        map.set(name, { original: source, translated })
        track(el)
        if (name === 'value') (el as HTMLInputElement).value = translated
        else el.setAttribute(name, translated)
      })
    }

    // A few at a time: the translator runs locally, but thousands of
    // simultaneous requests would still stall the page.
    let done = 0
    const total = jobs.length
    const running = Array.from({ length: Math.min(workers, total) }, async () => {
      while (jobs.length) {
        const job = jobs.shift()!
        await job()
        done++
        if (total > 20 && done % 10 === 0) progress?.(done / total)
      }
    })
    await Promise.all(running)
  }

  function watch(): void {
    observer?.disconnect()
    observer = new MutationObserver((records) => {
      // Removals add nothing to translate but still need a prune, or a page
      // that only takes content away keeps a reference per removed node.
      let removed = false
      for (const record of records) {
        if (record.type === 'characterData') {
          const node = record.target as Text
          // Our own write: the node now holds exactly what we put there.
          if (texts.get(node)?.translated === node.data) continue
          texts.delete(node)
          pendingRoots.add(node)
        } else if (record.type === 'attributes') {
          const el = record.target as Element
          const value = el.getAttribute(record.attributeName!) ?? ''
          if (attributes.get(el)?.get(record.attributeName!)?.translated === value) continue
          pendingRoots.add(el)
        } else {
          for (const added of Array.from(record.addedNodes)) pendingRoots.add(added)
          if (record.removedNodes.length > 0) removed = true
        }
      }
      if (pendingRoots.size === 0 && !removed) return
      clearTimeout(flushTimer)
      flushTimer = setTimeout(() => {
        const roots = Array.from(pendingRoots).filter((node) => node.isConnected)
        pendingRoots = new Set()
        prune()
        translateRoots(roots).catch(() => undefined)
      }, 150)
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    })
  }

  function putBack(): void {
    for (const ref of changed) {
      const node = ref.deref()
      if (node instanceof Text) {
        const entry = texts.get(node)
        if (entry && node.data === entry.translated) node.data = entry.original
        continue
      }
      const map = node ? attributes.get(node) : undefined
      if (!node || !map) continue
      for (const [name, entry] of map) {
        if (name === 'value') {
          const input = node as HTMLInputElement
          if (input.value === entry.translated) input.value = entry.original
        } else if (node.getAttribute(name) === entry.translated) {
          node.setAttribute(name, entry.original)
        }
      }
    }
    texts = new WeakMap()
    attributes = new WeakMap()
    changed = new Set()
    tracked = new WeakSet()
  }

  return {
    name,
    async apply(source, target, progress) {
      observer?.disconnect()
      clearTimeout(flushTimer)
      generation++
      // Translate from the original text, never from a previous translation.
      putBack()
      translator?.destroy?.()
      translator = null
      cache = new Map()
      try {
        translator = await open(source, target, progress)
        await translateRoots([document.body], progress)
        watch()
        return true
      } catch {
        putBack()
        return false
      }
    },
    async restore() {
      observer?.disconnect()
      observer = null
      clearTimeout(flushTimer)
      generation++
      putBack()
      translator?.destroy?.()
      translator = null
      cache = new Map()
      return true
    },
  }
}

const deviceEngine = textEngine('device', openDevice, 6)

// ---------------------------------------------------- Cloud Translation

/** Strings, and characters, sent to the site's endpoint in one request. */
export const CLOUD_BATCH = 100
export const CLOUD_CHARS = 5000

/**
 * Collects the strings asked for in the same moment into one request to the
 * site's endpoint: `{ source, target, q: [...] }` in, `{ translations: [...] }`
 * out, in the same order. The endpoint holds the key, not the page.
 */
async function openCloud(source: string, target: Language): Promise<TextTranslator> {
  let batch: { text: string; resolve: (text: string) => void; reject: (error: unknown) => void }[] = []
  let size = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const send = () => {
    clearTimeout(timer)
    timer = undefined
    if (!batch.length) return
    const sent = batch
    batch = []
    size = 0
    fetch(cloudUrl, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: googleCode(source), target: googleCode(target.code), q: sent.map((item) => item.text) }),
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((data: { translations?: unknown }) => {
        const out = data.translations
        if (!Array.isArray(out) || out.length !== sent.length) throw new Error('unexpected response')
        sent.forEach((item, i) => item.resolve(String(out[i])))
      })
      .catch((error: unknown) => sent.forEach((item) => item.reject(error)))
  }
  return {
    translate(text) {
      if (size + text.length > CLOUD_CHARS) send()
      const result = new Promise<string>((resolve, reject) => batch.push({ text, resolve, reject }))
      size += text.length
      if (batch.length >= CLOUD_BATCH) send()
      else timer ??= setTimeout(send, 0)
      return result
    },
  }
}

const cloudEngine = textEngine('google', openCloud, CLOUD_BATCH)

// ---------------------------------------------------------- Google engine

export const GOOGLE_SCRIPT = 'https://translate.google.com/translate_a/element.js?cb=__accessLayerGoogleReady'
const GOOGLE_BOX = 'access-layer-google-translate'
/** How long to wait for Google's script and its language list. */
export const GOOGLE_TIMEOUT_MS = 12_000

/**
 * Google adds a bar across the top of the page, pushes the body down by its
 * height, and pops up "original text" balloons on hover. The widget is the
 * control here, so all of that is hidden.
 */
const GOOGLE_CSS = `
#${GOOGLE_BOX} { position: absolute !important; width: 1px !important; height: 1px !important; overflow: hidden !important; clip-path: inset(50%) !important; }
iframe.skiptranslate, .goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt,
.VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-xl07Ob-OEVmcd, .VIpgJd-yAWNEb-L7lbkb { display: none !important; visibility: hidden !important; }
html.translated-ltr body, html.translated-rtl body, body[style*="top"] { top: 0 !important; }
.goog-text-highlight { background: none !important; box-shadow: none !important; }
`

let googleSheet: CSSStyleSheet | null = null

interface GoogleGlobal {
  translate: { TranslateElement: new (options: object, id: string) => unknown }
}

const googleEngine = (() => {
  let loading: Promise<boolean> | null = null
  let sourceLoaded = ''

  function load(source: string): Promise<boolean> {
    // Reuse a finished load only while Google's container is still on the
    // page: an app that re-renders <body> can take it away with everything.
    if (loading && sourceLoaded === source && document.getElementById(GOOGLE_BOX)) return loading
    sourceLoaded = source
    loading = new Promise<boolean>((resolve) => {
      adopt(document, (googleSheet ??= sheet(GOOGLE_CSS)))
      let box = document.getElementById(GOOGLE_BOX)
      if (!box) {
        box = document.createElement('div')
        box.id = GOOGLE_BOX
        box.setAttribute('aria-hidden', 'true')
        document.body.append(box)
      }
      const timer = setTimeout(() => resolve(false), GOOGLE_TIMEOUT_MS)
      const init = () => {
        try {
          const google = (window as unknown as { google?: GoogleGlobal }).google
          new google!.translate.TranslateElement(
            { pageLanguage: googleCode(source), autoDisplay: false },
            GOOGLE_BOX,
          )
          clearTimeout(timer)
          resolve(true)
        } catch {
          clearTimeout(timer)
          resolve(false)
        }
      }
      const w = window as unknown as { __accessLayerGoogleReady?: () => void; google?: GoogleGlobal }
      if (w.google?.translate?.TranslateElement) {
        init()
        return
      }
      w.__accessLayerGoogleReady = init
      const script = document.createElement('script')
      script.src = GOOGLE_SCRIPT
      script.async = true
      script.onerror = () => {
        clearTimeout(timer)
        loading = null
        resolve(false)
      }
      document.head.append(script)
    })
    return loading
  }

  /**
   * Google ignores a choice made before its language list has loaded, which
   * is a second or so after the script. Wait for the list, then choose.
   */
  async function combo(): Promise<HTMLSelectElement | null> {
    const deadline = Date.now() + GOOGLE_TIMEOUT_MS
    while (Date.now() < deadline) {
      const select = document.querySelector<HTMLSelectElement>(`#${GOOGLE_BOX} select.goog-te-combo, select.goog-te-combo`)
      if (select && select.options.length > 1) return select
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return null
  }

  function translatedClass(): boolean {
    const list = document.documentElement.classList
    return list.contains('translated-ltr') || list.contains('translated-rtl')
  }

  async function waitFor(check: () => boolean, ms: number): Promise<boolean> {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
      if (check()) return true
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return check()
  }

  /** Elements we marked `notranslate`, so the mark comes off with the translation. */
  let marked: Element[] = []

  /**
   * Google translates code samples, keyboard keys and form contents, which
   * mangles them ("font-size: 20px !important" came back as "…importanterreur").
   * The on-device engine skips these already; tell Google to as well.
   */
  function protect(): void {
    for (const el of Array.from(document.body.querySelectorAll('code, pre, kbd, samp, var, textarea'))) {
      if (el.classList.contains('notranslate')) continue
      el.classList.add('notranslate')
      marked.push(el)
    }
  }

  function unprotect(): void {
    for (const el of marked) el.classList.remove('notranslate')
    marked = []
  }

  const engine: Engine = {
    name: 'google',
    async apply(source, target) {
      protect()
      if (!(await load(source))) return false
      const select = await combo()
      if (!select) return false
      const code = googleCode(target.code)
      if (!Array.from(select.options).some((option) => option.value === code)) return false
      select.value = code
      select.dispatchEvent(new Event('change'))
      // Google marks <html> once it has started. If the first choice was
      // swallowed, which it sometimes is on a cold start, make it again.
      if (!(await waitFor(translatedClass, 2500))) {
        select.value = code
        select.dispatchEvent(new Event('change'))
        if (!(await waitFor(translatedClass, 4000))) return false
      }
      return true
    },
    async restore() {
      unprotect()
      if (!translatedClass()) return true
      // "Show original" lives in Google's own (hidden) bar.
      const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'))
      for (const frame of frames) {
        try {
          const button = frame.contentDocument?.querySelector<HTMLElement>('[id$=".restore"]')
          if (button) {
            button.click()
            break
          }
        } catch {
          // Cross-origin frame: not Google's bar.
        }
      }
      // Google's cookie drives it, so clearing it means a reload brings the
      // original back. The widget never reloads by itself: the visitor could
      // lose what they were typing, a post or a checkout form.
      const back = await waitFor(() => !translatedClass(), 3000)
      clearGoogleCookie()
      return back
    },
    dispose() {
      loading = null
      sourceLoaded = ''
      document.getElementById(GOOGLE_BOX)?.remove()
      if (googleSheet) drop(document, googleSheet)
    },
  }
  return engine
})()

function googleCode(code: string): string {
  const language = findLanguage(code)
  return language?.google ?? language?.code ?? primaryLanguage(code)
}

function clearGoogleCookie(): void {
  const expire = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  document.cookie = expire
  const host = location.hostname
  if (host && host.includes('.')) {
    document.cookie = `${expire}; domain=${host}`
    document.cookie = `${expire}; domain=.${host.split('.').slice(-2).join('.')}`
  }
}
