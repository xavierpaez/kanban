import { COLUMN_IDS, columnIdSchema, type Board, type ColumnId, type Item } from './schema'

export const COLUMN_TITLES: Record<ColumnId, string> = {
  todo: 'To Do',
  doing: 'Doing',
  done: 'Done',
}

export function isColumnId(value: unknown): value is ColumnId {
  return columnIdSchema.safeParse(value).success
}

export function emptyBoard(): Board {
  return { items: {}, columns: { todo: [], doing: [], done: [] } }
}

/** Looks up an item by id. Only the board's own keys count, so `?item=__proto__` finds nothing. */
export function getItem(board: Board, itemId: string): Item | undefined {
  return Object.hasOwn(board.items, itemId) ? board.items[itemId] : undefined
}

export function findColumn(board: Board, itemId: string): ColumnId | undefined {
  return COLUMN_IDS.find((column) => board.columns[column].includes(itemId))
}

/** Moves an item so it ends up at `toIndex` in `toColumn`. Returns the same board when nothing changes. */
export function moveItem(board: Board, itemId: string, toColumn: ColumnId, toIndex: number): Board {
  const fromColumn = findColumn(board, itemId)
  if (!fromColumn) return board

  const fromIndex = board.columns[fromColumn].indexOf(itemId)
  if (fromColumn === toColumn && fromIndex === toIndex) return board

  const columns = { ...board.columns, [fromColumn]: board.columns[fromColumn].filter((id) => id !== itemId) }
  const target = [...columns[toColumn]]
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, itemId)
  columns[toColumn] = target
  return { ...board, columns }
}

/** Adds a new item to `column` at `index` (the top by default). */
export function addItem(board: Board, item: Item, column: ColumnId, index = 0): Board {
  if (board.items[item.id]) return board
  const target = [...board.columns[column]]
  target.splice(Math.max(0, Math.min(index, target.length)), 0, item.id)
  return { items: { ...board.items, [item.id]: item }, columns: { ...board.columns, [column]: target } }
}

export type ItemChanges = Pick<Item, 'title' | 'character'>

export function updateItem(board: Board, itemId: string, changes: ItemChanges): Board {
  const item = board.items[itemId]
  if (!item) return board
  return { ...board, items: { ...board.items, [itemId]: { ...item, ...changes } } }
}

export function removeItem(board: Board, itemId: string): Board {
  const column = findColumn(board, itemId)
  if (!column) return board
  const { [itemId]: _removed, ...items } = board.items
  return { items, columns: { ...board.columns, [column]: board.columns[column].filter((id) => id !== itemId) } }
}

/**
 * What should take focus after `itemId` is removed: the next card in its column, else the
 * previous one, else the column itself (its add button), since the column is now empty.
 */
export function focusAfterRemove(board: Board, itemId: string): { card: string } | { column: ColumnId } | null {
  const column = findColumn(board, itemId)
  if (!column) return null
  const ids = board.columns[column]
  const index = ids.indexOf(itemId)
  const neighbor = ids[index + 1] ?? ids[index - 1]
  return neighbor ? { card: neighbor } : { column }
}

export type BoardAction =
  | { type: 'load'; board: Board }
  /** A late seed, after a retry. It applies only while the board is still empty. */
  | { type: 'seed'; board: Board }
  | { type: 'move'; itemId: string; toColumn: ColumnId; toIndex: number }
  | { type: 'create'; item: Item; column: ColumnId }
  | { type: 'update'; itemId: string; changes: ItemChanges }
  | { type: 'delete'; itemId: string }

/** The board is `null` until it has been read from storage or seeded on the client. */
export function boardReducer(board: Board | null, action: BoardAction): Board | null {
  if (action.type === 'load') return action.board
  if (action.type === 'seed') return !board || Object.keys(board.items).length === 0 ? action.board : board
  if (!board) return board
  switch (action.type) {
    case 'move':
      return moveItem(board, action.itemId, action.toColumn, action.toIndex)
    case 'create':
      return addItem(board, action.item, action.column)
    case 'update':
      return updateItem(board, action.itemId, action.changes)
    case 'delete':
      return removeItem(board, action.itemId)
  }
}
