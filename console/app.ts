import { version } from '../package.json'
import { CDN_URL, ValidationError, defaults, fromHash, positions, snippet, toHash, validateConfig, type SnippetKind, type Source } from './config'
import { tools, type ToolId } from '../src/tool-catalog'
import { esc, field, glyph } from './ui'

const sections = ['appearance', 'features', 'install'] as const
type Section = typeof sections[number]
const main = document.querySelector<HTMLElement>('#main')!
// Nothing is stored: the settings live in this page's URL, so a bookmark or the link inside the code reopens them.
const c = fromHash(location.hash)
const source: Source = { version, pinned: false }
// Whether the site uses our floating button or its own. Starts from the link's settings.
let opener: 'floating' | 'own' = c.triggerId ? 'own' : 'floating'
let section: Section = 'appearance', device: 'desktop' | 'mobile' = 'desktop', platform = 'html', noticeTimer = 0

const footer = 'Paste it just before the closing <code>&lt;/body&gt;</code> tag, on every page that should have the widget.'
const component = 'Render <code>&lt;AccessLayer /&gt;</code> once, in '
const platforms: Record<string, { name: string; kind: SnippetKind; builder?: true; file: string; steps: string[]; note?: string }> = {
  html: { name: 'HTML', kind: 'script', file: 'HTML', steps: ['Copy the code below.', footer] },
  react: { name: 'React', kind: 'react', file: 'AccessLayer.jsx', steps: ['Save the code as <code>AccessLayer.jsx</code> in your app.', `${component}your root component.`] },
  next: { name: 'Next.js', kind: 'next', file: 'components/AccessLayer.jsx', steps: ['Save the code as <code>components/AccessLayer.jsx</code>.', `${component}<code>app/layout</code>, inside <code>&lt;body&gt;</code>.`] },
  vue: { name: 'Vue', kind: 'vue', file: 'AccessLayer.vue', steps: ['Save the code as <code>AccessLayer.vue</code>.', `${component}<code>App.vue</code>.`] },
  nuxt: { name: 'Nuxt', kind: 'nuxt', file: 'plugins/access-layer.client.ts', steps: ['Save the code as <code>plugins/access-layer.client.ts</code>.', 'Nuxt runs it on every page. There is nothing to render.'] },
  shopify: { name: 'Shopify', kind: 'script', builder: true, file: 'HTML', steps: ['In your Shopify admin, open <strong>Online Store → Themes</strong>.', 'On your current theme, choose <strong>Edit code</strong> and open <code>layout/theme.liquid</code>.', 'Paste the code just before <code>&lt;/body&gt;</code> and save.'] },
  wordpress: { name: 'WordPress', kind: 'script', builder: true, file: 'HTML', steps: ['Install a header and footer code plugin, such as WPCode.', 'Open its <strong>Header &amp; Footer</strong> screen.', 'Paste the code into the <strong>Footer</strong> box and save.'] },
  wix: { name: 'Wix', kind: 'script', builder: true, file: 'HTML', steps: ['In your site dashboard, open <strong>Settings → Custom Code</strong>.', 'Choose <strong>Add Custom Code</strong> and paste the code.', 'Apply it to <strong>All pages</strong>, place it at <strong>Body - end</strong>, and apply.'], note: 'Wix allows custom code on premium sites with a connected domain.' },
  squarespace: { name: 'Squarespace', kind: 'script', builder: true, file: 'HTML', steps: ['Open <strong>Code Injection</strong>, under Settings → Advanced or Website Tools.', 'Paste the code into the <strong>Footer</strong> box and save.'], note: 'Code injection needs a Squarespace plan that includes it.' },
  webflow: { name: 'Webflow', kind: 'script', builder: true, file: 'HTML', steps: ['Open <strong>Site settings → Custom code</strong>.', 'Paste the code into <strong>Footer code</strong>.', 'Save, then publish the site.'], note: 'Custom code needs a paid Webflow site plan.' },
}
const platformTabs = (builder: boolean) => Object.entries(platforms).filter(([, p]) => !!p.builder === builder).map(([key, p]) => `<button type="button" data-platform="${key}">${p.name}</button>`).join('')

