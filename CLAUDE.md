# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

"Portal Board" is a Kanban board with a Rick and Morty theme, built with TanStack Start, React 19, TypeScript, dnd-kit, Tailwind CSS v4, and the Rick and Morty GraphQL API. Board data lives in the browser's localStorage.

Read these before changing anything:

- `docs/INTRODUCTION.md`: the requirements and collaboration rules. Treat it as the contract.
- `docs/PLAN.md`: the architecture, design direction, the staged plan with optional future stages, decisions, and the current status.

## Working rules (from INTRODUCTION.md)

- Work proceeds in stages. Do not start a stage without the user's explicit approval.
- Each stage ends in four steps:
  1. Run the relevant tests and fix any failures.
  2. Run six independent review agents: React best practices, accessibility, TypeScript and code quality, performance, security, and UI/UX with responsive design.
  3. Fix their actionable findings.
  4. Pause for review.
- Keep it simple. Don't add a state library, a modal library, a GraphQL client, or data-layer abstractions.
- Don't change or drop a requirement without discussing it first. Briefly explain important technical or design choices.

## Commands

Requires Node `>=22.12` (`engines` in package.json; `.nvmrc` says 22). Vite 8 won't run on older 22.x releases.

```
npm run dev            # dev server on :3000; for another port: npx vite dev --port 3200 --strictPort
npm run build          # production build into dist/
npm run preview        # serve the build (vite preview)
npm run typecheck      # tsc --noEmit
npm test               # Vitest unit and API tests (src/**/*.test.ts)
npx vitest run src/board/placement.test.ts     # one unit test file
npm run test:e2e       # builds, then runs Playwright
npx playwright test e2e/board.spec.ts          # one spec; needs an up-to-date build first
npx playwright test e2e/mobile.spec.ts --repeat-each=6 --workers=1   # check drag tests for flakiness
```

### End-to-end setup

Playwright (`playwright.config.ts`) starts three servers itself. Ports 3100, 3101, 4010 and 4011 must be free.

- **`e2e/mock-api.mjs` on :4010.** A fake GraphQL API with 8 characters. A search name containing `portal-error` returns HTTP 500. A name containing `flaky` fails once, then returns every character.
- **`vite preview` on :3100.** Points at the mock through `RICK_AND_MORTY_API_URL`. This is the default `baseURL`.
- **`vite preview` on :3101.** Points at :4011, where nothing listens, to simulate the API being down. `api-down.spec.ts` uses it.

The real API rate-limits scripted traffic with HTTP 429. Use the mock API and a preview build for any automated browser work, including screenshots.

## Architecture

There is one route, `src/routes/index.tsx`. Everything that crosses a trust boundary is validated with `zod/mini`. Use `zod/mini`, not classic `zod`, because the schemas ship to the client. Inside those boundaries, trust the types.

### Server boundary

- The client never calls the Rick and Morty API directly. `src/server/characters.ts` defines a `createServerFn` (`getCharacters`), whose input is validated by `characterQuery.ts`.
- The server function calls `rickAndMorty.server.ts`, which is server-only by its `.server.ts` name. It provides:
  - the fetch, with a timeout
  - response validation
  - a one-hour in-memory cache that shares in-flight requests
  - a limit on concurrent upstream calls
  - a `RICK_AND_MORTY_API_URL` override, which must be HTTPS unless it points at localhost
- The route loader returns the characters promise without awaiting it, so the page shell streams first. The promise always settles to a `CharactersResult` and never rejects.

### Board state (`src/board/`)

- **Shape.** The schema in `schema.ts` defines `{ items: Record<id, Item>, columns: { todo, doing, done }: id[] }`.
  - The column arrays are the single source of truth for which column an item is in and its order. Moving an item is one removal and one insertion.
  - Each item stores a snapshot of its character, so cards render without the API.
- **Pure logic.** These modules are unit-tested.
  - `board.ts` holds the reducer and its helpers.
  - `placement.ts` works out where a pointer or keyboard drag lands.
  - `search.ts` holds the URL schema.
  - `storage.ts` handles localStorage parsing and the `shouldSave` rule.
- **`useBoard.ts`** holds the board state.
  - The state is `null` during SSR and until hydration.
  - On mount it loads a saved board from storage. A first-time visitor instead gets a board seeded from the streamed characters.
  - If that fails, the board starts empty and `retrySeed` tries again.
  - An empty board from a failed seed isn't saved, so a refresh retries the seed.

### URL state

- `?new=<column>` opens the create dialog and `?item=<id>` opens the edit dialog. Both are validated by `boardSearchSchema`, and invalid values are dropped rather than raising an error.
- The dialogs are native `<dialog>` elements. Closing one goes back in history if opening it added an entry, and otherwise replaces the URL.

### Drag and drop

- `components/KanbanBoard.tsx` owns `DndContext`, the sensors, auto-scroll, the `DragOverlay`, and screen reader announcements.
- The board moves cards in state during a drag, so `SortableContext` uses a no-op sorting strategy.
- **Animations go on the inner `[data-card-id]` element, never on the sortable `<li>` that dnd-kit measures.** Scaling the `<li>` makes placement flip back and forth into a React render loop.
- On the horizontally scrolling phone layout, scroll snapping stays off from pickup until the dropped card's column has smoothly scrolled to center (`settle`).

### Focus and announcements

`BoardPage` queues focus moves, live-region messages, and celebrations in a ref. It flushes them only when no dialog is open.

### Celebration

`components/celebrate.ts` pops the card with the Web Animations API and fires canvas-confetti on its own canvas (`data-testid="confetti"`), removed when the burst ends. It fires only when a card enters Done from another column, and is skipped under reduced motion.

### Security headers

- `src/start.ts` adds request middleware: security headers, then TanStack's CSRF check. Requests to server functions must come from the same origin.
- Production builds send a strict CSP with a per-request script nonce:
  1. The middleware passes the nonce in its context.
  2. `src/router.tsx` reads it with `getGlobalStartContext()` into the router's `ssr.nonce`.
- The policy blocks inline style attributes in server-rendered HTML. For per-element colors, use attributes like `data-accent` with CSS in `styles.css`, not `style=`.
- The dev server sends only `frame-ancestors`, because Vite injects inline scripts without a nonce.

## Gotchas

- `src/routeTree.gen.ts` is generated by the dev server and the build. Don't edit it.
- In `vite.config.ts`, `tanstackStart()` must come before `viteReact()`.
- `vitest.config.ts` is separate from `vite.config.ts`, so unit tests don't boot the Start plugin. Unit tests run in the `node` environment. Components are covered by Playwright, not unit tests.
- Theme colors (`portal`, `portal-glow`, `todo`, `doing`, `done`), fonts, and animations are Tailwind v4 `@theme` tokens in `src/styles.css`.
