import { describe, expect, it } from 'vitest'
import { formOfTarget, letters, lookupCandidates, mergeFormOf, normalize, primaryLanguage, senses, stripHtml } from '../src/features/dictionaryData'

describe('stripHtml', () => {
  it('decodes decimal and hex character references, and leaves impossible ones as text', () => {
    expect(stripHtml('caf&#233; &#xE9;t&#xe9; &#X1F600;')).toBe('café été 😀')
    expect(stripHtml('broken &#99999999; and &#x110000;')).toBe('broken &#99999999; and &#x110000;')
    expect(stripHtml('half &#xD800; &#57343;')).toBe('half &#xD800; &#57343;')
  })

  it('removes the markup Wiktionary embeds in a definition', () => {
    const raw =
      'A place of safety, refuge<span class="serial-comma" about="#mwt12" typeof="mw:Transclusion">,</span> or protection.'
    expect(stripHtml(raw)).toBe('A place of safety, refuge, or protection.')
  })

  it('decodes the entities that survive stripping', () => {
    expect(stripHtml('salt &amp; pepper')).toBe('salt & pepper')
    expect(stripHtml('&quot;quoted&quot;')).toBe('"quoted"')
    expect(stripHtml('&#39;apostrophe&#39;')).toBe("'apostrophe'")
    expect(stripHtml('a&nbsp;b')).toBe('a b')
  })

  it('leaves an unknown entity alone rather than mangling it', () => {
    expect(stripHtml('&notarealentity;')).toBe('&notarealentity;')
  })

  it('drops embedded stylesheets and scripts, contents and all', () => {
    // Regression: the tags went but their CSS stayed in the definition.
    const raw =
      'As an object.<style data-mw-deduplicate="x">.mw-parser-output .defdate{font-size:smaller}</style>'
    expect(stripHtml(raw)).toBe('As an object.')
    expect(stripHtml('a<script>alert(1)</script>b')).toBe('ab')
    expect(stripHtml('a<STYLE>x{}</STYLE >b')).toBe('ab')
  })

  it('closes the gap a removed tag leaves before punctuation', () => {
    expect(stripHtml('The (thing) here <span></span>.')).toBe('The (thing) here.')
    expect(stripHtml('one <i>x</i> , two')).toBe('one x, two')
  })

  it('collapses the whitespace that stripping leaves behind', () => {
    expect(stripHtml('<p>one</p>\n\n  <p>two</p>')).toBe('one two')
  })
})

describe('normalize', () => {
  // Trimmed from a real response, September 2026.
  const wiktionary = {
    en: [
      {
        partOfSpeech: 'Noun',
        definitions: [
          { definition: 'A place of safety, refuge<span class="x">,</span> or protection.' },
          { definition: 'An area set aside for protection.' },
        ],
      },
    ],
  }

  const freeDictionary = [
    {
      word: 'sanctuary',
      phonetic: '/ˈsaŋ(k)tʃʊəri/',
      meanings: [
        { partOfSpeech: 'noun', definitions: [{ definition: 'A place of refuge.' }] },
      ],
    },
  ]

  it('reads the Wiktionary shape', () => {
    const entry = normalize(wiktionary, 'sanctuary')
    expect(entry?.meanings[0]?.partOfSpeech).toBe('Noun')
    expect(entry?.meanings[0]?.definitions[0]).toBe('A place of safety, refuge, or protection.')
    expect(entry?.meanings[0]?.definitions).toHaveLength(2)
  })

  it('reads the dictionaryapi.dev shape', () => {
    const entry = normalize(freeDictionary, 'sanctuary')
    expect(entry?.word).toBe('sanctuary')
    expect(entry?.phonetic).toBe('/ˈsaŋ(k)tʃʊəri/')
    expect(entry?.meanings[0]?.definitions[0]).toBe('A place of refuge.')
  })

  it('falls back to the requested language section', () => {
    const entry = normalize({ es: [{ partOfSpeech: 'Sustantivo', definitions: [{ definition: 'Refugio.' }] }] }, 'santuario', 'es')
    expect(entry?.meanings[0]?.definitions[0]).toBe('Refugio.')
  })

  it('returns null for anything it cannot read', () => {
    expect(normalize(null, 'x')).toBeNull()
    expect(normalize({}, 'x')).toBeNull()
    expect(normalize([], 'x')).toBeNull()
    expect(normalize({ en: [] }, 'x')).toBeNull()
    expect(normalize({ en: [{ partOfSpeech: 'Noun', definitions: [] }] }, 'x')).toBeNull()
    expect(normalize('a plain string', 'x')).toBeNull()
  })

  it('never surfaces markup as markup', () => {
    const hostile = { en: [{ partOfSpeech: 'Noun', definitions: [{ definition: '<img src=x onerror=alert(1)>text' }] }] }
    expect(normalize(hostile, 'x')?.meanings[0]?.definitions[0]).toBe('text')
  })
})

describe('lookupCandidates', () => {
  it('looks a lower-case word up once', () => {
    expect(lookupCandidates('grace')).toEqual(['grace'])
  })

  it('tries a capitalised word in lower case first, then as written', () => {
    expect(lookupCandidates('Sanctuary')).toEqual(['sanctuary', 'Sanctuary'])
    expect(lookupCandidates('This')).toEqual(['this', 'This'])
  })

  it('keeps acronyms and mixed case as written first', () => {
    expect(lookupCandidates('NASA')).toEqual(['NASA', 'nasa'])
    expect(lookupCandidates('iPhone')).toEqual(['iPhone', 'iphone'])
  })

  it('handles letters outside ASCII', () => {
    expect(lookupCandidates('Ámbito')).toEqual(['ámbito', 'Ámbito'])
  })
})

