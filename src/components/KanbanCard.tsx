import { useDndContext } from '@dnd-kit/core'
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ColumnId, Item } from '../board/schema'
import { Avatar } from './Avatar'
import { CardMenu, DotsIcon } from './CardMenu'
import type { CardActions } from './types'
import { STATUS_LABEL, StatusBadge } from './StatusBadge'

// Cards change places by reordering the DOM during a drag, so animate every layout change while sorting.
const animateLayoutChanges: AnimateLayoutChanges = (args) => args.isSorting || defaultAnimateLayoutChanges(args)

// No long-press callout on touch screens, where a long press picks the card up.
const CARD_CLASS =
  'block w-full select-none rounded-2xl border-2 p-4 text-left text-ink touch-manipulation [-webkit-touch-callout:none]'

/** Items created this recently pop in when they first appear. */
const NEW_ITEM_MS = 1500
// Items that have already appeared. A card mounts again when it changes columns, and that
// shouldn't replay its entrance.
const appeared = new Set<string>()

type Props = {
  item: Item
  column: ColumnId
  index: number
  count: number
  actions: CardActions
}

export function KanbanCard({ item, column, index, count, actions }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    animateLayoutChanges,
    attributes: { roleDescription: 'draggable card' },
  })
  const { activatorEvent } = useDndContext()
  // Decided once on mount, so moving the card later doesn't replay the entrance.
  const [isNew] = useState(() => !appeared.has(item.id) && Date.now() - item.createdAt < NEW_ITEM_MS)
  useEffect(() => {
    appeared.add(item.id)
  }, [item.id])

  const cardRef = useRef<HTMLDivElement | null>(null)
  const setCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      cardRef.current = node
      setActivatorNodeRef(node)
    },
    [setActivatorNodeRef],
  )

  // A card that changes columns mounts again under the new column. During a keyboard drag,
  // move focus to the new element so keyboard and screen reader users don't lose their place.
  useLayoutEffect(() => {
    if (isDragging && activatorEvent instanceof KeyboardEvent && document.activeElement !== cardRef.current) {
      cardRef.current?.focus({ preventScroll: true })
    }
  }, [isDragging, activatorEvent])

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative"
    >
      <div
        ref={setCardRef}
        {...attributes}
        {...listeners}
        // dnd-kit stops the click that ends a pointer drag, so a click here is always a plain click.
        onClick={() => actions.edit(item.id)}
        aria-label={`${item.title}. Assigned to ${item.character.name}, ${STATUS_LABEL[item.character.status]}.`}
        data-testid="card"
        data-card-id={item.id}
        // The entrance animates this element, not the list item, because dnd-kit measures the
        // list item to place drops and a scaling box would make those measurements jump.
        className={`${isNew ? 'animate-pop-in' : ''} ${
          isDragging
            ? // The card's own slot becomes the drop placeholder, so it always shows where the card will land.
              `${CARD_CLASS} border-dashed border-(--accent) bg-(--accent)/15 shadow-none`
            : `${CARD_CLASS} cursor-pointer border-ink bg-card shadow-[4px_4px_0_0_var(--accent)] transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--accent)] active:translate-y-px active:shadow-[2px_2px_0_0_var(--accent)]`
        }`}
      >
        <div className={isDragging ? 'opacity-0' : undefined}>
          <CardFace item={item} column={column} />
        </div>
      </div>
      <div className={isDragging ? 'invisible' : undefined}>
        <CardMenu item={item} column={column} index={index} count={count} actions={actions} />
      </div>
    </li>
  )
}

/** The lifted copy of a card that follows the pointer while dragging. */
export function KanbanCardOverlay({ item, column }: { item: Item; column: ColumnId }) {
  return (
    <div
      data-accent={column}
      className={`${CARD_CLASS} relative rotate-[2.5deg] border-ink bg-card scale-[1.04] cursor-grabbing shadow-[10px_12px_0_0_var(--accent)]`}
    >
      <CardFace item={item} column={column} />
      <span aria-hidden="true" className="absolute top-2.5 right-2.5 grid size-8 place-items-center text-ink/70">
        <DotsIcon />
      </span>
    </div>
  )
}

// Memoized: dnd-kit's context re-renders every card on each placement change, but the face only depends on its props.
const CardFace = memo(function CardFace({ item, column }: { item: Item; column: ColumnId }) {
  const done = column === 'done'
  return (
    <>
      {/* Right padding keeps the title clear of the actions button in the corner. */}
      <div className="flex items-start gap-2 pr-7">
        {done && (
          <span
            aria-hidden="true"
            data-done-badge=""
            className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-done text-ink"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
        <p className={`min-w-0 flex-1 text-[15px] leading-snug font-medium break-words ${done ? 'text-ink/65' : ''}`}>
          {item.title}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Avatar name={item.character.name} src={item.character.image} className="size-7 shrink-0" lazy />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink/80">{item.character.name}</span>
        <StatusBadge status={item.character.status} />
      </div>
    </>
  )
})
