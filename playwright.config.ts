import { defineConfig, devices } from '@playwright/test'

const MOCK_API_PORT = 4010
export const APP_PORT = 3100
/** A second copy of the app whose API address has nothing listening, for API-down tests. */
export const API_DOWN_APP_PORT = 3101
const DEAD_API_PORT = 4011

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node e2e/mock-api.mjs ${MOCK_API_PORT}`,
      port: MOCK_API_PORT,
      reuseExistingServer: false,
    },
    {
      // Tests run against the production build (`npm run test:e2e` builds first). Its server
      // functions call the mock API instead of the real one, so results are deterministic.
      command: `RICK_AND_MORTY_API_URL=http://localhost:${MOCK_API_PORT}/graphql npx vite preview --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `RICK_AND_MORTY_API_URL=http://localhost:${DEAD_API_PORT}/graphql npx vite preview --port ${API_DOWN_APP_PORT} --strictPort`,
      url: `http://localhost:${API_DOWN_APP_PORT}`,
      reuseExistingServer: false,
      // Every request logs an expected "Could not reach" error; keep the test output readable.
      stderr: 'ignore',
      timeout: 120_000,
    },
  ],
})
