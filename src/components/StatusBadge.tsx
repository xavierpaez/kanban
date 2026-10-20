import type { CharacterStatus } from '../board/schema'

export const STATUS_LABEL: Record<CharacterStatus, string> = { Alive: 'Alive', Dead: 'Dead', unknown: 'Unknown' }

const STATUS_DOT: Record<CharacterStatus, string> = {
  Alive: 'bg-alive',
  Dead: 'bg-dead',
  unknown: 'bg-unknown',
}

/** `compact` shows only the dot on small screens; the label stays available to screen readers. */
export function StatusBadge({ status, compact = false }: { status: CharacterStatus; compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-medium text-ink/75 ${
        compact ? 'max-sm:bg-transparent max-sm:px-1' : ''
      }`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
      <span className={compact ? 'max-sm:sr-only' : undefined}>{STATUS_LABEL[status]}</span>
    </span>
  )
}
