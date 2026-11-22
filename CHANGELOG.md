# Changelog

Changes to AccessLayer that matter to the people who use it: visitors to the
sites that install it, and the people who install it. Entries describe what
changed for them.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/). Every pull
request adds its line under **Unreleased**; a release renames that section to
its version and date. See [docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

## [1.1.1] - 2026-11-23

### Fixed
- **A new release no longer takes earlier ones offline.** Publishing kept
  only the newest version, which would have broken sites pinned to an older
  one. The build now stops unless every live release is still included.
- **Reduce motion only pauses animation.** It also muted colour, which its
  name did not say. Visitors who want that can turn on Saturation.
- **The Mobility profile is called Motor.** It is for visitors who find a
  mouse or pointer hard to use, which Mobility did not say.
- **Profile names stay on one line** where there is room. The check on a
  chosen profile moved to its corner, so it no longer takes space from the
  name.

## [1.1.0] - 2026-11-23

### Changed
- **Profiles with plain names.** Low vision, Dyslexia, Colour blindness, Focus,
  Cognitive, Reduce motion, Mobility and Read aloud. The speech tile is
  called Text to speech, since it is not a screen reader. A profile saved under an
  earlier name still opens.
- **A warmer, bolder panel.** A large title on a soft off-white, each profile
  as a block of colour in view as soon as the panel opens, text size as one
  wide bar that leads the tools, and tools that fill with the site's colour
  when they are on.
- **Alt + A opens the panel.** It was Ctrl + U, which browsers use for View
  Source. If your accessibility statement names the shortcut, update it.

## [1.0.0] - 2026-10-31

### Added
- **The widget.** One script tag adds an accessibility button to any website.
  Visitors get seventeen tools and eight one-click profiles, a skip link, and
  Ctrl + U to open the panel. Their choices are saved in their own browser and
  follow them from page to page.
- **Reading tools.** Text size, line height, letter spacing, text alignment,
  readable and dyslexia-friendly fonts, read aloud, and a dictionary that
  defines and spells any word a visitor selects.
- **Colour and focus tools.** Light, dark and inverted contrast, smart
  contrast that fixes only the text that fails, saturation, highlighted links,
  hidden images, and paused motion and video.
- **Navigation tools.** A larger cursor with a reading mask and guide,
  tooltips, and a page structure view of headings, landmarks and links.
- **Page translation.** In the browser where the device can translate, with
  Google as the fallback where it cannot. Nothing is sent until a visitor
  picks a language, and a site can turn the fallback off with
  `data-translate-fallback="off"`, as checkout pages should. A site can also
  point `data-translate-url` at its own Cloud Translation endpoint.
- **Private by default.** No request on page load, no analytics and no
  cookies. The README lists every request the widget can make and when.
- **Made to fit a site.** Colour, icon, size, language, a different position
  and offset on phones, your own open button, and the choice of which tools to
  offer, all set with `data-*` attributes on the script tag or attributes on
  `<access-layer>`.
- **Works where sites are strict.** Under `style-src 'self'`, inside apps that
  move or re-insert the element, and on long pages that keep adding content.
- **A console instead of an account.** Open `/console/`, shape the widget on a
  live preview, pick your platform (plain HTML, React, Next.js, Vue, Nuxt,
  Shopify, WordPress, Wix, Squarespace or Webflow) and copy the code. Nothing
  is stored: the settings are part of the code, which carries a link that
  reopens them.
- **Automatic or pinned updates.** `/v1/` follows the newest 1.x release so
  fixes arrive on their own. A pinned version, with its integrity hash, never
  changes.

### Fixed
- **The project site answers unknown addresses with a 404 page** in the
  site's own design, with links home and to the console, where it used to
  show the landing page.
