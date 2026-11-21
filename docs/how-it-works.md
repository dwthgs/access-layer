# How it works

[Back to the README](../README.md)

- [Architecture](#architecture)
- [Fonts](#fonts)
- [Known limits](#known-limits)

## Architecture

Presentation-only tools are `data-mla-*` attributes on `<html>` plus one
stylesheet. That lets them survive a client-side route change with nothing to
re-apply, and it keeps the hot path free of JavaScript.

Only four things need script, because CSS cannot do them:

- **Bigger text** measures each element's own computed size and multiplies it.
  A global `font-size` rule would flatten every heading to body size, and
  scaling the root only works on sites that size everything in `rem`.
- **Smart contrast** measures each text element against the first opaque
  background above it and corrects the colour along its own lightness axis.
  Text whose background it cannot determine, such as text over an image, is
  left alone.
- **Reading mask, reading guide and tooltips** follow the pointer and keyboard
  focus.
- **Speech and the dictionary** call browser and network APIs.

The widget is a custom element with a shadow root. The page stylesheet it adds
is full of `!important` rules aimed at the page, and the shadow boundary is
what keeps them from reaching the panel. It also stops the host page's CSS from
restyling the panel.

## Fonts

OpenDyslexic and Atkinson Hyperlegible are optional downloads, kept out of git
because they are third-party files under the SIL Open Font License 1.1.

```bash
npm run fetch-fonts   # writes public/fonts/
```

Serve that directory and point `data-fonts-url` at it. Code from the console
already points at the fonts served next to the widget. Without them the font
tools fall back to Comic Sans MS and Verdana, which are present on almost
every desktop, so the feature degrades and does not silently do nothing.

## Known limits

- **Colour filters and fixed positioning.** Saturation and invert apply a CSS
  filter to `<html>`. The widget counter-inverts itself so the panel stays
  readable under Invert, but under Saturation and Monochrome the panel is
  desaturated along with the page. It stays usable.
- **Bigger text and media queries.** Inline sizes override the site's own
  responsive type rules, so the pass re-runs when the viewport width changes.
  Expect a short reflow on a slow device.
- **Very large documents.** Bigger text, line height and smart contrast each
  walk the document once when turned on or changed. On a page with tens of
  thousands of elements that first pass is noticeable. Content added afterwards
  is measured on its own, in a batch when the browser is idle.
- **Dark and light contrast modes are blunt.** They force colours across the
  whole page, which flattens deliberate design. Smart contrast is the subtler
  option.
