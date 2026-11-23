# Configuration

[Back to the README](../README.md)

- [All attributes](#all-attributes)
- [Your own button](#your-own-button)
- [Keeping the button clear of your UI](#keeping-the-button-clear-of-your-ui)
- [Language and position](#language-and-position)
- [JavaScript API](#javascript-api)
- [Content Security Policy](#content-security-policy)

The [console](console.md) writes all of this for you. This page is for
setting it by hand.

## All attributes

Set these as `data-*` on the script tag, or as attributes on `<access-layer>`.

| Attribute | Script-tag form | Default | Meaning |
| --- | --- | --- | --- |
| `color` | `data-color` | `#1742c9` | Accent colour for the button and panel |
| `position` | `data-position` | `bottom-left` | Corner or middle edge to sit in |
| `mobile-position` | `data-mobile-position` | same as `position` | Where to sit on screens narrower than 768 px |
| `offset-x`, `offset-y` | `data-offset-x`, `data-offset-y` | `18` | Distance from the side and from the top or bottom edge, in pixels (0 to 999) |
| `mobile-offset-x`, `mobile-offset-y` | `data-mobile-offset-x`, `data-mobile-offset-y` | same as the offsets | The same, on screens narrower than 768 px |
| `button-icon` | `data-button-icon` | `accessibility` | `accessibility`, `wheelchair` or `eye` |
| `button-size` | `data-button-size` | `medium` | `small`, `medium` or `large` |
| `profile-colors` | `data-profile-colors` | `none` | `none`: plain profile cards, like the tools. `classic`: yellow, lilac, mint and coral |
| `default-language` | `data-default-language` | the page's language | `en` or `es` for the widget's own labels |
| `disabled-tools` | `data-disabled-tools` | none | Comma-separated tool IDs to leave out |
| `no-profiles` | `data-no-profiles` | profiles on | Hide the ready-made profiles |
| `no-skip-link` | `data-no-skip-link` or `data-skip-link="false"` | skip link on | Turn off when the page has its own |
| `statement-url` | `data-statement-url` | none | Link shown in the panel footer |
| `statement-text` | `data-statement-text` | the widget's own label | Text of that link |
| `trigger-id` | `data-trigger-id` | floating button | ID of your own button or link that opens the panel |
| `trigger` | `data-trigger` | floating button | CSS selector for your own open buttons, or `none` |
| `fonts-url` | `data-fonts-url` | none | Directory serving the optional font files. See [how-it-works.md](how-it-works.md#fonts) |
| `dictionary-url` | `data-dictionary-url` | Wiktionary | Lookup endpoint, or your own. See [dictionary.md](dictionary.md#your-own-endpoint) |
| `translate-fallback` | `data-translate-fallback` | `google` | Set `off` on checkout and payment pages. See [translation.md](translation.md) |
| `translate-url` | `data-translate-url` | none | Your endpoint for Google's Cloud Translation API. See [translation.md](translation.md#your-own-google-cloud-key) |
| — | `data-auto="false"` | auto-mount | Place `<access-layer>` yourself |

## Your own button

**By ID.** Set `trigger-id` to the ID of an existing button or link, without
`#`. The widget opens from that element and the floating button stays hidden,
even if the element is missing. Use a keyboard-accessible element:

```html
<button id="accessibility-button" type="button">Accessibility options</button>
<script defer data-access-layer src="/access-layer.iife.js"
        data-trigger-id="accessibility-button"></script>
```

**By selector.** Point `trigger` at one or more buttons with any CSS selector:

```html
<script defer data-access-layer src="/access-layer.iife.js"
        data-trigger="#accessibilityWidget, #accessibilityWidgetCollapsed"></script>
```

With a selector, the floating button hides only while one of your buttons is
visible. On a layout without your navigation, behind a collapsed menu, or on a
phone where the navigation is hidden, it comes back, so the tools are never
unreachable. `trigger="none"` hides it unconditionally. Only use that if every
page has another way in.

In both cases your button gets `aria-expanded` and `aria-haspopup`, and focus
returns to it when the panel closes. An ID takes priority over a selector. Do
not also attach your own click handler to the same button, or one click will
open the panel and the other will close it.

## Keeping the button clear of your UI

The floating button sits 18 px from the edges. Change that with the offset
attributes, or from your own stylesheet:

```css
@media (max-width: 767px) {
  access-layer { --mla-offset-y: 84px; }   /* clear a 64px mobile tab bar */
}
```

`--mla-offset-x` does the same horizontally.

## Language and position

Both follow the site until the visitor chooses otherwise. The widget's language
tracks `<html lang>`, including when your app switches locale at runtime, so
the page must set that attribute. The position comes from `position`. Once a
visitor picks either in the panel, their choice wins on every later visit.

## JavaScript API

```js
const widget = document.querySelector('access-layer')

widget.open()
widget.close()
widget.settings.set({ contrast: 'dark', textScale: 2 })
widget.settings.setProfile('dyslexia')
widget.settings.reset()
widget.settings.state          // the current settings
widget.settings.subscribe(fn)  // called on every change
```

## Content Security Policy

The widget works under a strict `style-src 'self'`. Its CSS is added as
constructed stylesheets (`adoptedStyleSheets`), which the policy does not
block, and it adds no `<style>` elements or `style=""` attributes. Inline
adjustments such as text size are set from script through `element.style`,
which the policy also allows.

A site with a policy allows, besides its own origin:

| Directive | Origin | Why |
| --- | --- | --- |
| `script-src` | where the script is served | The widget itself |
| `connect-src` | `https://en.wiktionary.org`, or your `dictionary-url` | Dictionary lookups, only when a visitor asks for one |
| `font-src` | your `fonts-url` origin | Only if the fonts are served from another origin |
| `script-src` | `https://translate.google.com`, `https://translate.googleapis.com` | Only where the Google translation fallback is on |
