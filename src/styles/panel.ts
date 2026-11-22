/**
 * Styles for everything inside the shadow root: the trigger button, the
 * panel, and the overlays features draw (mask, guide, tooltip, dictionary,
 * page structure).
 *
 * Shadow DOM means none of this can leak onto the host page and none of the
 * host page's CSS can reach in, which is the whole reason the widget is a
 * custom element rather than a div. Colours come from custom properties so a
 * property can rebrand the widget with one attribute.
 */

export const PANEL_CSS = `
:host {
  --mla-accent: #1742c9;
  --mla-accent-ink: #ffffff;
  /** The accent as text on the pale fills; set from the accent by the element. */
  --mla-accent-text: var(--mla-accent);
  --mla-bg: #fffdf9;
  --mla-bg-sunken: #f4efe7;
  --mla-ink: #17130f;
  --mla-ink-muted: #6b6156;
  --mla-line: #e4dcd0;
  /* Profile cards. Fixed, with fixed dark text: they do not follow the accent. */
  --mla-hue-1: #ffd84d;
  --mla-hue-2: #c4b6ff;
  --mla-hue-3: #8fe3c4;
  --mla-hue-4: #ffb39c;
  --mla-hue-ink: #17130f;
  --mla-focus: #ff7a00;
  --mla-radius: 14px;
  --mla-panel-width: 348px;
  --mla-trigger-size: var(--mla-trigger-base, 56px);
  --mla-scale: 1;
  --mla-font: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
:host([data-oversized]) {
  --mla-panel-width: 420px;
  --mla-trigger-size: 76px;
  --mla-scale: 1.18;
}

*, *::before, *::after { box-sizing: border-box; }
/* Author display rules (the trigger is display: grid) beat the UA's rule for
   [hidden], so restate it or hiding an element would silently do nothing. */
[hidden] { display: none !important; }

.mla-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: var(--mla-font);
  color: var(--mla-ink);
  -webkit-font-smoothing: antialiased;
}
.mla-root > * { pointer-events: auto; }
.mla-layer { position: fixed; inset: 0; pointer-events: none; }
.mla-layer > * { pointer-events: auto; }

button { font: inherit; color: inherit; }
:where(button, a, [tabindex]):focus-visible {
  outline: 3px solid var(--mla-focus);
  outline-offset: 2px;
  border-radius: 8px;
}

/* ------------------------------------------------------------------ trigger */
.mla-trigger {
  position: fixed;
  width: var(--mla-trigger-size);
  height: var(--mla-trigger-size);
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.85);
  background: var(--mla-accent);
  color: var(--mla-accent-ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,.28);
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.mla-trigger:hover { transform: scale(1.06); }
.mla-trigger:active { transform: scale(.97); }
.mla-trigger svg { width: 58%; height: 58%; stroke-width: 1.6; }

/*
 * Distance from the viewport edges. Host pages override these on the
 * <access-layer> element from their own stylesheet, media queries included, to
 * clear things like a mobile tab bar:
 *   @media (max-width: 767px) { access-layer { --mla-offset-y: 84px; } }
 * Custom properties inherit through the shadow boundary, which is why this
 * needs no attribute or script.
 */
.mla-trigger[data-pos="bottom-left"]  { left: var(--mla-offset-x, 18px); bottom: var(--mla-offset-y, 18px); }
.mla-trigger[data-pos="bottom-right"] { right: var(--mla-offset-x, 18px); bottom: var(--mla-offset-y, 18px); }
.mla-trigger[data-pos="top-left"]     { left: var(--mla-offset-x, 18px); top: var(--mla-offset-y, 18px); }
.mla-trigger[data-pos="top-right"]    { right: var(--mla-offset-x, 18px); top: var(--mla-offset-y, 18px); }
.mla-trigger[data-pos="middle-left"]  { left: var(--mla-offset-x, 18px); top: 50%; transform: translateY(-50%); }
.mla-trigger[data-pos="middle-right"] { right: var(--mla-offset-x, 18px); top: 50%; transform: translateY(-50%); }
.mla-trigger[data-pos^="middle"]:hover { transform: translateY(-50%) scale(1.06); }

/* -------------------------------------------------------------------- panel */
.mla-panel {
  position: fixed;
  top: 12px;
  bottom: 12px;
  width: var(--mla-panel-width);
  max-width: calc(100vw - 24px);
  background: var(--mla-bg);
  border-radius: 28px;
  box-shadow: 0 30px 70px -18px rgba(40,25,10,.38), 0 0 0 1px rgba(40,25,10,.08);
  display: none;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  font-size: calc(15px * var(--mla-scale));
}
.mla-panel[data-open] { display: grid; }
.mla-panel[data-side="left"]  { left: 12px; }
.mla-panel[data-side="right"] { right: 12px; }

.mla-head { display: flex; align-items: center; gap: 10px; padding: 20px 18px 10px 22px; }
.mla-title {
  flex: 1; margin: 0;
  font-size: calc(24px * var(--mla-scale)); font-weight: 800;
  letter-spacing: -.03em; line-height: 1.05;
}
.mla-shortcut {
  margin-left: auto;
  font-size: calc(11px * var(--mla-scale)); font-weight: 600;
  color: var(--mla-ink-muted);
  border: 1px solid var(--mla-line);
  border-radius: 8px;
  padding: 3px 7px;
  white-space: nowrap;
}
.mla-icon-btn {
  display: grid;
  place-items: center;
  width: 36px; height: 36px; flex: none;
  border: 0; border-radius: 50%;
  background: var(--mla-bg-sunken);
  color: inherit;
  cursor: pointer;
}
.mla-icon-btn:hover { background: var(--mla-line); }

.mla-body { overflow-y: auto; overscroll-behavior: contain; padding: 8px 18px 16px; }
.mla-body::-webkit-scrollbar { width: 10px; }
.mla-body::-webkit-scrollbar-thumb { background: var(--mla-line); border-radius: 6px; }

/* ------------------------------------------------------------------- pieces */
.mla-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 14px;
  border: 0;
  border-radius: 20px;
  background: var(--mla-bg-sunken);
  cursor: pointer;
  text-align: left;
}
.mla-row:hover { background: var(--mla-line); }
.mla-row-label { flex: 1; font-weight: 650; }
.mla-row svg { flex: none; }
.mla-row .mla-chevron { transition: transform 140ms ease; opacity: .6; }
.mla-row[aria-expanded="true"] .mla-chevron { transform: rotate(90deg); }

.mla-translate-status { margin: -4px 2px 10px; color: var(--mla-ink-muted); font-size: calc(12.5px * var(--mla-scale)); }
.mla-translate-status[hidden] { display: none; }
.mla-translate-status[data-state="failed"] { color: #b42318; }
.mla-translate-action {
  margin: -4px 2px 12px; padding: 8px 12px;
  border: 1px solid var(--mla-ink-muted); border-radius: 8px;
  background: none; color: var(--mla-ink);
  font-weight: 600; cursor: pointer;
}
.mla-translate-action[hidden] { display: none; }
.mla-hint { margin: 0 2px 10px; color: var(--mla-ink-muted); font-size: calc(13px * var(--mla-scale)); }

.mla-switch {
  flex: none;
  width: 44px; height: 25px;
  border-radius: 999px;
  background: #8d8378;
  position: relative;
  transition: background 140ms ease;
}
.mla-switch::after {
  content: "";
  position: absolute; top: 3px; left: 3px;
  width: 19px; height: 19px;
  border-radius: 50%;
  background: #fff;
  transition: transform 140ms ease;
}
[aria-pressed="true"] > .mla-switch,
[aria-checked="true"] > .mla-switch { background: var(--mla-accent); }
[aria-pressed="true"] > .mla-switch::after,
[aria-checked="true"] > .mla-switch::after { transform: translateX(19px); }

.mla-collapse { display: none; padding: 2px 0 10px; }
.mla-collapse[data-open] { display: block; }

.mla-profiles { margin: 6px 0 14px; }
.mla-profiles-head { display: flex; align-items: center; gap: 6px; margin: 0 4px 8px; }
.mla-profiles-title { flex: 1; margin: 0; font-size: calc(13px * var(--mla-scale)); font-weight: 700; color: var(--mla-ink-muted); }
/* The language picker's disclosure arrow. */
.mla-profiles-caret { display: inline-flex; transition: transform 140ms ease; }
.mla-profiles-caret svg { width: 18px; height: 18px; }
.mla-profiles-info-btn {
  display: grid; place-items: center; flex: none;
  width: 24px; height: 24px;
  border: 0; border-radius: 50%;
  background: var(--mla-bg-sunken); color: var(--mla-ink);
  cursor: pointer;
}
.mla-profiles-info-btn svg { width: 16px; height: 16px; }
.mla-profiles-info-btn[aria-expanded="true"] { background: var(--mla-ink); color: var(--mla-bg); }
.mla-profile-info { padding: 0 4px 10px; }
.mla-profile-info-list { margin: 0; font-size: calc(13px * var(--mla-scale)); }
.mla-profile-info-list dt { font-weight: 700; margin-top: 6px; }
.mla-profile-info-list dd { margin: 0; color: var(--mla-ink-muted); }
.mla-profile-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.mla-profile {
  display: flex; align-items: center; gap: 9px;
  min-width: 0;
  min-height: calc(50px * var(--mla-scale));
  padding: 8px 12px;
  border: 0; border-radius: 18px;
  background: var(--mla-hue-1); color: var(--mla-hue-ink);
  font: 700 calc(13px * var(--mla-scale))/1.15 var(--mla-font);
  letter-spacing: -.01em;
  cursor: pointer;
  text-align: left;
  transition: transform 120ms ease;
}
.mla-profile:nth-of-type(4n + 2) { background: var(--mla-hue-2); }
.mla-profile:nth-of-type(4n + 3) { background: var(--mla-hue-3); }
.mla-profile:nth-of-type(4n + 4) { background: var(--mla-hue-4); }
.mla-profile:hover { filter: brightness(.95); }
.mla-profile[aria-pressed="true"] { box-shadow: inset 0 0 0 3px var(--mla-hue-ink); }
.mla-profile-icon { display: inline-flex; flex: none; }
.mla-profile-icon svg { width: 20px; height: 20px; stroke-width: 2; }
.mla-profile-name { flex: 1; min-width: 0; }
.mla-profile-check {
  display: grid; place-items: center; flex: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--mla-hue-ink); color: var(--mla-hue-1);
  visibility: hidden;
}
.mla-profile-check svg { width: 11px; height: 11px; stroke-width: 3; }
.mla-profile[aria-pressed="true"] .mla-profile-check { visibility: visible; }

/* -------------------------------------------------------------------- tiles */
.mla-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 8px; }
.mla-tile {
  position: relative;
  display: grid; grid-template-columns: auto minmax(0, 1fr);
  align-items: center; align-content: center; column-gap: 10px; row-gap: 5px;
  min-height: calc(58px * var(--mla-scale));
  padding: 9px 12px;
  border: 0; border-radius: 20px;
  background: var(--mla-bg-sunken); color: var(--mla-ink);
  cursor: pointer;
  text-align: left;
  line-height: 1.15;
  transition: transform 120ms ease;
}
.mla-tile:hover { background: var(--mla-line); }
.mla-tile:active, .mla-profile:active { transform: scale(.98); }
.mla-tile[aria-pressed="true"] {
  background: var(--mla-accent); color: var(--mla-accent-ink);
  box-shadow: 0 10px 22px -10px var(--mla-accent);
}
.mla-tile[disabled] { opacity: .45; cursor: not-allowed; }
.mla-tile-icon { grid-column: 1; grid-row: 1 / span 2; display: inline-flex; }
.mla-tile-icon svg { width: 20px; height: 20px; stroke-width: 2; }
.mla-tile-label { grid-column: 2; grid-row: 1; font-size: calc(13.5px * var(--mla-scale)); font-weight: 650; letter-spacing: -.01em; }
/* No bars under it: the name takes both rows, so it sits in the middle. */
.mla-tile-label:last-child { grid-row: 1 / span 2; }

/* A badge on the corner of an active tile, so it takes no room from the name. */
.mla-tile-check {
  position: absolute; top: -5px; right: -5px;
  display: grid; place-items: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid var(--mla-bg);
  background: var(--mla-ink); color: var(--mla-bg);
  opacity: 0; transform: scale(.6);
  transition: opacity .15s, transform .15s;
}
.mla-tile-check svg { width: 11px; height: 11px; stroke-width: 3.2; }
.mla-tile[aria-pressed="true"] .mla-tile-check { opacity: 1; transform: none; }

/* One bar per step; the ones up to the current step are filled. */
.mla-steps { grid-column: 2; grid-row: 2; display: flex; gap: 3px; }
/* Bars appear once the tile is in use; the space stays so tiles do not jump. */
.mla-tile:not([aria-pressed="true"]) .mla-steps { visibility: hidden; }
.mla-step { flex: 1; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--mla-accent-ink) 35%, var(--mla-accent)); }
.mla-step[data-on] { background: var(--mla-accent-ink); }

/* Text size leads the tools as one wide dark bar whose steps always show. */
.mla-tile[data-tile="textScale"],
.mla-tile[data-tile="textScale"][aria-pressed="true"] {
  grid-column: 1 / -1;
  grid-template-columns: auto auto minmax(0, 1fr);
  min-height: calc(62px * var(--mla-scale));
  padding: 9px 16px;
  background: var(--mla-ink); color: var(--mla-bg);
  box-shadow: none;
}
.mla-tile[data-tile="textScale"] .mla-tile-label { grid-row: 1 / span 2; }
.mla-tile[data-tile="textScale"] .mla-steps { grid-column: 3; grid-row: 1 / span 2; gap: 5px; margin-left: 6px; visibility: visible; }
.mla-tile[data-tile="textScale"] .mla-step { height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--mla-bg) 24%, var(--mla-ink)); }
.mla-tile[data-tile="textScale"] .mla-step[data-on] { background: var(--mla-bg); }
@media (prefers-reduced-motion: reduce) {
  .mla-tile, .mla-profile, .mla-tile-check, .mla-profiles-caret { transition: none; }
  .mla-tile:active, .mla-profile:active { transform: none; }
}

/* ------------------------------------------------------------------- footer */
.mla-foot { border-top: 1px solid var(--mla-line); padding: 12px 18px 16px; }
.mla-reset {
  display: inline-flex; align-items: center; gap: 7px;
  height: calc(40px * var(--mla-scale)); padding: 0 16px;
  border: 0; border-radius: 999px;
  background: transparent; color: var(--mla-ink);
  box-shadow: inset 0 0 0 2px var(--mla-ink);
  font-size: calc(13.5px * var(--mla-scale)); font-weight: 700; cursor: pointer;
}
.mla-reset span { display: inline-flex; }
.mla-reset svg { width: 16px; height: 16px; stroke-width: 2; }
.mla-reset:hover { background: var(--mla-ink); color: var(--mla-bg); }
.mla-foot-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.mla-foot-links a, .mla-foot-links button:not(.mla-reset) {
  background: none; border: 0; padding: 0;
  color: var(--mla-ink-muted); font-size: calc(12.5px * var(--mla-scale));
  text-decoration: underline; cursor: pointer;
}
.mla-positions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.mla-positions button {
  padding: 10px; border: 0; border-radius: 14px;
  background: var(--mla-bg-sunken); cursor: pointer; font-size: calc(12.5px * var(--mla-scale));
}
.mla-positions button[aria-pressed="true"] { background: var(--mla-ink); color: var(--mla-bg); font-weight: 600; }

/* Language picker: header with a code badge, then a list. */
.mla-lang {
  margin: 0 0 10px;
  padding: 10px;
  border-radius: 20px;
  background: var(--mla-bg-sunken);
}
.mla-lang-toggle {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 4px;
  border: 0; border-radius: 10px;
  background: transparent; color: var(--mla-ink);
  font: 600 calc(16px * var(--mla-scale)) var(--mla-font);
  text-align: left;
  cursor: pointer;
}
.mla-lang-toggle[aria-expanded="false"] .mla-profiles-caret { transform: rotate(-90deg); }
.mla-lang-current { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mla-lang-badge {
  display: grid; place-items: center; flex: none;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #dfe6fb; color: #1b2a6b;
  font: 700 calc(11px * var(--mla-scale)) var(--mla-font);
  letter-spacing: .02em;
}
.mla-lang-toggle .mla-lang-badge,
.mla-lang-option[aria-selected="true"] .mla-lang-badge { background: var(--mla-accent); color: var(--mla-accent-ink); }
.mla-lang-panel {
  margin-top: 8px;
  padding: 12px 10px 4px;
  border-radius: 14px;
  background: var(--mla-bg);
}
.mla-lang-search { position: relative; margin: 0 2px 10px; }
.mla-lang-input {
  box-sizing: border-box;
  width: 100%; height: 44px;
  padding: 0 44px 0 18px;
  border: 1px solid #c9d0da; border-radius: 999px;
  background: var(--mla-bg); color: var(--mla-ink);
  font: calc(15px * var(--mla-scale)) var(--mla-font);
}
.mla-lang-input::placeholder { color: var(--mla-ink-muted); }
.mla-lang-input:focus { outline: none; border-color: var(--mla-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mla-accent) 22%, transparent); }
.mla-lang-search-icon { position: absolute; top: 50%; right: 16px; transform: translateY(-50%); display: inline-flex; color: var(--mla-ink-muted); pointer-events: none; }
.mla-lang-search-icon svg { width: 20px; height: 20px; stroke-width: 2.2; }
.mla-lang-options { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow-y: auto; overscroll-behavior: contain; }
.mla-lang-option {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 10px;
  border-top: 1px solid #e3e7ee;
  font-size: calc(15px * var(--mla-scale));
  cursor: pointer;
}
.mla-lang-option:hover { background: var(--mla-bg-sunken); }
.mla-lang-options[data-keyboard] .mla-lang-option.is-active { box-shadow: inset 0 0 0 2px var(--mla-accent); border-radius: 6px; }
.mla-lang-option[aria-selected="true"] { background: #eef3ff; color: var(--mla-accent-text); font-weight: 600; }
.mla-lang-name { flex: 1; min-width: 0; }
.mla-lang-check {
  display: grid; place-items: center; flex: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #dfe6fb; color: var(--mla-accent-text);
  visibility: hidden;
}
.mla-lang-check svg { width: 13px; height: 13px; stroke-width: 3; }
.mla-lang-option[aria-selected="true"] .mla-lang-check { visibility: visible; }
.mla-lang-empty { margin: 4px 10px 10px; color: var(--mla-ink-muted); font-size: calc(13px * var(--mla-scale)); }
.mla-lang-empty[hidden] { display: none; }

.mla-sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ----------------------------------------------------------------- overlays */
.mla-mask {
  position: fixed; inset: 0; pointer-events: none;
  background: rgba(0,0,0,.72);
  --mla-band-top: 40vh;
  --mla-band-height: 130px;
  -webkit-mask-image: linear-gradient(to bottom,
    #000 0, #000 var(--mla-band-top),
    transparent var(--mla-band-top),
    transparent calc(var(--mla-band-top) + var(--mla-band-height)),
    #000 calc(var(--mla-band-top) + var(--mla-band-height)), #000 100%);
  mask-image: linear-gradient(to bottom,
    #000 0, #000 var(--mla-band-top),
    transparent var(--mla-band-top),
    transparent calc(var(--mla-band-top) + var(--mla-band-height)),
    #000 calc(var(--mla-band-top) + var(--mla-band-height)), #000 100%);
}
.mla-guide {
  position: fixed; left: 0; top: 0; width: 100vw; height: 4px;
  pointer-events: none;
  background: #ff2d55;
  box-shadow: 0 0 0 1px rgba(255,255,255,.9);
  will-change: transform;
}

.mla-tooltip {
  position: fixed; top: 0; left: 0;
  max-width: min(360px, 80vw);
  padding: 9px 12px;
  border-radius: 8px;
  background: #101418;
  color: #fff;
  font: 500 15px/1.4 var(--mla-font);
  box-shadow: 0 6px 22px rgba(0,0,0,.4);
  opacity: 0; visibility: hidden;
  pointer-events: none;
}
.mla-tooltip.is-visible { opacity: 1; visibility: visible; }

.mla-dict-trigger {
  position: fixed; top: 0; left: 0;
  padding: 7px 14px;
  border: 0; border-radius: 8px;
  background: var(--mla-accent); color: var(--mla-accent-ink);
  font: 600 14px var(--mla-font);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,.3);
  opacity: 0; visibility: hidden;
}
.mla-dict-trigger.is-visible { opacity: 1; visibility: visible; }
.mla-dict-popover {
  --mla-dict-spell: #2e9e9f;
  position: fixed; top: 0; left: 0;
  width: min(360px, calc(100vw - 16px));
  max-height: 60vh; overflow-y: auto;
  padding: 14px;
  border-radius: 12px;
  background: var(--mla-bg);
  color: var(--mla-ink);
  box-shadow: 0 14px 40px rgba(0,0,0,.28);
  font: 15px/1.45 var(--mla-font);
  opacity: 0; visibility: hidden;
}
.mla-dict-popover.is-visible { opacity: 1; visibility: visible; }

.mla-dict-search { position: relative; margin: 0 0 10px; }
.mla-dict-input {
  box-sizing: border-box;
  width: 100%; height: 44px;
  padding: 0 44px 0 14px;
  border: 1px solid #9aa3ad; border-radius: 8px;
  background: var(--mla-bg); color: var(--mla-ink);
  font: 15px var(--mla-font);
  appearance: none;
}
.mla-dict-input::-webkit-search-cancel-button { display: none; }
.mla-dict-input:focus { outline: none; border-color: var(--mla-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mla-accent) 25%, transparent); }
.mla-dict-go {
  position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
  display: grid; place-items: center;
  width: 36px; height: 36px;
  border: 0; border-radius: 8px;
  background: transparent; color: var(--mla-ink-muted);
  cursor: pointer;
}
.mla-dict-go:hover { color: var(--mla-ink); background: var(--mla-bg-sunken); }
.mla-dict-go svg { width: 20px; height: 20px; stroke-width: 2.2; }

.mla-dict-definition { margin: 0; color: var(--mla-ink-muted); }
.mla-dict-term { color: var(--mla-ink); font-weight: 700; }
.mla-dict-status { margin: 0; color: var(--mla-ink-muted); }

.mla-dict-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.mla-dict-action {
  --mla-dict-tone: var(--mla-accent);
  display: inline-flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 16px 0 5px;
  border: 0; border-radius: 999px;
  background: color-mix(in srgb, var(--mla-dict-tone) 16%, var(--mla-bg));
  color: var(--mla-ink);
  font: 500 15px var(--mla-font);
  cursor: pointer;
}
.mla-dict-action-spell { --mla-dict-tone: var(--mla-dict-spell); }
.mla-dict-action:hover { background: color-mix(in srgb, var(--mla-dict-tone) 26%, var(--mla-bg)); }
.mla-dict-action[aria-pressed="true"] { background: color-mix(in srgb, var(--mla-dict-tone) 34%, var(--mla-bg)); }
.mla-dict-action-icon {
  display: grid; place-items: center;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--mla-dict-tone); color: #fff;
}
.mla-dict-action-icon svg { width: 15px; height: 15px; stroke-width: 2; }
.mla-dict-action[aria-pressed="true"] .mla-dict-action-icon svg { animation: mla-dict-pulse 1s ease-in-out infinite; }
.mla-dict-pager { display: inline-flex; align-items: center; gap: 2px; margin-left: auto; }
.mla-dict-count { min-width: 48px; text-align: center; font-size: 15px; font-variant-numeric: tabular-nums; }
.mla-dict-page {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  border: 0; border-radius: 6px;
  background: transparent; color: var(--mla-ink);
  cursor: pointer;
}
.mla-dict-page:hover:not(:disabled) { background: var(--mla-bg-sunken); }
.mla-dict-page:disabled { opacity: .35; cursor: default; }
.mla-dict-page svg { width: 18px; height: 18px; stroke-width: 2; }
.mla-dict-page[data-page="previous"] svg { transform: scaleX(-1); }
@keyframes mla-dict-pulse { 50% { transform: scaleY(.6); } }
@media (prefers-reduced-motion: reduce) {
  .mla-dict-action[aria-pressed="true"] .mla-dict-action-icon svg { animation: none; }
}

.mla-struct {
  position: fixed;
  top: 12px; bottom: 12px;
  left: 50%; transform: translateX(-50%);
  width: min(460px, calc(100vw - 24px));
  display: grid; grid-template-rows: auto auto 1fr;
  background: var(--mla-bg);
  border-radius: var(--mla-radius);
  box-shadow: 0 18px 50px rgba(0,0,0,.36);
  overflow: hidden;
  font: 15px/1.4 var(--mla-font);
}
.mla-struct-head {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 12px 14px 18px;
  background: var(--mla-accent); color: var(--mla-accent-ink);
}
.mla-struct-title { flex: 1; margin: 0; font-size: 16px; }
.mla-struct-close {
  width: 34px; height: 34px; border: 0; border-radius: 50%;
  background: rgba(255,255,255,.18); color: inherit;
  font-size: 22px; line-height: 1; cursor: pointer;
}
.mla-struct-tabs { display: flex; border-bottom: 1px solid var(--mla-line); }
.mla-struct-tab {
  flex: 1; padding: 12px 6px;
  border: 0; border-bottom: 3px solid transparent;
  background: none; cursor: pointer; font-weight: 550;
  color: var(--mla-ink-muted);
}
.mla-struct-tab[aria-pressed="true"] { color: var(--mla-accent-text); border-bottom-color: var(--mla-accent); }
.mla-struct-list { margin: 0; padding: 8px; list-style: none; overflow-y: auto; }
.mla-struct-item {
  display: flex; align-items: baseline; gap: 10px;
  width: 100%; padding: 9px 10px;
  border: 0; border-radius: 8px;
  background: none; cursor: pointer; text-align: left;
}
.mla-struct-item:hover { background: var(--mla-bg-sunken); }
.mla-struct-badge {
  flex: none; min-width: 22px;
  padding: 1px 5px; border-radius: 5px;
  background: var(--mla-bg-sunken); color: var(--mla-ink-muted);
  font-size: 11.5px; font-weight: 700; text-align: center;
}
.mla-struct-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mla-struct-empty { padding: 20px; color: var(--mla-ink-muted); text-align: center; }
.mla-struct-item[data-level="1"] .mla-struct-label { font-weight: 700; }
.mla-struct-item[data-level="3"] { padding-left: 22px; }
.mla-struct-item[data-level="4"] { padding-left: 34px; }
.mla-struct-item[data-level="5"],
.mla-struct-item[data-level="6"] { padding-left: 46px; }

@media (max-width: 480px) {
  .mla-panel { width: calc(100vw - 16px); left: 8px !important; right: 8px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .mla-trigger, .mla-chevron, .mla-switch, .mla-switch::after { transition: none !important; }
}
`

/** Injected into the host page once, to flag a jump target from Page Structure. */
export const JUMP_CSS = `
.mla-jump-target {
  outline: 3px solid #ff7a00 !important;
  outline-offset: 3px !important;
  scroll-margin-top: 80px;
}
`
