/**
 * Nuxt 3 client plugin.
 *
 * Copy this file to `plugins/access-layer.client.ts` in the host app and put the
 * built `access-layer.iife.js` somewhere it is served from (this app's `public/`,
 * or a shared CDN path). Loading it here rather than through `app.head.script`
 * keeps it out of the document's `load` event, so a slow script never holds
 * up page load or automated browser tests.
 */

import { defineNuxtPlugin, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public as {
    accessLayerWidgetUrl?: string
    accessLayerWidgetColor?: string
    accessLayerWidgetPosition?: string
    accessLayerStatementUrl?: string
    /** False when the app's layout renders its own skip link. */
    accessLayerSkipLink?: boolean
  }

  const src = config.accessLayerWidgetUrl ?? '/access-layer.iife.js'
  if (document.querySelector(`script[src="${src}"]`)) return

  const script = document.createElement('script')
  script.src = src
  script.defer = true
  script.dataset.accessLayer = ''
  script.dataset.color = config.accessLayerWidgetColor ?? '#1742C9'
  script.dataset.position = config.accessLayerWidgetPosition ?? 'bottom-left'
  if (config.accessLayerStatementUrl) script.dataset.statementUrl = config.accessLayerStatementUrl

  // If the app's layout renders its own skip link, set accessLayerSkipLink: false so
  // the two do not compete for the first tab stop.
  script.dataset.skipLink = config.accessLayerSkipLink === false ? 'false' : 'true'

  document.body.append(script)
})
