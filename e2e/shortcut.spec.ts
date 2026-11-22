/** Alt + A opens the panel, except in the page's own editors, where it can type a character (#7). */
import { expect, test } from '@playwright/test'

test('Alt+A opens the panel, but not while typing in an editor', async ({ page }) => {
  await page.goto('/demo/fixture.html')
  const panel = page.locator('access-layer .mla-panel')
  await page.evaluate(() =>
    document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<div id="editor" contenteditable="true">My post</div>'),
  )
  await page.locator('#editor').click()
  await page.keyboard.press('Alt+a')
  await expect(panel).not.toHaveAttribute('data-open', '')

  await page.locator('main h1, main h2').first().click()
  await page.keyboard.press('Alt+a')
  await expect(panel).toHaveAttribute('data-open', '')
})
