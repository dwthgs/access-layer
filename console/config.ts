import { tools, type ToolId } from '../src/tool-catalog'
export const positions = ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'] as const
export const defaults = {
  color: '#1742c9', position: 'bottom-left', mobilePosition: 'bottom-left',
  offsetX: 18, offsetY: 18, mobileOffsetX: 18, mobileOffsetY: 18,
  icon: 'accessibility', size: 'medium', profileColors: 'none', defaultLanguage: '',
  statementUrl: '', statementText: '', fontsUrl: '', dictionaryUrl: '',
  disabledTools: [] as ToolId[], profiles: true, trigger: '', triggerId: '', skipLink: true,
}
export type WidgetConfig = typeof defaults
/** Where the released widget files are served. Set `VITE_CDN_URL` when building the console. */
export const CDN_URL: string = (import.meta.env?.VITE_CDN_URL || 'https://getaccesslayer.pages.dev').replace(/\/$/, '')
const escapeAttribute = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export class ValidationError extends Error {}
/** The settings with defaults filled in and unknown fields dropped. Throws on a value the widget would not accept. */
export function validateConfig(input: unknown): WidgetConfig {
  const c = { ...defaults, ...(input && typeof input === 'object' ? input : {}) } as WidgetConfig
  if (typeof c.color !== 'string' || !/^#[\da-f]{6}$/i.test(c.color)) throw new ValidationError('Use a six-digit hex colour, such as #1742c9.')
  if (!(positions as readonly string[]).includes(c.position) || !(positions as readonly string[]).includes(c.mobilePosition)) throw new ValidationError('Choose a supported position.')
  for (const key of ['statementUrl', 'fontsUrl', 'dictionaryUrl'] as const) {
    if (typeof c[key] !== 'string' || c[key].length > 2048) throw new ValidationError(`Invalid ${key}.`)
    if (!c[key]) continue
    let url: URL
    try { url = new URL(c[key], 'https://example.com') } catch { throw new ValidationError(`Invalid ${key} URL.`) }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /[\u0000-\u001f]/.test(c[key])) throw new ValidationError(`Use an HTTP(S) or relative ${key} URL.`)
    // Font file names are appended to this directory URL.
    if (key === 'fontsUrl' && /[?#]/.test(c[key])) throw new ValidationError('Leave ? and # out of the fonts directory URL.')
  }
  if (typeof c.trigger !== 'string' || c.trigger.length > 500) throw new ValidationError('Trigger must be at most 500 characters.')
  if (typeof c.triggerId !== 'string' || c.triggerId.length > 200 || /[\s\u0000-\u001f\u007f]/.test(c.triggerId) || c.triggerId.startsWith('#')) throw new ValidationError('Enter an element ID without # or spaces (up to 200 characters).')
  for (const [key, label] of [['profiles', 'profiles'], ['skipLink', 'skip link']] as const) if (typeof c[key] !== 'boolean') throw new ValidationError(`Invalid ${label} setting.`)
  for (const key of ['offsetX', 'offsetY', 'mobileOffsetX', 'mobileOffsetY'] as const) if (!Number.isInteger(c[key]) || c[key] < 0 || c[key] > 200) throw new ValidationError('Offsets must be between 0 and 200 pixels.')
  if (!['accessibility', 'wheelchair', 'eye'].includes(c.icon)) throw new ValidationError('Choose a supported button icon.')
  if (!['small', 'medium', 'large'].includes(c.size)) throw new ValidationError('Choose a supported button size.')
  if (!['none', 'classic'].includes(c.profileColors)) throw new ValidationError('Choose a supported profile colour style.')
  if (typeof c.defaultLanguage !== 'string' || !['', 'en', 'es'].includes(c.defaultLanguage)) throw new ValidationError('Choose a supported default language.')
  if (typeof c.statementText !== 'string' || c.statementText.length > 80) throw new ValidationError('Statement link text must be at most 80 characters.')
  if (!Array.isArray(c.disabledTools) || c.disabledTools.length > tools.length || c.disabledTools.some(id => !tools.some(tool => tool.id === id))) throw new ValidationError('Choose supported widget features.')
  c.disabledTools = [...new Set(c.disabledTools)]
  return Object.fromEntries(Object.keys(defaults).map(key => [key, c[key as keyof WidgetConfig]])) as WidgetConfig
}

/** The settings that differ from the defaults, as the console's URL hash (without the #). */
export function toHash(c: WidgetConfig): string {
  const params = new URLSearchParams()
  for (const key of Object.keys(defaults) as (keyof WidgetConfig)[]) if (String(c[key]) !== String(defaults[key])) params.set(key, String(c[key]))
  return params.toString()
}
/** Settings from a console link. Anything missing or invalid falls back to the defaults. */
export function fromHash(hash: string): WidgetConfig {
  const input: Record<string, unknown> = {}
  for (const [key, value] of new URLSearchParams(hash.replace(/^#/, ''))) {
    if (!(key in defaults)) continue
    const base = defaults[key as keyof WidgetConfig]
    input[key] = typeof base === 'number' ? Number(value) : typeof base === 'boolean' ? value === 'true' : Array.isArray(base) ? value.split(',').filter(Boolean) : value
  }
  try { return validateConfig(input) } catch { return structuredClone(defaults) }
}

/** The `<access-layer>` attributes for these settings. Values the widget already defaults to are left out. */
export function widgetAttributes(c: WidgetConfig): [string, string][] {
  const unless = (value: string | number, base: string | number) => value === base ? '' : String(value)
  const attributes = Object.entries({
    color: c.color, position: c.position, 'mobile-position': unless(c.mobilePosition, c.position),
    'offset-x': unless(c.offsetX, defaults.offsetX), 'offset-y': unless(c.offsetY, defaults.offsetY),
    'mobile-offset-x': unless(c.mobileOffsetX, c.offsetX), 'mobile-offset-y': unless(c.mobileOffsetY, c.offsetY),
    'button-icon': unless(c.icon, defaults.icon), 'button-size': unless(c.size, defaults.size), 'profile-colors': unless(c.profileColors, defaults.profileColors), 'default-language': c.defaultLanguage,
    'disabled-tools': c.disabledTools.join(','), 'statement-url': c.statementUrl, 'statement-text': c.statementText,
    'fonts-url': c.fontsUrl, 'dictionary-url': c.dictionaryUrl, trigger: c.trigger, 'trigger-id': c.triggerId,
  }).filter(([, value]) => value)
  if (!c.skipLink) attributes.push(['no-skip-link', ''])
  if (!c.profiles) attributes.push(['no-profiles', ''])
  return attributes
}

/** Which released file a snippet loads: `/v1/` follows new 1.x releases, a pinned version never changes. */
export interface Source { version: string; pinned: boolean; integrity?: string }
export type SnippetKind = 'script' | 'react' | 'next' | 'vue' | 'nuxt'
const camel = (name: string) => name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
// A JavaScript string. "<" is escaped so a value can never close a <script> block.
const js = (text: string) => JSON.stringify(text).replace(/</g, '\\u003c')
/**
 * The installation code. `script` is one tag for any HTML page. The framework
 * kinds are a small file that adds the same tag when the app starts, so nobody
 * edits the HTML shell by hand. `editUrl` is the console link that reopens
 * these settings.
 */
export function snippet(kind: SnippetKind, c: WidgetConfig, source: Source, editUrl: string): string {
  const directory = `${CDN_URL}/v${source.pinned ? source.version : source.version.split('.')[0]}/`
  // The fonts ship next to the script, so the font tools work without any setup.
  const attributes = widgetAttributes({ ...c, fontsUrl: c.fontsUrl || `${directory}fonts/` })
  const src = `${directory}access-layer.iife.js`, integrity = source.pinned ? source.integrity : undefined
  if (kind === 'script') {
    const data = attributes.map(([name, value]) => value ? `\n  data-${name}="${escapeAttribute(value)}"` : `\n  data-${name}`).join('')
    // "--" would end the comment early.
    return `<!-- AccessLayer. Change these settings: ${editUrl.replace(/--/g, '-%2D').replace(/>/g, '%3E')} -->\n<script defer data-access-layer\n  src="${src}"${integrity ? `\n  integrity="${escapeAttribute(integrity)}" crossorigin="anonymous"` : ''}${data}></script>`
  }
  const load = (indent: string) => [
    'if (document.querySelector("script[data-access-layer]")) return',
    'const script = document.createElement("script")',
    `script.src = ${js(src)}`,
    ...(integrity ? [`script.integrity = ${js(integrity)}`, 'script.crossOrigin = "anonymous"'] : []),
    'Object.assign(script.dataset, {',
    '  accessLayer: "",',
    ...attributes.map(([name, value]) => `  ${camel(name)}: ${js(value)},`),
    '})',
    'document.body.append(script)',
  ].map(line => indent + line).join('\n')
  const link = `// AccessLayer. Change these settings: ${editUrl}\n`
  if (kind === 'nuxt') return `${link}export default defineNuxtPlugin(() => {\n${load('  ')}\n})`
  if (kind === 'vue') return `<script setup>\n${link}import { onMounted } from "vue"\n\nonMounted(() => {\n${load('  ')}\n})\n</script>`
  return `${kind === 'next' ? '"use client"\n' : ''}${link}import { useEffect } from "react"\n\nexport function AccessLayer() {\n  useEffect(() => {\n${load('    ')}\n  }, [])\n  return null\n}`
}
