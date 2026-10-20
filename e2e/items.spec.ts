import { expect, test, type Page } from '@playwright/test'
import { card, cards, column } from './helpers'

const dialog = (page: Page) => page.getByRole('dialog')
const status = (page: Page) => page.getByTestId('announcer')

/** Searches the character field and clicks a result. */
async function chooseCharacter(page: Page, search: string, name: string) {
  await dialog(page).getByRole('combobox', { name: 'Character' }).fill(search)
  await dialog(page).getByRole('option', { name: new RegExp(name) }).click()
}

async function openMenu(page: Page, title: string) {
  await page.getByRole('button', { name: `Actions for ${title}` }).click()
  await expect(page.getByRole('menu', { name: `Actions for ${title}` })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(card(page, 'Recalibrate the portal gun')).toBeVisible()
})

test.describe('creating items', () => {
  test('creates an item from the header button', async ({ page }) => {
    await page.getByRole('link', { name: 'New item' }).click()
    await expect(dialog(page)).toBeVisible()
    await expect(page).toHaveURL(/\?new=todo$/)
    await expect(dialog(page).getByLabel('Title')).toBeFocused()

    await dialog(page).getByLabel('Title').fill('Get Schwifty')
    await chooseCharacter(page, 'beth', 'Beth Smith')
    await dialog(page).getByRole('button', { name: 'Create item' }).click()

    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await expect(cards(column(page, 'To Do')).first()).toHaveText(/Get Schwifty.*Beth Smith/)
    await expect(card(page, 'Get Schwifty')).toBeFocused()
    await expect(status(page)).toHaveText('Added Get Schwifty to To Do.')
  })

  test('creates an item from a column button, in that column', async ({ page }) => {
    await page.getByRole('link', { name: 'Add item to Done' }).click()
    await expect(dialog(page).getByRole('radio', { name: 'Done' })).toBeChecked()

    await dialog(page).getByLabel('Title').fill('Save the Citadel')
    await chooseCharacter(page, 'rick', 'Adjudicator Rick')
    await dialog(page).getByRole('button', { name: 'Create item' }).click()

    await expect(cards(column(page, 'Done'))).toHaveText([/Save the Citadel.*Adjudicator Rick/, /pickle/])
  })

  test('requires a title and a character chosen from the list', async ({ page }) => {
    await page.getByRole('link', { name: 'New item' }).click()
    await dialog(page).getByRole('button', { name: 'Create item' }).click()

    await expect(dialog(page).getByText('Give this item a title.')).toBeVisible()
    await expect(dialog(page).getByText('Pick a character from the list.')).toBeVisible()
    await expect(dialog(page).getByLabel('Title')).toBeFocused()
    await expect(dialog(page).getByLabel('Title')).toHaveAttribute('aria-invalid', 'true')

    // Typed text that isn't a chosen character doesn't count.
    await dialog(page).getByLabel('Title').fill('Find the Council of Ricks')
    await dialog(page).getByRole('combobox', { name: 'Character' }).fill('Rick Sanchez')
    await dialog(page).getByRole('button', { name: 'Create item' }).click()

    await expect(dialog(page).getByText('Give this item a title.')).toBeHidden()
    await expect(dialog(page).getByText('Pick a character from the list.')).toBeVisible()
    await expect(dialog(page).getByRole('combobox', { name: 'Character' })).toBeFocused()
    await expect(cards(column(page, 'To Do'))).toHaveCount(3)
  })

  test('picks a character with the keyboard', async ({ page }) => {
    await page.getByRole('link', { name: 'New item' }).click()
    const picker = dialog(page).getByRole('combobox', { name: 'Character' })
    await picker.fill('smith')
    await expect(dialog(page).getByRole('option')).toHaveCount(4)

    await picker.press('ArrowDown')
    await expect(picker).toHaveAttribute('aria-activedescendant', /.+/)
    await picker.press('Enter')

    await expect(picker).toHaveValue('Summer Smith')
    await expect(picker).toHaveAttribute('aria-expanded', 'false')
  })

  test('shows an error with a retry when character search fails', async ({ page }) => {
    await page.getByRole('link', { name: 'New item' }).click()
    await dialog(page).getByRole('combobox', { name: 'Character' }).fill('portal-error')

    // Shown in the list's footer, and announced through the picker's live region.
    await expect(dialog(page).locator('span', { hasText: 'Couldn’t reach the Rick and Morty API.' })).toBeVisible()
    await expect(dialog(page).getByRole('status')).toHaveText('Couldn’t reach the Rick and Morty API.')
    await expect(dialog(page).getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('recovers when a failed search is retried', async ({ page }) => {
    await page.getByRole('link', { name: 'New item' }).click()
    const picker = dialog(page).getByRole('combobox', { name: 'Character' })
    // The mock fails the first request for this name, then answers it.
    await picker.fill(`flaky ${test.info().repeatEachIndex} ${test.info().retry}`)
    await dialog(page).getByRole('button', { name: 'Try again' }).click()

    await expect(dialog(page).getByRole('option')).toHaveCount(8)
    await expect(picker).toBeFocused()
  })

  test('ignores an invalid column in the URL', async ({ page }) => {
    await page.goto('/?new=bogus')
    await expect(card(page, 'Recalibrate the portal gun')).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
  })
})

test.describe('editing items', () => {
  test('edits an item by clicking its card, and keeps the change after reload', async ({ page }) => {
    await card(page, 'Find a job').click()
    await expect(page).toHaveURL(/\?item=/)
    await expect(dialog(page).getByLabel('Title')).toHaveValue('Find a job. Any job.')
    await expect(dialog(page).getByRole('combobox', { name: 'Character' })).toHaveValue('Jerry Smith')

    await dialog(page).getByLabel('Title').fill('Get a job at the Citadel')
    await chooseCharacter(page, 'abra', 'Abradolf Lincler')
    await dialog(page).getByRole('button', { name: 'Save changes' }).click()

    await expect(dialog(page)).toBeHidden()
    await expect(card(page, 'Get a job at the Citadel')).toContainText('Abradolf Lincler')
    await expect(card(page, 'Get a job at the Citadel')).toBeFocused()
    await expect(status(page)).toHaveText('Saved changes to Get a job at the Citadel.')

    await page.reload()
    await expect(cards(column(page, 'To Do')).last()).toHaveText(/Get a job at the Citadel.*Abradolf Lincler/)
  })

  test('keeps the edit dialog open when the title is cleared', async ({ page }) => {
    await card(page, 'Find a job').click()
    await dialog(page).getByLabel('Title').fill('   ')
    await dialog(page).getByRole('button', { name: 'Save changes' }).click()

    await expect(dialog(page).getByText('Give this item a title.')).toBeVisible()
    await expect(dialog(page).getByLabel('Title')).toBeFocused()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(card(page, 'Find a job. Any job.')).toBeVisible()
  })

  test('closes the dialog with the browser back button', async ({ page }) => {
    await card(page, 'Find a job').click()
    await expect(dialog(page)).toBeVisible()

    await page.goBack()

    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
  })

  test('opens the edit dialog from a link', async ({ page }) => {
    const id = await card(page, 'Hide the spaceship').getAttribute('data-card-id')
    await page.goto(`/?item=${id}`)

    await expect(dialog(page).getByRole('heading', { name: 'Edit item' })).toBeVisible()
    await expect(dialog(page).getByLabel('Title')).toHaveValue('Hide the spaceship from Mom')
  })

  test('clears a link to an item that no longer exists', async ({ page }) => {
    await page.goto('/?item=gone')

    await expect(status(page)).toHaveText('That item no longer exists.')
    await expect(page).toHaveURL(/\/$/)
    await expect(dialog(page)).toHaveCount(0)
  })

  test('closes the dialog with Escape and returns focus', async ({ page }) => {
    await openMenu(page, 'Find a job. Any job.')
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(dialog(page)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', { name: 'Actions for Find a job. Any job.' })).toBeFocused()
  })
})

test.describe('deleting items', () => {
  test('deletes an item from its menu after confirming', async ({ page }) => {
    await openMenu(page, 'Recalibrate the portal gun')
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    const confirm = page.getByRole('alertdialog', { name: 'Delete this item?' })
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await confirm.getByRole('button', { name: 'Delete' }).click()

    await expect(card(page, 'Recalibrate the portal gun')).toHaveCount(0)
    await expect(cards(column(page, 'To Do'))).toHaveCount(2)
    // Focus moves to the next card in the column.
    await expect(card(page, 'Goldenfold')).toBeFocused()
    await expect(status(page)).toHaveText('Deleted Recalibrate the portal gun.')

    await page.reload()
    await expect(cards(column(page, 'To Do'))).toHaveCount(2)
  })

  test('keeps the item when the delete is cancelled', async ({ page }) => {
    await openMenu(page, 'Recalibrate the portal gun')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(cards(column(page, 'To Do'))).toHaveCount(3)
  })

  test('deletes an item from its edit dialog', async ({ page }) => {
    await card(page, 'Turn myself into a pickle').click()
    await dialog(page).getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
    await expect(cards(column(page, 'Done'))).toHaveCount(0)
    // The column is now empty, so focus moves to its add button.
    await expect(page.getByRole('link', { name: 'Add item to Done' })).toBeFocused()
    await expect(status(page)).toHaveText('Deleted Turn myself into a pickle.')
  })
})

test('moves an item to another column from its menu', async ({ page }) => {
  await openMenu(page, 'Hide the spaceship from Mom')
  await page.getByRole('menuitem', { name: 'Move to Done' }).click()

  await expect(cards(column(page, 'Done'))).toHaveText([/Hide the spaceship/, /pickle/])
  await expect(card(page, 'Hide the spaceship')).toBeFocused()
  await expect(status(page)).toHaveText('Hide the spaceship from Mom moved to Done, position 1.')
})

test('moves an item within its column from its menu, using the keyboard', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Actions for Recalibrate the portal gun' })
  await trigger.focus()
  await page.keyboard.press('ArrowUp')
  // ArrowUp opens the menu on its last item.
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('menuitem', { name: 'Move down' })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(cards(column(page, 'To Do'))).toHaveText([/Goldenfold/, /Recalibrate/, /Find a job/])
  await expect(card(page, 'Recalibrate the portal gun')).toBeFocused()
})
