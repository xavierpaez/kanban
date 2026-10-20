import { expect, test } from '@playwright/test'
import { card, cards, column, drag, pickUp } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(card(page, 'Recalibrate the portal gun')).toBeVisible()
})

test('shows the three columns seeded with characters from the API', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Portal Board' })).toBeVisible()
  await expect(cards(column(page, 'To Do'))).toHaveCount(3)
  await expect(cards(column(page, 'Doing'))).toHaveCount(2)
  await expect(cards(column(page, 'Done'))).toHaveCount(1)
  await expect(card(page, 'Recalibrate the portal gun')).toContainText('Rick Sanchez')
  await expect(card(page, 'Hide the spaceship from Mom')).toContainText('Summer Smith')
})

test('drags a card from To Do into Doing', async ({ page }) => {
  await drag(page, card(page, 'Find a job'), card(page, 'Perform emergency horse surgery'), 'top')

  await expect(cards(column(page, 'Doing'))).toHaveText([/Find a job/, /horse surgery/, /Hide the spaceship/])
  await expect(cards(column(page, 'To Do'))).toHaveCount(2)
})

test('drags a card into an empty part of a column', async ({ page }) => {
  await drag(page, card(page, 'Recalibrate the portal gun'), column(page, 'Done'), 'bottom')

  await expect(cards(column(page, 'Done'))).toHaveText([/pickle/, /Recalibrate the portal gun/])
})

test('reorders cards within a column', async ({ page }) => {
  await drag(page, card(page, 'Find a job'), card(page, 'Recalibrate the portal gun'), 'top')

  await expect(cards(column(page, 'To Do'))).toHaveText([/Find a job/, /Recalibrate the portal gun/, /Goldenfold/])
})

test('moves a card with the keyboard', async ({ page }) => {
  await pickUp(page, 'Recalibrate the portal gun')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Recalibrate the portal gun moved to Doing, position 1 of 3.')).toBeAttached()
  // The card remounts in its new column; focus must follow it.
  await expect(card(page, 'Recalibrate the portal gun')).toBeFocused()
  await page.keyboard.press('Space')

  await expect(cards(column(page, 'Doing'))).toHaveText([/Recalibrate the portal gun/, /horse surgery/, /spaceship/])
  await expect(cards(column(page, 'To Do'))).toHaveCount(2)
  await expect(page.getByText('Recalibrate the portal gun dropped in Doing, position 1 of 3.')).toBeAttached()
  await expect(card(page, 'Recalibrate the portal gun')).toBeFocused()
})

test('reorders a card within a column with the keyboard', async ({ page }) => {
  await pickUp(page, 'Recalibrate the portal gun')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')

  await expect(cards(column(page, 'To Do'))).toHaveText([/Goldenfold/, /Find a job/, /Recalibrate the portal gun/])
  await expect(card(page, 'Recalibrate the portal gun')).toBeFocused()
})

test('cancels a keyboard move with Escape', async ({ page }) => {
  await pickUp(page, 'Recalibrate the portal gun')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')

  await expect(cards(column(page, 'To Do'))).toHaveCount(3)
  await expect(cards(column(page, 'To Do')).first()).toContainText('Recalibrate the portal gun')
})

test('keeps the board after a reload', async ({ page }) => {
  await drag(page, card(page, 'Find a job'), card(page, 'Turn myself into a pickle'), 'bottom')
  await expect(cards(column(page, 'Done'))).toHaveText([/pickle/, /Find a job/])

  await page.reload()

  await expect(cards(column(page, 'Done'))).toHaveText([/pickle/, /Find a job/])
  await expect(cards(column(page, 'To Do'))).toHaveCount(2)
})
