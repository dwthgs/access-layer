/**
 * The landing page. Every control on it drives the real widget mounted on
 * this page through its public API (`open()`, `settings.set`,
 * `settings.setProfile`, `settings.subscribe`), so what a visitor sees here is
 * exactly what AccessLayer does on a real site.
 */

import { mount, PROFILES, DEFAULT_STATE, type AccessLayerElement, type State } from '../src/index'
import { AVAILABLE_LOCALES, en, messagesFor } from '../src/i18n'
import { version } from '../package.json'
import {
  $,
  $$,
  COPY_CONTENT,
  copyButtonHtml,
  highlight,
  ICONS,
  motionReduced,
  revealOnScroll,
  stickyNav,
  wireCopyButtons,
} from './shared'

// Importing the entry point has already mounted the widget; `mount()` returns
// it. Its options are set here because Vite's build drops `data-*` attributes
// from the module script tag, which left the live page with the defaults.
const widget: AccessLayerElement = mount()
widget.setAttribute('color', '#1742C9')
widget.setAttribute('position', 'bottom-right')
widget.setAttribute('statement-url', '#privacy')
widget.setAttribute('profile-colors', 'classic')
const settings = widget.settings

// ------------------------------------------------------------ descriptions
const LINE_HEIGHTS = ['1.5×', '1.75×', '2×']

/** A short human name for one setting, as the chips and profile lists show it. */
function describe(key: keyof State, value: unknown): string | null {
  switch (key) {
    case 'textScale': return `Bigger text ${value}`
    case 'letterSpacing': return `Text spacing ${value}`
    case 'lineHeight': return `Line height ${LINE_HEIGHTS[Number(value) - 1] ?? ''}`
    case 'textAlign': return `Align ${value}`
    case 'contrast': return { invert: 'Inverted colours', dark: 'Dark contrast', light: 'Light contrast' }[String(value)] ?? null
    case 'saturation': return { low: 'Low saturation', high: 'High saturation', mono: 'Monochrome' }[String(value)] ?? null
    case 'font': return value === 'dyslexic' ? 'Dyslexia font' : 'Legible font'
    case 'cursor': return { big: 'Big cursor', mask: 'Reading mask', guide: 'Reading guide' }[String(value)] ?? null
    case 'smartContrast': return 'Smart contrast'
    case 'highlightLinks': return 'Highlighted links'
    case 'hideImages': return 'Images hidden'
    case 'pauseAnimations': return 'Animations paused'
    case 'tooltips': return 'Tooltips'
    case 'screenReader': return 'Text to speech'
    case 'dictionary': return 'Dictionary'
    case 'oversized': return 'Large menu'
    default: return null
  }
}

/** Every page adjustment that differs from the defaults, in a stable order. */
function activeAdjustments(state: State): string[] {
  const skip = new Set<keyof State>(['profile', 'position', 'lang', 'readerRate'])
  return (Object.keys(DEFAULT_STATE) as (keyof State)[])
    .filter((key) => !skip.has(key) && state[key] !== DEFAULT_STATE[key])
    .map((key) => describe(key, state[key]))
    .filter((label): label is string => !!label)
}

// ------------------------------------------------------------------- icons
function paintIcons(root: ParentNode = document): void {
  for (const el of $$('[data-icon]', root)) {
    if (!el.firstElementChild) el.innerHTML = ICONS[el.dataset.icon ?? ''] ?? ''
  }
}

// ------------------------------------------------------------------- tools
type Category = 'reading' | 'seeing' | 'navigating' | 'understanding'

interface Tool {
  key: keyof State | 'pageStructure' | 'language'
  name: string
  blurb: string
  how: string
  icon: string
  category: Category
  /** Values in click order, off first. Absent for tools that open something. */
  options?: unknown[]
  /** In place of `options`, for a card that sets more than one key. */
  patches?: Partial<State>[]
  labels?: string[]
  /** Opens part of the panel instead of changing a setting. */
  action?: (opener: HTMLElement) => void
  available?: () => boolean
}

const TOGGLE = [false, true]

