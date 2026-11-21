/**
 * Font faces and cursor images, expressed as CSS custom properties on
 * `:root` so the page stylesheet can reference them and so a host app can
 * override any of them without touching this package.
 *
 * The two typefaces are optional downloads (`yarn fetch-fonts`). When they
 * are absent the stacks fall back to faces that ship with Windows, macOS and
 * most Linux desktops, so the feature degrades instead of silently doing
 * nothing.
 */

/** Big arrow, drawn dark on a white keyline so it reads on any background. */
const ARROW =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 32 32'%3E%3Cpath d='M7 1.5 L7 27 L13.4 20.6 L17.6 30.5 L22.2 28.5 L18 18.8 L26.5 18.8 Z' fill='%23000' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E"

/** Pointing hand for interactive elements, same scale as the arrow. */
const HAND =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 32 32'%3E%3Cpath d='M11 17V5.5a2 2 0 0 1 4 0V14V3.5a2 2 0 0 1 4 0V14V5.5a2 2 0 0 1 4 0V17c0 6-2.5 9.5-2.5 13.5H12C12 26 5.5 22 5.5 18.5c0-2 2-2.5 3-1.5z' fill='%23000' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E"

export interface AssetOptions {
  /** Directory the optional woff2 files are served from, with trailing slash. */
  fontsUrl?: string
}

export function assetCss({ fontsUrl }: AssetOptions = {}): string {
  // A directory: `/fonts` and `/fonts/` both work.
  if (fontsUrl && !fontsUrl.endsWith('/')) fontsUrl += '/'
  const faces = fontsUrl
    ? `
@font-face {
  font-family: 'MLA OpenDyslexic';
  src: url('${fontsUrl}OpenDyslexic-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'MLA OpenDyslexic';
  src: url('${fontsUrl}OpenDyslexic-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'MLA Atkinson';
  src: url('${fontsUrl}AtkinsonHyperlegible-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'MLA Atkinson';
  src: url('${fontsUrl}AtkinsonHyperlegible-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: swap;
}`
    : ''

  return `${faces}
:root {
  --mla-font-dyslexic: 'MLA OpenDyslexic', 'OpenDyslexic', 'Comic Sans MS', 'Trebuchet MS', Verdana, sans-serif;
  --mla-font-legible: 'MLA Atkinson', 'Atkinson Hyperlegible', Verdana, Tahoma, 'DejaVu Sans', sans-serif;
  --mla-cursor-big: url("${ARROW}") 4 2;
  --mla-cursor-big-pointer: url("${HAND}") 14 2;
}
`
}
