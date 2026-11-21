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
  --mla-bg: #ffffff;
  --mla-bg-sunken: #f2f4f7;
  --mla-ink: #12151a;
  --mla-ink-muted: #5a6473;
  --mla-line: #d9dee6;
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
  border-radius: var(--mla-radius);
  box-shadow: 0 18px 50px rgba(0,0,0,.32);
  display: none;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  font-size: calc(15px * var(--mla-scale));
}
.mla-panel[data-open] { display: grid; }
.mla-panel[data-side="left"]  { left: 12px; }
.mla-panel[data-side="right"] { right: 12px; }

.mla-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 14px 18px;
  background: var(--mla-accent);
  color: var(--mla-accent-ink);
}
.mla-title { margin: 0; font-size: calc(16px * var(--mla-scale)); font-weight: 650; flex: 1; }
.mla-shortcut {
  font-size: calc(11px * var(--mla-scale));
  border: 1px solid currentColor;
  border-radius: 6px;
  padding: 2px 6px;
  white-space: nowrap;
}
.mla-icon-btn {
  display: grid;
  place-items: center;
  width: 34px; height: 34px;
  border: 0; border-radius: 50%;
  background: rgba(255,255,255,.18);
  color: inherit;
  cursor: pointer;
}
.mla-icon-btn:hover { background: rgba(255,255,255,.32); }

.mla-body { overflow-y: auto; overscroll-behavior: contain; padding: 14px; }
.mla-body::-webkit-scrollbar { width: 10px; }
.mla-body::-webkit-scrollbar-thumb { background: #c3cad6; border-radius: 6px; }

/* ------------------------------------------------------------------- pieces */
.mla-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid var(--mla-line);
  border-radius: 10px;
  background: var(--mla-bg);
  cursor: pointer;
  text-align: left;
  margin-bottom: 8px;
}
.mla-row:hover { background: var(--mla-bg-sunken); }
.mla-row-label { flex: 1; font-weight: 550; }
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
  background: #b9c1cd;
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
[aria-checked="true"] > .mla-switch { background: #16a34a; }
[aria-pressed="true"] > .mla-switch::after,
[aria-checked="true"] > .mla-switch::after { transform: translateX(19px); }

.mla-collapse { display: none; padding: 2px 0 10px; }
.mla-collapse[data-open] { display: block; }

.mla-profiles {
  margin: 0 0 12px;
  padding: 10px;
  border-radius: 14px;
  background: #eef0f4;
}
.mla-profiles-head { display: flex; align-items: center; gap: 6px; }
.mla-profiles-toggle {
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 4px;
  border: 0; border-radius: 10px;
  background: transparent; color: var(--mla-ink);
  font: 600 calc(16px * var(--mla-scale)) var(--mla-font);
  text-align: left;
  cursor: pointer;
}
.mla-profiles-badge {
  display: grid; place-items: center; flex: none;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #111; color: #fff;
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px #111;
  margin: 2px;
}
.mla-profiles-badge svg { width: 20px; height: 20px; }
.mla-profiles-caret { display: inline-flex; transition: transform 140ms ease; }
.mla-profiles-caret svg { width: 18px; height: 18px; }
.mla-profiles-toggle[aria-expanded="false"] .mla-profiles-caret { transform: rotate(-90deg); }
.mla-profiles-info-btn {
  display: grid; place-items: center; flex: none;
  width: 24px; height: 24px;
  border: 0; border-radius: 50%;
  background: #d7e0e4; color: var(--mla-ink);
  cursor: pointer;
  margin-right: 4px;
}
.mla-profiles-info-btn svg { width: 16px; height: 16px; }
.mla-profiles-info-btn[aria-expanded="true"] { background: var(--mla-accent); color: var(--mla-accent-ink); }
.mla-profile-info { padding: 8px 6px 2px; }
.mla-profile-info-list { margin: 0; font-size: calc(13px * var(--mla-scale)); }
.mla-profile-info-list dt { font-weight: 600; margin-top: 6px; }
.mla-profile-info-list dd { margin: 0; color: var(--mla-ink-muted); }
.mla-profile-list { padding: 8px 0 0; }

.mla-profile {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  min-height: calc(54px * var(--mla-scale));
  padding: 8px 12px;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: var(--mla-bg); color: var(--mla-ink);
  font: calc(15px * var(--mla-scale)) var(--mla-font);
  cursor: pointer;
  text-align: left;
  margin-bottom: 8px;
}
.mla-profile:last-of-type { margin-bottom: 0; }
.mla-profile:hover { border-color: #c9d0da; }
.mla-profile[aria-pressed="true"] { border-color: var(--mla-accent); }
.mla-profile-icon {
  display: grid; place-items: center; flex: none;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #eef0f4;
}
.mla-profile-icon svg { width: 18px; height: 18px; stroke-width: 2.1; color: #111; }
.mla-profile-name { flex: 1; min-width: 0; }
.mla-profile-check {
  display: grid; place-items: center; flex: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--mla-accent); color: var(--mla-accent-ink);
  visibility: hidden;
}
.mla-profile-check svg { width: 12px; height: 12px; stroke-width: 3; }
.mla-profile[aria-pressed="true"] .mla-profile-check { visibility: visible; }
@media (prefers-reduced-motion: reduce) { .mla-profiles-caret { transition: none; } }

/* -------------------------------------------------------------------- tiles */
.mla-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 4px 0 14px; }
.mla-tile {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  min-height: calc(96px * var(--mla-scale));
  padding: 12px 8px 10px;
  border: 1px solid var(--mla-line);
  border-radius: 12px;
  background: var(--mla-bg);
  cursor: pointer;
  text-align: center;
  line-height: 1.25;
}
.mla-tile:hover { background: var(--mla-bg-sunken); }
.mla-tile[aria-pressed="true"] {
  border-color: var(--mla-accent);
  background: #eef4ff;
  box-shadow: inset 0 0 0 1px var(--mla-accent);
}
.mla-tile-label { font-size: calc(13px * var(--mla-scale)); font-weight: 550; }
.mla-tile[disabled] { opacity: .45; cursor: not-allowed; }

/* The check in the corner of an active tile. */
.mla-tile-check {
  position: absolute; top: 7px; right: 7px;
  display: grid; place-items: center;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--mla-accent); color: var(--mla-accent-ink);
  opacity: 0; transform: scale(.6);
  transition: opacity .15s, transform .15s;
}
.mla-tile-check svg { width: 12px; height: 12px; stroke-width: 3; }
.mla-tile[aria-pressed="true"] .mla-tile-check { opacity: 1; transform: none; }

