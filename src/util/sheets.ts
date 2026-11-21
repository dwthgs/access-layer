/**
 * The widget's CSS goes in as constructed stylesheets, not `<style>`
 * elements: a site with `style-src 'self'` blocks `<style>`, but not sheets
 * adopted from script, so the widget keeps working under a strict CSP (#5).
 */

export function sheet(css: string): CSSStyleSheet {
  const result = new CSSStyleSheet()
  result.replaceSync(css)
  return result
}

export function adopt(root: Document | ShadowRoot, added: CSSStyleSheet): void {
  if (!root.adoptedStyleSheets.includes(added)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, added]
}

export function drop(root: Document | ShadowRoot, removed: CSSStyleSheet): void {
  root.adoptedStyleSheets = root.adoptedStyleSheets.filter((each) => each !== removed)
}