const titleCase = (text: string) => text[0]!.toUpperCase() + text.slice(1)
const hint = (text: string) => `<p class="hint">${text}</p>`
const toggle = (name: string, label: string, detail: string, checked: boolean) => `<label class="toggle-row"><span><strong>${label}</strong><small>${detail}</small></span><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span class="switch" aria-hidden="true"></span></label>`
const editUrl = () => `${location.origin}${location.pathname}${toHash(c) ? `#${toHash(c)}` : ''}`
function notice(message: string) { document.querySelector('#notice')!.textContent = message; clearTimeout(noticeTimer); noticeTimer = window.setTimeout(() => document.querySelector('#notice')!.textContent = '', 6000) }
/** Why these settings cannot be installed yet, or an empty string. */
function problem(): string {
  try { validateConfig(c) } catch (error) { return error instanceof ValidationError ? error.message : 'Check your settings.' }
  if (!c.triggerId && c.trigger && c.trigger !== 'none') { try { document.querySelector(c.trigger) } catch { return 'Enter a valid CSS selector for the custom trigger.' } }
  return ''
}

main.innerHTML = `<div class="page-heading"><div><h1>Set up your widget</h1><p>Three short steps make one piece of code for your website. No account, and nothing is stored.</p></div><button type="button" id="start-over">Start over</button></div>
  <div class="site-tabs" role="group" aria-label="Setup steps">${sections.map((item, i) => `<button type="button" data-section="${item}"><span class="step-number" aria-hidden="true">${i + 1}</span>${titleCase(item)}</button>`).join('')}</div>
  <p class="error" id="problem" role="status"></p><div id="section-content"></div>`
const content = main.querySelector<HTMLElement>('#section-content')!
main.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(button => button.onclick = () => { section = button.dataset.section as Section; show() })
main.querySelector<HTMLButtonElement>('#start-over')!.onclick = () => { if (confirm('Reset every setting to its default?')) { Object.assign(c, structuredClone(defaults)); changed(); show() } }

