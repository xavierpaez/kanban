# Kanban Board — Architecture, Design Direction, and Plan

Status: **approved.** Stages 1, 2 and 3 are implemented, which completes the core plan. Optional stages from section 4 start after review and approval.

## 1. Architecture (revision of ARCHITECTURE-INITIAL.md)

The initial component split is sound. These changes make it fit TanStack Start and keep it simple.

| Initial | Revised | Why |
| --- | --- | --- |
| KanbanPage component | The route file `src/routes/index.tsx` | The route owns the loader, search params, and SSR mode. A separate page component would only forward props. |
| Characters "fetched through the GraphQL API" | A typed server function in `src/server/characters.ts` | Fetching and parsing stay behind an explicit server boundary. The browser never talks to the API directly. Responses are parsed with zod, so bad data fails at the edge. |
| Board state "managed at the board level" | A pure reducer plus a small `useBoard` hook that persists to localStorage | Create, edit, delete, and move are plain actions that are easy to test. No global store is needed. |
| CreateItemForm | ItemForm, used for create and edit | One form, two modes. Edit and delete are core requirements. |
| Card shows assigned character | Card stores a snapshot of the character: id, name, image, status, species | Cards render without refetching and still render if the API is down. |
| (none) | `celebrate.ts` | The Done-column effect is isolated and respects reduced motion. |

### Data model

```ts
type ColumnId = 'todo' | 'doing' | 'done'
type Character = { id: string; name: string; image: string; status: 'Alive' | 'Dead' | 'unknown'; species: string }
type Item = { id: string; title: string; character: Character; createdAt: number }
type Board = { items: Record<string, Item>; columns: Record<ColumnId, string[]> }
```

Column arrays are the single source of truth for membership and order. Moving or reordering a card is one array splice.

### Routing, SSR, and streaming

- **`/` (board)** uses full-document SSR. The loader starts the character request and returns it unawaited, so the page shell streams first and the character list streams in after.
- **Board contents** live in the browser's localStorage, which the server cannot read. The server renders the columns with card skeletons, and the client fills them after hydration. This is the honest SSR boundary for a frontend-only board.
- **Search params** are validated with zod. Core use: `?item=<id>` opens the edit dialog, so an item has a shareable URL within the same browser. Later stages add `?q=` and filters to the same schema.
- **Character search** in the selector calls a second server function with a name filter, so all 800+ characters are reachable without loading them all.
- **Deployment target** is local development for now. End-to-end tests run against the production build through `vite preview`. Adding a hosting target later is a Vite plugin setting, not an app change.

### Stack

- TanStack Start 1.x, TanStack Router file routes, React 19, TypeScript strict
- dnd-kit core and sortable (stable). The new `@dnd-kit/react` package is still 0.x.
- Tailwind CSS v4 for styling and zod for parsing. The Done confetti uses canvas-confetti
- Vitest for unit and API tests, Playwright for end-to-end tests

## 2. Design direction: "Portal Board", a playful Rick and Morty theme

- **Feel.** Cartoon stickers floating in deep space. The board borrows the show's look: thick ink outlines, flat colors, hard offset shadows, and a glowing portal-green accent.
- **Background.** A deep-space navy with soft purple, green, and cyan nebula glows and a gradient starfield. No image requests.
- **Brand.** A spinning CSS portal next to the "Portal Board" title, set in Luckiest Guy. Body text uses Fredoka, a rounded, friendly face. Both fonts are bundled with the app.
- **Columns.** Translucent glass panels. Each has a colored dot, a cartoon title, a playful tagline, and a count badge. To Do is Rick's cyan, Doing is Morty's yellow, and Done is portal green.
- **Cards.** Cream stickers with an ink outline and a hard shadow in the column color. The footer shows the character avatar, name, and a status badge for Alive, Dead, or Unknown. Done cards get a check badge and a muted title.
- **Layout.** Three equal columns on desktop. On mobile, a horizontal scroll-snap row where the next column peeks in from the edge.
- **Theme.** Always dark, because the space backdrop is the theme. A separate light theme is dropped.

### Drag-and-drop indicators

- The whole card is the drag target, with a grab cursor on hover. A 5px activation distance keeps clicks working.
- The dragged card lifts in an overlay: larger shadow, slight tilt, grabbing cursor.
- A dashed placeholder the size of the card marks exactly where it will land. It goes above or below the nearest card depending on which half the dragged card is over, and dropping commits exactly that spot.
- The column under the pointer highlights its border and background.
- Empty columns show a "Drop items here" zone.
- On drop, the card animates into place. Edges auto-scroll while dragging.
- Keyboard dragging works with Space, arrow keys, and Escape. A screen reader hears each move announced by name and column.
- Touch uses a short press delay so scrolling still works.
- All motion is reduced or removed under `prefers-reduced-motion`.

### Completion effect

A short confetti burst fires from the card's position in portal green and the column colors. The card does a small pop and shows a check mark. It fires only when a card enters Done from another column, never on reorder inside Done. Under reduced motion, only the check mark appears.

