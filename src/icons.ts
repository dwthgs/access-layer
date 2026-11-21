/**
 * Inline icons. Stroke-based, 24x24, drawn in `currentColor` so they follow
 * the tile's own colour in every contrast mode without a second asset.
 */

const wrap = (body: string, fill = false): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" ` +
  `fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" ` +
  `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

export const ICONS: Record<string, string> = {
  accessibility: wrap(
    '<circle cx="12" cy="4.2" r="2.1"/><path d="M4.5 8.2c2.4.9 4.9 1.3 7.5 1.3s5.1-.4 7.5-1.3"/>' +
      '<path d="M12 9.5v5m0 0-2.6 6.2M12 14.5l2.6 6.2"/>',
  ),
  close: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
  chevron: wrap('<path d="m9 5 7 7-7 7"/>'),
  check: wrap('<path d="m5 12.5 4.5 4.5L19 7"/>'),
  reset: wrap('<path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><path d="M3.5 19v-5h5"/>'),
  move: wrap('<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5-2 2m-9 9-2 2m0-13 2 2m9 9 2 2"/>'),
  globe: wrap('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/>'),

  audio: wrap('<path d="M4 10v4m4-7v10m4-13v16m4-12v8m4-5v2"/>'),
  contrast: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>'),
  smartContrast: wrap('<circle cx="10" cy="10" r="7.2"/><path d="M10 2.8a7.2 7.2 0 0 0 0 14.4z" fill="currentColor" stroke="none"/><path d="M18 15.5v5m-2.5-2.5h5"/>'),
  link: wrap('<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/>'),
  text: wrap('<path d="M3 7V5h8v2M7 5v14M13 11V9.5h8V11m-4-1.5V19"/>'),
  spacing: wrap('<path d="M3 6h18M3 18h18"/><path d="M8 12H4m0 0 2-2m-2 2 2 2m8-2h4m0 0-2-2m2 2-2 2"/>'),
  lineHeight: wrap('<path d="M3 4v16m0-16 2 2M3 4 1.5 6M3 20l2-2m-2 2-1.5-2M9 6h12M9 12h12M9 18h12"/>'),
  align: wrap('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
  motion: wrap('<circle cx="12" cy="12" r="9"/><path d="M10 9v6m4-6v6"/>'),
  image: wrap('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m4 17 5-5 4 4 2.5-2.5L20 17"/><path d="m4 4.5 16 15"/>'),
  dyslexia: wrap('<path d="M3.5 19V5h3.8c3.9 0 6 2.6 6 7s-2.1 7-6 7z"/><path d="M16.5 19V9m0 0h4m-4 4h3"/>'),
  cursor: wrap('<path d="M5.5 3.5 19 11l-5.6 1.6L11.5 18z"/>'),
  tooltip: wrap('<rect x="3" y="4.5" width="18" height="13" rx="3"/><path d="m9 17.5-1 3 4-3"/><path d="M12 8.2v.2m0 2.1v2.5"/>'),
  structure: wrap('<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>'),
  search: wrap('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
  wheelchair: wrap('<circle cx="11" cy="4.2" r="1.7"/><path d="M11 7.5v5.5h5l2.2 5.5 1.8-.7M11 10h4.5"/><path d="M8.2 11a5.3 5.3 0 1 0 7 6.6"/>'),
  puzzle: wrap('<path d="M9.5 3.5h2.2a1.9 1.9 0 1 1 3.3 1.4v1.6h4v4h-1.6a1.9 1.9 0 1 0 0 3.3h1.6v5.7h-5.4v-1.6a1.9 1.9 0 1 0-3.3 0v1.6H4.5v-5.4h1.6a1.9 1.9 0 1 0 0-3.3H4.5V6.5h5z"/>', true),
  brain: wrap('<path d="M12 5.5a3 3 0 0 0-5.6-1.2A3 3 0 0 0 4 9a3 3 0 0 0 .3 5 3 3 0 0 0 2.2 4.6A3 3 0 0 0 12 19.5zm0 0a3 3 0 0 1 5.6-1.2A3 3 0 0 1 20 9a3 3 0 0 1-.3 5 3 3 0 0 1-2.2 4.6A3 3 0 0 1 12 19.5"/><path d="M12 5.5v14M8 9.5h1.5M14.5 9.5H16M8.5 14.5H10M14 14.5h1.5"/>'),
  target: wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  info: wrap('<path d="M12 10.5v6M12 7.4v.2" stroke-width="2.4"/>'),
  caret: wrap('<path d="M6.5 9.5h11L12 15.5z" fill="currentColor" stroke="none"/>'),
  book: wrap('<path d="M4 4.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4.5h-6a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H20z"/>'),
  saturation: wrap('<path d="M12 3.5c3.5 4 5.5 6.8 5.5 9.4A5.5 5.5 0 0 1 12 18.4a5.5 5.5 0 0 1-5.5-5.5c0-2.6 2-5.4 5.5-9.4z"/>'),

  eye: wrap('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  shield: wrap('<path d="M12 3 4.5 6v6c0 4.4 3 7.6 7.5 9 4.5-1.4 7.5-4.6 7.5-9V6z"/>'),
  focus: wrap('<circle cx="12" cy="12" r="3"/><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8m8 0h2.5A1.5 1.5 0 0 1 20 5.5V8m0 8v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/>'),
}

export function icon(name: string): string {
  return ICONS[name] ?? ICONS.accessibility ?? ''
}