const TOOLS: Tool[] = [
  { key: 'textScale', name: 'Bigger text', icon: 'text', category: 'reading', how: 'measured',
    blurb: 'Four steps, measured per element, so headings stay bigger than body.',
    options: [0, 1, 2, 3, 4], labels: ['Off', 'Step 1', 'Step 2', 'Step 3', 'Step 4'] },
  { key: 'letterSpacing', name: 'Text spacing', icon: 'spacing', category: 'reading', how: 'css',
    blurb: 'Three steps of letter and word spacing.',
    options: [0, 1, 2, 3], labels: ['Off', 'Step 1', 'Step 2', 'Step 3'] },
  { key: 'lineHeight', name: 'Line height', icon: 'lineHeight', category: 'reading', how: 'measured',
    blurb: '1.5×, 1.75× or 2× the page’s own spacing.',
    options: [0, 1, 2, 3], labels: ['Off', ...LINE_HEIGHTS] },
  { key: 'textAlign', name: 'Text align', icon: 'align', category: 'reading', how: 'css',
    blurb: 'Left, centre, right or justified, everywhere at once.',
    options: [null, 'left', 'center', 'right', 'justify'], labels: ['Off', 'Left', 'Centre', 'Right', 'Justify'] },
  { key: 'font', name: 'Dyslexia friendly', icon: 'dyslexia', category: 'reading', how: 'css',
    blurb: 'OpenDyslexic, or Atkinson Hyperlegible.',
    options: [null, 'dyslexic', 'legible'], labels: ['Off', 'Dyslexic', 'Legible'] },

  // One card for both contrast settings: smart contrast, then the page modes.
  { key: 'contrast', name: 'Contrast', icon: 'contrast', category: 'seeing', how: 'measured + css',
    blurb: 'Smart mode corrects text to WCAG 1.4.3; or invert, dark and light.',
    patches: [
      { contrast: null, smartContrast: false },
      { contrast: null, smartContrast: true },
      { contrast: 'invert', smartContrast: false },
      { contrast: 'dark', smartContrast: false },
      { contrast: 'light', smartContrast: false },
    ],
    labels: ['Off', 'Smart', 'Invert', 'Dark', 'Light'] },
  { key: 'saturation', name: 'Saturation', icon: 'saturation', category: 'seeing', how: 'css filter',
    blurb: 'Low, high or monochrome colour.',
    options: [null, 'low', 'high', 'mono'], labels: ['Off', 'Low', 'High', 'Mono'] },
  { key: 'hideImages', name: 'Hide images', icon: 'image', category: 'seeing', how: 'css',
    blurb: 'Blanks images and backgrounds, and keeps the layout where it was.', options: TOGGLE },
  { key: 'pauseAnimations', name: 'Pause animations', icon: 'motion', category: 'seeing', how: 'css + media',
    blurb: 'Stops CSS animation, transitions and autoplaying video.', options: TOGGLE },

  { key: 'highlightLinks', name: 'Highlight links', icon: 'link', category: 'navigating', how: 'css',
    blurb: 'Outlines every link and button on the page.', options: TOGGLE },
  { key: 'cursor', name: 'Cursor', icon: 'cursor', category: 'navigating', how: 'overlay',
    blurb: 'Big cursor, reading mask or reading guide.',
    options: [null, 'big', 'mask', 'guide'], labels: ['Off', 'Big', 'Mask', 'Guide'] },
  { key: 'pageStructure', name: 'Page structure', icon: 'structure', category: 'navigating', how: 'dialog',
    blurb: 'Headings, landmarks and links, with jump-to.', action: (opener) => openPanelPart('structure', opener) },

  { key: 'screenReader', name: 'Text to speech', icon: 'audio', category: 'understanding', how: 'speech api',
    blurb: 'Reads the clicked or focused block aloud, at three speeds.', options: TOGGLE,
    available: () => 'speechSynthesis' in window },
  { key: 'tooltips', name: 'Tooltips', icon: 'tooltip', category: 'understanding', how: 'overlay',
    blurb: 'Shows alt text and ARIA labels on hover and focus.', options: TOGGLE },
  { key: 'dictionary', name: 'Dictionary', icon: 'book', category: 'understanding', how: 'wiktionary',
    blurb: 'Turn it on, then double-click any word on this page.', options: TOGGLE },
  { key: 'language', name: 'Language', icon: 'globe', category: 'understanding', how: 'on-device',
    blurb: 'Translates the page into 193 languages, on the device where it can.',
    action: (opener) => openPanelPart('language', opener) },
]

/** Open the panel and, where asked, go straight to one part of it. */
function openPanelPart(part: 'structure' | 'language', opener?: HTMLElement): void {
  widget.open(opener ?? (document.activeElement as HTMLElement | null))
  const shadow = widget.shadowRoot
  if (!shadow) return
  if (part === 'language') {
    shadow.querySelector<HTMLElement>('.mla-lang-toggle')?.click()
    return
  }
  // The panel labels its tiles in the visitor's language, so match any locale's name.
  const names = AVAILABLE_LOCALES.map(({ code }) => messagesFor(code).pageStructure)
  const tile = $$<HTMLButtonElement>('.mla-tile', shadow).find(
    (button) => names.includes(button.querySelector('.mla-tile-label')?.textContent ?? ''),
  )
  tile?.click()
}

