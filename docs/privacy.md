# Privacy

[Back to the README](../README.md)

The widget makes no network request when a page loads. This page lists every
request it can make, and what triggers each one.

## Every request

| Request | Triggered by | What is sent | Sent to | How to turn it off |
| --- | --- | --- | --- | --- |
| Dictionary lookup | A visitor double-clicks a word or presses Define, with the Dictionary tool on | The word | Wiktionary, or your `dictionary-url` | Leave the tool out with `data-disabled-tools="dictionary"` |
| Page translation | A visitor picks a language and the browser cannot translate on the device | The page's text | Google, or your `translate-url` | `data-translate-fallback="off"` |
| Fonts | A visitor turns on a font tool | A normal font file request | Your `fonts-url` | Do not set `fonts-url` |

Apart from these, nothing leaves the browser.

## What stays in the browser

- **Settings.** A visitor's choices are saved in `localStorage` under
  `access-layer:v1`, on their own device.
- **On-device translation.** Where the browser has a built-in translator, the
  page is translated locally.
- **Read aloud.** The widget prefers a voice that runs on the device. If the
  device has none for the language, the browser's default is used, and in some
  browsers that is a network voice run by the browser's vendor.

## What the widget never does

- No analytics, beacons or tracking pixels.
- No cookies.
- No account, site ID or identifier of any kind.
- No request for its own settings. They are attributes in your page.