## 3. Core plan: three stages

Each stage ends with tests passing, a review by six independent agents, fixes for their findings, and a pause for your approval.

### Stage 1: A working, good-looking board

- **Goal.** A polished board you can drag cards around on, backed by real character data.
- **Scope.** Project scaffold, characters server function, route loader with streaming, three columns, seeded cards with real characters, drag between columns and reorder within a column with all the indicators above, keyboard dragging, localStorage persistence, base visual design.
- **Tests.** Vitest API tests for the character fetch: success, GraphQL errors, network failure, malformed data. Playwright: board renders, drag across columns, reorder, state survives reload.

### Stage 2: Item lifecycle

- **Goal.** Users manage their own items end to end.
- **Scope.** Create dialog with a required title and a required character. Searchable character selector with avatars, keyboard support, and loading and error states. Edit dialog opened through `?item=<id>`. Delete with a confirmation. Form validation with clear messages. A card actions menu with Edit, Delete, and "Move to" a column or position, so cards can be moved without dragging (WCAG 2.5.7).
- **Tests.** Playwright create, edit, delete, and required-character validation. Vitest for the character search server function and search param validation.

### Stage 3: Delight and hardening

- **Goal.** The board feels finished.
- **Scope.** Done-column confetti and card pop with the reduced-motion fallback. API-down behavior: the board still works and the selector offers a retry. Avatar fallback when an image fails. Empty states. Mobile layout and touch dragging polish.
- **Tests.** Playwright for the celebration trigger, mobile viewport dragging, and API failure. Full suite green.

## 4. Optional stages after the core

These are separate from the core plan. Pick any for Stage 4 and beyond.

- **Search and filter.** Text search and a character filter in the URL, through the same validated search params.
- **Sorting.** Within a column by created date, title, or priority.
- **Priority and labels.** Priority levels with colored chips, and free-form labels.
- **Description.** A longer text field on each item, shown in the edit dialog.
- **Undo.** A toast after delete or move with a one-click undo.
- **WIP limits.** A soft limit on Doing, with a visual warning when exceeded.
- **Import and export.** Save the board as JSON and load it back.

## 5. Decisions

1. The design direction is playful and themed. See section 2.
2. Board persistence uses localStorage.
3. The deployment target is local development for now.
4. Styling uses Tailwind CSS v4.

## 6. Status

- **Stage 1** implemented and reviewed by six agents: React, accessibility, TypeScript and code quality, performance, security, and UI/UX. Their actionable findings are fixed, except the two below.
- **Stage 2** implemented and reviewed by the same six agents. Their actionable findings are fixed. It also delivers the two items Stage 1 carried over: "Move to" in the card menu, and the keyboard edge announcement.
- **Stage 2 decisions.**
  - Dialogs are native `<dialog>` elements, driven by `?new=<column>` and `?item=<id>`. Closing goes back in history when the dialog added an entry, so the back button never replays a closed dialog.
  - The card menu is a native popover, so columns never clip it.
  - The character list overlays the form on tall screens and joins the page flow on short ones.
  - Focus and screen reader announcements wait until dialogs close.
  - The server caps concurrent upstream searches.
- **Lesson from Stage 2.** Any animation on a card must run on the card's inner element, never on the list item dnd-kit measures. A scaling list item made drop placement flip back and forth into a render loop.
- **Stage 3** implemented and reviewed by the same six agents. Their actionable findings are fixed. It also delivers everything Stage 2 carried over: the Content Security Policy, a retry button, themed empty columns with an inline add link, and the avatar fallback.
- **Stage 3 decisions.**
  - The confetti uses canvas-confetti on its own canvas, which is removed when the burst ends. The card and check badge pop with the Web Animations API.
  - Production responses carry a strict Content Security Policy with a per-request nonce for scripts, and no inline styles or `data:` images. Column colors come from `data-accent` attributes instead of inline styles. The dev server sends only `frame-ancestors`, because Vite's dev server injects inline scripts without a nonce.
  - When the API is down, the board starts empty with a retry banner that counts failed tries. Empty columns explain why instead of offering a form that can't be finished. A successful retry seeds an empty board, moves focus to it, and announces how many items arrived.
  - Avatars that fail to load show a colored initial. Failures are remembered across card remounts, so a card doesn't refetch a broken image when it changes column.
  - On phones, scroll snapping stays off from pickup until the dropped card's column has scrolled smoothly to the center. Turning it back on at the drop made the row jump in one frame.
- **Not changed, by design.**
  - The nonce is readable in the framework's `csp-nonce` meta tag, which is how TanStack Start passes it to the client.
  - `vite preview` doesn't add security headers to static assets. A real deployment would set them at the host.
  - Avatars are 300×300 images shown at 28px. The API offers no smaller size.
- **If the app is ever hosted:** a per-client rate limit on character searches and on the seed retry.
