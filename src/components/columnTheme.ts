import type { ColumnId } from '../board/schema'

export const COLUMN_TAGLINES: Record<ColumnId, string> = {
  todo: 'Waiting in the garage',
  doing: 'Mid-adventure',
  done: 'Wubba lubba dub dub!',
}

/** What an empty column says when nothing is being dragged. */
export const EMPTY_COLUMN_COPY: Record<ColumnId, string> = {
  todo: 'Nothing to do? That’s suspicious.',
  doing: 'Nobody’s on an adventure right now.',
  done: 'Nothing finished yet. Don’t be a Jerry.',
}
