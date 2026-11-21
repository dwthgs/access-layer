/**
 * Assembles `site/`, the widget's public files, from `dist/` and
 * `public/fonts/`. Run `npm run build` (and
 * `npm run fetch-fonts`) first.
 *
 *   node scripts/build-site.mjs --channel=production   a release
 *   node scripts/build-site.mjs                        local, for `npm run serve:prod-like`
 *
 * Layout:
 *   /v1.2.3/access-layer.iife.js     a release; never changes once published
 *   /v1.2.3/fonts/*.woff2       its fonts
 *   /v1.2.3/integrity.json      SRI hashes for the files above
 *   /v1/access-layer.iife.js         alias: the newest 1.x.y release
 *   /versions.json              every release on the site, newest first
 *   /index.html                 the demo page, running the /vN/ alias
 *   /_headers                   caching, CORS and security headers per path
 *
 * A local build publishes under a pre-release name such as
 * `/v1.2.3-local.abc1234/`, so it can never occupy a path that a release
 * serves as immutable. `_headers` caches the two differently.
 *
 * A release is additive: earlier releases already in `site/` are kept, and
 * this script refuses to overwrite a version that is already there.
 */

import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const FONTS = resolve(ROOT, 'public/fonts')
const SITE = resolve(ROOT, 'site')
const SHIPPED = ['access-layer.iife.js', 'access-layer.iife.js.map']
const RELEASE_DIR = /^v(\d+)\.(\d+)\.(\d+)$/

const channel = (process.argv.find((a) => a.startsWith('--channel=')) ?? '--channel=local').split('=')[1]
if (!['production', 'local'].includes(channel)) {
  fail(`Unknown channel "${channel}"`)
}

const { version } = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'))
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`package.json version "${version}" is not plain semver (X.Y.Z)`)
const major = version.split('.')[0]

for (const file of SHIPPED) {
  if (!existsSync(resolve(DIST, file))) fail(`dist/${file} is missing. Run \`npm run build\` first.`)
}

const fonts = existsSync(FONTS) ? (await readdir(FONTS)).filter((f) => f.endsWith('.woff2')) : []
if (fonts.length === 0) {
  if (channel === 'production') fail('public/fonts/ is empty. Run `npm run fetch-fonts` first.')
  console.warn('  warn  no fonts in public/fonts/; the font tools will fall back to system faces')
}

// A release keeps the earlier releases already in site/; a local build
// starts clean.
if (channel !== 'production') await rm(SITE, { recursive: true, force: true })
await mkdir(SITE, { recursive: true })

const dirName = channel === 'production' ? `v${version}` : `v${version}-${channel}.${shortSha()}`
const target = resolve(SITE, dirName)
if (existsSync(target)) {
  fail(`${dirName} is already published. Bump the version in package.json; a release is never overwritten.`)
}

await mkdir(resolve(target, 'fonts'), { recursive: true })
for (const file of SHIPPED) await cp(resolve(DIST, file), resolve(target, file))
for (const font of fonts) await cp(resolve(FONTS, font), resolve(target, 'fonts', font))
await writeFile(resolve(target, 'integrity.json'), JSON.stringify(await integrityOf(target), null, 2) + '\n')

// Aliases. In production, /vN/ is the newest release in major N. Elsewhere
// there is only this build, so /vN/ is simply this build.
const releases = channel === 'production' ? await listReleases() : []
const aliases = new Map()
if (channel === 'production') {
  for (const r of releases) if (!aliases.has(r.major)) aliases.set(r.major, r.dir)
} else {
  aliases.set(major, dirName)
}
for (const [m, dir] of aliases) {
  const alias = resolve(SITE, `v${m}`)
  await rm(alias, { recursive: true, force: true })
  await cp(resolve(SITE, dir), alias, { recursive: true })
}

const listed = channel === 'production' ? releases : [{ dir: dirName }]
const versions = []
for (const r of listed) {
  versions.push({
    version: r.dir.slice(1),
    path: `/${r.dir}/access-layer.iife.js`,
    integrity: JSON.parse(await readFile(resolve(SITE, r.dir, 'integrity.json'), 'utf8'))['access-layer.iife.js'],
  })
}
await writeFile(resolve(SITE, 'versions.json'), JSON.stringify({ channel, versions }, null, 2) + '\n')

