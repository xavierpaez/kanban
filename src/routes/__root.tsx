/// <reference types="vite/client" />
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import fredokaFont from '@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2?url'
import luckiestGuyFont from '@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2?url'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0b0920' },
      { title: 'Portal Board' },
      { name: 'description', content: 'A Rick and Morty flavored Kanban board.' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // Fonts are otherwise discovered only after the stylesheet loads, and the title uses Luckiest Guy.
      { rel: 'preload', href: luckiestGuyFont, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: fredokaFont, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      // Character avatars come from the API's host.
      { rel: 'preconnect', href: 'https://rickandmortyapi.com' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div>
        <h1 className="font-display text-4xl text-portal">Wrong dimension</h1>
        <p className="mt-2 text-white/70">This page doesn’t exist in this reality.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-portal px-5 py-2 font-semibold text-ink">
          Portal back home
        </Link>
      </div>
    </main>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
