import { AccessLayerElement } from '../src/element'
import { validateConfig, widgetAttributes } from './config'
customElements.define('access-layer', AccessLayerElement)
let element: AccessLayerElement | undefined
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent) return
  if (event.data?.type !== 'access-layer-preview') return
  try {
    const config = validateConfig(event.data.config)
    element?.remove()
    document.querySelector<HTMLButtonElement>('#sample-trigger')!.hidden = !config.triggerId
    element = document.createElement('access-layer') as AccessLayerElement
    // Remote resources and external triggers are tested on the actual website.
    for (const [name, value] of widgetAttributes({ ...config, trigger: '', triggerId: config.triggerId ? 'sample-trigger' : '', statementUrl: '', fontsUrl: '', dictionaryUrl: '' })) element.setAttribute(name, value)
    // Nothing is saved, and the chosen device decides the position whatever the frame's width.
    element.setAttribute('preview', event.data.device === 'mobile' ? 'mobile' : 'desktop')
    // The desktop frame is narrower than a real desktop, so draw the site smaller to keep the widget in proportion.
    document.documentElement.style.zoom = event.data.device === 'mobile' ? '' : '0.7'
    document.body.append(element)
    parent.postMessage({ type: 'access-layer-preview-ready' }, location.origin)
  } catch { parent.postMessage({ type: 'access-layer-preview-invalid' }, location.origin) }
})
parent.postMessage({ type: 'access-layer-preview-loaded' }, location.origin)
