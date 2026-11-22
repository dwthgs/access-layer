/**
 * The panel: profiles, the tile grid, and the footer.
 *
 * Tiles are declared as data rather than hand-written markup so that a tile
 * with two states and a tile with five behave identically — one click moves
 * to the next value and wraps. Each tile is a single button with
 * `aria-pressed` and a visible value, which is far easier to operate with a
 * screen reader or a switch device than a nest of radio groups.
 */

import { Controller } from './controller'
import * as lineHeight from './features/lineHeight'
import * as pageStructure from './features/pageStructure'
import * as screenReader from './features/screenReader'
import { icon } from './icons'
import type { MessageKey } from './i18n'
import { buildLanguagePicker } from './languagePicker'
import { PROFILES } from './profiles'
import * as translate from './features/translate'
import { isPristine, type Position, type State } from './state'
import { h } from './util/dom'

interface TileOption {
  value: unknown
  labelKey?: MessageKey
  /**
   * What the tile itself reads while this option is on, when the short
   * option name alone would be unclear there: "Low saturation", not "Low".
   */
  nameKey?: MessageKey
}

interface Tile {
  id: keyof State | 'pageStructure'
  labelKey: MessageKey
  iconName: string
  /** Options cycled by clicking. The first entry is always the off state. */
  options?: TileOption[]
  /** Levelled tiles keep their name and show how many levels are on. */
  levels?: number
  /** Shown after the name for each level above off: "Line height 1.5×". */
  levelNames?: string[]
  action?: () => void
  available?: () => boolean
}

const OFF: TileOption = { value: null, labelKey: 'optionOff' }

export interface PanelHandles {
  root: HTMLElement
  panel: HTMLElement
  trigger: HTMLButtonElement
  layer: HTMLElement
  update(): void
  /**
   * Close the profiles popup. Given an event, only when it happened outside
   * the popup and its button. Says whether anything closed.
   */
  dismiss(event?: Event): boolean
}

