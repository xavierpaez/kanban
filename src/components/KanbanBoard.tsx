import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragMoveEvent,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
  type SensorContext,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import type { Coordinates } from '@dnd-kit/utilities'
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COLUMN_TITLES, findColumn, moveItem } from '../board/board'
import { dropCandidates, placementFromKey, placementFromPointer, type Direction, type Placement } from '../board/placement'
import { COLUMN_IDS, type Board } from '../board/schema'
import type { CardActions } from './types'
import { KanbanCardOverlay } from './KanbanCard'
import { KanbanColumn } from './KanbanColumn'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * While a card is dragged, the board renders `preview`. The dragged card's own slot in
 * the preview is the drop placeholder, and dropping commits exactly that position.
 */
type Drag = { itemId: string; preview: Board }

/** Matches the `gap-3` between cards in KanbanColumn. */
const CARD_GAP_PX = 12

const KEY_DIRECTIONS: Partial<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/** How long a dropped card takes to settle into place. */
export const DROP_MS = 220

const DROP_ANIMATION: DropAnimation = {
  duration: DROP_MS,
  easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
  sideEffects: (params) => {
    // The lifted card is tilted and scaled up. Settle it flat while it lands so it doesn't snap at the end.
    params.dragOverlay.node.firstElementChild?.animate(
      [
        { rotate: '2.5deg', scale: '1.04' },
        { rotate: '0deg', scale: '1' },
      ],
      { duration: DROP_MS, easing: 'ease-out', fill: 'forwards' },
    )
    return defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } })(params)
  },
}

// Scroll only near the edges and ramp up gently. The defaults race past the next column on phones,
// where the columns scroll sideways and the next one is only a sliver at the edge.
const AUTO_SCROLL = { threshold: { x: 0.12, y: 0.15 }, acceleration: 3 }

const SCREEN_READER_INSTRUCTIONS =
  'To pick up a card, press Space or Enter. Use the arrow keys to move it within a column or to another column. Press Space or Enter again to drop it, or Escape to cancel.'

type Props = {
  /** `null` while the board is still loading on the client. */
  board: Board | null
  onDrop: (itemId: string, to: Placement) => void
  announce: (message: string) => void
  actions: CardActions
  /** True while the API is unreachable, so new items can't get a character. */
  charactersUnavailable: boolean
}