/** A tool's steps as settings patches, off first. */
function patchesOf(tool: Tool): Partial<State>[] {
  return tool.patches ?? (tool.options ?? TOGGLE).map((value) => ({ [tool.key]: value }) as Partial<State>)
}

/** The last step whose changed settings are all on, or 0 when none are. */
function stepOf(tool: Tool, state: State): number {
  const patches = patchesOf(tool)
  for (let i = patches.length - 1; i > 0; i--) {
    const matches = Object.entries(patches[i]!).every(
      ([key, value]) => value === DEFAULT_STATE[key as keyof State] || state[key as keyof State] === value,
    )
    if (matches) return i
  }
  return 0
}

const toolNodes = new Map<Tool, HTMLButtonElement>()

function renderTools(): void {
  const grid = $('[data-tool-grid]')
  TOOLS.forEach((tool, index) => {
    const li = document.createElement('li')
    li.className = 'reveal'
    li.style.setProperty('--i', String(index % 4))
    li.dataset.category = tool.category

    const count = tool.action ? 0 : patchesOf(tool).length
    const steps = count > 2 ? count - 1 : 0
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tool'
    button.innerHTML = `
      <span class="tool-top">
        <span class="tool-icon">${ICONS[tool.icon] ?? ''}</span>
        <span class="tool-state" aria-hidden="true"></span>
      </span>
      <span class="tool-name"></span>
      <span class="tool-blurb"></span>
      <span class="tool-foot">
        <span class="tool-how"></span>
        ${
          steps
            ? `<span class="tool-steps" aria-hidden="true">${'<i></i>'.repeat(steps)}</span>`
            : tool.action
              ? '<span class="tool-go" aria-hidden="true">Open →</span>'
              : ''
        }
      </span>`
    button.querySelector('.tool-name')!.textContent = tool.name
    button.querySelector('.tool-blurb')!.textContent = tool.blurb
    button.querySelector('.tool-how')!.textContent = tool.how

    if (tool.available && !tool.available()) {
      button.disabled = true
      button.querySelector('.tool-blurb')!.textContent = 'Not available in this browser.'
    }

    button.addEventListener('click', () => {
      if (tool.action) {
        tool.action(button)
        return
      }
      const patches = patchesOf(tool)
      settings.set(patches[(stepOf(tool, settings.state) + 1) % patches.length]!)
      pulse(button)
    })
    spotlight(button)

    li.append(button)
    grid.append(li)
    toolNodes.set(tool, button)
  })
}

function syncTools(state: State): void {
  for (const [tool, button] of toolNodes) {
    if (tool.action) {
      button.setAttribute('aria-label', `${tool.name}. ${tool.blurb} Opens the widget panel.`)
      continue
    }
    const count = patchesOf(tool).length
    const index = stepOf(tool, state)
    const on = index > 0
    const label = tool.labels?.[index] ?? (on ? 'On' : 'Off')
    button.toggleAttribute('data-on', on)
    button.setAttribute('aria-pressed', String(on))
    button.querySelector('.tool-state')!.textContent = label
    button.setAttribute(
      'aria-label',
      count > 2 ? `${tool.name}, ${label}. ${tool.blurb}` : `${tool.name}. ${tool.blurb}`,
    )
    $$('.tool-steps i', button).forEach((bar, i) => bar.toggleAttribute('data-on', i < index))
  }
}

function pulse(el: HTMLElement): void {
  el.removeAttribute('data-pulse')
  void el.offsetWidth
  el.setAttribute('data-pulse', '')
}

/** A light that follows the pointer across a card. */
function spotlight(el: HTMLElement): void {
  el.addEventListener('pointermove', (event) => {
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  })
}

// --------------------------------------------------------------- filtering
function wireFilters(): void {
  const group = $('.filters')
  const pill = $('.filter-pill', group)
  const buttons = $$<HTMLButtonElement>('.filter', group)

  const movePill = (target: HTMLElement) => {
    pill.style.setProperty('--x', `${target.offsetLeft}px`)
    pill.style.setProperty('--w', `${target.offsetWidth}px`)
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)))
      movePill(button)
      const filter = button.dataset.filter
      for (const li of $$('[data-tool-grid] > li')) {
        const show = filter === 'all' || li.dataset.category === filter
        li.toggleAttribute('data-dim', !show)
      }
    })
  }
  const sync = () => movePill(buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons[0]!)
  // Text size changes from the widget move the buttons, so follow them.
  new ResizeObserver(sync).observe(group)
  sync()
}

