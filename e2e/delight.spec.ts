import { expect, test, type Page } from '@playwright/test'
import { card, cards, column, drag } from './helpers'

const confetti = (page: Page) => page.getByTestId('confetti')

/**
 * Asserts that no burst fires for a move: waits for the move's announcement, which comes from
 * the same render pass that would start a celebration, lets queued timers run, then checks once.
 * A retrying assertion would wait out a wrongly fired burst, since bursts remove themselves.
 */
async function expectNoCelebration(page: Page, announcement: string) {
  await expect(page.getByTestId('announcer')).toContainText(announcement)
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
  expect(await confetti(page).count()).toBe(0)
}

async function moveWithMenu(page: Page, title: string, action: string) {
  await page.getByRole('button', { name: `Actions for ${title}` }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(card(page, 'Recalibrate the portal gun')).toBeVisible()
})

test('celebrates a card moved into Done from its menu', async ({ page }) => {
  await moveWithMenu(page, 'Hide the spaceship from Mom', 'Move to Done')

  await expect(confetti(page)).toBeAttached()
  await expect(card(page, 'Hide the spaceship').locator('[data-done-badge]')).toBeVisible()
  // The burst cleans up after itself.
  await expect(confetti(page)).toHaveCount(0, { timeout: 4000 })
})

test('celebrates a card dragged into Done', async ({ page }) => {
  await drag(page, card(page, 'Recalibrate the portal gun'), column(page, 'Done'), 'bottom')

  await expect(cards(column(page, 'Done'))).toHaveText([/pickle/, /Recalibrate/])
  await expect(confetti(page)).toBeAttached()
})

test('does not celebrate reordering inside Done', async ({ page }) => {
  await moveWithMenu(page, 'Hide the spaceship from Mom', 'Move to Done')
  await expect(confetti(page)).toBeAttached()
  await expect(confetti(page)).toHaveCount(0, { timeout: 4000 })

  await moveWithMenu(page, 'Hide the spaceship from Mom', 'Move down')

  await expect(cards(column(page, 'Done'))).toHaveText([/pickle/, /Hide the spaceship/])
  await expectNoCelebration(page, 'moved to Done, position 2')
})

test('shows only the check mark under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await moveWithMenu(page, 'Hide the spaceship from Mom', 'Move to Done')

  await expect(card(page, 'Hide the spaceship').locator('[data-done-badge]')).toBeVisible()
  await expectNoCelebration(page, 'moved to Done, position 1')
})

test('shows a lettered fallback when avatars fail to load', async ({ page }) => {
  await page.route('https://rickandmortyapi.com/**', (route) => route.abort())
  await page.reload()

  await expect(card(page, 'Recalibrate the portal gun').locator('[data-avatar-fallback]')).toHaveText('R')
  await expect(page.locator('img[src*="rickandmortyapi.com"]')).toHaveCount(0)
})

test('offers a way to add an item in an empty column', async ({ page }) => {
  await moveWithMenu(page, 'Turn myself into a pickle', 'Move to Doing')

  await expect(column(page, 'Done')).toContainText('Nothing finished yet.')
  await column(page, 'Done').getByRole('link', { name: 'Add an item to Done' }).click()
  await expect(page.getByRole('dialog').getByRole('radio', { name: 'Done' })).toBeChecked()
})
