import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'

// Defining a start instance replaces TanStack Start's default middleware, so the
// cross-site request check for server functions is added back explicitly.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // The board is never meant to be framed by another site.
  'X-Frame-Options': 'DENY',
}

/**
 * Scripts must come from the app itself or carry this request's nonce, which TanStack Start
 * puts on its inline hydration scripts. Images may also come from the API's avatar host.
 * Inline style attributes are not allowed; styles that React sets from scripts are unaffected.
 */
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self'",
    "img-src 'self' https://rickandmortyapi.com",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
}

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const nonce = createNonce()
  // The router reads the nonce from this context; see `src/router.tsx`.
  const result = await next({ context: { nonce } })
  const headers = new Headers(result.response.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
  // Vite's dev server injects inline scripts without a nonce, so the full policy applies to builds only.
  headers.set('Content-Security-Policy', import.meta.env.DEV ? "frame-ancestors 'none'" : contentSecurityPolicy(nonce))
  const { body, status, statusText } = result.response
  return { ...result, response: new Response(body, { status, statusText, headers }) }
})

export const startInstance = createStart(() => ({
  // The headers wrap everything, including the cross-site check's rejections.
  requestMiddleware: [securityHeadersMiddleware, csrfMiddleware],
}))