/* One bar per step; the ones up to the current step are filled. */
.mla-steps { display: flex; gap: 4px; width: min(100%, 118px); margin-top: 2px; }
/* Bars appear once the tile is in use; the space stays so tiles do not jump. */
.mla-tile:not([aria-pressed="true"]) .mla-steps { visibility: hidden; }
.mla-step { flex: 1; height: 4px; border-radius: 2px; background: #d5dbe4; }
.mla-tile[aria-pressed="true"] .mla-step { background: color-mix(in srgb, var(--mla-accent) 28%, var(--mla-bg)); }
.mla-tile[aria-pressed="true"] .mla-step[data-on] { background: var(--mla-accent); }
@media (prefers-reduced-motion: reduce) { .mla-tile-check { transition: none; } }

/* ------------------------------------------------------------------- footer */
.mla-foot { border-top: 1px solid var(--mla-line); padding: 10px 14px 12px; background: var(--mla-bg-sunken); }
.mla-reset {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 11px;
  border: 0; border-radius: 10px;
  background: var(--mla-accent); color: var(--mla-accent-ink);
  font-weight: 600; cursor: pointer;
}
/* Darker, not lighter: white text on the accent only just passes. */
.mla-reset:hover { filter: brightness(.92); }
.mla-foot-links { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 10px; }
.mla-foot-links a, .mla-foot-links button {
  background: none; border: 0; padding: 0;
  color: var(--mla-ink-muted); font-size: calc(12.5px * var(--mla-scale));
  text-decoration: underline; cursor: pointer;
}
.mla-positions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.mla-positions button {
  padding: 8px; border: 1px solid var(--mla-line); border-radius: 8px;
  background: var(--mla-bg); cursor: pointer; font-size: calc(12.5px * var(--mla-scale));
}
.mla-positions button[aria-pressed="true"] { border-color: var(--mla-accent); background: #eef4ff; font-weight: 600; }

/* Language picker, as UserWay's: header with a code badge, then a list. */
.mla-lang {
  margin: 0 0 10px;
  padding: 10px;
  border-radius: 14px;
  background: #eef0f4;
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
