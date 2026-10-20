import { expect, test } from '@playwright/test'
import { API_DOWN_APP_PORT, APP_PORT } from '../playwright.config'
import { card, cards, column, useSavedBoard } from './helpers'

// This copy of the app points at an API address where nothing is listening.
test.use({ baseURL: `http://localhost:${API_DOWN_APP_PORT}` })

test('starts with an empty board and a retry when the API is down', async ({ page }) => {
  await page.goto('/')

  const banner = page.getByRole('alert')
  await expect(banner).toContainText('Couldn’t reach the Rick and Morty API')
  await expect(cards(page.locator('main'))).toHaveCount(0)
  // Every item needs a character, so empty columns point to the retry instead of the form.
  await expect(column(page, 'To Do')).toContainText('Characters are lost in another dimension.')
  await expect(column(page, 'To Do').getByRole('link', { name: 'Add an item' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(banner).toContainText('Still no signal from the Rick and Morty API after 2 tries.')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
})

test('fills the board and moves focus to it when the API comes back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  // "Bring the API back": send this app's server function calls to the healthy copy, which runs
  // the same build, so the same functions answer there.
  // Its CSRF check compares the request's origin with its own, so the headers move over too.
  const toHealthy = (value: string) => value.replaceAll(`:${API_DOWN_APP_PORT}`, `:${APP_PORT}`)
  await page.route('**/_serverFn/**', async (route) => {
    const request = route.request()
    const headers = Object.fromEntries(
      Object.entries(await request.allHeaders()).map(([name, value]) => [name, toHealthy(value)]),
    )
    await route.fulfill({ response: await route.fetch({ url: toHealthy(request.url()), headers }) })
  })

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(cards(page.locator('main'))).toHaveCount(6)
  await expect(page.getByTestId('announcer')).toHaveText('Back online. Added 6 starter items.')
  await expect(cards(column(page, 'To Do')).first()).toBeFocused()
})

test('explains why a character cannot be chosen while the API is down', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'New item' }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'Character' }).fill('rick')

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Try again' })).toBeVisible()
  await page.getByRole('dialog').getByLabel('Title').fill('Fix the portal')
  await page.getByRole('dialog').getByRole('button', { name: 'Create item' }).click()
  await expect(page.getByRole('dialog').getByText('Pick a character from the list.')).toBeVisible()
})

test('keeps a saved board fully usable while the API is down', async ({ page }) => {
  await useSavedBoard(page)
  await page.goto('/')

  await expect(card(page, 'Fix the garage door')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.getByRole('button', { name: 'Actions for Fix the garage door' }).click()
  await page.getByRole('menuitem', { name: 'Move to Done' }).click()
  await expect(cards(column(page, 'Done'))).toHaveText([/Fix the garage door/])

  await page.reload()
  await expect(cards(column(page, 'Done'))).toHaveText([/Fix the garage door/])
})
