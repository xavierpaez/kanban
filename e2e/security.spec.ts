import { expect, test } from '@playwright/test'
import { card } from './helpers'

test('serves a strict Content Security Policy that the app runs under', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text())
  })
  const response = await page.goto('/')
  const policy = response?.headers()['content-security-policy'] ?? ''

  expect(policy).toMatch(/script-src 'self' 'nonce-[\w+/=]+'/)
  expect(policy).toContain("object-src 'none'")
  await expect(card(page, 'Recalibrate the portal gun')).toBeVisible()
  await page.getByRole('link', { name: 'New item' }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'Character' }).fill('smith')
  await expect(page.getByRole('dialog').getByRole('option')).toHaveCount(4)
  expect(violations).toEqual([])
})