// ---------------------------------------------------------------- profiles
const HERO_PROFILES = ['dyslexia', 'vision', 'focus', 'colorBlind']
let selectedProfile = 'dyslexia'

function profileTurnsOn(id: string): string[] {
  const profile = PROFILES.find((p) => p.id === id)
  if (!profile) return []
  return Object.entries(profile.patch)
    .map(([key, value]) => describe(key as keyof State, value))
    .filter((label): label is string => !!label)
}

function renderProfiles(): void {
  const hero = $('[data-hero-profiles]')
  for (const id of HERO_PROFILES) {
    const profile = PROFILES.find((p) => p.id === id)
    if (!profile) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mini-profile'
    button.dataset.profile = id
    button.innerHTML = `<span class="ico">${ICONS[profile.icon] ?? ''}</span><span></span>`
    button.lastElementChild!.textContent = en[profile.labelKey]
    button.addEventListener('click', () => toggleProfile(id))
    hero.append(button)
  }

  const list = $('[data-profile-list]')
  for (const profile of PROFILES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'profile-item'
    button.dataset.profile = profile.id
    button.innerHTML = `<span class="ico">${ICONS[profile.icon] ?? ''}</span><span><strong></strong><span class="hint"></span></span>`
    button.querySelector('strong')!.textContent = en[profile.labelKey]
    button.querySelector('.hint')!.textContent = en[profile.hintKey]
    button.addEventListener('click', () => {
      selectedProfile = profile.id
      toggleProfile(profile.id)
    })
    // Hover and focus preview the details without applying anything.
    const preview = () => {
      if (selectedProfile === profile.id) return
      selectedProfile = profile.id
      syncProfiles(settings.state)
    }
    button.addEventListener('mouseenter', preview)
    button.addEventListener('focus', preview)
    list.append(button)
  }
}

function toggleProfile(id: string): void {
  // Choosing the active profile again turns it off, as the panel does.
  settings.setProfile(settings.state.profile === id ? null : id)
}

let renderedDetail = ''

function syncProfiles(state: State): void {
  for (const button of $$<HTMLButtonElement>('[data-profile]')) {
    const active = state.profile === button.dataset.profile
    button.setAttribute('aria-pressed', String(active))
    button.toggleAttribute('data-selected', button.dataset.profile === selectedProfile)
    button.querySelector('.badge')?.remove()
    if (active && button.classList.contains('profile-item')) {
      button.insertAdjacentHTML('beforeend', '<span class="badge" aria-hidden="true">On</span>')
    }
  }

  const profile = PROFILES.find((p) => p.id === selectedProfile)
  if (!profile) return
  const active = state.profile === profile.id
  const key = `${profile.id}:${active}`
  if (key === renderedDetail) return
  renderedDetail = key

  const detail = $('[data-profile-detail]')
  const items = profileTurnsOn(profile.id)
  // Applying from the detail replaces its button; keep keyboard focus on it.
  const hadFocus = detail.contains(document.activeElement)
  detail.innerHTML = `
    <div class="detail-in">
      <h3></h3>
      <p></p>
      <ul class="turns-on">${items
        .map((_, i) => `<li style="--i:${i}"><span class="tick">${ICONS.check}</span></li>`)
        .join('')}</ul>
      <button type="button" class="btn ${active ? 'btn-ghost' : 'btn-primary'}"></button>
    </div>`
  detail.querySelector('h3')!.textContent = en[profile.labelKey]
  detail.querySelector('p')!.textContent = en[profile.hintKey]
  $$('.turns-on li', detail).forEach((li, i) => li.append(items[i] ?? ''))
  const apply = detail.querySelector('button')!
  apply.textContent = active ? 'Turn off and restore the page' : `Apply ${en[profile.labelKey]} to this page`
  apply.addEventListener('click', () => toggleProfile(profile.id))
  if (hadFocus) apply.focus()
}

// -------------------------------------------------------------- hero stage
function syncStage(state: State): void {
  const list = $('[data-active-list]')
  const active = activeAdjustments(state)
  const current = $$('li', list).map((li) => li.textContent)
  if (current.join('|') === (active.length ? active : ['Nothing yet. The page is as designed.']).join('|')) return

  list.replaceChildren()
  if (!active.length) {
    const li = document.createElement('li')
    li.className = 'empty'
    li.textContent = 'Nothing yet. The page is as designed.'
    list.append(li)
  }
  active.forEach((label, i) => {
    const li = document.createElement('li')
    li.style.setProperty('--i', String(i))
    li.textContent = label
    list.append(li)
  })
  $('[data-reset]').hidden = active.length === 0
}

