import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  enforceContrast,
  luminance,
  parseColor,
  type RGB,
} from '../src/util/contrast'

describe('parseColor', () => {
  it('reads the notations getComputedStyle actually returns', () => {
    expect(parseColor('rgb(18, 21, 26)')).toEqual([18, 21, 26])
    expect(parseColor('rgb(255 255 255)')).toEqual([255, 255, 255])
    expect(parseColor('#0b5cd8')).toEqual([11, 92, 216])
    expect(parseColor('#fff')).toEqual([255, 255, 255])
  })

  it('reports unknown rather than guessing behind transparency', () => {
    expect(parseColor('transparent')).toBeNull()
    expect(parseColor('rgba(0, 0, 0, 0)')).toBeNull()
    expect(parseColor('rgba(0, 0, 0, 0.4)')).toBeNull()
    expect(parseColor('#00000055')).toBeNull()
    expect(parseColor('not a colour')).toBeNull()
  })

  it('treats a nearly opaque colour as opaque', () => {
    expect(parseColor('rgba(10, 20, 30, 0.98)')).toEqual([10, 20, 30])
  })
})

describe('luminance and contrastRatio', () => {
  it('matches the anchor values in WCAG 2.1', () => {
    expect(luminance([0, 0, 0])).toBeCloseTo(0, 5)
    expect(luminance([255, 255, 255])).toBeCloseTo(1, 5)
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 2)
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    const a: RGB = [11, 92, 216]
    const b: RGB = [246, 248, 250]
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })

  it('agrees with a known failing pair', () => {
    // #777 on white is 4.48:1, just under the 4.5 threshold.
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeLessThan(4.5)
    expect(contrastRatio([118, 118, 118], [255, 255, 255])).toBeGreaterThan(4.5)
  })
})

describe('enforceContrast', () => {
  it('leaves colours that already pass untouched', () => {
    const fg: RGB = [17, 17, 17]
    expect(enforceContrast(fg, [255, 255, 255])).toBe(fg)
  })

  it('darkens light text on a light background until it passes', () => {
    const fixed = enforceContrast([170, 170, 170], [255, 255, 255])
    expect(contrastRatio(fixed, [255, 255, 255])).toBeGreaterThanOrEqual(4.5)
  })

  it('lightens dark text on a dark background until it passes', () => {
    const fixed = enforceContrast([60, 60, 60], [20, 20, 20])
    expect(contrastRatio(fixed, [20, 20, 20])).toBeGreaterThanOrEqual(4.5)
  })

  it('honours the relaxed target for large text', () => {
    const fixed = enforceContrast([150, 150, 150], [255, 255, 255], 3)
    expect(contrastRatio(fixed, [255, 255, 255])).toBeGreaterThanOrEqual(3)
  })

  it('still passes once the channels are rounded to integers', () => {
    // Regression: the search used to run in continuous space and only round
    // on the way out, which could drop a boundary result back under target.
    const backgrounds: RGB[] = [[255, 255, 255], [20, 20, 20], [240, 230, 200]]
    for (const bg of backgrounds) {
      for (let r = 0; r <= 255; r += 17) {
        for (let g = 0; g <= 255; g += 51) {
          const fixed = enforceContrast([r, g, 128], bg, 4.5)
          const rounded: RGB = [Math.round(fixed[0]), Math.round(fixed[1]), Math.round(fixed[2])]
          expect(rounded.every((channel) => Number.isInteger(channel))).toBe(true)
          expect(contrastRatio(rounded, bg)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('keeps the hue recognisable when it can', () => {
    const [r, g, b] = enforceContrast([120, 160, 255], [255, 255, 255])
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
  })
})
