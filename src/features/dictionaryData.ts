/**
 * Normalising dictionary responses.
 *
 * Two shapes are supported and told apart by structure rather than by URL, so
 * pointing the widget at an internal proxy of either service still works:
 *
 *   Wiktionary REST  { "en": [ { partOfSpeech, definitions: [{ definition }] } ] }
 *   dictionaryapi.dev [ { word, phonetic, meanings: [{ partOfSpeech, definitions }] } ]
 *
 * Wiktionary returns HTML inside each definition. It is stripped to plain text
 * here and rendered with `textContent`, never `innerHTML`: this is third-party
 * content arriving over the network and it is never treated as markup.
 */

export interface Meaning {
  partOfSpeech: string
  definitions: string[]
}

export interface Entry {
  word: string
  phonetic: string
  meanings: Meaning[]
  /**
   * Set when the first definition only points at another word ("plural of
   * invitation", "present participle of run"): that word, whose definition
   * is the one worth showing.
   */
  formOf?: string
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
}

/** Nested lists inside a definition are sub-senses and quotations, not the definition. */
function dropNestedLists(input: string): string {
  const innermost = /<(ol|ul|dl)\b[^>]*>(?:(?!<(?:ol|ul|dl)\b)[\s\S])*?<\/\1\s*>/gi
  let previous: string
  let output = input
  do {
    previous = output
    output = output.replace(innermost, '')
  } while (output !== previous)
  return output
}

/** The word a Wiktionary "form of" definition links to, if this is one. */
export function formOfTarget(html: string): string | null {
  if (!/form-of-definition/.test(html)) return null
  const link = /class="form-of-definition-link"[\s\S]*?<a\b[^>]*\btitle="([^"]+)"/.exec(html)
  const target = link?.[1] ? stripHtml(link[1]) : ''
  return target || null
}

/**
 * Show a "form of" entry with its base word's definition, the way a reader
 * expects: "invitations (noun): The act of inviting." Prefers the base word's
 * sense with the same part of speech, so "running" (verb) gets "run" (verb).
 * Only the pointer is replaced; the entry's other senses are kept.
 */
export function mergeFormOf(form: Entry, base: Entry): Entry {
  const first = form.meanings[0]
  if (!first) return form
  const wanted = first.partOfSpeech.toLowerCase()
  const match =
    base.meanings.find((meaning) => meaning.partOfSpeech.toLowerCase() === wanted) ?? base.meanings[0]
  if (!match) return form
  return {
    word: form.word,
    phonetic: form.phonetic,
    meanings: [
      { partOfSpeech: first.partOfSpeech, definitions: [...match.definitions, ...first.definitions.slice(1)] },
      ...form.meanings.slice(1),
    ],
  }
}

export interface Sense {
  /** Lower case, as shown: "noun", not "Noun". Empty when the source gives none. */
  partOfSpeech: string
  definition: string
}

/** Most senses the popover pages through; past this they are rare usages. */
export const MAX_SENSES = 10

/**
 * Every definition as its own page, each carrying its part of speech, in
 * the source's order: "this (pronoun) 1 of 10", "this (adjective) 2 of 10".
 */
export function senses(entry: Entry, limit = MAX_SENSES): Sense[] {
  const out: Sense[] = []
  for (const meaning of entry.meanings) {
    for (const definition of meaning.definitions) {
      if (out.length >= limit) return out
      out.push({ partOfSpeech: meaning.partOfSpeech.toLocaleLowerCase(), definition })
    }
  }
  return out
}

export function stripHtml(input: string): string {
  return dropNestedLists(input)
    // Wiktionary inlines TemplateStyles as <style> blocks inside definitions.
    // Dropping only the tags left their CSS in the text, so a definition read
    // "…as an object. .mw-parser-output .defdate{font-size:smaller}".
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    // Decimal and hex; a number that is not a character (past Unicode's range,
    // or a lone surrogate) stays as text.
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (match, code: string) => {
      const point = code[0] === 'x' || code[0] === 'X' ? parseInt(code.slice(1), 16) : Number(code)
      const character = point <= 0x10ffff && (point < 0xd800 || point > 0xdfff)
      return character ? String.fromCodePoint(point) : match
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    // A removed tag can leave a space before the punctuation that followed it.
    .replace(/ ([.,;:!?)])/g, '$1')
    .trim()
}

