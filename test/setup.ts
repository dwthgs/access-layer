/**
 * Unit tests never reach the network. Picking a widget language now also
 * translates the page, so give every test a silent on-device translator
 * (it returns text unchanged) unless a test installs its own.
 */
import { beforeEach } from 'vitest'

beforeEach(() => {
  ;(globalThis as { Translator?: unknown }).Translator = {
    availability: async () => 'available',
    create: async () => ({ translate: async (text: string) => text, destroy() {} }),
  }
})
