# AccessLayer

A free, open-source accessibility widget for any website. One script tag adds
a button that lets visitors adjust the page to their needs: bigger text, more
contrast, a dyslexia-friendly font, page translation, read aloud and more.

- **Private.** No request on page load, no analytics, no cookies, no account.
- **Small.** One custom element, no runtime dependencies, about 40 KB gzipped.
- **Honest.** It helps visitors read a page. It does not make a site compliant.

## Contents

- [Quick start](#quick-start)
- [Tools](#tools)
- [Configuration](#configuration)
- [Privacy](#privacy)
- [What it does not do](#what-it-does-not-do)
- [Browser support](#browser-support)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Licence](#licence)

## Quick start

**With the console.** Open the [console](https://getaccesslayer.pages.dev/console/),
choose how the widget looks and which tools it offers, pick your platform and
copy the code. It covers plain HTML, React, Next.js, Vue, Nuxt, Shopify,
WordPress, Wix, Squarespace and Webflow. There is no account. See
[docs/console.md](docs/console.md).

**By hand.** Add one tag before `</body>`:

```html
<script defer data-access-layer
  src="https://getaccesslayer.pages.dev/v1/access-layer.iife.js"
  data-color="#1742c9"
  data-position="bottom-right"></script>
```

**Self-hosted.** Build the file and serve it from your own site:

```bash
npm install
npm run build        # writes dist/access-layer.iife.js
```

```html
<script defer data-access-layer src="/access-layer.iife.js"></script>
```

Visitors open the panel with the button or with <kbd>Ctrl</kbd> + <kbd>U</kbd>.
Their choices are saved in their own browser and follow them across pages.

## Tools

| Group | Tools |
| --- | --- |
| Reading | Bigger text, line height, text spacing, text alignment, dyslexia-friendly fonts, read aloud, dictionary |
| Colour and focus | Contrast modes, smart contrast, saturation, highlighted links, hidden images, paused animations |
| Navigation | Large cursor with reading mask and guide, tooltips, page structure |
| Language | Page translation into 193 languages |

Eight one-click profiles turn on a sensible group at once: Motor Impaired,
Read aloud, Color Blind, Dyslexia, Low vision, Cognitive & Learning,
Seizure & Epileptic and ADHD.

Every tool and profile is described in [docs/tools.md](docs/tools.md).

## Configuration

Settings are `data-*` attributes on the script tag, or plain attributes on
`<access-layer>`. The most common ones:

| Script-tag attribute | Default | Meaning |
| --- | --- | --- |
| `data-color` | `#1742c9` | Accent colour of the button and panel |
| `data-position` | `bottom-left` | Corner or middle edge the button sits in |
| `data-mobile-position` | same as position | Position on screens narrower than 768 px |
| `data-button-icon` | `accessibility` | `accessibility`, `wheelchair` or `eye` |
| `data-disabled-tools` | none | Comma-separated tool IDs to leave out |
| `data-trigger-id` | floating button | ID of your own button that opens the panel |
| `data-translate-fallback` | `google` | Set `off` on checkout and payment pages |

The full list, the JavaScript API, Content Security Policy and using your own
button are in [docs/configuration.md](docs/configuration.md).

## Privacy

The widget makes **no network request when a page loads**. A request happens
only after a visitor asks for something that needs one:

| When | What is sent | Where |
| --- | --- | --- |
| A visitor looks up a word | That word | Wiktionary, or your own `dictionary-url` |
| A visitor picks a language and the browser cannot translate on the device | The page's text | Google, or your own `translate-url` |

Everything else stays in the browser. Settings live in `localStorage`. There is
no analytics, no beacon and no cookie. Details are in
[docs/privacy.md](docs/privacy.md).

## What it does not do

- **It does not make a site WCAG or ADA compliant.** No overlay does. It
  changes presentation at runtime. It cannot fix a broken heading order, an
  unlabelled control or a component a screen reader cannot use.
- **It is not a screen reader.** Read aloud is a reading aid for sighted
  visitors. People who rely on assistive technology use NVDA, JAWS or
  VoiceOver, and those need correct markup underneath.
- **It does not generate alt text or ARIA labels.** Fix those in the source.

Known limits of individual tools are in
[docs/how-it-works.md](docs/how-it-works.md#known-limits).

## Browser support

Current Chrome, Edge, Firefox and Safari, on desktop, iOS and Android. The
widget needs custom elements, shadow DOM and constructed stylesheets (Chrome
and Edge 73+, Firefox 101+, Safari 16.4+). Read aloud needs the Web Speech API
and is disabled where that is missing.

## Documentation

| Page | What it covers |
| --- | --- |
| [docs/tools.md](docs/tools.md) | Every tool and profile |
| [docs/configuration.md](docs/configuration.md) | All attributes, the API, CSP, your own button |
| [docs/console.md](docs/console.md) | Building installation code without an account |
| [docs/translation.md](docs/translation.md) | How page translation works and how to control it |
| [docs/dictionary.md](docs/dictionary.md) | How lookups work, and using your own endpoint |
| [docs/privacy.md](docs/privacy.md) | Every request the widget can make |
| [docs/how-it-works.md](docs/how-it-works.md) | Architecture, fonts and known limits |
| [docs/RELEASING.md](docs/RELEASING.md) | Versions and releases |
| [integrations/](integrations/) | Starting points for Nuxt and plain script tags |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |

## Contributing

Bug reports and pull requests are welcome. Setup, commands and the rules every
change follows are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE). The optional fonts, if you fetch them, are under the SIL Open
Font License 1.1.
