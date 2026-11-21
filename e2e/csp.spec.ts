/**
 * Storefronts often ship `Content-Security-Policy: style-src 'self'`, which
 * blocks `<style>` elements. The widget must still be styled there (#5).
 */
import { expect, test } from '@playwright/test'

test('works under a strict style-src policy, with no violations', async ({ page }) => {
  await page.route('**/demo/fixture.html', async (route) => {
    const response = await route.fetch()
    // Drop the demo page's own inline styles, so any violation is the widget's.
    const body = (await response.text()).replace(/<style>[\s\S]*?<\/style>/g, '').replace(/ style="[^"]*"/g, '')
    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), 'content-security-policy': "style-src 'self'" },
    })
  })
  await page.addInitScript(() => {
    ;(window as unknown as { violations: string[] }).violations = []
    document.addEventListener('securitypolicyviolation', (event) => {
      ;(window as unknown as { violations: string[] }).violations.push(event.violatedDirective)
    })
  })
  await page.goto('/demo/fixture.html')

  const trigger = page.locator('access-layer .mla-trigger')
  await expect(trigger).toBeVisible()
  expect(await trigger.evaluate((el) => getComputedStyle(el).position)).toBe('fixed')

  await trigger.click()
  await page.locator('access-layer').getByRole('button', { name: 'Highlight links' }).click()
  const link = page.locator('main a[href]').first()
  await expect.poll(() => link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')

  expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([])
})