await writeFile(resolve(SITE, 'index.html'), await demoPage(`v${major}`, dirName))
await writeFile(resolve(SITE, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
await writeFile(resolve(SITE, '_headers'), headers(listed.map((r) => r.dir), [...aliases.keys()]))
await writeFile(resolve(SITE, '404.html'), '<!doctype html><meta charset="utf-8"><title>Not found</title><p>Not found.</p>\n')

console.log(`  ok    site/${dirName}/ (${channel})`)
for (const [m, dir] of aliases) console.log(`  ok    site/v${m}/ -> ${dir}`)
console.log(`  sri   ${versions.find((v) => v.version === dirName.slice(1))?.integrity}`)

// ---------------------------------------------------------------------------

/**
 * Cloudflare's `_headers`. Each path gets each header from one rule only:
 * Cloudflare joins the values when two rules set the same header. Cloudflare
 * reads at most 100 rules, about 95 releases.
 */
function headers(dirs, majors) {
  const cors = ['Access-Control-Allow-Origin: *', 'Cross-Origin-Resource-Policy: cross-origin']
  const rule = (path, lines) => `${path}\n${lines.map((line) => `  ${line}\n`).join('')}`
  return [
    rule('/*', ['X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin']),
    rule('/versions.json', [...cors, 'Cache-Control: public, max-age=300']),
    ...majors.map((m) => rule(`/v${m}/*`, [...cors, 'Cache-Control: public, max-age=300'])),
    // A release never changes; a pre-release build can be rebuilt under the same name.
    ...dirs.map((dir) => rule(`/${dir}/*`, [...cors, RELEASE_DIR.test(dir) ? 'Cache-Control: public, max-age=31536000, immutable' : 'Cache-Control: no-cache'])),
  ].join('')
}

async function integrityOf(dir) {
  const out = {}
  for (const file of ['access-layer.iife.js']) {
    out[file] = 'sha384-' + createHash('sha384').update(await readFile(resolve(dir, file))).digest('base64')
  }
  return out
}

/** Every release directory in site/, newest first. */
async function listReleases() {
  const found = []
  for (const name of await readdir(SITE)) {
    const m = RELEASE_DIR.exec(name)
    if (m && (await stat(resolve(SITE, name))).isDirectory()) {
      found.push({ dir: name, major: m[1], parts: m.slice(1).map(Number) })
    }
  }
  return found.sort((a, b) => b.parts[0] - a.parts[0] || b.parts[1] - a.parts[1] || b.parts[2] - a.parts[2])
}

/** The demo page from demo/fixture-dist.html, pointed at the published bundle. */
async function demoPage(aliasDir, buildDir) {
  let html = await readFile(resolve(ROOT, 'demo/fixture-dist.html'), 'utf8')
  const tag = 'src="/dist/access-layer.iife.js"'
  if (!html.includes(tag)) fail(`demo/fixture-dist.html no longer contains ${tag}; update build-site.mjs`)
  html = html.replace(tag, `src="/${aliasDir}/access-layer.iife.js" data-fonts-url="/${aliasDir}/fonts/"`)
  html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex">')
  const badge =
    `<div style="position:fixed;top:0;right:0;z-index:2147483646;padding:4px 10px;` +
    `font:12px/1.4 system-ui,sans-serif;background:#1f2933;color:#fff;border-bottom-left-radius:6px">` +
    `AccessLayer ${buildDir.slice(1)} &middot; ${channel}</div>`
  return html.replace('</body>', `${badge}\n</body>`)
}

function shortSha() {
  const fromCi = process.env.GITHUB_SHA
  if (fromCi) return fromCi.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { cwd: ROOT }).toString().trim()
  } catch {
    return 'local'
  }
}

function fail(message) {
  console.error(`  error ${message}`)
  process.exit(1)
}
