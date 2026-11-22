/**
 * Frameworks move nodes (keep-alive, teleport, list reorder). The widget must
 * keep working when moved, and set itself up again when re-inserted (#3).
 */
import { expect, test } from '@playwright/test'

test('keeps working after being moved, and after being removed and re-inserted', async ({ page }) => {
  await page.goto('/demo/fixture.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const widget = page.locator('access-layer')
  const panel = widget.locator('.mla-panel')
  await expect(widget.locator('.mla-trigger')).toBeVisible()

  await page.evaluate(() => document.querySelector('main')!.append(document.querySelector('access-layer')!))
  await page.keyboard.press('Alt+a')
  await expect(panel).toHaveAttribute('data-open', '')
  await page.keyboard.press('Escape')

  await page.evaluate(async () => {
    const element = document.querySelector('access-layer')!
    element.remove()
    await new Promise((resolve) => setTimeout(resolve, 50))
    document.body.append(element)
  })
  await expect(widget.locator('.mla-trigger')).toBeVisible()
  expect(await widget.locator('.mla-trigger').evaluate((el) => getComputedStyle(el).position)).toBe('fixed')
  await page.keyboard.press('Alt+a')
  await expect(panel).toHaveAttribute('data-open', '')
})
