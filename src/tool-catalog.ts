/** Stable tool identifiers shared by site configuration and the widget. */
export const tools = [
  { id: 'textScale', name: 'Text size', description: 'Make text larger without zooming the whole page.', icon: 'text', group: 'Reading & content' },
  { id: 'lineHeight', name: 'Line height', description: 'Add breathing room between lines.', icon: 'lineHeight', group: 'Reading & content' },
  { id: 'letterSpacing', name: 'Letter spacing', description: 'Increase the space between characters.', icon: 'spacing', group: 'Reading & content' },
  { id: 'textAlign', name: 'Text alignment', description: 'Choose a comfortable reading alignment.', icon: 'align', group: 'Reading & content' },
  { id: 'font', name: 'Readable fonts', description: 'Switch to legible or dyslexia-friendly type.', icon: 'dyslexia', group: 'Reading & content' },
  { id: 'screenReader', name: 'Text to speech', description: 'Listen to page text with browser speech.', icon: 'audio', group: 'Reading & content' },
  { id: 'dictionary', name: 'Dictionary', description: 'Look up selected words using your endpoint.', icon: 'book', group: 'Reading & content' },
  { id: 'contrast', name: 'Contrast', description: 'Choose light, dark or inverted colors.', icon: 'contrast', group: 'Color & focus' },
  { id: 'smartContrast', name: 'Smart contrast', description: 'Adjust text contrast against its background.', icon: 'smartContrast', group: 'Color & focus' },
  { id: 'saturation', name: 'Saturation', description: 'Reduce, increase or remove color.', icon: 'saturation', group: 'Color & focus' },
  { id: 'highlightLinks', name: 'Highlight links', description: 'Make links easier to find on the page.', icon: 'link', group: 'Color & focus' },
  { id: 'hideImages', name: 'Hide images', description: 'Reduce visual distractions.', icon: 'image', group: 'Color & focus' },
  { id: 'pauseAnimations', name: 'Pause motion', description: 'Pause animations and playing media.', icon: 'motion', group: 'Color & focus' },
  { id: 'cursor', name: 'Cursor & reading guides', description: 'Use a larger cursor, mask or guide.', icon: 'cursor', group: 'Navigation & assistance' },
  { id: 'tooltips', name: 'Tooltips', description: 'Show readable descriptions on hover.', icon: 'tooltip', group: 'Navigation & assistance' },
  { id: 'pageStructure', name: 'Page structure', description: 'Navigate headings, landmarks and links.', icon: 'structure', group: 'Navigation & assistance' },
] as const
export type ToolId = typeof tools[number]['id']