describe('primaryLanguage', () => {
  it('drops the region', () => {
    expect(primaryLanguage('en-US')).toBe('en')
    expect(primaryLanguage('es_MX')).toBe('es')
    expect(primaryLanguage('PT-br')).toBe('pt')
  })

  it('defaults to English when the page declares nothing', () => {
    expect(primaryLanguage('')).toBe('en')
    expect(primaryLanguage(null)).toBe('en')
    expect(primaryLanguage(undefined)).toBe('en')
  })
})

describe('normalize with a regional page language', () => {
  it('finds the section for en-US under en', () => {
    const data = { fr: [{ partOfSpeech: 'Nom', definitions: [{ definition: 'Wrong.' }] }], en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'Right.' }] }] }
    expect(normalize(data, 'x', 'en-US')?.meanings[0]?.definitions[0]).toBe('Right.')
  })
})

describe('letters', () => {
  it('splits a word into letters', () => {
    expect(letters('grace')).toEqual(['g', 'r', 'a', 'c', 'e'])
  })

  it('keeps a letter and its combining accent together', () => {
    // "é" written as "e" + U+0301 is one letter to a reader.
    expect(letters('cafe\u0301')).toEqual(['c', 'a', 'f', 'e\u0301'])
  })

  it('keeps punctuation inside a word as its own letter', () => {
    expect(letters("o'clock")).toEqual(['o', "'", 'c', 'l', 'o', 'c', 'k'])
  })
})

describe('nested lists in a definition', () => {
  it('drops sub-senses and quotations, keeping the definition', () => {
    // Trimmed from Wiktionary's "running" (adjective), September 2026.
    const raw =
      'Moving or advancing at a run.\n<ol><li>Of a horse, having a running gait; not a <a href="/wiki/trotter">trotter</a>.</li></ol>'
    expect(stripHtml(raw)).toBe('Moving or advancing at a run.')
  })

  it('handles lists nested inside lists', () => {
    expect(stripHtml('Main.<ol><li>a<ol><li>b</li></ol></li></ol><dl><dd>quote</dd></dl>')).toBe('Main.')
  })
})

describe('formOfTarget', () => {
  it('finds the word a "plural of" definition links to', () => {
    // Real markup from Wiktionary's "invitations", September 2026.
    const raw =
      '<span class="form-of-definition use-with-mention" about="#mwt4" typeof="mw:Transclusion"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#plural_number" title="Appendix:Glossary">plural</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="en"><a rel="mw:WikiLink" href="/wiki/invitation#English" title="invitation">invitation</a></i></span></span>'
    expect(formOfTarget(raw)).toBe('invitation')
  })

  it('returns null for an ordinary definition', () => {
    expect(formOfTarget('A place of <a title="refuge">refuge</a>.')).toBeNull()
  })

  it('is recorded by normalize', () => {
    const data = {
      en: [
        {
          partOfSpeech: 'Verb',
          definitions: [
            { definition: '<span class="form-of-definition">present participle of <span class="form-of-definition-link"><a title="run">run</a></span></span>' },
          ],
        },
      ],
    }
    expect(normalize(data, 'running')?.formOf).toBe('run')
    expect(normalize({ en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'Plain.' }] }] }, 'x')?.formOf).toBeUndefined()
  })
})

describe('mergeFormOf', () => {
  const form = {
    word: 'running',
    phonetic: '',
    meanings: [
      { partOfSpeech: 'Verb', definitions: ['present participle of run'] },
      { partOfSpeech: 'Adjective', definitions: ['Moving at a run.'] },
    ],
  }
  const base = {
    word: 'run',
    phonetic: '',
    meanings: [
      { partOfSpeech: 'Noun', definitions: ['An act of running.'] },
      { partOfSpeech: 'Verb', definitions: ['To move swiftly.'] },
    ],
  }

  it("uses the base word's sense with the same part of speech", () => {
    const merged = mergeFormOf(form, base)
    expect(merged.word).toBe('running')
    expect(merged.meanings[0]).toEqual({ partOfSpeech: 'Verb', definitions: ['To move swiftly.'] })
  })

  it("keeps the word's own other senses", () => {
    expect(mergeFormOf(form, base).meanings[1]?.definitions).toEqual(['Moving at a run.'])
  })

  it('falls back to the first sense when no part of speech matches', () => {
    const onlyNoun = { ...base, meanings: [base.meanings[0]!] }
    expect(mergeFormOf(form, onlyNoun).meanings[0]?.definitions).toEqual(['An act of running.'])
  })
})

describe('senses', () => {
  const entry = {
    word: 'this',
    phonetic: '',
    meanings: [
      { partOfSpeech: 'Pronoun', definitions: ['One.', 'Two.'] },
      { partOfSpeech: 'Adjective', definitions: ['Three.'] },
    ],
  }

  it('makes every definition a page, with its part of speech in lower case', () => {
    expect(senses(entry)).toEqual([
      { partOfSpeech: 'pronoun', definition: 'One.' },
      { partOfSpeech: 'pronoun', definition: 'Two.' },
      { partOfSpeech: 'adjective', definition: 'Three.' },
    ])
  })

  it('stops at the limit', () => {
    expect(senses(entry, 2)).toHaveLength(2)
  })
})
