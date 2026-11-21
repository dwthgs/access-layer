/** Speech picks a voice that runs on the device, so text is not sent to a vendor (L-13). */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { localVoice } from '../src/util/speech'

const voice = (name: string, lang: string, localService: boolean) => ({ name, lang, localService }) as SpeechSynthesisVoice

afterEach(() => vi.unstubAllGlobals())

describe('localVoice', () => {
  it('prefers an on-device voice over a network one for the language', () => {
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [voice('Google US English', 'en-US', false), voice('Samantha', 'en-US', true)],
    })
    expect(localVoice('en-US')?.name).toBe('Samantha')
  })

  it('falls back to a local voice for the same language in another region', () => {
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [voice('Google español', 'es-ES', false), voice('Paulina', 'es_MX', true)],
    })
    expect(localVoice('es-ES')?.name).toBe('Paulina')
  })

  it('has nothing to offer when only network voices speak the language', () => {
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [voice('Google français', 'fr-FR', false), voice('Samantha', 'en-US', true)],
    })
    expect(localVoice('fr-FR')).toBeUndefined()
  })
})
