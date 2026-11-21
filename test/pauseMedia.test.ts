/**
 * Pause animations stops playing and autoplaying video when turned on, keeps
 * later videos from autoplaying, and never re-pauses a video the visitor
 * started (#11).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount, type AccessLayerElement } from '../src/index'

let element: AccessLayerElement

/** happy-dom does not play media, so track play() and pause() by hand. */
function video(autoplay = false): HTMLVideoElement {
  const el = document.createElement('video')
  el.autoplay = autoplay
  let paused = true
  Object.defineProperty(el, 'paused', { get: () => paused })
  el.play = vi.fn(async () => void (paused = false))
  el.pause = vi.fn(() => void (paused = true))
  return el
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<main></main>'
  element = mount()
})

afterEach(() => unmount())

describe('Pause animations and video', () => {
  it('pauses a playing video and stops autoplay when turned on', async () => {
    const playing = video()
    const autoplaying = video(true)
    document.querySelector('main')!.append(playing, autoplaying)
    await playing.play()
    element.settings.set({ pauseAnimations: true })
    expect(playing.paused).toBe(true)
    expect(autoplaying.autoplay).toBe(false)
  })

  it('leaves a video the visitor starts afterwards playing through other changes', async () => {
    const clip = video()
    document.querySelector('main')!.append(clip)
    element.settings.set({ pauseAnimations: true })
    await clip.play()
    element.settings.set({ highlightLinks: true })
    element.settings.set({ textScale: 1 })
    expect(clip.paused).toBe(false)
  })

  it('keeps videos added later from autoplaying', async () => {
    element.settings.set({ pauseAnimations: true })
    const later = video(true)
    const wrapper = document.createElement('section')
    wrapper.append(later)
    document.querySelector('main')!.append(wrapper)
    await Promise.resolve()
    expect(later.autoplay).toBe(false)
    expect(later.pause).toHaveBeenCalled()
  })

  it('stops watching when turned off', async () => {
    element.settings.set({ pauseAnimations: true })
    element.settings.set({ pauseAnimations: false })
    const later = video(true)
    document.querySelector('main')!.append(later)
    await Promise.resolve()
    expect(later.autoplay).toBe(true)
  })
})
