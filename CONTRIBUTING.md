# Contributing

Thanks for helping. This page covers setup, the commands you will use, the
rules every change follows and how a change gets merged.

## Setup

You need Node, in the version listed in `.nvmrc`.

```bash
git clone https://github.com/dwthgs/access-layer.git
cd access-layer
npm install
npx playwright install chromium     # once, for the browser tests
```

Optional: `npm run fetch-fonts` downloads the two reading typefaces into
`public/fonts/`. Without them the font tools fall back to system fonts.

Everything runs offline. The dictionary and the translator are replaced by
stand-ins in tests; only `npm run test:e2e:live` reaches the real services.

## Commands

```bash
npm run dev                              # landing page at /, console at /console/
npm test                                 # unit tests (Vitest)
npx playwright test --project=chromium   # browser tests
npm run typecheck
npm run build                            # dist/access-layer.{js,umd.cjs,iife.js}
npm run size                             # bundle size
```

`demo/fixture.html` is a deliberately awkward page (poor contrast, animation,
images, a table) so every tool has something to act on. The browser tests run
against it.

Unit tests (`test/`) run in Vitest with happy-dom and never reach the network.
Browser tests (`e2e/`) run in Playwright against the fixture page, with the
dictionary and translator replaced by routes, so they are deterministic.
`demo/fixture-dist.html` is the same fixture loading the built bundle, for
checking what actually ships.

To see exactly what a release serves, with its real paths and headers:

```bash
npm run serve:prod-like                  # http://localhost:5005
```

## Project structure

| Path | What it is |
| --- | --- |
| `src/` | The widget: the `<access-layer>` element, its panel and each tool |
| `console/` | The no-login page that builds installation code |
| `demo/`, `index.html` | The landing page and the test fixture |
| `integrations/` | Copy-paste starting points for specific setups |
| `test/`, `e2e/` | Unit tests and browser tests |
| `scripts/` | Build, size and release helpers |

## What is at stake

AccessLayer is one script that other people put on their own websites,
checkout pages included. It runs with full access to those pages, and a
mistake ships to every one of them at once. Small, careful changes matter more
here than in most projects.

## The promises the widget makes

Every change keeps these true. If a change cannot, it needs a discussion
before it needs code.

1. **Private by default.** The widget makes no network request when a page
   loads. A request happens only after a visitor does something that visibly
   asks for it, such as looking up a word or choosing a language. Every
   request the widget can make is listed in the README.
2. **No runtime dependencies.** The shipped bundle contains only this
   repository's code.
3. **Works under a strict Content Security Policy.** No `<style>` elements and
   no `style="…"` strings. Styles go in constructed stylesheets or through the
   style API, so `style-src 'self'` is enough.
4. **Cheap on large pages.** Never walk the whole document in response to a
   DOM change or a resize. Handle the nodes that changed.
5. **Survives being moved or removed.** `<access-layer>` can be taken out of
   the page and put back, and it cleans up every listener and observer it
   added.
6. **Accessible itself.** The widget meets WCAG 2.2 AA: readable contrast in
   any configured colour, full keyboard use, and focus returned to where it
   came from.
7. **Untrusted text stays text.** Anything from the network or from a setting
   is written with `textContent`, never parsed as HTML.

## Code style

- Prefer the smallest change that fully solves the problem.
- Delete what a change makes unused: options, strings, helpers, comments.
- Comment the reason, not the mechanics, and only where the code cannot say it.
- A behaviour change comes with a test that would have caught its absence.
- Do not loosen a test, the size budget or a check to get a change through.
  Say why it fails instead.

## Pull requests

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…` or `chore/…`. Never commit
   to `main` directly.
2. Keep the pull request to one change. Size is not limited, scope is.
3. Use conventional commit subjects: `feat:`, `fix:`, `docs:`, `test:`,
   `chore:`.
4. Add a line to `CHANGELOG.md` under **Unreleased**, written for the people
   who install the widget and the visitors who use it.
5. Leave the version in `package.json` alone. It changes only in a release.
6. Run all three checks, and say so if one could not be run:

   ```bash
   npm run typecheck
   npm test
   npx playwright test --project=chromium
   ```

7. Check the seven promises against your change, and note in the pull request
   which ones it touches and how you checked them.
8. A maintainer reviews and merges.

## Reporting a bug

Bug reports are most useful with the browser, the page (or a minimal copy of
it) and the settings you used. For anything that affects visitors' privacy or
security, please open a private security advisory instead of a public issue.
