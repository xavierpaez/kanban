import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test'
import { card, cards, column } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

type Point = { x: number; y: number }

/** Real touch input through the DevTools protocol, which is what dnd-kit's touch sensor listens to. */
async function touchscreen(page: Page) {
  const cdp: CDPSession = await page.context().newCDPSession(page)
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: Point) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [at] : [] })
  return {
    down: (at: Point) => send('touchStart', at),
    async move(from: Point, to: Point, steps = 12) {
      for (let i = 1; i <= steps; i++) {
        await send('touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
      }
    },
    up: () => send('touchEnd'),
  }
}

async function center(locator: Locator): Promise<Point> {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** How far the sideways-scrolling row of columns has scrolled. */
const scrollLeft = (page: Page) => column(page, 'To Do').evaluate((section) => section.parentElement!.scrollLeft)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(card(page, 'Recalibrate the portal gun')).toBeVisible()
})

test('long-press drags a card to a new position', async ({ page }) => {
  const touch = await touchscreen(page)
  const from = await center(card(page, 'Find a job'))
  const target = (await card(page, 'Recalibrate the portal gun').boundingBox())!
  const to = { x: target.x + target.width / 2, y: target.y + 10 }

  await touch.down(from)
  // Longer than the touch sensor's 180ms press-and-hold, which tells a drag from a scroll.
  await page.waitForTimeout(300)
  await touch.move(from, to)
  await touch.up()

  await expect(cards(column(page, 'To Do'))).toHaveText([/Find a job/, /Recalibrate/, /Goldenfold/])
})

test('drags a card into the next column by holding it at the edge', async ({ page }) => {
  const touch = await touchscreen(page)
  const from = await center(card(page, 'Recalibrate the portal gun'))
  const edge = { x: 375, y: from.y }

  await touch.down(from)
  await page.waitForTimeout(300) // past the 180ms press-and-hold
  await touch.move(from, edge)
  // Hold at the edge until the board has scrolled Doing into view, then let go over it.
  await expect.poll(async () => (await column(page, 'Doing').boundingBox())!.x, { timeout: 5000 }).toBeLessThan(200)
  const middle = { x: 195, y: from.y }
  await touch.move(edge, middle, 6)
  await touch.up()

  await expect(cards(column(page, 'Doing'))).toContainText([/Recalibrate/])
  await expect(cards(column(page, 'To Do'))).toHaveCount(2)
})

test('a quick swipe scrolls the board instead of picking up a card', async ({ page }) => {
  const touch = await touchscreen(page)
  const from = await center(card(page, 'Study for Mr. Goldenfold'))

  await touch.down(from)
  await touch.move(from, { x: from.x - 150, y: from.y }, 6)
  await touch.up()

  await expect.poll(() => scrollLeft(page)).toBeGreaterThan(0)
  await expect(cards(column(page, 'To Do'))).toHaveCount(3)
})
