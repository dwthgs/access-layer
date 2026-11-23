/**
 * The console: a setting changes the live preview, the page's own link and the
 * code, and that link reopens the same settings. No account and no request.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('a setting reaches the preview, the link and the code', async ({ page }) => {
  await page.goto('/console/')
  const trigger = page.frameLocator('#widget-preview').locator('access-layer .mla-trigger')
  await expect(trigger).toHaveAttribute('data-pos', 'bottom-left')

  await page.locator('input[name=position][value=top-right]').check({ force: true })
  await page.locator('input[name=mobilePosition][value=bottom-right]').check({ force: true })
  await expect(trigger).toHaveAttribute('data-pos', 'top-right')
  await page.getByRole('button', { name: 'Mobile preview' }).click()
  await expect(trigger).toHaveAttribute('data-pos', 'bottom-right')
  await expect(page).toHaveURL(/#position=top-right&mobilePosition=bottom-right$/)

  await page.getByRole('button', { name: 'Install', exact: true }).click()
  const code = page.locator('#install-code')
  await expect(code).toContainText('data-position="top-right"')
  await expect(code).toContainText('data-mobile-position="bottom-right"')
  await expect(code).toContainText(`Change these settings: ${page.url()} -->`)

  // The link in the code is all it takes to come back.
  await page.reload()
  await expect(page.locator('input[name=position][value=top-right]')).toBeChecked()
})

test('the console has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/console/')
  for (const section of ['Appearance', 'Features', 'Install']) {
    await page.getByRole('button', { name: section, exact: true }).click()
    const results = await new AxeBuilder({ page }).exclude('#widget-preview').analyze()
    expect(results.violations.map(v => `${section}: ${v.id}`)).toEqual([])
  }
})
