import { memo, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { COLUMN_TITLES } from '../board/board'
import { COLUMN_IDS, type ColumnId, type Item } from '../board/schema'
import type { CardActions } from './types'
import { LIGHT_SURFACE } from './ui'

type Props = {
  item: Item
  column: ColumnId
  index: number
  count: number
  actions: CardActions
}

const MENU_GAP_PX = 6

/**
 * A card's actions menu. Dragging needs a pointer or the arrow keys, so every move is also
 * offered here as a single action. It follows the ARIA menu button pattern and renders in
 * the top layer as a popover, so columns never clip it. Memoized because dnd-kit re-renders
 * every card on each drag frame, and the menu's props don't change while dragging.
 */
export const CardMenu = memo(function CardMenu({ item, column, index, count, actions }: Props) {
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  // Opening with ArrowUp focuses the last item instead of the first.
  const focusLast = useRef(false)

  const entries: { label: string; icon: ReactNode; danger?: boolean; run: () => void }[] = [
    { label: 'Edit', icon: <PencilIcon />, run: () => actions.edit(item.id) },
    ...COLUMN_IDS.filter((target) => target !== column).map((target) => ({
      label: `Move to ${COLUMN_TITLES[target]}`,
      icon: <ArrowIcon direction={COLUMN_IDS.indexOf(target) > COLUMN_IDS.indexOf(column) ? 'right' : 'left'} />,
      run: () => actions.move(item.id, { column: target, index: 0 }),
    })),
    ...(index > 0
      ? [{ label: 'Move up', icon: <ArrowIcon direction="up" />, run: () => actions.move(item.id, { column, index: index - 1 }) }]
      : []),
    ...(index < count - 1
      ? [{ label: 'Move down', icon: <ArrowIcon direction="down" />, run: () => actions.move(item.id, { column, index: index + 1 }) }]
      : []),
    { label: 'Delete', icon: <TrashIcon />, danger: true, run: () => actions.remove(item.id) },
  ]

  function menuItems() {
    return [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
  }

  function close() {
    // Return focus first: once focus is outside the popover, hiding it leaves focus alone.
    triggerRef.current?.focus({ preventScroll: true })
    if (menuRef.current?.matches(':popover-open')) menuRef.current.hidePopover()
  }

  // The menu is positioned once when it opens, so it closes on scroll or resize instead of
  // drifting away from its button. The listeners attach as it opens, so none are missed.
  const stopWatching = useRef<AbortController | null>(null)
  useEffect(() => () => stopWatching.current?.abort(), [])

  function watchLayout(isOpen: boolean) {
    stopWatching.current?.abort()
    stopWatching.current = null
    if (!isOpen) return
    const controller = new AbortController()
    window.addEventListener('resize', close, { signal: controller.signal })
    window.addEventListener('scroll', close, { capture: true, passive: true, signal: controller.signal })
    stopWatching.current = controller
  }

  function place() {
    const trigger = triggerRef.current?.getBoundingClientRect()
    const menu = menuRef.current
    if (!trigger || !menu) return
    menu.style.right = `${Math.max(8, window.innerWidth - trigger.right)}px`
    menu.style.top = `${trigger.bottom + MENU_GAP_PX}px`
    // Flip above the button when there is no room below.
    const height = menu.offsetHeight
    if (trigger.bottom + MENU_GAP_PX + height > window.innerHeight && trigger.top - MENU_GAP_PX - height > 0) {
      menu.style.top = `${trigger.top - MENU_GAP_PX - height}px`
    }
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    focusLast.current = event.key === 'ArrowUp'
    menuRef.current?.showPopover()
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = menuItems()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => items.at(next % items.length)?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(current + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(current - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(-1)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        menuRef.current?.hidePopover()
        break
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={menuId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Actions for ${item.title}`}
        onKeyDown={handleTriggerKeyDown}
        // The pseudo-element widens the touch target beyond the visible circle.
        className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full before:absolute before:-inset-1.5 before:rounded-full text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink aria-expanded:bg-ink aria-expanded:text-card"
      >
        <DotsIcon />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label={`Actions for ${item.title}`}
        onBeforeToggle={(event) => {
          if (event.newState === 'open') menuRef.current?.style.setProperty('top', '-9999px')
        }}
        onToggle={(event) => {
          const isOpen = event.newState === 'open'
          setOpen(isOpen)
          watchLayout(isOpen)
          if (!isOpen) return
          place()
          const items = menuItems()
          ;(focusLast.current ? items.at(-1) : items[0])?.focus()
          focusLast.current = false
        }}
        onKeyDown={handleMenuKeyDown}
        className={`${LIGHT_SURFACE} fixed inset-auto m-0 min-w-48 rounded-2xl border-2 border-ink bg-card p-1.5 shadow-[5px_5px_0_0_var(--color-ink)]`}
      >
        {entries.map((entry) => [
          entry.danger && <div key="separator" role="separator" className="mx-2 my-1 h-0.5 rounded-full bg-ink/10" />,
          <button
            key={entry.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              entry.run()
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium outline-offset-0 hover:bg-portal/25 focus-visible:bg-portal/25 ${
              entry.danger ? 'text-danger' : ''
            }`}
          >
            {entry.icon}
            {entry.label}
          </button>,
        ])}
      </div>
    </>
  )
})

/** The menu button's dots, also drawn on the lifted card so it looks the same while dragging. */
export function DotsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <circle cx="3" cy="8" r="1.6" />
      <circle cx="8" cy="8" r="1.6" />
      <circle cx="13" cy="8" r="1.6" />
    </svg>
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function PencilIcon() {
  return (
    <Icon>
      <path d="m10.5 2.5 3 3L6 13H3v-3z" />
    </Icon>
  )
}

function TrashIcon() {
  return (
    <Icon>
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4" />
    </Icon>
  )
}

const ARROW_ROTATION = { right: 0, down: 90, left: 180, up: 270 }

function ArrowIcon({ direction }: { direction: keyof typeof ARROW_ROTATION }) {
  return (
    <Icon>
      <g transform={`rotate(${ARROW_ROTATION[direction]} 8 8)`}>
        <path d="M3 8h10M9 4l4 4-4 4" />
      </g>
    </Icon>
  )
}