/**
 * The spellings to try, in order, for a selected word.
 *
 * Wiktionary titles are case-sensitive: "Sanctuary" at the start of a sentence
 * is a 404, and "This" is a genus of kelp flies. So a word that is merely
 * capitalised is looked up in lower case first, with the original as the
 * fallback for real proper nouns. Acronyms ("NASA") and mixed case ("iPhone")
 * are kept as written first, since lower-casing them changes the word.
 */
export function lookupCandidates(word: string): string[] {
  const lower = word.toLocaleLowerCase()
  if (lower === word) return [word]
  const rest = word.slice(1)
  const merelyCapitalised = rest === rest.toLocaleLowerCase()
  return merelyCapitalised ? [lower, word] : [word, lower]
}

/**
 * The letters of a word as a reader sees them: grapheme clusters, so an
 * accented letter written as a base plus a combining mark is one letter, not
 * two, and is spoken and highlighted as one.
 */
export function letters(word: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (lang?: string, o?: object) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter
  if (Segmenter) {
    return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(word), (part) => part.segment)
  }
  return Array.from(word)
}

/** `en-US` → `en`: Wiktionary keys its sections by bare language code. */
export function primaryLanguage(lang: string | null | undefined): string {
  const primary = (lang ?? '').trim().split(/[-_]/)[0]?.toLowerCase()
  return primary || 'en'
}

export function normalize(data: unknown, word: string, lang = 'en'): Entry | null {
  const fromWiktionary = parseWiktionary(data, word, lang)
  if (fromWiktionary) return fromWiktionary
  return parseFreeDictionary(data, word)
}

function parseWiktionary(data: unknown, word: string, lang: string): Entry | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const record = data as Record<string, unknown>
  const sections = record[primaryLanguage(lang)] ?? record.en ?? Object.values(record)[0]
  if (!Array.isArray(sections)) return null

  const meanings: Meaning[] = []
  for (const section of sections) {
    if (!section || typeof section !== 'object') continue
    const part = section as { partOfSpeech?: unknown; definitions?: unknown }
    const definitions = Array.isArray(part.definitions) ? part.definitions : []
    const texts = definitions
      .map((entry) =>
        entry && typeof entry === 'object'
          ? stripHtml(String((entry as { definition?: unknown }).definition ?? ''))
          : '',
      )
      .filter((text) => text.length > 0)
    if (texts.length === 0) continue
    meanings.push({
      partOfSpeech: typeof part.partOfSpeech === 'string' ? part.partOfSpeech : '',
      definitions: texts,
    })
  }
  if (meanings.length === 0) return null
  const entry: Entry = { word, phonetic: '', meanings }
  const target = firstDefinitionHtml(sections)
  const formOf = target ? formOfTarget(target) : null
  if (formOf && formOf !== word) entry.formOf = formOf
  return entry
}

/** The raw HTML of the first non-empty definition, to look for a "form of" link. */
function firstDefinitionHtml(sections: unknown[]): string | null {
  for (const section of sections) {
    const definitions = (section as { definitions?: unknown })?.definitions
    if (!Array.isArray(definitions)) continue
    for (const entry of definitions) {
      const html = String((entry as { definition?: unknown })?.definition ?? '')
      if (stripHtml(html)) return html
    }
  }
  return null
}

function parseFreeDictionary(data: unknown, word: string): Entry | null {
  if (!Array.isArray(data)) return null
  const first = data[0] as
    | { word?: unknown; phonetic?: unknown; meanings?: unknown }
    | undefined
  if (!first) return null
  const sections = Array.isArray(first.meanings) ? first.meanings : []

  const meanings: Meaning[] = []
  for (const section of sections) {
    if (!section || typeof section !== 'object') continue
    const part = section as { partOfSpeech?: unknown; definitions?: unknown }
    const definitions = Array.isArray(part.definitions) ? part.definitions : []
    const texts = definitions
      .map((entry) =>
        entry && typeof entry === 'object'
          ? stripHtml(String((entry as { definition?: unknown }).definition ?? ''))
          : '',
      )
      .filter((text) => text.length > 0)
    if (texts.length === 0) continue
    meanings.push({
      partOfSpeech: typeof part.partOfSpeech === 'string' ? part.partOfSpeech : '',
      definitions: texts,
    })
  }
  if (meanings.length === 0) return null
  return {
    word: typeof first.word === 'string' ? first.word : word,
    phonetic: typeof first.phonetic === 'string' ? first.phonetic : '',
    meanings,
  }
}
