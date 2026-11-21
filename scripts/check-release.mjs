/**
 * Version and changelog rules for a release.
 *
 *   node scripts/check-release.mjs
 *       The version in package.json must be higher than every existing v*
 *       tag, and CHANGELOG.md must have a "## [X.Y.Z]" section for it.
 *
 *   node scripts/check-release.mjs --notes
 *       Prints that CHANGELOG section, for the release notes.
 *
 * Fetch tags first (`git fetch --tags`).
 */

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
const changelog = readFileSync(resolve(ROOT, 'CHANGELOG.md'), 'utf8')
const arg = (name) => process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))

const parse = (v) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v)
  return m ? m.slice(1).map(Number) : null
}
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

const current = parse(version)
if (!current) fail(`package.json version "${version}" is not plain semver X.Y.Z.`)

if (!arg('notes')) {
  // execFileSync, not execSync: no shell, so `v*` reaches git unexpanded on
  // every platform (a shell would glob it against vite.config.ts).
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { cwd: ROOT }).toString().split('\n').map(parse).filter(Boolean)
  const latest = tags.sort(compare).at(-1) ?? [0, 0, 0]
  if (compare(current, latest) <= 0) {
    fail(`version ${version} must be higher than the latest release v${latest.join('.')}. ` +
      'Bump package.json: patch for a fix, minor or major for new behaviour.')
  }
  if (!section(version)) {
    fail(`CHANGELOG.md has no "## [${version}]" section. Move the Unreleased entries under it first.`)
  }
  console.log(`ok  ${version} > v${latest.join('.')} and CHANGELOG has its section`)
}

if (arg('notes')) {
  const notes = section(version)
  if (!notes) fail(`CHANGELOG.md has no "## [${version}]" section.`)
  process.stdout.write(notes.trim() + '\n')
}

/** The body of "## [X.Y.Z] ..." up to the next "## " heading. */
function section(v) {
  const lines = changelog.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`## [${v}]`))
  if (start === -1) return null
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
