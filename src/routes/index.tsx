import { Link, createFileRoute, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COLUMN_TITLES, findColumn, focusAfterRemove, getItem, type ItemChanges } from '../board/board'
import type { Placement } from '../board/placement'
import type { ColumnId } from '../board/schema'
import { boardSearchSchema } from '../board/search'
import { useBoard } from '../board/useBoard'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ItemDialog, type ItemDialogMode } from '../components/ItemDialog'
import { celebrate } from '../components/celebrate'
import { DROP_MS, KanbanBoard } from '../components/KanbanBoard'
import { PortalLogo } from '../components/PortalLogo'
import type { CardActions } from '../components/types'
import { usePrefersReducedMotion } from '../components/usePrefersReducedMotion'
import { BUTTON } from '../components/ui'
import { getCharacters, type CharactersResult } from '../server/characters'

export const Route = createFileRoute('/')({
  // `?new=<column>` opens the create dialog and `?item=<id>` opens the edit dialog, so both
  // work with the back button and as links. Invalid values are dropped rather than erroring.
  validateSearch: boardSearchSchema,
  // Full-document SSR (the default). The character request is returned unawaited, so the
  // page shell streams immediately and the characters stream in when they resolve. The
  // promise never rejects: an unhandled rejection here would crash the server process.
  loader: () => ({
    characters: getCharacters({ data: {} }).then(
      (characters): CharactersResult => ({ ok: true, characters }),
      (): CharactersResult => ({ ok: false }),
    ),
  }),
  // Opening and closing dialogs only changes search params. Keep the first character list
  // instead of fetching it again on every navigation.
  staleTime: Infinity,
  component: BoardPage,
})

