import { assetCss } from '../src/styles/assets'
import { describe, expect, it } from 'vitest'
import { defaults, fromHash, snippet, toHash, validateConfig, widgetAttributes } from '../console/config'

const auto = { version: '1.2.3', pinned: false }
describe('console configuration', () => {
  it('gives the script tag every setting as a data attribute, escaped', () => {
    const code = snippet('script', { ...defaults, statementText: '"><script>alert(1)</script>', icon: 'eye', disabledTools: ['dictionary'], skipLink: false, mobilePosition: 'top-right' }, auto, 'https://console.test/')
    expect(code).toContain('src="https://getaccesslayer.pages.dev/v1/access-layer.iife.js"')
    expect(code).toContain('data-statement-text="&quot;&gt;&lt;script&gt;')
    expect(code.match(/<script/g)).toHaveLength(1)
    for (const attribute of ['data-position="bottom-left"', 'data-mobile-position="top-right"', 'data-button-icon="eye"', 'data-disabled-tools="dictionary"', 'data-fonts-url="https://getaccesslayer.pages.dev/v1/fonts/"', '\n  data-no-skip-link']) expect(code).toContain(attribute)
    expect(code).not.toContain('integrity=')
  })
  it('passes the classic profile colours on, and leaves the plain default out', () => {
    expect(widgetAttributes({ ...defaults, profileColors: 'classic' })).toContainEqual(['profile-colors', 'classic'])
    expect(widgetAttributes(defaults).some(([name]) => name === 'profile-colors')).toBe(false)
    expect(defaults.profileColors).toBe('none')
    expect(() => validateConfig({ profileColors: 'brand' })).toThrow()
  })
  it('pins a version with its integrity hash', () => {
    const code = snippet('script', defaults, { version: '1.2.3', pinned: true, integrity: 'sha384-abc' }, 'https://console.test/')
    expect(code).toContain('src="https://getaccesslayer.pages.dev/v1.2.3/access-layer.iife.js"\n  integrity="sha384-abc" crossorigin="anonymous"\n  data-color')
    expect(code).toContain('data-fonts-url="https://getaccesslayer.pages.dev/v1.2.3/fonts/"')
  })
  it('gives frameworks a file that adds the same tag, with no script tag to write', () => {
    const config = { ...defaults, mobilePosition: 'top-right', skipLink: false, statementText: '</script>"' }
    const react = snippet('react', config, { version: '1.2.3', pinned: true, integrity: 'sha384-abc' }, 'https://console.test/#a=1')
    expect(react.startsWith('// AccessLayer. Change these settings: https://console.test/#a=1\nimport { useEffect } from "react"')).toBe(true)
    for (const line of ['script.src = "https://getaccesslayer.pages.dev/v1.2.3/access-layer.iife.js"', 'script.integrity = "sha384-abc"', '  accessLayer: "",', '  mobilePosition: "top-right",', '  noSkipLink: "",', '  statementText: "\\u003c/script>\\"",']) expect(react).toContain(line)
    expect(snippet('next', config, auto, '').startsWith('"use client"\n')).toBe(true)
    expect(snippet('nuxt', config, auto, '')).toContain('export default defineNuxtPlugin(() => {\n  if (document.querySelector')
    const vue = snippet('vue', config, auto, '')
    expect(vue.match(/<\/script>/g)).toHaveLength(1)
    expect(vue).toContain('onMounted(() => {')
  })
  it('keeps the edit link from ending its comment early', () => {
    const code = snippet('script', defaults, auto, 'https://console.test/#trigger=.a--b-->x')
    expect(code.split('\n')[0]).toBe('<!-- AccessLayer. Change these settings: https://console.test/#trigger=.a-%2Db-%2D%3Ex -->')
  })
  it('leaves out what the widget already defaults to', () => {
    expect(widgetAttributes(defaults)).toEqual([['color', '#1742c9'], ['position', 'bottom-left']])
    expect(widgetAttributes({ ...defaults, offsetX: 40, mobileOffsetX: 0 })).toEqual(expect.arrayContaining([['offset-x', '40'], ['mobile-offset-x', '0']]))
  })
  it('round-trips settings through the URL hash, and only the changed ones', () => {
    expect(toHash(defaults)).toBe('')
    const config = { ...defaults, color: '#112233', offsetY: 0, profiles: false, disabledTools: ['dictionary', 'cursor'] as typeof defaults.disabledTools, trigger: '.menu > a' }
    expect(fromHash(`#${toHash(config)}`)).toEqual(config)
  })
  it('falls back to the defaults for a link it cannot use', () => {
    expect(fromHash('#color=red')).toEqual(defaults)
    expect(fromHash('#main')).toEqual(defaults)
    expect(fromHash('#secret=nope&size=large')).toEqual({ ...defaults, size: 'large' })
  })
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'https://user:pass@example.com/a'])('rejects unsafe URL %s', statementUrl => {
    expect(() => validateConfig({ statementUrl })).toThrow()
  })
  it('requires a fonts directory that file names can be appended to', () => {
    for (const fontsUrl of ['/fonts/?v=1', '/fonts/#x']) expect(() => validateConfig({ fontsUrl })).toThrow('fonts directory')
    expect(validateConfig({ fontsUrl: '/fonts' }).fontsUrl).toBe('/fonts')
    expect(assetCss({ fontsUrl: '/fonts' })).toContain("url('/fonts/OpenDyslexic-Regular.woff2')")
  })
  it.each([['profiles', 'profiles'], ['skipLink', 'skip link']])('names the invalid %s setting', (key, label) => {
    expect(() => validateConfig({ [key]: 'yes' })).toThrow(`Invalid ${label} setting.`)
  })
})
