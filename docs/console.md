# Console

[Back to the README](../README.md)

The console is a static page with no account and no server. It shows the
widget on a sample page while you set it up, then gives you the code for your
platform. Run it locally with `npm run dev` and open `/console/`.

## The four steps

1. **Appearance.** Icon, size, colour, desktop and mobile position, language,
   or your own button.
2. **Features.** Which tools and profiles visitors can use.
3. **Settings.** The accessibility statement link, the skip link and advanced
   endpoints.
4. **Install.** Choose how updates arrive, pick your platform and copy the
   code.

## Platforms

| Platform | What you get |
| --- | --- |
| HTML, Shopify, WordPress, Wix, Squarespace, Webflow | One script tag, with steps for where to paste it |
| React, Next.js, Vue | A small component that loads the widget when the app starts |
| Nuxt | A client plugin |

The framework code adds the same script tag for you, so nobody edits the HTML
shell by hand.

## What to know

- **Nothing is stored.** The settings live in the console's own URL, and the
  code starts with a comment holding that link. Open it to change a setting,
  then paste the new code over the old one.
- **The code makes no request for its settings.** They are attributes on the
  script tag, so a page with the widget loads one script and nothing else.
- **Updates are your choice.** "Automatic" loads `/v1/`, which follows the
  newest 1.x release, so fixes arrive without a new paste. "Pinned" loads one
  exact version with its integrity hash and never changes. Use pinned on
  checkout and account pages.
- **The settings are public**, like the rest of your page. Never put a key or
  anything private in them.

## Hosting the console yourself

`npm run build:app` builds the console and the landing page into `dist-app/`.
Set `VITE_CDN_URL` to the address the widget's files are served from. The code
the console produces points there.
