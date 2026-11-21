/**
 * Prints the built bundle sizes, raw and gzipped.
 *
 * `--budget=<KB>` fails the run when the gzipped IIFE bundle (the file every
 * property loads) is larger than that. Raise it deliberately, in the same pull
 * request as the change that needs the room, never to make a build pass.
 */
import { readdir, readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`
const budgetArg = process.argv.find((a) => a.startsWith('--budget='))
const budget = budgetArg ? Number(budgetArg.split('=')[1]) * 1024 : null

for (const name of (await readdir(DIST)).filter((f) => /\.(js|cjs)$/.test(f))) {
  const body = await readFile(resolve(DIST, name))
  const gz = gzipSync(body).length
  console.log(`${name.padEnd(24)} ${kb(body.length).padStart(9)}  gzip ${kb(gz).padStart(9)}`)
  if (budget && name === 'access-layer.iife.js' && gz > budget) {
    console.error(`::error::access-layer.iife.js is ${kb(gz)} gzipped, over the ${kb(budget)} budget.`)
    process.exitCode = 1
  }
}