function wireTilt(): void {
  const card = $('[data-tilt]')
  const stage = card.parentElement!
  stage.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    card.style.setProperty('--mx', `${x * 100}%`)
    card.style.setProperty('--my', `${y * 100}%`)
    if (motionReduced() || event.pointerType !== 'mouse') return
    card.style.setProperty('--ry', `${(x - 0.5) * 6}deg`)
    card.style.setProperty('--rx', `${(0.5 - y) * 6}deg`)
  })
  stage.addEventListener('pointerleave', () => {
    card.style.setProperty('--rx', '0deg')
    card.style.setProperty('--ry', '0deg')
  })
}

// ------------------------------------------------------------- live <html>
function wireLiveHtml(): void {
  const out = $('[data-live-html]')
  let previous = new Map<string, string>()

  const render = () => {
    const root = document.documentElement
    const attrs = Array.from(root.attributes).filter(
      (a) => a.name === 'lang' || a.name.startsWith('data-mla-'),
    )
    const next = new Map(attrs.map((a) => [a.name, a.value]))
    const lines = attrs.map((a) => {
      const changed = previous.size > 0 && previous.get(a.name) !== a.value
      const value = a.value === '' ? '' : `=<span class="tok-str">"${a.value}"</span>`
      const body = `  <span class="tok-attr">${a.name}</span>${value}`
      return changed ? `<span class="changed">${body}</span>` : body
    })
    out.innerHTML =
      `<span class="tok-tag">&lt;html</span>\n${lines.join('\n')}${
        attrs.length <= 1 ? '\n  <span class="tok-com">&lt;!-- switch a tool on and watch --&gt;</span>' : ''
      }\n<span class="tok-tag">&gt;</span>`
    previous = next
  }
  new MutationObserver(render).observe(document.documentElement, { attributes: true })
  render()
}

// ------------------------------------------------------------------- stats
function countUp(): void {
  const items = $$('[data-count]')
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count)
    if (motionReduced() || target === 0) {
      el.textContent = String(target)
      return
    }
    const start = performance.now()
    const duration = 1100
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      el.textContent = String(Math.round(target * eased))
      if (t < 1) requestAnimationFrame(tick)
    }
    el.textContent = '0'
    requestAnimationFrame(tick)
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      run(entry.target as HTMLElement)
      observer.unobserve(entry.target)
    }
  })
  items.forEach((el) => observer.observe(el))
}

// -------------------------------------------------------------------- tabs
function wireTabs(): void {
  const tabs = $$<HTMLButtonElement>('[role="tab"]')
  const select = (tab: HTMLButtonElement, focus = false) => {
    for (const t of tabs) {
      const selected = t === tab
      t.setAttribute('aria-selected', String(selected))
      t.tabIndex = selected ? 0 : -1
      document.getElementById(t.getAttribute('aria-controls') ?? '')!.hidden = !selected
    }
    if (focus) tab.focus()
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab))
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (event.key === 'Home') select(tabs[0]!, true)
      else if (event.key === 'End') select(tabs[tabs.length - 1]!, true)
      else if (step) select(tabs[(i + step + tabs.length) % tabs.length]!, true)
      else return
      event.preventDefault()
    })
  })
}

// --------------------------------------------------------------------- go
function init(): void {
  paintIcons()
  // The space before it is in the markup: in this flex row a leading space would double the gap.
  $('[data-version]').textContent = `· v${version}`
  for (const pre of $$('[data-code]')) pre.innerHTML = highlight(pre.textContent ?? '')
  for (const button of $$('.copy')) if (!button.firstElementChild) button.innerHTML = COPY_CONTENT
  for (const bar of $$('.code-bar')) bar.insertAdjacentHTML('beforeend', copyButtonHtml())

  renderTools()
  renderProfiles()
  wireFilters()
  wireTilt()
  wireLiveHtml()
  wireTabs()
  wireCopyButtons()
  stickyNav()
  countUp()

  for (const button of $$('[data-open-widget]')) {
    button.addEventListener('click', () => widget.open(button))
  }
  $('[data-reset]').addEventListener('click', () => settings.reset())

  const sync = (state: State) => {
    syncTools(state)
    syncProfiles(state)
    syncStage(state)
  }
  settings.subscribe(sync)
  sync(settings.state)

  revealOnScroll()
}

init()