export function buildPanel(
  controller: Controller,
  hooks: { onToggle(): void; onClose(): void },
): PanelHandles {
  const t = controller.t

  const layer = h('div', { class: 'mla-layer' })
  const live = h('div', { class: 'mla-sr-only', role: 'status', 'aria-live': 'polite' })

  // ------------------------------------------------------------------ tiles
  const tiles: Tile[] = [
    // First: the panel draws it as a wide bar above the other tools.
    { id: 'textScale', labelKey: 'biggerText', iconName: 'text', levels: 4 },
    {
      id: 'screenReader',
      labelKey: 'screenReader',
      iconName: 'audio',
      options: [{ value: false }, { value: true }],
      available: () => screenReader.supported(),
    },
    {
      id: 'contrast',
      labelKey: 'contrast',
      iconName: 'contrast',
      options: [
        OFF,
        { value: 'invert', labelKey: 'optionInvert', nameKey: 'nameInvert' },
        { value: 'dark', labelKey: 'optionDark', nameKey: 'nameDarkContrast' },
        { value: 'light', labelKey: 'optionLight', nameKey: 'nameLightContrast' },
      ],
    },
    { id: 'smartContrast', labelKey: 'smartContrast', iconName: 'smartContrast', options: [{ value: false }, { value: true }] },
    { id: 'highlightLinks', labelKey: 'highlightLinks', iconName: 'link', options: [{ value: false }, { value: true }] },
    { id: 'letterSpacing', labelKey: 'textSpacing', iconName: 'spacing', levels: 3 },
    { id: 'pauseAnimations', labelKey: 'pauseAnimations', iconName: 'motion', options: [{ value: false }, { value: true }] },
    { id: 'hideImages', labelKey: 'hideImages', iconName: 'image', options: [{ value: false }, { value: true }] },
    {
      id: 'font',
      labelKey: 'dyslexiaFont',
      iconName: 'dyslexia',
      options: [
        OFF,
        { value: 'dyslexic', labelKey: 'dyslexiaFont' },
        { value: 'legible', labelKey: 'legibleFont' },
      ],
    },
    {
      id: 'cursor',
      labelKey: 'cursor',
      iconName: 'cursor',
      options: [
        OFF,
        { value: 'big', labelKey: 'optionBigCursor' },
        { value: 'mask', labelKey: 'optionReadingMask' },
        { value: 'guide', labelKey: 'optionReadingGuide' },
      ],
    },
    { id: 'tooltips', labelKey: 'tooltips', iconName: 'tooltip', options: [{ value: false }, { value: true }] },
    {
      id: 'pageStructure',
      labelKey: 'pageStructure',
      iconName: 'structure',
      action: () => {
        hooks.onClose()
        pageStructure.open(
          { shadow: layer.getRootNode() as ShadowRoot, layer, t, getState: () => controller.state, setState: (p) => controller.set(p) },
        )
      },
    },
    {
      id: 'lineHeight',
      labelKey: 'lineHeight',
      iconName: 'lineHeight',
      levels: 3,
      levelNames: lineHeight.FACTORS.slice(1).map((factor) => `${factor}\u00d7`),
    },
    {
      id: 'textAlign',
      labelKey: 'textAlign',
      iconName: 'align',
      options: [
        { value: null, labelKey: 'optionDefault' },
        { value: 'left', labelKey: 'optionLeft', nameKey: 'nameAlignLeft' },
        { value: 'center', labelKey: 'optionCenter', nameKey: 'nameAlignCenter' },
        { value: 'right', labelKey: 'optionRight', nameKey: 'nameAlignRight' },
        { value: 'justify', labelKey: 'optionJustify', nameKey: 'nameJustify' },
      ],
    },
    { id: 'dictionary', labelKey: 'dictionary', iconName: 'book', options: [{ value: false }, { value: true }] },
    {
      id: 'saturation',
      labelKey: 'saturation',
      iconName: 'saturation',
      options: [
        OFF,
        { value: 'low', labelKey: 'optionLow', nameKey: 'nameLowSaturation' },
        { value: 'high', labelKey: 'optionHigh', nameKey: 'nameHighSaturation' },
        { value: 'mono', labelKey: 'optionMono' },
      ],
    },
  ]

  const grid = h('div', { class: 'mla-grid' })
  const tileNodes = new Map<Tile, { button: HTMLButtonElement; label: HTMLElement; steps: HTMLElement[] }>()

  for (const tile of tiles) {
    if (!controller.isToolEnabled(tile.id)) continue
    const label = h('span', { class: 'mla-tile-label', text: t(tile.labelKey) })
    // One bar per step above off, for any tile that
    // has more than on and off. Decorative: the state is in the aria-label.
    const steps = Array.from({ length: stepCount(tile) }, () => h('span', { class: 'mla-step' }))
    const button = h('button', {
      class: 'mla-tile',
      type: 'button',
      'data-tile': tile.id,
      onclick: () => activate(tile),
    }, [
      h('span', { class: 'mla-tile-check', 'aria-hidden': 'true', html: icon('check') }),
      h('span', { class: 'mla-tile-icon', html: icon(tile.iconName) }),
      label,
      ...(steps.length ? [h('span', { class: 'mla-steps', 'aria-hidden': 'true' }, steps)] : []),
    ]) as HTMLButtonElement

    if (tile.available && !tile.available()) {
      button.disabled = true
      button.title = t('notSupported')
    }
    grid.append(button)
    tileNodes.set(tile, { button, label, steps })
  }

  function activate(tile: Tile): void {
    if (tile.action) {
      tile.action()
      return
    }
    const key = tile.id as keyof State
    if (tile.levels) {
      const current = Number(controller.state[key] ?? 0)
      const next = current >= tile.levels ? 0 : current + 1
      controller.set({ [key]: next } as unknown as Partial<State>)
      announce(`${t(tile.labelKey)}: ${next === 0 ? t('optionOff') : t('level', { n: next })}`)
      return
    }
    const options = tile.options ?? []
    const index = options.findIndex((option) => option.value === controller.state[key])
    const next = options[(index + 1) % options.length]
    if (!next) return
    controller.set({ [key]: next.value } as unknown as Partial<State>)
    const off = next.value === options[0]?.value
    const state = off ? t('optionOff') : options.length === 2 ? t('optionOn') : tileName(next)
    announce(`${t(tile.labelKey)}: ${state}`)
  }

  /** What a tile reads while `option` is on. */
  function tileName(option: TileOption): string {
    return option.nameKey ? t(option.nameKey) : optionLabel(option)
  }

  function optionLabel(option: TileOption): string {
    if (option.labelKey) return t(option.labelKey)
    return option.value ? t('optionNormal') : t('optionOff')
  }

  function announce(message: string): void {
    live.textContent = ''
    setTimeout(() => {
      live.textContent = message
    }, 40)
  }

  // --------------------------------------------------------------- profiles
  // A heading with an info button, then the profiles as a grid that is
  // always in view. What a profile turns on is in the info panel for everyone
  // and in each card's description for screen readers, instead of in small
  // print on every card.
  const profileList = h('div', { class: 'mla-profile-list' })
  // Descriptions live outside the buttons: inside, they would become part of
  // each button's accessible name ("Blind Reads the page aloud…").
  // aria-describedby still reads them while they are hidden.
  const profileHints = h('div', { hidden: true })
  const profileButtons = new Map<string, HTMLButtonElement>()
  for (const profile of PROFILES) {
    const hintId = `mla-profile-hint-${profile.id}`
    const button = h('button', {
      class: 'mla-profile',
      type: 'button',
      'data-profile': profile.id,
      'aria-describedby': hintId,
      onclick: () => {
        const next = controller.state.profile === profile.id ? null : profile.id
        controller.setProfile(next)
        announce(`${t(profile.labelKey)}: ${next ? t('optionOn') : t('optionOff')}`)
      },
    }, [
      h('span', { class: 'mla-profile-icon', html: icon(profile.icon) }),
      h('span', { class: 'mla-profile-name', text: t(profile.labelKey) }),
      h('span', { class: 'mla-profile-check', 'aria-hidden': 'true', html: icon('check') }),
    ]) as HTMLButtonElement
    profileHints.append(h('span', { id: hintId, text: t(profile.hintKey) }))
    profileButtons.set(profile.id, button)
    profileList.append(button)
  }
  profileList.append(profileHints)

  const profilesInfo = h('div', { class: 'mla-collapse mla-profile-info', id: 'mla-profiles-info' }, [
    h('p', { class: 'mla-hint', text: t('profilesHint') }),
    h(
      'dl',
      { class: 'mla-profile-info-list' },
      PROFILES.flatMap((profile) => [
        h('dt', { text: t(profile.labelKey) }),
        h('dd', { text: t(profile.hintKey) }),
      ]),
    ),
  ])

  const infoButton = h('button', {
    class: 'mla-profiles-info-btn',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'mla-profiles-info',
    'aria-label': t('profilesInfo'),
    html: icon('info'),
    onclick: () => setInfoOpen(!profilesInfo.hasAttribute('data-open')),
  }) as HTMLButtonElement

  // The popup sits in the heading row and floats over the cards, so opening
  // it moves nothing in the panel.
  const profilesSection = h('section', { class: 'mla-profiles', 'aria-label': t('profiles') }, [
    h('div', { class: 'mla-profiles-head' }, [
      h('h3', { class: 'mla-profiles-title', text: t('profiles') }),
      infoButton,
      profilesInfo,
    ]),
    profileList,
  ])

  function setInfoOpen(open: boolean): void {
    infoButton.setAttribute('aria-expanded', open ? 'true' : 'false')
    profilesInfo.toggleAttribute('data-open', open)
  }

  function dismiss(event?: Event): boolean {
    if (!profilesInfo.hasAttribute('data-open')) return false
    const path = event?.composedPath() ?? []
    if (path.includes(profilesInfo) || path.includes(infoButton)) return false
    setInfoOpen(false)
    return true
  }

  // ------------------------------------------------------- reader speed row
  const speedRow = h('div', { class: 'mla-collapse' }, [
    h('p', { class: 'mla-hint', text: t('readerSpeed') }),
    h('div', { class: 'mla-positions' }, [
      speedButton(0.75, 'optionSlow'),
      speedButton(1, 'optionNormal'),
      speedButton(1.5, 'optionFast'),
    ]),
  ])
  const speedButtons: HTMLButtonElement[] = Array.from(
    speedRow.querySelectorAll<HTMLButtonElement>('button'),
  )

  function speedButton(rate: number, labelKey: MessageKey): HTMLButtonElement {
    return h('button', {
      type: 'button',
      'data-rate': String(rate),
      text: t(labelKey),
      onclick: () => controller.set({ readerRate: rate }),
    }) as HTMLButtonElement
  }

  // ------------------------------------------------------------- oversized
  const oversizedRow = h('button', {
    class: 'mla-row',
    type: 'button',
    onclick: () => controller.set({ oversized: !controller.state.oversized }),
  }, [
    h('span', { html: icon('focus') }),
    h('span', { class: 'mla-row-label', text: t('oversized') }),
    h('span', { class: 'mla-switch', 'aria-hidden': 'true' }),
  ]) as HTMLButtonElement

  // -------------------------------------------------------------- language
  profilesSection.hidden = !controller.profilesEnabled
  const languagePicker = buildLanguagePicker(controller)

  const translateStatus = h('p', {
    class: 'mla-translate-status',
    id: 'mla-translate-status',
    role: 'status',
  })
  const reloadButton = h('button', {
    class: 'mla-translate-action',
    type: 'button',
    text: t('translateReloadButton'),
    onclick: () => location.reload(),
  }) as HTMLButtonElement
  // The panel is rebuilt on every language change, so a listener outlives
  // its panel; it lets go the first time it finds its line detached.
  let statusShown = false
  const showTranslateStatus = (status: translate.Status) => {
    if (statusShown && !translateStatus.isConnected) {
      stopTranslateStatus()
      return
    }
    statusShown ||= translateStatus.isConnected
    let text = ''
    if (status.state === 'working') {
      text = status.progress !== undefined && status.progress < 1
        ? t('translateProgress', { percent: Math.round(status.progress * 100) })
        : t('translateWorking')
    } else if (status.state === 'done') {
      text = t(status.engine === 'device' ? 'translateDoneDevice' : 'translateDoneGoogle')
    } else if (status.state === 'failed') {
      text = t('translateFailed')
    } else if (status.state === 'unavailable') {
      text = t('translateUnavailable')
    } else if (status.state === 'reload') {
      text = t('translateReload')
    }
    translateStatus.textContent = text
    translateStatus.hidden = !text
    reloadButton.hidden = status.state !== 'reload'
    translateStatus.dataset.state = status.state
  }
  const stopTranslateStatus = translate.onStatus(showTranslateStatus)
  showTranslateStatus(translate.getStatus())

  // ---------------------------------------------------------------- footer
  const positionGrid = h('div', { class: 'mla-collapse' }, [
    h('div', { class: 'mla-positions' }, [
      positionButton('bottom-left', 'positionBottomLeft'),
      positionButton('bottom-right', 'positionBottomRight'),
      positionButton('middle-left', 'positionMiddleLeft'),
      positionButton('middle-right', 'positionMiddleRight'),
      positionButton('top-left', 'positionTopLeft'),
      positionButton('top-right', 'positionTopRight'),
    ]),
  ])
  const positionButtons: HTMLButtonElement[] = Array.from(
    positionGrid.querySelectorAll<HTMLButtonElement>('button'),
  )

  function positionButton(value: Position, labelKey: MessageKey): HTMLButtonElement {
    return h('button', {
      type: 'button',
      'data-position': value,
      text: t(labelKey),
      onclick: () => controller.set({ position: value }),
    }) as HTMLButtonElement
  }

  const resetButton = h('button', {
    class: 'mla-reset',
    type: 'button',
    onclick: () => {
      controller.reset()
      announce(t('reset'))
    },
  }, [h('span', { html: icon('reset') }), h('span', { text: t('reset') })]) as HTMLButtonElement

  const moveButton = h('button', {
    type: 'button',
    text: t('moveWidget'),
    onclick: () => {
      const open = positionGrid.hasAttribute('data-open')
      if (open) positionGrid.removeAttribute('data-open')
      else positionGrid.setAttribute('data-open', '')
    },
  })

  const statementLink = h('a', {
    href: '#',
    text: t('statement'),
    'data-mla-statement': '',
    hidden: true,
  }) as HTMLAnchorElement

  const footer = h('div', { class: 'mla-foot' }, [
    h('div', { class: 'mla-foot-links' }, [
      resetButton,
      moveButton,
      statementLink,
      h('span', { class: 'mla-shortcut', text: t('shortcut') }),
    ]),
    positionGrid,
  ])

  // ----------------------------------------------------------------- panel
  const closeButton = h('button', {
    class: 'mla-icon-btn',
    type: 'button',
    'aria-label': t('closeMenu'),
    html: icon('close'),
    onclick: hooks.onClose,
  }) as HTMLButtonElement

  const panel = h('div', {
    class: 'mla-panel',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-label': t('title'),
    tabindex: '-1',
  }, [
    h('div', { class: 'mla-head' }, [
      // h2: an h1 here would give every page a second top-level heading.
      h('h2', { class: 'mla-title', text: t('title') }),
      closeButton,
    ]),
    h('div', { class: 'mla-body' }, [
      languagePicker.root,
      translateStatus,
      reloadButton,
      profilesSection,
      grid,
      speedRow,
      oversizedRow,
    ]),
    footer,
  ])

  const trigger = h('button', {
    class: 'mla-trigger',
    type: 'button',
    'aria-label': t('openMenu'),
    'aria-expanded': 'false',
    html: icon('accessibility'),
    onclick: hooks.onToggle,
  }) as HTMLButtonElement

  const root = h('div', { class: 'mla-root' }, [trigger, panel, layer, live])

  // ---------------------------------------------------------------- update
  function update(): void {
    const s = controller.state

    for (const [tile, nodes] of tileNodes) {
      if (tile.action) continue
      const key = tile.id as keyof State
      const current = s[key]

      if (tile.levels) {
        const level = Number(current ?? 0)
        nodes.button.setAttribute('aria-pressed', level > 0 ? 'true' : 'false')
        fillSteps(nodes.steps, level)
        const suffix = level > 0 ? tile.levelNames?.[level - 1] : undefined
        const shown = suffix ? `${t(tile.labelKey)} ${suffix}` : t(tile.labelKey)
        if (nodes.label.textContent !== shown) nodes.label.textContent = shown
        nodes.button.setAttribute(
          'aria-label',
          `${t(tile.labelKey)}, ${
            level === 0
              ? t('optionOff')
              : `${suffix ? `${suffix}, ` : ''}${t('levelOf', { n: level, total: tile.levels })}`
          }`,
        )
        continue
      }

      const options = tile.options ?? []
      const index = options.findIndex((entry) => entry.value === current)
      const option = options[index]
      const isOn = current !== null && current !== false
      nodes.button.setAttribute('aria-pressed', isOn ? 'true' : 'false')
      fillSteps(nodes.steps, isOn ? index : 0)
      // An on/off tile is a plain toggle: it keeps its name, the check shows
      // it is on, and aria-pressed tells assistive technology the same.
      if (nodes.steps.length === 0) {
        nodes.button.setAttribute('aria-label', t(tile.labelKey))
        continue
      }
      // A multi-step tile reads the option's full name while on. Visible label
      // and accessible name agree, and the name starts with the tile's own, so
      // a voice-control user can still say "click Saturation".
      const shown = isOn && option ? tileName(option) : t(tile.labelKey)
      if (nodes.label.textContent !== shown) nodes.label.textContent = shown
      const stateText = isOn && option ? tileName(option) : t('optionOff')
      const position = isOn ? `, ${t('stepOf', { n: index, total: nodes.steps.length })}` : ''
      nodes.button.setAttribute('aria-label', `${t(tile.labelKey)}, ${stateText}${position}`)
    }

    for (const [id, button] of profileButtons) {
      button.setAttribute('aria-pressed', s.profile === id ? 'true' : 'false')
    }

    oversizedRow.setAttribute('aria-pressed', s.oversized ? 'true' : 'false')
    languagePicker.update()

    for (const button of speedButtons) {
      button.setAttribute('aria-pressed', Number(button.dataset.rate) === s.readerRate ? 'true' : 'false')
    }
    if (s.screenReader) speedRow.setAttribute('data-open', '')
    else speedRow.removeAttribute('data-open')

    for (const button of positionButtons) {
      button.setAttribute('aria-pressed', button.dataset.position === controller.position ? 'true' : 'false')
    }

    trigger.dataset.pos = controller.position
    panel.dataset.side = controller.position.endsWith('right') ? 'right' : 'left'
    resetButton.disabled = isPristine(s)
    resetButton.style.opacity = isPristine(s) ? '.55' : '1'
  }

  return { root, panel, trigger, layer, update, dismiss }
}

/** How many bars a tile draws: its levels, or its options other than off. */
export function stepCount(tile: { levels?: number; options?: unknown[] }): number {
  if (tile.levels) return tile.levels
  const options = tile.options?.length ?? 0
  return options > 2 ? options - 1 : 0
}

function fillSteps(steps: HTMLElement[], filled: number): void {
  steps.forEach((step, index) => step.toggleAttribute('data-on', index < filled))
}
