/**
 * Relative luminance and contrast ratio, per WCAG 2.1 (1.4.3 / 1.4.6).
 * Used by Smart Contrast to decide whether text needs correcting and by how
 * much, and covered by unit tests against the values in the spec.
 */

export type RGB = [number, number, number]

export function parseColor(input: string): RGB | null {
  const value = input.trim().toLowerCase()
  if (!value || value === 'transparent') return null

  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/,
  )
  if (rgb) {
    const alphaRaw = rgb[4]
    if (alphaRaw !== undefined) {
      const alpha = alphaRaw.endsWith('%')
        ? Number(alphaRaw.slice(0, -1)) / 100
        : Number(alphaRaw)
      // A mostly transparent background tells us nothing about what shows
      // through, so report "unknown" rather than guess at white.
      if (alpha < 0.95) return null
    }
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  }

  const hex = value.match(/^#([0-9a-f]{3,8})$/)
  if (hex?.[1]) {
    let body = hex[1]
    if (body.length === 3 || body.length === 4) {
      body = body
        .split('')
        .map((c) => c + c)
        .join('')
    }
    if (body.length === 8 && parseInt(body.slice(6, 8), 16) < 242) return null
    if (body.length < 6) return null
    return [
      parseInt(body.slice(0, 2), 16),
      parseInt(body.slice(2, 4), 16),
      parseInt(body.slice(4, 6), 16),
    ]
  }
  return null
}

/** WCAG relative luminance. Channels are 0-255. */
export function luminance([r, g, b]: RGB): number {
  const channel = (raw: number) => {
    const c = raw / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: RGB, b: RGB): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (light + 0.05) / (dark + 0.05)
}

export function toCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

/**
 * Push `fg` away from `bg` along its own lightness axis until it reaches
 * `target`, preserving hue so a brand colour stays recognisable. Falls back
 * to plain black or white when the hue simply cannot reach the ratio.
 */
export function enforceContrast(fg: RGB, bg: RGB, target = 4.5): RGB {
  if (contrastRatio(fg, bg) >= target) return fg
  const goDarker = luminance(bg) > 0.4
  const extreme: RGB = goDarker ? [0, 0, 0] : [255, 255, 255]
  let low = 0
  let high = 1
  let best: RGB = extreme
  for (let i = 0; i < 12; i++) {
    const amount = (low + high) / 2
    // Round before measuring. The colour that ends up in the stylesheet has
    // integer channels, and rounding a boundary candidate can drop it back
    // under the target, which is how a "corrected" colour can still fail.
    const candidate = round(mix(fg, extreme, amount))
    if (contrastRatio(candidate, bg) >= target) {
      best = candidate
      high = amount
    } else {
      low = amount
    }
  }
  return best
}

function round([r, g, b]: RGB): RGB {
  return [Math.round(r), Math.round(g), Math.round(b)]
}

export function mix(a: RGB, b: RGB, amount: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]
}
