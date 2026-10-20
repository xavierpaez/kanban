import { useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import type { Character } from '../board/schema'
import type { CharactersResult } from '../server/characters'
import { Avatar } from './Avatar'
import { StatusBadge } from './StatusBadge'
import { INPUT } from './ui'
import { useCharacterSearch } from './useCharacterSearch'

type Props = {
  value: Character | null
  onChange: (character: Character | null) => void
  initial: Promise<CharactersResult>
  error?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * A searchable character field, following the ARIA combobox pattern: type to search the
 * API, use the arrow keys to move through matches, and press Enter to choose one.
 */
export function CharacterPicker({ value, onChange, initial, error, ref }: Props) {
  const id = useId()
  const inputId = `${id}-input`
  const listId = `${id}-list`
  const errorId = `${id}-error`

  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Search only while the list is open, so showing a chosen character costs no request.
  const search = useCharacterSearch(open ? query : '', initial)
  const options = search.characters
  const activeIndex = active < options.length ? active : 0
  const activeOption = open ? options[activeIndex] : undefined

  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  function setInputRef(node: HTMLInputElement | null) {
    inputRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  function show(index: number) {
    setActive(index)
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  function choose(character: Character) {
    onChange(character)
    setQuery(character.name)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setActive(0)
          return
        }
        const step = event.key === 'ArrowDown' ? 1 : -1
        if (options.length > 0) show((activeIndex + step + options.length) % options.length)
        return
      }
      case 'Enter':
        if (!open) return
        // Never submit the form from an open list, and never pick from results that are out of date.
        event.preventDefault()
        if (search.status === 'ready' && activeOption) choose(activeOption)
        return
      case 'Escape':
        if (open) {
          // Close the list only; the dialog around it stays open.
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
        }
        return
    }
  }

  const statusText =
    search.status === 'loading'
      ? 'Searching the multiverse…'
      : search.status === 'error'
        ? 'Couldn’t reach the Rick and Morty API.'
        : options.length === 0
          ? `No characters match “${query.trim()}”.`
          : `${options.length} ${options.length === 1 ? 'character' : 'characters'} found.`

  return (
    <div
      className="flex flex-col gap-1.5"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <label htmlFor={inputId} className="text-sm font-semibold">
        Character <span className="font-normal text-ink/70">(required)</span>
      </label>
      <div className="relative">
        <div className="relative">
          {value && query === value.name ? (
            <Avatar
              name={value.name}
              src={value.image}
              className="pointer-events-none absolute top-1/2 left-2.5 size-7 -translate-y-1/2"
            />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink/60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
            </svg>
          )}
          <input
            ref={setInputRef}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search Rick, Morty, Squanchy…"
            aria-required="true"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? `${id}-option-${activeOption.id}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
              setOpen(true)
              if (value && event.target.value !== value.name) onChange(null)
            }}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={`${INPUT} pl-11 ${error ? 'border-danger' : 'border-ink'}`}
          />
        </div>

        {/* Overlays the fields below, so opening and closing it never moves the buttons under the pointer. */}
        {open && (
          // On short screens the dialog scrolls, so the list joins the normal flow and makes it taller instead.
          <div className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden [@media(max-height:44rem)]:static rounded-xl border-2 border-ink bg-white shadow-[4px_4px_0_0_var(--color-ink)]">
            <ul ref={listRef} id={listId} role="listbox" aria-label="Characters" className="max-h-[min(15rem,35dvh)] overflow-y-auto p-1 empty:hidden">
              {options.map((character, index) => {
                const isActive = index === activeIndex
                const isChosen = value?.id === character.id
                return (
                  <li
                    key={character.id}
                    id={`${id}-option-${character.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-index={index}
                    // Keep focus in the input so the combobox stays in control.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(character)}
                    onMouseMove={() => setActive(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${
                      // An ink outline marks the active option, since the green fill alone is too faint.
                      isActive ? 'bg-portal/25 outline-2 -outline-offset-2 outline-ink' : ''
                    }`}
                  >
                    <Avatar name={character.name} src={character.image} className="size-8 shrink-0" lazy />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{character.name}</span>
                      <span className="block truncate text-xs text-ink/70">{character.species}</span>
                    </span>
                    <StatusBadge status={character.status} compact />
                    {isChosen && (
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isChosen && <span className="sr-only">(current choice)</span>}
                  </li>
                )
              })}
            </ul>
            {(search.status !== 'ready' || options.length === 0) && (
              <div className="flex items-center justify-between gap-2 border-t-2 border-ink/10 px-3 py-2.5 text-sm text-ink/75">
                <span>{statusText}</span>
                {search.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => {
                      search.retry()
                      // The button disappears while retrying, so keep focus in the field.
                      inputRef.current?.focus()
                    }}
                    className="rounded-full border-2 border-ink px-3 py-0.5 text-sm font-semibold text-ink hover:bg-portal/30"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Always mounted, so screen readers announce search progress and result counts. */}
      <p role="status" className="sr-only">
        {open ? statusText : ''}
      </p>

      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
