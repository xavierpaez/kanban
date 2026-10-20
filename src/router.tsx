import { createRouter } from '@tanstack/react-router'
import { createIsomorphicFn, getGlobalStartContext } from '@tanstack/react-start'
import { routeTree } from './routeTree.gen'

// The request's Content Security Policy nonce, set by the security headers middleware in
// `src/start.ts`. The router adds it to the inline scripts it renders on the server.
const getNonce = createIsomorphicFn()
  .server(() => getGlobalStartContext()?.nonce)
  .client(() => undefined)

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    ssr: { nonce: getNonce() },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