export function KanbanBoard({ board, onDrop, announce, actions, charactersUnavailable }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const shown = drag?.preview ?? board
  const reducedMotion = usePrefersReducedMotion()
  const rowRef = useRef<HTMLDivElement>(null)
  // Scroll snapping stays off from pickup until the dropped card has settled; see `settle`.
  const [settling, setSettling] = useState(false)
  const dndId = useId()

  // dnd-kit calls sensors, handlers, and announcements between renders. Key presses can
  // arrive before React re-renders, so the drag is mirrored in a ref that updates synchronously.
  const dragRef = useRef<Drag | null>(null)
  const boardRef = useRef(board)
  useLayoutEffect(() => {
    boardRef.current = board
  })
  const lastOverId = useRef<UniqueIdentifier | null>(null)
  const lastAnnounced = useRef('')

  const updateDrag = useCallback((next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  const applyPlacement = useCallback(
    (placement: Placement | null) => {
      const current = dragRef.current
      if (!placement || !current) return
      const preview = moveItem(current.preview, current.itemId, placement.column, placement.index)
      if (preview !== current.preview) updateDrag({ ...current, preview })
    },
    [updateDrag],
  )

  // Arrow keys move the card one slot at a time, and the lifted card jumps to that slot.
  const keyboardCoordinates: KeyboardCoordinateGetter = useCallback(
    (event, { context, currentCoordinates }) => {
      const direction = KEY_DIRECTIONS[event.code]
      const current = dragRef.current
      if (!direction || !current) return undefined
      event.preventDefault()
      const placement = placementFromKey(current.preview, current.itemId, direction)
      if (!placement) {
        announce(edgeMessage(current, direction))
        return currentCoordinates
      }
      const slot = slotPosition(current, placement, context)
      applyPlacement(placement)
      return slot ?? currentCoordinates
    },
    [applyPlacement, announce],
  )

  const sensors = useSensors(
    // A small distance keeps plain clicks from starting a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A short press-and-hold lets touch users scroll the board without grabbing cards.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  )

  // Find the column under the pointer, then the card in it closest to the dragged card.
  // Remembering the last target keeps the placeholder steady over gaps between columns.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!shown) return []
      const pointerHits = pointerWithin(args)
      const hitId = getFirstCollision(pointerHits.length > 0 ? pointerHits : rectIntersection(args), 'id')
      const target = hitId == null ? null : dropCandidates(shown, String(args.active.id), String(hitId))
      if (!target) return lastOverId.current == null ? [] : [{ id: lastOverId.current }]

      const { column, candidates } = target
      const closest = closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((container) =>
          candidates.includes(String(container.id)),
        ),
      })[0]
      const overId = closest?.id ?? column
      lastOverId.current = overId
      return [{ id: overId }]
    },
    [shown],
  )

  const announcements: Announcements = useMemo(() => {
    const view = () => dragRef.current?.preview ?? boardRef.current
    const title = (id: UniqueIdentifier) => view()?.items[String(id)]?.title ?? 'Card'
    const place = (id: UniqueIdentifier) => {
      const board = view()
      return board ? describePlace(board, id) : 'its column'
    }
    const announceMove = (id: UniqueIdentifier) => {
      const where = place(id)
      if (where === lastAnnounced.current) return undefined
      lastAnnounced.current = where
      return `${title(id)} moved to ${where}.`
    }
    return {
      onDragStart: ({ active }) => {
        lastAnnounced.current = place(active.id)
        return `Picked up ${title(active.id)}. It is in ${lastAnnounced.current}.`
      },
      onDragMove: ({ active }) => announceMove(active.id),
      onDragOver: ({ active }) => announceMove(active.id),
      onDragEnd: ({ active }) => `${title(active.id)} dropped in ${place(active.id)}.`,
      onDragCancel: ({ active }) => `Move cancelled. ${title(active.id)} is back in ${place(active.id)}.`,
    }
  }, [])

  function handleDragStart({ active, activatorEvent }: DragStartEvent) {
    if (!board) return
    // A tiny buzz confirms a long-press pickup on phones that support it.
    if (typeof TouchEvent !== 'undefined' && activatorEvent instanceof TouchEvent) navigator.vibrate?.(10)
    lastOverId.current = null
    updateDrag({ itemId: String(active.id), preview: board })
  }

  function handleDragMove({ active, over, activatorEvent }: DragMoveEvent) {
    // Keyboard drags are positioned by the coordinate getter instead.
    const current = dragRef.current
    if (activatorEvent instanceof KeyboardEvent || !current || !over) return
    const dragged = active.rect.current.translated
    if (!dragged) return
    const centerY = dragged.top + dragged.height / 2
    applyPlacement(placementFromPointer(current.preview, current.itemId, String(over.id), centerY, over.rect))
  }

  /**
   * On the sideways-scrolling layout, turning snapping back on at the drop would jump the row
   * while the card is still flying to its slot. So wait for the drop animation, glide the card's
   * column to the center, and only then snap again.
   */
  function settle(itemId: string | undefined) {
    setSettling(true)
    setTimeout(
      () => {
        const row = rowRef.current
        const section = itemId && row?.querySelector(`[data-card-id="${CSS.escape(itemId)}"]`)?.closest('section')
        if (!row || !section || row.scrollWidth <= row.clientWidth) {
          setSettling(false)
          return
        }
        const rowBox = row.getBoundingClientRect()
        const box = section.getBoundingClientRect()
        const left = row.scrollLeft + box.left - rowBox.left - (row.clientWidth - box.width) / 2
        if (Math.abs(left - row.scrollLeft) < 1) {
          setSettling(false)
          return
        }
        const done = () => setSettling(false)
        row.addEventListener('scrollend', done, { once: true })
        setTimeout(done, 600) // in case `scrollend` isn't supported
        row.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' })
      },
      reducedMotion ? 0 : DROP_MS,
    )
  }

  function handleDragEnd() {
    const finished = dragRef.current
    if (finished) {
      // dnd-kit announces the drop before React re-renders, so point announcements at the result now.
      boardRef.current = finished.preview
    }
    updateDrag(null)
    settle(finished?.itemId)
    if (!finished) return
    const column = findColumn(finished.preview, finished.itemId)
    if (!column) return
    onDrop(finished.itemId, { column, index: finished.preview.columns[column].indexOf(finished.itemId) })
  }

  const activeItem = drag ? shown?.items[drag.itemId] : undefined
  const activeColumn = drag ? findColumn(drag.preview, drag.itemId) : undefined

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={AUTO_SCROLL}
      accessibility={{ announcements, screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        settle(dragRef.current?.itemId)
        updateDrag(null)
      }}
    >
      {/* Below 56rem the columns scroll sideways with the next one peeking in; from 56rem up they form a grid. */}
      {/* Snapping pauses during a drag, so it doesn't fight auto-scrolling toward the next column. */}
      <div
        ref={rowRef}
        className={`mx-auto flex w-full max-w-7xl flex-1 gap-4 overflow-x-auto ${drag || settling ? '' : 'snap-x snap-mandatory'} px-4 pt-2 pb-4 sm:px-6 min-[56rem]:grid min-[56rem]:grid-cols-3 min-[56rem]:overflow-visible lg:gap-6 lg:px-8`}
      >
        {COLUMN_IDS.map((column) => (
          <KanbanColumn
            key={column}
            column={column}
            items={shown ? shown.columns[column].flatMap((id) => shown.items[id] ?? []) : null}
            highlighted={activeColumn === column}
            dragging={drag !== null}
            actions={actions}
            charactersUnavailable={charactersUnavailable}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={reducedMotion ? null : DROP_ANIMATION}>
        {activeItem && activeColumn ? <KanbanCardOverlay item={activeItem} column={activeColumn} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

/** What a keyboard drag says when an arrow key can't move the card any further. */
function edgeMessage(drag: Drag, direction: Direction): string {
  if (direction === 'left') return 'Already in the first column.'
  if (direction === 'right') return 'Already in the last column.'
  const column = findColumn(drag.preview, drag.itemId)
  const where = column ? COLUMN_TITLES[column] : 'the column'
  return `Already at the ${direction === 'up' ? 'top' : 'bottom'} of ${where}.`
}

/** Describes where an item sits, for example "Doing, position 2 of 3". */
function describePlace(board: Board, id: UniqueIdentifier): string {
  const column = findColumn(board, String(id))
  if (!column) return 'its column'
  const ids = board.columns[column]
  return `${COLUMN_TITLES[column]}, position ${ids.indexOf(String(id)) + 1} of ${ids.length}`
}

/**
 * Where the lifted card should sit once it occupies `to`, measured from the current layout.
 * Moving down aligns its bottom with the next card's bottom, moving up aligns its top with
 * the previous card's top, and moving sideways lines it up with the target slot.
 */
function slotPosition(drag: Drag, to: Placement, { droppableRects, collisionRect }: SensorContext): Coordinates | null {
  if (!collisionRect) return null
  const from = findColumn(drag.preview, drag.itemId)
  if (!from) return null

  if (to.column === from) {
    const ids = drag.preview.columns[from]
    const neighbor = droppableRects.get(ids[to.index] ?? '')
    if (!neighbor) return null
    const movingDown = to.index > ids.indexOf(drag.itemId)
    return { x: collisionRect.left, y: movingDown ? neighbor.bottom - collisionRect.height : neighbor.top }
  }

  const column = droppableRects.get(to.column)
  if (!column) return null
  const x = column.left + (column.width - collisionRect.width) / 2
  const targetIds = drag.preview.columns[to.column]
  const atIndex = droppableRects.get(targetIds[to.index] ?? '')
  if (atIndex) return { x, y: atIndex.top }
  const last = droppableRects.get(targetIds.at(-1) ?? '')
  return { x, y: last ? last.bottom + CARD_GAP_PX : column.top }
}