/** After any setting changes: keep the URL, the preview and the code in step. */
function changed() {
  history.replaceState(null, '', editUrl())
  main.querySelector('#problem')!.textContent = problem()
  content.querySelector('.feature-total')?.replaceChildren(`${tools.length - c.disabledTools.length} of ${tools.length} tools enabled`)
  updatePreview()
}
function show() {
  // Start over sits by the preview's device toggle on the Appearance step; bring it home first.
  main.querySelector('.page-heading')!.append(main.querySelector('#start-over')!)
  document.title = `${titleCase(section)} · Console — AccessLayer`
  main.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(button => button.dataset.section === section ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'))
  main.querySelector('#problem')!.textContent = problem()
  if (section === 'install') { install(); stepNav(); return }
  content.innerHTML = `<form id="config-form" novalidate><div class="section-title"><div><h2 tabindex="-1">${section === 'appearance' ? 'Make it feel like your website' : 'The right tools for your visitors'}</h2><p>${section === 'appearance' ? 'A familiar button. A welcoming experience. All yours.' : section === 'features' ? 'Choose which adjustments people can use on your website.' : 'The details behind your widget.'}</p></div>${section === 'features' ? `<span class="feature-total">${tools.length - c.disabledTools.length} of ${tools.length} tools enabled</span>` : ''}</div>
    ${section === 'appearance' ? appearance() : features()}</form>`
  const form = content.querySelector<HTMLFormElement>('form')!
  form.onsubmit = e => e.preventDefault()
  form.addEventListener('input', e => {
    const target = e.target as HTMLInputElement | HTMLSelectElement
    if (target.name === 'tool') c.disabledTools = [...form.querySelectorAll<HTMLInputElement>('[name=tool]:not(:checked)')].map(input => input.value as ToolId)
    else if (target.name in defaults) Object.assign(c, { [target.name]: target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.type === 'number' ? Number(target.value) : target.value })
    else return
    if (target.name === 'color') { const picker = form.querySelector<HTMLInputElement>('#color-picker'); if (picker && /^#[\da-f]{6}$/i.test(c.color)) picker.value = c.color }
    changed()
  })
  if (section === 'appearance') {
    const setColor = (color: string) => { c.color = color; form.querySelector<HTMLInputElement>('#color')!.value = color; form.querySelector<HTMLInputElement>('#color-picker')!.value = color; changed() }
    form.querySelector<HTMLInputElement>('#color-picker')!.oninput = e => { e.stopPropagation(); setColor((e.target as HTMLInputElement).value) }
    form.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button => button.onclick = () => setColor(button.dataset.color!))
    form.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => button.onclick = () => { device = button.dataset.device as typeof device; form.querySelectorAll('[data-device]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); form.querySelector('.preview-canvas')!.classList.toggle('mobile', device === 'mobile'); updatePreview() })
    form.querySelector('.device-toggle')!.after(main.querySelector('#start-over')!)
    form.querySelectorAll<HTMLInputElement>('[name=opener]').forEach(radio => radio.onchange = () => {
      opener = radio.value as typeof opener
      form.querySelectorAll<HTMLElement>('[data-opener]').forEach(part => { part.hidden = part.dataset.opener !== opener })
      // Back to the floating button: forget the ID, or the button would stay hidden.
      if (opener === 'floating') { c.triggerId = ''; form.querySelector<HTMLInputElement>('#triggerId')!.value = '' }
      else form.querySelector<HTMLInputElement>('#triggerId')!.focus()
      changed()
    })
    form.querySelector<HTMLIFrameElement>('iframe')!.onload = updatePreview
  }
  if (section === 'features') form.querySelector('#enable-all')!.addEventListener('click', () => { c.disabledTools = []; form.querySelectorAll<HTMLInputElement>('[name=tool]').forEach(input => input.checked = true); changed() })
  stepNav()
}
/** Back and Next under each step, so the four read as one path to the code. */
function stepNav() {
  const i = sections.indexOf(section), back = sections[i - 1], next = sections[i + 1]
  content.insertAdjacentHTML('beforeend', `<div class="step-nav">${back ? `<button type="button" data-go="${back}">Back</button>` : '<span></span>'}${next ? `<button type="button" class="primary" data-go="${next}">Next: ${next === 'install' ? 'Get your code' : titleCase(next)} ${glyph('arrow')}</button>` : ''}</div>`)
  // The buttons are replaced with the step, so focus moves to the new step's heading.
  content.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(button => button.onclick = () => { section = button.dataset.go as Section; show(); content.querySelector<HTMLElement>('h2')!.focus() })
}

function previewMessage(message: unknown) { main.querySelector<HTMLIFrameElement>('#widget-preview')?.contentWindow?.postMessage(message, location.origin) }
function updatePreview() { previewMessage({ type: 'access-layer-preview', config: c, device }) }
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== main.querySelector<HTMLIFrameElement>('#widget-preview')?.contentWindow) return
  if (event.data?.type === 'access-layer-preview-loaded') updatePreview()
  if (event.data?.type === 'access-layer-preview-ready') main.querySelector('#preview-status')!.textContent = 'Interactive preview · Click the widget to try it'
  if (event.data?.type === 'access-layer-preview-invalid') main.querySelector('#preview-status')!.textContent = 'Preview paused · Check your field values'
})
// A console link pasted into this tab, or the skip link, which must not wipe the settings from the URL.
window.addEventListener('hashchange', () => {
  if (location.hash === '#main') { history.replaceState(null, '', editUrl()); return }
  Object.assign(c, fromHash(location.hash)); show()
})

function positionControls(mobile: boolean) {
  const key = mobile ? 'mobilePosition' : 'position', x = mobile ? 'mobileOffsetX' : 'offsetX', y = mobile ? 'mobileOffsetY' : 'offsetY'
  return `<div class="position-group"><div class="control-label">${glyph(mobile ? 'phone' : 'monitor')} ${mobile ? 'Mobile' : 'Desktop'} <small>${mobile ? 'Below 768 px' : '768 px and above'}</small></div><div class="position-controls"><fieldset class="position-picker"><legend class="sr-only">${mobile ? 'Mobile' : 'Desktop'} button position</legend>${positions.map(p => `<label class="position-option"><input type="radio" name="${key}" value="${p}" ${c[key] === p ? 'checked' : ''}><span aria-label="${titleCase(p.replace('-', ' '))}"><i></i><span class="sr-only">${titleCase(p.replace('-', ' '))}</span></span></label>`).join('')}</fieldset><div class="offsets">${field(x, 'Side offset', String(c[x]), 'number', 'required min="0" max="200" aria-describedby="offset-help"')}${field(y, 'Edge offset', String(c[y]), 'number', 'required min="0" max="200" aria-describedby="offset-help"')}</div></div></div>`
}
function appearance() {
  return `<div class="config-layout"><div class="controls-column"><section class="surface"><div class="block-heading"><h3>Open the widget</h3><p>How visitors reach it on your site.</p></div><fieldset class="segmented size-picker"><legend class="sr-only">How visitors open the widget</legend>${[['floating', 'Floating button', 'We add it'], ['own', 'Your own button', 'Already on your site']].map(([id, label, note]) => `<label><input type="radio" name="opener" value="${id}" ${opener === id ? 'checked' : ''}><span>${label}<small>${note}</small></span></label>`).join('')}</fieldset><div data-opener="own" ${opener === 'own' ? '' : 'hidden'}>${field('triggerId', 'Your button’s element ID', c.triggerId, 'text', 'maxlength="200" placeholder="accessibility-button" autocomplete="off" spellcheck="false" aria-describedby="trigger-id-help"')}<p class="hint" id="trigger-id-help">Its HTML ID, without #. Use a real button or link, so keyboards can reach it.</p><details><summary>Several buttons? Use a CSS selector</summary>${field('trigger', 'CSS selector', c.trigger, 'text', 'maxlength="500" placeholder=".open-accessibility"')}${hint('Used when the ID is empty. Every match opens the widget. Enter “none” only if you offer another accessible way to open it.')}</details></div></section><section class="surface" data-opener="floating" ${opener === 'floating' ? '' : 'hidden'}><div class="block-heading"><h3>Button style</h3><p>A recognizable way to open your widget.</p></div><fieldset class="icon-picker"><legend>Icon</legend>${[['accessibility', 'Universal'], ['wheelchair', 'Accessibility'], ['eye', 'Visibility']].map(([id, label]) => `<label><input type="radio" name="icon" value="${id}" ${c.icon === id ? 'checked' : ''}><span>${glyph(id!)}<small>${label}</small></span></label>`).join('')}</fieldset><fieldset class="segmented size-picker"><legend>Button size</legend>${[['small', 'Small', '44 px'], ['medium', 'Medium', '56 px'], ['large', 'Large', '68 px']].map(([id, label, size]) => `<label><input type="radio" name="size" value="${id}" ${c.size === id ? 'checked' : ''}><span>${label}<small>${size}</small></span></label>`).join('')}</fieldset></section><section class="surface"><div class="block-heading"><h3>Colors</h3><p>For the button and inside the panel.</p></div><div class="color-label"><label for="color">Brand color</label><span>Solid color</span></div><div class="color-input"><input aria-label="Choose brand color" id="color-picker" type="color" value="${esc(c.color)}"><input id="color" name="color" value="${esc(c.color)}" required pattern="#[0-9a-fA-F]{6}" maxlength="7" spellcheck="false"><span>HEX</span></div><div class="swatches">${['#1742c9', '#183e36', '#6843bc', '#b43846', '#202c3a', '#a85215'].map(color => `<button type="button" data-color="${color}" style="--swatch:${color}" aria-label="Use color ${color}"></button>`).join('')}</div><fieldset class="segmented size-picker profile-colors-picker"><legend>Profile colors</legend>${[['none', 'Default', 'Plain'], ['classic', 'Classic', 'Four colors']].map(([id, label, note]) => `<label><input type="radio" name="profileColors" value="${id}" ${c.profileColors === id ? 'checked' : ''}><span>${label}<small>${note}</small></span></label>`).join('')}</fieldset></section><section class="surface" data-opener="floating" ${opener === 'floating' ? '' : 'hidden'}><div class="block-heading"><h3>Placement</h3><p>Give your button room on every screen.</p></div>${positionControls(false)}${positionControls(true)}<p class="hint" id="offset-help">Offsets are in pixels. Edge offset applies to top and bottom positions. Visitors can move the button themselves.</p></section><section class="surface"><h3>Widget language</h3><div class="field"><label for="defaultLanguage">Default language</label><select name="defaultLanguage" id="defaultLanguage">${[['', 'Match website language'], ['en', 'English'], ['es', 'Español']].map(([code, label]) => `<option value="${code}" ${c.defaultLanguage === code ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${hint('Visitors can choose another language in the widget.')}</section></div><aside class="preview-column"><div class="preview-toolbar"><strong>Live preview</strong><div class="device-toggle" role="group" aria-label="Preview device"><button type="button" data-device="desktop" aria-label="Desktop preview" aria-pressed="${device === 'desktop'}">${glyph('monitor')}</button><button type="button" data-device="mobile" aria-label="Mobile preview" aria-pressed="${device === 'mobile'}">${glyph('phone')}</button></div></div><div class="preview-canvas ${device === 'mobile' ? 'mobile' : ''}"><div class="browser-frame"><div class="browser-chrome"><div><i></i><i></i><i></i></div><span>your-website.com</span>${glyph('shield')}</div><iframe id="widget-preview" title="Interactive accessibility widget preview on sample content" src="./preview.html"></iframe></div></div><div class="preview-caption"><span id="preview-status" role="status">Loading interactive preview…</span></div></aside></div>`
}
function features() {
  return `<div class="feature-layout"><div><div class="feature-toolbar"><p>Visitors choose their own adjustments.</p><div><button type="button" id="enable-all">Enable all tools</button></div></div>${['Reading & content', 'Color & focus', 'Navigation & assistance'].map(group => `<section class="surface feature-group"><h3>${group}</h3><div class="feature-grid">${tools.filter(t => t.group === group).map(tool => `<label class="feature-row"><span class="feature-icon">${glyph(tool.icon)}</span><span><strong>${tool.name}</strong><small>${tool.description}</small></span><input type="checkbox" name="tool" value="${tool.id}" ${!c.disabledTools.includes(tool.id) ? 'checked' : ''}><span class="switch" aria-hidden="true"></span></label>`).join('')}</div></section>`).join('')}</div><aside class="feature-aside"><section class="surface"><h3>Ready-made profiles</h3><p>Let visitors apply a group of adjustments in one step.</p>${toggle('profiles', 'Show profiles', 'Includes vision, reading and focus presets.', c.profiles)}${hint('Profiles only apply enabled tools. Restricted tools also stay off for visitors with previously saved preferences.')}</section><section class="surface"><h3>Also in the widget</h3>${toggle('skipLink', 'Skip to content', 'A keyboard shortcut past repeated navigation.', c.skipLink)}${field('statementUrl', 'Accessibility statement URL', c.statementUrl, 'text', 'placeholder="https://example.com/accessibility"')}${field('statementText', 'Link text', c.statementText, 'text', 'maxlength="80" placeholder="Accessibility statement"')}${hint('Shown in the panel footer. Leave the URL empty to hide it.')}<details><summary>Your own fonts or dictionary</summary>${field('fontsUrl', 'Fonts directory URL', c.fontsUrl, 'text', 'placeholder="/fonts/"')}${field('dictionaryUrl', 'Dictionary endpoint URL', c.dictionaryUrl)}${hint('Optional. Leave empty to use ours. These are part of your page’s code, so anyone can read them: never put keys or private details here.')}</details></section><div class="quiet-note">${glyph('info')}<p>Keep as many tools available as possible. Different visitors need different ways to use the same website.</p></div></aside></div>`
}

function install() {
  const invalid = problem()
  content.innerHTML = `<div class="section-title"><div><h2 tabindex="-1">Paste once. Change it whenever you like.</h2><p>The code carries your settings and a link back to this page.</p></div></div><div class="installation-layout"><div>
    <section class="surface install-step"><span class="step-number">01</span><div><h3>Choose how updates arrive</h3><fieldset class="segmented size-picker"><legend class="sr-only">Updates</legend><label><input type="radio" name="update" value="auto" ${source.pinned ? '' : 'checked'}><span>Automatic<small>Fixes arrive on their own</small></span></label><label><input type="radio" name="update" value="pinned" ${source.pinned ? 'checked' : ''}><span>Pinned to ${esc(version)}<small>Changes only when you update it</small></span></label></fieldset><p class="hint" id="update-note" role="status"></p></div></section>
    <section class="surface install-step"><span class="step-number">02</span><div><h3>Add it to your website</h3><div class="platform-tabs" role="group" aria-label="Where your website is built">${platformTabs(false)}<i aria-hidden="true"></i>${platformTabs(true)}</div><ol id="install-steps"></ol><p class="hint" id="platform-note"></p>${invalid ? '<p class="callout">Fix the setting named above to get your code.</p>' : `<div class="code-toolbar"><span id="code-file"></span><button type="button" id="copy-code">${glyph('copy')} Copy code</button></div><pre id="install-code" tabindex="0"></pre>`}${hint('To change a setting later, open the link at the top of the code, adjust it here, and paste the new code over the old one.')}</div></section>
    </div><aside class="surface installation-summary"><h3>What this code does</h3><p class="hint">It loads one script from <strong>${esc(new URL(CDN_URL).host)}</strong> and nothing else when a page opens. There is no account, no site ID and no tracking.</p><p class="hint">The dictionary and page translation contact their services only when a visitor uses them. The README’s privacy section lists every request.</p></aside></div>`
  const code = () => {
    const chosen = platforms[platform]!
    content.querySelectorAll<HTMLButtonElement>('[data-platform]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platform === platform)))
    content.querySelector('#install-steps')!.innerHTML = chosen.steps.map(step => `<li>${step}</li>`).join('')
    content.querySelector('#platform-note')!.textContent = `${chosen.note ? `${chosen.note} ` : ''}${chosen.builder ? 'Menu names belong to the platform and can change. Look for “custom code” or “footer code”.' : chosen.kind === 'script' ? '' : 'There is no script tag to add by hand: this file loads the widget when your app starts.'}`
    content.querySelector('#update-note')!.textContent = !source.pinned ? 'Loads the newest 1.x release, so security fixes reach your site without a new paste.' : source.integrity ? 'Includes an integrity hash, so browsers refuse the file if it ever changes. You will not receive fixes until you paste a newer version.' : `This version’s integrity hash could not be read from ${new URL(CDN_URL).host}, so the code has no integrity check.`
    const pre = content.querySelector('#install-code')
    if (pre) { pre.textContent = snippet(chosen.kind, c, source, editUrl()); content.querySelector('#code-file')!.textContent = chosen.file }
  }
  content.querySelectorAll<HTMLButtonElement>('[data-platform]').forEach(button => button.onclick = () => { platform = button.dataset.platform!; code() })
  content.querySelectorAll<HTMLInputElement>('[name=update]').forEach(input => input.onchange = async () => {
    source.pinned = input.value === 'pinned'
    // Read once, and only when someone asks for a pinned version.
    if (source.pinned && !source.integrity) { try { source.integrity = (await (await fetch(`${CDN_URL}/v${version}/integrity.json`)).json())['access-layer.iife.js'] } catch { /* The note says the hash is missing. */ } }
    if (content.isConnected && section === 'install') code()
  })
  content.querySelector('#copy-code')?.addEventListener('click', async () => {
    const pre = content.querySelector('#install-code')!
    try { await navigator.clipboard.writeText(pre.textContent!); notice('Code copied.') } catch { const selection = getSelection(), range = document.createRange(); range.selectNodeContents(pre); selection?.removeAllRanges(); selection?.addRange(range); notice('Clipboard unavailable. The code is selected for manual copying.') }
  })
  code()
}

show()
