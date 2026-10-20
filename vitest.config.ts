import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so unit tests don't boot the TanStack Start plugin.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
