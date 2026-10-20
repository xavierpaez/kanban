import { useDroppable } from '@dnd-kit/core'
import { SortableContext, type SortingStrategy } from '@dnd-kit/sortable'
import { Link } from '@tanstack/react-router'
import { COLUMN_TITLES } from '../board/board'
import type { ColumnId, Item } from '../board/schema'
import type { CardActions } from './types'
import { COLUMN_TAGLINES, EMPTY_COLUMN_COPY } from './columnTheme'
import { KanbanCard } from './KanbanCard'

// The board reorders cards itself during a drag, so dnd-kit should not shift them with transforms.
const noDisplacement: SortingStrategy = () => null

type Props = {
  column: ColumnId
  /** `null` while the board is still loading on the client. */
  items: Item[] | null
  highlighted: boolean
  /** True while any card is being dragged. */
  dragging: boolean
  actions: CardActions
  charactersUnavailable: boolean
}

export function KanbanColumn({ column, items, highlighted, dragging, actions, charactersUnavailable }: Props) {
  const { setNodeRef } = useDroppable({ id: column })
  const headingId = `column-${column}-heading`
  const ids = items?.map((item) => item.id) ?? []

  return (
    <section
      aria-labelledby={headingId}
      data-accent={column}
      className={`flex w-[min(calc(100vw-4.5rem),22rem)] shrink-0 snap-center flex-col rounded-[28px] border-2 backdrop-blur-sm transition-[background-color,border-color,box-shadow] duration-200 md:w-[calc(50vw-3rem)] min-[56rem]:w-auto ${
        highlighted
          ? // The sideways-scrolling row clips outer shadows, so the glow sits inside until the grid layout.
            'border-(--accent) bg-(--accent)/10 shadow-[inset_0_0_28px_-8px_var(--accent)] min-[56rem]:shadow-[0_0_36px_-6px_var(--accent)]'
          : 'border-white/10 bg-white/[0.045]'
      }`}
    >
      <header className="flex items-center gap-3 px-5 pt-5 pb-4">
        <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-(--accent) shadow-[0_0_12px_var(--accent)]" />
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="font-display text-2xl leading-none tracking-wide text-(--accent)">
            {COLUMN_TITLES[column]}
          </h2>
          <p className="mt-1 truncate text-xs text-white/60">{COLUMN_TAGLINES[column]}</p>
        </div>
        {items === null ? (
          <span aria-hidden="true" className="h-6 w-8 animate-shimmer rounded-full bg-white/10" />
        ) : (
          <span className="rounded-full bg-(--accent) px-2.5 py-0.5 text-sm font-semibold text-ink tabular-nums">
            {items.length}
            <span className="sr-only"> {items.length === 1 ? 'item' : 'items'}</span>
          </span>
        )}
        <Link
          to="/"
          search={{ new: column }}
          resetScroll={false}
          aria-label={`Add item to ${COLUMN_TITLES[column]}`}
          data-add-column={column}
          className="relative grid size-8 shrink-0 place-items-center rounded-full border-2 before:absolute before:-inset-1.5 before:rounded-full border-(--accent) text-(--accent) transition-colors hover:bg-(--accent) hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      {/* Extra right padding leaves room for the cards' offset shadow. */}
      <div ref={setNodeRef} className="flex min-h-48 flex-1 flex-col pr-4 pb-4 pl-3">
        {items === null ? (
          <div aria-hidden="true" className="flex flex-col gap-3">
            <div className="h-24 animate-shimmer rounded-2xl bg-white/10" />
            <div className="h-24 animate-shimmer rounded-2xl bg-white/10 [animation-delay:200ms]" />
          </div>
        ) : (
          <SortableContext id={column} items={ids} strategy={noDisplacement}>
            <ul className="flex flex-col gap-3">
              {items.map((item, index) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  column={column}
                  index={index}
                  count={items.length}
                  actions={actions}
                />
              ))}
            </ul>
            {items.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 p-6 text-center">
                {dragging ? (
                  <p className="text-sm font-medium text-white/70">Drop items here</p>
                ) : charactersUnavailable ? (
                  // Every item needs a character, so don't offer a form that can't be finished.
                  <p className="text-sm text-white/70">Characters are lost in another dimension. Try again above.</p>
                ) : (
                  <>
                    <p className="text-sm text-white/70">{EMPTY_COLUMN_COPY[column]}</p>
                    <Link
                      to="/"
                      search={{ new: column }}
                      resetScroll={false}
                      aria-label={`Add an item to ${COLUMN_TITLES[column]}`}
                      className="rounded-full border-2 border-(--accent) px-4 py-1.5 text-sm font-semibold text-(--accent) transition-colors hover:bg-(--accent) hover:text-ink"
                    >
                      Add an item
                    </Link>
                  </>
                )}
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </section>
  )
}
