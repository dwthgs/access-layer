## What changed, and why

<!-- One or two sentences. Link an issue if there is one. -->

## How to check it

<!-- The steps a reviewer can follow, e.g. "Open the panel, turn on Bigger text, scroll the feed." -->

## Checklist

- [ ] One change, branched from `main`
- [ ] `CHANGELOG.md` has a line under **Unreleased**
- [ ] `npm run typecheck`, `npm test` and `npx playwright test --project=chromium` pass
- [ ] Nothing unused is left behind

**The widget's promises** (see `CONTRIBUTING.md`). Tick what you checked, or write "n/a".

- [ ] Privacy: no new request, or the README says exactly when it happens
- [ ] CSP: works under `style-src 'self'`
- [ ] Performance: no whole-document walk on DOM changes or resize
- [ ] Lifecycle: survives being removed and re-inserted
- [ ] Accessibility: keyboard-only use, focus returns, contrast holds
