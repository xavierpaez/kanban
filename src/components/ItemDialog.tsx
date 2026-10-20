import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { COLUMN_TITLES, type ItemChanges } from '../board/board'
import { COLUMN_IDS, ITEM_TITLE_MAX, type Character, type ColumnId, type Item } from '../board/schema'
import type { CharactersResult } from '../server/characters'
import { CharacterPicker } from './CharacterPicker'
import { BUTTON, DIALOG, INPUT, LIGHT_SURFACE } from './ui'
import { useModal } from './useModal'

export type ItemDialogMode =
  | { kind: 'create'; column: ColumnId; onCreate: (values: ItemChanges, column: ColumnId) => void }
  | { kind: 'edit'; item: Item; column: ColumnId; onSave: (values: ItemChanges) => void; onDelete: () => void }

type Props = {
  mode: ItemDialogMode
  characters: Promise<CharactersResult>
  onClose: () => void
}

type Errors = { title?: string; character?: string }

function validate(title: string, character: Character | null): Errors {
  return {
    title: title.trim() ? undefined : 'Give this item a title.',
    character: character ? undefined : 'Pick a character from the list.',
  }
}

/** The create and edit form, shown as a modal dialog. */
export function ItemDialog({ mode, characters, onClose }: Props) {
  const ref = useModal()
  const id = useId()
  const editing = mode.kind === 'edit' ? mode.item : null

  const [title, setTitle] = useState(editing?.title ?? '')
  const [character, setCharacter] = useState<Character | null>(editing?.character ?? null)
  const [column, setColumn] = useState<ColumnId>(mode.column)
  // Errors appear after the first submit attempt, then update as the fields change.
  const [attempted, setAttempted] = useState(false)
  const errors = attempted ? validate(title, character) : {}

  const titleRef = useRef<HTMLInputElement>(null)
  const characterRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => titleRef.current?.focus(), [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problems = validate(title, character)
    if (problems.title || !character) {
      setAttempted(true)
      ;(problems.title ? titleRef : characterRef).current?.focus()
      return
    }
    const values = { title: title.trim(), character }
    if (mode.kind === 'create') mode.onCreate(values, column)
    else mode.onSave(values)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-heading`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // Pinned near the top rather than centered, so it stays put while the character list is open.
      // When the screen is tall enough for the whole form, the list may hang past the bottom edge;
      // on shorter screens the dialog scrolls instead.
      className={`${DIALOG} ${LIGHT_SURFACE} mx-auto mt-[max(1rem,8dvh)] mb-auto max-h-[calc(100dvh-max(1rem,8dvh)-1rem)] w-[min(calc(100%-2rem),30rem)] shadow-[8px_8px_0_0_var(--color-portal)] [@media(min-height:44rem)]:overflow-visible`}
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 max-sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${id}-heading`} className="font-display text-3xl leading-none tracking-wide">
              {editing ? 'Edit item' : 'New item'}
            </h2>
            <p className="mt-1.5 text-sm text-ink/70">
              {editing
                ? `In ${COLUMN_TITLES[mode.column]}. Tweak the details, wubba lubba dub dub.`
                : 'Every task needs a hero. Or at least a Jerry.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1.5 -mr-1.5 grid size-10 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-ink/10 hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-title`} className="text-sm font-semibold">
            Title <span className="font-normal text-ink/70">(required)</span>
          </label>
          <input
            ref={titleRef}
            id={`${id}-title`}
            type="text"
            autoComplete="off"
            maxLength={ITEM_TITLE_MAX}
            placeholder="Recalibrate the portal gun"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-required="true"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            className={`${INPUT} ${errors.title ? 'border-danger' : 'border-ink'}`}
          />
          {errors.title && (
            <p id={`${id}-title-error`} className="text-sm font-medium text-danger">
              {errors.title}
            </p>
          )}
        </div>

        <CharacterPicker
          ref={characterRef}
          value={character}
          onChange={setCharacter}
          initial={characters}
          error={errors.character}
        />

        {mode.kind === 'create' && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">Column</legend>
            <div className="grid grid-cols-3 gap-2">
              {COLUMN_IDS.map((option) => (
                <label
                  key={option}
                  data-accent={option}
                  className="group flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-white px-2 py-2 text-sm font-semibold has-checked:bg-(--accent) has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
                >
                  <input
                    type="radio"
                    name={`${id}-column`}
                    value={option}
                    checked={column === option}
                    onChange={() => setColumn(option)}
                    className="sr-only"
                  />
                  {/* The check marks the choice by shape, not just by the fill color. */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="hidden size-3.5 shrink-0 group-has-checked:block"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {COLUMN_TITLES[option]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-1 flex items-center gap-2 sm:gap-3">
          {mode.kind === 'edit' && (
            <button type="button" onClick={mode.onDelete} className={`${BUTTON.dangerOutline} max-sm:px-3`}>
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4" />
              </svg>
              {/* Icon only on phones, so all three buttons fit on one row. */}
              <span className="max-sm:sr-only">Delete</span>
            </button>
          )}
          <div className="ml-auto flex gap-2 sm:gap-3">
            <button type="button" onClick={onClose} className={`${BUTTON.secondary} max-sm:px-3.5`}>
              Cancel
            </button>
            <button type="submit" className={`${BUTTON.primary} max-sm:px-3.5`}>
              {editing ? 'Save changes' : 'Create item'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
