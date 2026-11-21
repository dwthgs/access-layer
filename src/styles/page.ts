/**
 * The stylesheet injected into the *host page*.
 *
 * Every rule is gated on a `data-mla-*` attribute on `<html>`, so turning a
 * feature on or off is a single attribute write and nothing has to be
 * re-applied when a single-page app swaps its route. The widget itself lives
 * in a shadow root, which is why these blunt `*` selectors are safe: shadow
 * content is unreachable from here, and the host element `access-layer` is
 * excluded explicitly wherever a rule could still touch it.
 */

export const PAGE_CSS = `
/* ------------------------------------------------------------------ host */
access-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  color-scheme: light;
}
@media print { access-layer { display: none !important; } }

/* --------------------------------------------------------------- skip link */
.mla-skip-link {
  position: fixed;
  top: -100px;
  left: 8px;
  z-index: 2147483001;
  padding: 12px 20px;
  background: #0b3a6f;
  color: #fff;
  font: 600 16px/1.2 system-ui, sans-serif;
  border-radius: 0 0 8px 8px;
  text-decoration: none;
  transition: top 120ms ease-out;
}
.mla-skip-link:focus {
  top: 0;
  outline: 3px solid #ffbf47;
  outline-offset: 2px;
}
@media print { .mla-skip-link { display: none !important; } }

/* ---------------------------------------------------------------- contrast */
html[data-mla-contrast="invert"] {
  filter: invert(1) hue-rotate(180deg);
  background: #fff;
}
/* Media would look like a photo negative, so invert it a second time. */
html[data-mla-contrast="invert"] :is(img, video, picture, canvas, iframe, svg image, [style*="background-image"]) {
  filter: invert(1) hue-rotate(180deg);
}
/* The same second inversion keeps the widget itself looking normal. */
html[data-mla-contrast="invert"] access-layer {
  filter: invert(1) hue-rotate(180deg);
}

html[data-mla-contrast="dark"] :is(html, body),
html[data-mla-contrast="dark"] body *:not(access-layer):not(access-layer *) {
  color: #f2f4f6 !important;
  border-color: #4a5058 !important;
  box-shadow: none !important;
  text-shadow: none !important;
}
html[data-mla-contrast="light"] :is(html, body),
html[data-mla-contrast="light"] body *:not(access-layer):not(access-layer *) {
  color: #101215 !important;
  border-color: #6b7280 !important;
  box-shadow: none !important;
  text-shadow: none !important;
}
/*
 * Backgrounds are flattened on everything except icon-font-style elements.
 * Iconify (and @nuxt/icon, UnoCSS icons) draw single-colour icons as a CSS
 * mask filled with background-color: currentColor, and multi-colour logos as
 * a background-image. Flattening either erases the icon, so these keep their
 * own background and simply follow the forced text colour above.
 */
html[data-mla-contrast="dark"] :is(html, body),
html[data-mla-contrast="dark"] body *:not(access-layer):not(access-layer *):not(.iconify):not([class^="i-"]):not([class*=" i-"]) {
  background-color: #08090a !important;
  background-image: none !important;
}
html[data-mla-contrast="light"] :is(html, body),
html[data-mla-contrast="light"] body *:not(access-layer):not(access-layer *):not(.iconify):not([class^="i-"]):not([class*=" i-"]) {
  background-color: #ffffff !important;
  background-image: none !important;
}
html[data-mla-contrast="dark"] body :is(a, a *):not(access-layer *) { color: #ffe14d !important; }
html[data-mla-contrast="dark"] body :is(a:visited, a:visited *):not(access-layer *) { color: #f5a9ff !important; }
html[data-mla-contrast="light"] body :is(a, a *):not(access-layer *) { color: #0b3a9e !important; }
html[data-mla-contrast="light"] body :is(a:visited, a:visited *):not(access-layer *) { color: #6a1b9a !important; }
/* Forced colour schemes flatten focus rings, so put an unmissable one back. */
html[data-mla-contrast="dark"] body *:focus-visible:not(access-layer *),
html[data-mla-contrast="light"] body *:focus-visible:not(access-layer *) {
  outline: 3px solid #ff7a00 !important;
  outline-offset: 2px !important;
}
/* Buttons and inputs lose all affordance once backgrounds are flattened. */
html[data-mla-contrast="dark"] body :is(button, input, select, textarea):not(access-layer *) {
  border: 2px solid #8b949e !important;
}
html[data-mla-contrast="light"] body :is(button, input, select, textarea):not(access-layer *) {
  border: 2px solid #374151 !important;
}

/* -------------------------------------------------------------- saturation */
html[data-mla-sat="low"]  { filter: saturate(0.5); }
html[data-mla-sat="high"] { filter: saturate(2); }
html[data-mla-sat="mono"] { filter: grayscale(1); }
/* Contrast and saturation can be on together. */
html[data-mla-contrast="invert"][data-mla-sat="low"]  { filter: invert(1) hue-rotate(180deg) saturate(0.5); }
html[data-mla-contrast="invert"][data-mla-sat="high"] { filter: invert(1) hue-rotate(180deg) saturate(2); }
html[data-mla-contrast="invert"][data-mla-sat="mono"] { filter: invert(1) hue-rotate(180deg) grayscale(1); }

/* ----------------------------------------------------------- highlight links */
html[data-mla-links] body :is(a[href], [role="link"]):not(access-layer *) {
  outline: 2px solid #ffbf00 !important;
  outline-offset: 2px !important;
  background-color: #1a1a00 !important;
  color: #ffe14d !important;
  text-decoration: underline !important;
  text-underline-offset: 3px !important;
}
html[data-mla-links] body :is(button, [role="button"], summary):not(access-layer *) {
  outline: 2px dashed #38bdf8 !important;
  outline-offset: 2px !important;
}

/* --------------------------------------------------------------- hide images */
html[data-mla-noimg] body :is(img, picture, svg, video, canvas):not(access-layer *) {
  visibility: hidden !important;
}
html[data-mla-noimg] body *:not(access-layer):not(access-layer *) {
  background-image: none !important;
}
/* Collapsing them would reflow the page; an outline keeps the slot visible. */
html[data-mla-noimg] body :is(img, picture, video):not(access-layer *) {
  outline: 1px dashed #9ca3af !important;
  outline-offset: -1px;
}

/* ---------------------------------------------------------- pause animations */
html[data-mla-nomotion] body *:not(access-layer):not(access-layer *),
html[data-mla-nomotion] body *:not(access-layer):not(access-layer *)::before,
html[data-mla-nomotion] body *:not(access-layer):not(access-layer *)::after {
  animation-play-state: paused !important;
  animation-duration: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
}

/* --------------------------------------------------------------------- fonts */
html[data-mla-font="dyslexic"] body *:not(access-layer):not(access-layer *):not(i):not([class*="icon" i]):not([class*="fa-"]) {
  font-family: var(--mla-font-dyslexic) !important;
}
html[data-mla-font="legible"] body *:not(access-layer):not(access-layer *):not(i):not([class*="icon" i]):not([class*="fa-"]) {
  font-family: var(--mla-font-legible) !important;
}

/* ---------------------------------------------------------- text adjustments */
/* Line height is measured and multiplied per element in features/lineHeight.ts:
   a fixed value here did nothing on pages already set that loose. */

html[data-mla-ls="1"] body *:not(access-layer):not(access-layer *) { letter-spacing: .05em !important; word-spacing: .1em !important; }
html[data-mla-ls="2"] body *:not(access-layer):not(access-layer *) { letter-spacing: .1em !important;  word-spacing: .2em !important; }
html[data-mla-ls="3"] body *:not(access-layer):not(access-layer *) { letter-spacing: .16em !important; word-spacing: .3em !important; }

html[data-mla-align="left"] body *:not(access-layer):not(access-layer *)    { text-align: left !important; }
html[data-mla-align="center"] body *:not(access-layer):not(access-layer *)  { text-align: center !important; }
html[data-mla-align="right"] body *:not(access-layer):not(access-layer *)   { text-align: right !important; }
html[data-mla-align="justify"] body *:not(access-layer):not(access-layer *) { text-align: justify !important; }

/* -------------------------------------------------------------------- cursor */
/* html and body too: without them the cursor shrank back to normal over the
   page background, margins and any empty area below short content. */
html[data-mla-cursor="big"],
html[data-mla-cursor="big"] body,
html[data-mla-cursor="big"] body *:not(access-layer):not(access-layer *) {
  cursor: var(--mla-cursor-big) , auto !important;
}
html[data-mla-cursor="big"] body :is(a, button, [role="button"], summary, label, select):not(access-layer *) {
  cursor: var(--mla-cursor-big-pointer), pointer !important;
}

/* ------------------------------------------------------- screen reader focus */
html[data-mla-reader] body [data-mla-speaking]:not(access-layer *) {
  outline: 3px solid #16a34a !important;
  outline-offset: 2px !important;
  background-color: rgba(22, 163, 74, .12) !important;
}
`
