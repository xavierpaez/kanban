# Portal Board

A Rick and Morty themed Kanban board built with TanStack Start, React, dnd-kit, and Tailwind CSS.

Hey, thanks for taking the time to review this. I gave it a Rick and Morty theme to make it a bit more fun.

You can find the deployed version at [kanban.xavierpaez.com](https://kanban.xavierpaez.com). Otherwise, these are the instructions to run it.

If you'd like to see my thought process, the `docs` folder shows where the project started:

- [`INTRODUCTION.md`](docs/INTRODUCTION.md): the initial instructions and requirements I wrote for the coding agent.
- [`ARCHITECTURE-INITIAL.md`](docs/ARCHITECTURE-INITIAL.md): my first sketch of the architecture.
- [`PLAN.md`](docs/PLAN.md): the revised architecture, the staged plan, and the decisions along the way.

## Run it

Requires Node 22.

```
npm install
npm run dev            # http://localhost:3000
```

## Other commands

```
npm run typecheck      # TypeScript check
npm test               # unit tests (Vitest)
npx playwright install chromium   # once, before the end-to-end tests
npm run test:e2e       # builds, then runs the end-to-end tests (Playwright)
```
