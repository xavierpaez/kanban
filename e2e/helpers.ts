import { expect, type Locator, type Page } from '@playwright/test'
import type { Board } from '../src/board/schema'

export const column = (page: Page, name: 'To Do' | 'Doing' | 'Done') => page.getByRole('region', { name })
export const cards = (scope: Locator) => scope.getByTestId('card')
export const card = (page: Page, title: string) => page.getByTestId('card').filter({ hasText: title })

/** Drags with real mouse events, in small steps, the way dnd-kit expects a pointer to move. */
export async function drag(page: Page, source: Locator, target: Locator, where: 'top' | 'bottom' | 'center' = 'center') {
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  const toY = where === 'top' ? to.y + 8 : where === 'bottom' ? to.y + to.height - 8 : to.y + to.height / 2
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 3 })
  await page.mouse.move(to.x + to.width / 2, toY, { steps: 20 })
  await page.mouse.move(to.x + to.width / 2, toY + 1, { steps: 2 })
  await page.mouse.up()
}

/** Picks a card up with the keyboard and waits for the screen reader announcement, as a user would. */
export async function pickUp(page: Page, title: string) {
  await card(page, title).focus()
  await page.keyboard.press('Space')
  await expect(page.getByText(`Picked up ${title}.`)).toBeAttached()
  // dnd-kit starts listening for arrow keys in a zero-delay timer after pickup. Waiting one
  // task in the page lets that timer run; keys sent sooner are dropped (no human is that fast).
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

const avatar = (id: number) => `https://rickandmortyapi.com/api/character/avatar/${id}.jpeg`

/** A saved board, as the app stores it, for tests that start from local data. */
export const SAVED_BOARD = {
  items: {
    'saved-1': {
      id: 'saved-1',
      title: 'Fix the garage door',
      character: { id: '1', name: 'Rick Sanchez', image: avatar(1), status: 'Alive', species: 'Human' },
      createdAt: 1,
    },
    'saved-2': {
      id: 'saved-2',
      title: 'Walk the dog',
      character: { id: '2', name: 'Morty Smith', image: avatar(2), status: 'Alive', species: 'Human' },
      createdAt: 2,
    },
  },
  columns: { todo: ['saved-1'], doing: ['saved-2'], done: [] },
} satisfies Board

/**
 * Stores `board` before the app first loads, the way a returning visitor's browser would have
 * it. Init scripts run again on reload, so it only writes when nothing is stored yet.
 */
export async function useSavedBoard(page: Page, board: Board = SAVED_BOARD) {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('portal-board:v1')) localStorage.setItem('portal-board:v1', value)
  }, JSON.stringify(board))
}
