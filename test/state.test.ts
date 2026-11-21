import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_STATE, isPristine, load, sanitize, save, STORAGE_KEY } from '../src/state'
import { applyProfile, PROFILES } from '../src/profiles'

beforeEach(() => {
  // Unstub first: a previous test may have replaced localStorage wholesale.
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('sanitize', () => {
  it('drops values outside the allowed range', () => {
    const result = sanitize({ textScale: 99 as never, contrast: 'neon' as never })
    expect(result.textScale).toBe(DEFAULT_STATE.textScale)
    expect(result.contrast).toBeNull()
  })

  it('keeps legitimate values', () => {
    const result = sanitize({ textScale: 3, contrast: 'dark', highlightLinks: true })
    expect(result.textScale).toBe(3)
    expect(result.contrast).toBe('dark')
    expect(result.highlightLinks).toBe(true)
  })

  it('refuses a non-boolean for a boolean setting', () => {
    expect(sanitize({ highlightLinks: 'yes' as never }).highlightLinks).toBe(false)
  })
})

describe('persistence', () => {
  it('round-trips through localStorage', () => {
    save({ ...DEFAULT_STATE, textScale: 2, font: 'dyslexic' })
    const loaded = load()
    expect(loaded.textScale).toBe(2)
    expect(loaded.font).toBe('dyslexic')
  })

  it('survives corrupted storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(load().textScale).toBe(0)
  })

  it('never throws when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
      removeItem() { throw new Error('denied') },
    })
    expect(() => save(DEFAULT_STATE)).not.toThrow()
    expect(() => load()).not.toThrow()
  })
})

describe('isPristine', () => {
  it('ignores where the widget sits', () => {
    expect(isPristine({ ...DEFAULT_STATE, position: 'top-right' })).toBe(true)
  })

  it('counts a chosen language, so Reset can stop a translation', () => {
    expect(isPristine({ ...DEFAULT_STATE, lang: 'es' })).toBe(false)
  })

  it('notices a real adjustment', () => {
    expect(isPristine({ ...DEFAULT_STATE, highlightLinks: true })).toBe(false)
  })
})

describe('applyProfile', () => {
  it('starts from defaults so profiles cannot stack', () => {
    const dirty = { ...DEFAULT_STATE, hideImages: true, contrast: 'dark' as const }
    const result = applyProfile(dirty, 'dyslexia')
    expect(result.hideImages).toBe(false)
    expect(result.contrast).toBeNull()
    expect(result.font).toBe('dyslexic')
    expect(result.profile).toBe('dyslexia')
  })

  it('preserves preferences about the widget itself', () => {
    const result = applyProfile(
      { ...DEFAULT_STATE, lang: 'es', position: 'top-right', oversized: true },
      'vision',
    )
    expect(result.lang).toBe('es')
    expect(result.position).toBe('top-right')
    expect(result.oversized).toBe(true)
  })

  it('clears everything when the profile is turned off', () => {
    const result = applyProfile({ ...DEFAULT_STATE, textScale: 3 }, null)
    expect(result.textScale).toBe(0)
    expect(result.profile).toBeNull()
  })

  it('defines every profile with a non-empty patch', () => {
    for (const profile of PROFILES) {
      expect(Object.keys(profile.patch).length).toBeGreaterThan(0)
    }
  })
})
