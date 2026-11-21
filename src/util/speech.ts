/**
 * Speaking a sequence of phrases with the browser's own speech synthesis.
 *
 * Every call replaces whatever was speaking. `speechSynthesis.cancel()` fires
 * the old utterances' end and error events on the way out, so each sequence
 * carries a generation number and callbacks from a superseded one are
 * ignored; otherwise stopping one word would clear the highlight on the next.
 */

export interface SpeechPart {
  text: string
  /** Called as this part starts being spoken. */
  onstart?: () => void
}

export interface SpeechOptions {
  rate: number
  lang: string
  /** Called once, when the last part finishes or speech fails. Not on cancel. */
  onend?: () => void
}

let generation = 0
/** Chrome drops utterances it no longer references before they finish. */
let live: SpeechSynthesisUtterance[] = []

/**
 * A voice that runs on the device, for the language. Some browsers offer
 * network voices (Chrome's "Google …" ones) that send the text to the vendor;
 * a local voice keeps it on the device. Undefined when there is none, or the
 * list has not loaded yet, and then the browser's default voice speaks.
 */
export function localVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((voice) => voice.localService)
  const wanted = lang.toLowerCase()
  const primary = (code: string) => code.toLowerCase().split(/[-_]/)[0]
  return voices.find((voice) => voice.lang.toLowerCase() === wanted) ?? voices.find((voice) => primary(voice.lang) === primary(lang))
}

export function speechSupported(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function speakSequence(parts: SpeechPart[], options: SpeechOptions): void {
  if (!speechSupported()) return
  cancelSpeech()
  const spoken = parts.filter((part) => part.text.trim())
  if (spoken.length === 0) return
  const mine = generation
  const finish = () => {
    if (mine !== generation) return
    generation++
    live = []
    options.onend?.()
  }
  live = spoken.map((part, index) => {
    const utterance = new SpeechSynthesisUtterance(part.text.slice(0, 4000))
    utterance.rate = options.rate
    utterance.lang = options.lang
    utterance.voice = localVoice(options.lang) ?? null
    utterance.onstart = () => {
      if (mine === generation) part.onstart?.()
    }
    utterance.onerror = finish
    if (index === spoken.length - 1) utterance.onend = finish
    return utterance
  })
  for (const utterance of live) speechSynthesis.speak(utterance)
}

export function cancelSpeech(): void {
  generation++
  live = []
  if (speechSupported()) speechSynthesis.cancel()
}
