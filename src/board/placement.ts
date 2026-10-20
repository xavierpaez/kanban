import { findColumn, isColumnId } from './board'
import { COLUMN_IDS, type Board, type ColumnId } from './schema'

export type Placement = { column: ColumnId; index: number }

/**
 * Resolves a collision hit (a column, or a card in it) to the column under the dragged card
 * and the other cards in that column it can land next to. No candidates means the column
 * itself is the target.
 */
export function dropCandidates(
  board: Board,
  itemId: string,
  hitId: string,
): { column: ColumnId; candidates: string[] } | null {
  const column = isColumnId(hitId) ? hitId : findColumn(board, hitId)
  if (!column) return null
  return { column, candidates: board.columns[column].filter((id) => id !== itemId) }
}

/**
 * Where a pointer-dragged card should land. `overId` is the column under the pointer,
 * or the card in that column closest to the dragged card. The dragged card goes above
 * that card when its center is in the upper half, and below it otherwise.
 */
export function placementFromPointer(
  board: Board,
  itemId: string,
  overId: string,
  draggedCenterY: number,
  overRect: { top: number; height: number },
): Placement | null {
  if (isColumnId(overId)) {
    const others = board.columns[overId].filter((id) => id !== itemId)
    return { column: overId, index: others.length }
  }
  const column = findColumn(board, overId)
  if (!column || overId === itemId) return null
  const others = board.columns[column].filter((id) => id !== itemId)
  const overIndex = others.indexOf(overId)
  const below = draggedCenterY > overRect.top + overRect.height / 2
  return { column, index: overIndex + (below ? 1 : 0) }
}

export type Direction = 'up' | 'down' | 'left' | 'right'

/** Where a keyboard-dragged card lands after one arrow key press, or null at an edge. */
export function placementFromKey(board: Board, itemId: string, direction: Direction): Placement | null {
  const column = findColumn(board, itemId)
  if (!column) return null
  const index = board.columns[column].indexOf(itemId)

  if (direction === 'up') return index > 0 ? { column, index: index - 1 } : null
  if (direction === 'down') return index < board.columns[column].length - 1 ? { column, index: index + 1 } : null

  const target = COLUMN_IDS[COLUMN_IDS.indexOf(column) + (direction === 'right' ? 1 : -1)]
  if (!target) return null
  return { column: target, index: Math.min(index, board.columns[target].length) }
}
