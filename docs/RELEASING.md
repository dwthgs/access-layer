# Releasing

How versions work, what a release publishes and how to cut one.

## What a release publishes

`scripts/build-site.mjs` lays the built widget out like this:

```
/v1.0.0/access-layer.iife.js     a release. Never changes. Cached for a year.
/v1.0.0/fonts/                   its fonts
/v1.0.0/integrity.json           its integrity hash
/v1/access-layer.iife.js         the newest 1.x.y. Cached for five minutes.
/versions.json                   every release, newest first, with hashes
```

A site chooses one of two ways to load it, and the console offers both:

- **`/v1/`** follows the newest 1.x release, so fixes arrive on their own.
- **`/v1.0.0/` with its integrity hash** never changes. The browser refuses
  the file if it differs from the one that was reviewed. Use this on checkout
  and account pages.

A published version is never rebuilt. A fix is a new version.

## Versions

[Semantic Versioning](https://semver.org/):

- **Patch** (1.0.1): a fix.
- **Minor** (1.1.0): new tools or options that existing installs can ignore.
- **Major** (2.0.0): anything an installed site has to act on, such as a
  renamed attribute or a removed tool. Attribute names are public API.

`npm run check:release` confirms that the version in `package.json` is higher
than every `v*` tag and that `CHANGELOG.md` has a section for it.

## Cutting a release

1. Open a pull request that sets the version in `package.json`, renames
   `## [Unreleased]` in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD`, and adds a
   new empty `## [Unreleased]` above it.
2. Run `npm run check:release`, the unit tests, and the browser tests in all
   three browsers (`npm run test:e2e`).
3. Merge, then tag the merge commit: `git tag vX.Y.Z && git push --tags`.
4. Publish: `npm run deploy:site`. Publishing replaces the whole site, so
   `site/` must already hold every earlier release. The build checks this
   against the live `versions.json` and stops if one is missing or differs.
   To restore a release, download its folder from the live site into
   `site/vX.Y.Z/`: `access-layer.iife.js`, its `.map`, `integrity.json` and
   the four files in `fonts/`.
5. Load the published file and compare it with the hash in `integrity.json`.
6. Use `node scripts/check-release.mjs --notes` for the release notes.

## If a release is bad

Release a fix as the next version. Sites on `/v1/` receive it within five
minutes. Sites pinned to a version are unaffected until they choose to update,
which is the reason to pin.