function BoardPage() {
  const { characters } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const { board, dispatch, seed, seedFailures, retrySeed } = useBoard(characters)
  const reducedMotion = usePrefersReducedMotion()
  const [announcement, announce] = useAnnouncer()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Card actions read the latest board from a ref, so they stay the same object between changes.
  const boardRef = useRef(board)
  useLayoutEffect(() => {
    boardRef.current = board
  })
  // Focus and announcements wait until no dialog is open: focus can't leave a modal, and the
  // page's live region is inert behind one.
  const pending = useRef<{ focus?: string; message?: string; celebrate?: { itemId: string; delay: number } }>({})
  // An item deleted from its own edit dialog, whose dialog is already closing.
  const deletedFromDialog = useRef<string | null>(null)

  const editing = search.item && board ? getItem(board, search.item) : undefined
  const creating = !search.item && search.new ? search.new : undefined
  const dialogOpen = Boolean(editing || creating || confirmDelete)

  const clearSearch = useCallback(
    () => void navigate({ search: {}, replace: true, resetScroll: false }),
    [navigate],
  )
  // Dialogs open with a new history entry, so closing goes back to it when it exists. That
  // keeps the back button from replaying closed dialogs.
  const closeDialog = useCallback(() => {
    if (canGoBack) router.history.back()
    else clearSearch()
  }, [canGoBack, router, clearSearch])

  // An `?item` that isn't on the board, for example from a stale link, is cleared.
  const missingItem = board !== null && search.item !== undefined && !editing
  useEffect(() => {
    if (!missingItem) return
    if (deletedFromDialog.current === search.item) {
      deletedFromDialog.current = null
      return
    }
    announce('That item no longer exists.')
    clearSearch()
  }, [missingItem, search.item, announce, clearSearch])

  useEffect(() => {
    if (dialogOpen) return
    const { focus, message, celebrate: party } = pending.current
    pending.current = {}
    if (focus) document.querySelector<HTMLElement>(focus)?.focus()
    if (message) announce(message)
    // Under reduced motion the card just shows its check mark.
    if (party && !reducedMotion) {
      setTimeout(() => {
        const card = document.querySelector<HTMLElement>(cardSelector(party.itemId))
        if (card) celebrate(card)
      }, party.delay)
    }
  })

  /** Queues the celebration when a card arrives in Done from another column, not when it is reordered there. */
  const celebrateIfDone = useCallback((itemId: string, to: Placement, delay: number) => {
    const from = boardRef.current && findColumn(boardRef.current, itemId)
    if (to.column === 'done' && from !== 'done') pending.current.celebrate = { itemId, delay }
  }, [])

  const actions: CardActions = useMemo(
    () => ({
      edit: (itemId) => void navigate({ search: { item: itemId }, resetScroll: false }),
      move: (itemId, to) => {
        const title = boardRef.current && getItem(boardRef.current, itemId)?.title
        if (!title) return
        pending.current = {
          focus: cardSelector(itemId),
          message: `${title} moved to ${COLUMN_TITLES[to.column]}, position ${to.index + 1}.`,
        }
        celebrateIfDone(itemId, to, 0)
        dispatch({ type: 'move', itemId, toColumn: to.column, toIndex: to.index })
      },
      remove: setConfirmDelete,
    }),
    [dispatch, navigate, celebrateIfDone],
  )

  const handleDrop = useCallback(
    (itemId: string, to: Placement) => {
      // Wait for the dropped card to settle before celebrating.
      celebrateIfDone(itemId, to, DROP_MS)
      dispatch({ type: 'move', itemId, toColumn: to.column, toIndex: to.index })
    },
    [dispatch, celebrateIfDone],
  )

  async function handleRetry() {
    const result = await retrySeed()
    if (!result.ok) return
    // The banner and its button are gone, so focus moves to the board.
    pending.current = {
      focus: result.seeded > 0 ? '[data-card-id]' : '[data-new-item]',
      message:
        result.seeded > 0
          ? `Back online. Added ${result.seeded} starter items.`
          : 'Back online. Character search works again.',
    }
  }

  function handleCreate(values: ItemChanges, column: ColumnId) {
    const item = { id: crypto.randomUUID(), ...values, createdAt: Date.now() }
    dispatch({ type: 'create', item, column })
    pending.current = { focus: cardSelector(item.id), message: `Added ${item.title} to ${COLUMN_TITLES[column]}.` }
    closeDialog()
  }

  function handleSave(itemId: string, values: ItemChanges) {
    dispatch({ type: 'update', itemId, changes: values })
    pending.current = { focus: cardSelector(itemId), message: `Saved changes to ${values.title}.` }
    closeDialog()
  }

  function handleConfirmDelete() {
    const item = confirmDelete && board ? getItem(board, confirmDelete) : undefined
    setConfirmDelete(null)
    if (!board || !item) return
    const next = focusAfterRemove(board, item.id)
    pending.current = {
      focus: next ? ('card' in next ? cardSelector(next.card) : `[data-add-column="${next.column}"]`) : undefined,
      message: `Deleted ${item.title}.`,
    }
    dispatch({ type: 'delete', itemId: item.id })
    if (search.item === item.id) {
      deletedFromDialog.current = item.id
      closeDialog()
    }
  }

  const editingColumn = editing && board ? findColumn(board, editing.id) : undefined
  const dialogMode: ItemDialogMode | null =
    editing && editingColumn
      ? {
          kind: 'edit',
          item: editing,
          column: editingColumn,
          onSave: (values) => handleSave(editing.id, values),
          onDelete: () => setConfirmDelete(editing.id),
        }
      : creating
        ? { kind: 'create', column: creating, onCreate: handleCreate }
        : null
  const deleting = confirmDelete && board ? getItem(board, confirmDelete) : undefined

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-6 pb-4 sm:px-6 lg:px-8 lg:pt-10">
        <PortalLogo />
        <div className="mr-auto">
          <h1 className="font-display text-3xl leading-none tracking-wide text-portal-glow drop-shadow-[0_2px_0_var(--color-ink)] sm:text-4xl">
            Portal Board
          </h1>
          <p className="mt-1 text-sm text-white/70 sm:text-base">Tasks from across the multiverse.</p>
        </div>
        <Link to="/" search={{ new: 'todo' }} resetScroll={false} data-new-item="" className={BUTTON.primary}>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          New item
        </Link>
      </header>

      <main className="flex flex-1 flex-col pb-6">
        {seed !== 'ok' && (
          <div className="mx-auto mb-4 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-dead/60 bg-dead/15 px-4 py-3 text-sm">
              <p role="alert" className="flex-1 basis-60">
                {/* Changes only when another attempt fails, so each failure is announced once. */}
                {seedFailures > 1
                  ? `Still no signal from the Rick and Morty API after ${seedFailures} tries. Character search may not work either.`
                  : 'Couldn’t reach the Rick and Morty API, so the board starts empty and character search may not work.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (seed !== 'retrying') void handleRetry()
                }}
                aria-disabled={seed === 'retrying' ? true : undefined}
                className="rounded-full border-2 border-white/80 px-4 py-1 font-semibold text-white transition-colors hover:bg-white hover:text-ink aria-disabled:opacity-60"
              >
                {seed === 'retrying' ? 'Opening a portal…' : 'Try again'}
              </button>
            </div>
          </div>
        )}
        <KanbanBoard
          board={board}
          onDrop={handleDrop}
          announce={announce}
          actions={actions}
          charactersUnavailable={seed !== 'ok'}
        />
      </main>

      {/* Always mounted, so screen readers pick up every change. */}
      <p role="status" data-testid="announcer" className="sr-only">
        {board === null ? 'Loading the board…' : announcement}
      </p>

      {board && dialogMode && (
        <ItemDialog
          key={editing?.id ?? 'new'}
          mode={dialogMode}
          characters={characters}
          onClose={closeDialog}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this item?"
          message={`“${deleting.title}” will be gone from every dimension. This can’t be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function cardSelector(itemId: string) {
  return `[data-card-id="${CSS.escape(itemId)}"]`
}

/**
 * A polite live region's message. Repeating the same text would not be announced again,
 * so a repeat toggles a trailing non-breaking space to make it a change.
 */
function useAnnouncer() {
  const [message, setMessage] = useState('')
  const announce = useCallback(
    (next: string) => setMessage((previous) => (previous === next ? `${next}\u00a0` : next)),
    [],
  )
  return [message, announce] as const
}
