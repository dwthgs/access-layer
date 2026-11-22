import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply, FACTORS, lineHeightRatio, teardown } from '../src/features/lineHeight'

describe('lineHeightRatio', () => {
  it('reads a computed px value against the font size', () => {
    expect(lineHeightRatio('24px', '16px')).toBe(1.5)
  })
  it('takes a bare number as a ratio', () => {
    expect(lineHeightRatio('1.6', '16px')).toBe(1.6)
  })
  it('treats normal as 1.2', () => {
    expect(lineHeightRatio('normal', '16px')).toBe(1.2)
  })
  it('refuses what it cannot read', () => {
    expect(lineHeightRatio('24px', '0px')).toBeNull()
    expect(lineHeightRatio('auto', '16px')).toBeNull()
  })
})

describe('line height', () => {
  let p: HTMLElement
  let h: HTMLElement

  beforeEach(() => {
    document.body.innerHTML =
      '<main style="line-height:1.6;font-size:16px"><p id="p">Body</p><h2 id="h" style="line-height:1.2">Head</h2></main>'
    p = document.getElementById('p')!
    h = document.getElementById('h')!
  })

  afterEach(() => teardown())

  it('steps are 1.5x, 1.75x and 2x', () => {
    expect(FACTORS).toEqual([1, 1.5, 1.75, 2])
  })

  it("multiplies each element's own spacing, so the first step always shows", () => {
    // Regression: level 1 wrote a fixed 1.6, which did nothing on this page.
    apply(1)
    expect(Number(p.style.getPropertyValue('line-height'))).toBeCloseTo(2.4)
    expect(Number(h.style.getPropertyValue('line-height'))).toBeCloseTo(1.8)
    expect(p.style.getPropertyPriority('line-height')).toBe('important')
  })

  it('does not multiply twice through inheritance', () => {
    apply(2)
    // p inherits 1.6 from main; measured before main is rewritten.
    expect(Number(p.style.getPropertyValue('line-height'))).toBeCloseTo(2.8)
  })

  it('starts from the original on every step', () => {
    apply(1)
    apply(3)
    expect(Number(h.style.getPropertyValue('line-height'))).toBeCloseTo(2.4)
  })

  it('puts back what the page had when switched off', () => {
    apply(2)
    teardown()
    expect(p.style.getPropertyValue('line-height')).toBe('')
    expect(h.style.getPropertyValue('line-height')).toBe('1.2')
  })
})
