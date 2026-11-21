/**
 * Downloads the two optional typefaces into `public/fonts/`.
 *
 * They are kept out of git because they are third-party binaries with their
 * own licences (both SIL Open Font License 1.1) and because the widget works
 * without them: the CSS stacks fall back to faces that ship with the common
 * desktop operating systems.
 *
 * Run once per deployment target, then serve `public/fonts/` and point the
 * widget at it with `data-fonts-url`.
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/fonts')

/**
 * Each file's SHA-256, checked before it is saved, so a changed or tampered
 * download is refused. Taken from jsDelivr and confirmed identical on unpkg.
 * Update them only together with the pinned version in the URL.
 */
const FONTS = [
  {
    file: 'OpenDyslexic-Regular.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.3.0/files/opendyslexic-latin-400-normal.woff2',
    sha256: 'f007004af3cda5d8076e57c943f8cc8d00a0da25988b1ae1048683d60e7cac1a',
  },
  {
    file: 'OpenDyslexic-Bold.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.3.0/files/opendyslexic-latin-700-normal.woff2',
    sha256: 'dd9fa9c7991113b0dddefe9506a30ad26b48e302b7a8fb91719a4726e8fde85b',
  },
  {
    file: 'AtkinsonHyperlegible-Regular.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.0.20/files/atkinson-hyperlegible-latin-400-normal.woff2',
    sha256: 'b09653e3ba9d95e26da5c408979f40451990a4573ce5f96abe6982e2fcb09e6c',
  },
  {
    file: 'AtkinsonHyperlegible-Bold.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.0.20/files/atkinson-hyperlegible-latin-700-normal.woff2',
    sha256: 'd8e8b1e0e929651439e25e23ade4b9d6cac073f2444aadb8e8b85431726c2036',
  },
]

await mkdir(OUT, { recursive: true })

let failures = 0
for (const font of FONTS) {
  try {
    const response = await fetch(font.url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    const hash = createHash('sha256').update(bytes).digest('hex')
    if (hash !== font.sha256) throw new Error(`unexpected SHA-256 ${hash}`)
    await writeFile(resolve(OUT, font.file), bytes)
    console.log(`  ok   ${font.file}  ${(bytes.length / 1024).toFixed(1)} KB`)
  } catch (error) {
    failures += 1
    console.error(`  FAIL ${font.file}  ${(error).message}`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} font(s) could not be downloaded. The widget still works; the`)
  console.error('dyslexia and legible font tools fall back to system faces.')
  process.exitCode = 1
} else {
  console.log(`\nSaved to ${OUT}. Serve this directory and set data-fonts-url to its URL.`)
}
