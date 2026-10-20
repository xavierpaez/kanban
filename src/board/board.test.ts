import { describe, expect, it } from 'vitest'
import { addItem, boardReducer, findColumn, focusAfterRemove, getItem, moveItem, removeItem, updateItem } from './board'
import { boardWith, morty, rick } from './fixtures'
import { createSeedBoard } from './seed'

describe('moveItem', () => {
  const board = boardWith({ todo: ['a', 'b', 'c'], doing: ['d'], done: [] })

  it('moves an item into another column at the given index', () => {
    expect(moveItem(board, 'b', 'doing', 0).columns).toEqual({ todo: ['a', 'c'], doing: ['b', 'd'], done: [] })
  })

  it('appends to an empty column', () => {
    expect(moveItem(board, 'a', 'done', 0).columns.done).toEqual(['a'])
  })

  it('reorders within a column so the item ends up at the given index', () => {
    expect(moveItem(board, 'a', 'todo', 2).columns.todo).toEqual(['b', 'c', 'a'])
    expect(moveItem(board, 'c', 'todo', 0).columns.todo).toEqual(['c', 'a', 'b'])
  })

  it('clamps an out-of-range index to the end of the column', () => {
    expect(moveItem(board, 'a', 'doing', 99).columns.doing).toEqual(['d', 'a'])
  })

  it('returns the same board when nothing changes or the item is unknown', () => {
    expect(moveItem(board, 'b', 'todo', 1)).toBe(board)
    expect(moveItem(board, 'missing', 'done', 0)).toBe(board)
  })

  it('does not mutate the original board', () => {
    moveItem(board, 'a', 'done', 0)
    expect(board.columns).toEqual({ todo: ['a', 'b', 'c'], doing: ['d'], done: [] })
  })
})

describe('addItem', () => {
  const board = boardWith({ todo: ['a'], doing: [], done: [] })
  const item = { id: 'new', title: 'New', character: rick, createdAt: 1 }

  it('adds the item to the top of the column by default', () => {
    const next = addItem(board, item, 'todo')
    expect(next.columns.todo).toEqual(['new', 'a'])
    expect(next.items.new).toEqual(item)
  })

  it('adds the item at a given index', () => {
    expect(addItem(board, item, 'todo', 1).columns.todo).toEqual(['a', 'new'])
  })

  it('ignores an item whose id already exists', () => {
    expect(addItem(board, { ...item, id: 'a' }, 'done')).toBe(board)
  })
})

describe('updateItem', () => {
  const board = boardWith({ todo: ['a'], doing: [], done: [] })

  it('changes the title and character and keeps the rest', () => {
    const next = updateItem(board, 'a', { title: 'Renamed', character: morty })
    expect(next.items.a).toEqual({ id: 'a', title: 'Renamed', character: morty, createdAt: 0 })
    expect(next.columns).toBe(board.columns)
  })

  it('returns the same board for an unknown item', () => {
    expect(updateItem(board, 'zzz', { title: 'x', character: rick })).toBe(board)
  })
})

describe('removeItem', () => {
  const board = boardWith({ todo: ['a', 'b'], doing: ['c'], done: [] })

  it('removes the item and its place in the column', () => {
    const next = removeItem(board, 'a')
    expect(next.columns.todo).toEqual(['b'])
    expect(next.items).not.toHaveProperty('a')
  })

  it('returns the same board for an unknown item', () => {
    expect(removeItem(board, 'zzz')).toBe(board)
  })
})

describe('getItem', () => {
  const board = boardWith({ todo: ['a'], doing: [], done: [] })

  it('finds an item by id', () => {
    expect(getItem(board, 'a')?.id).toBe('a')
  })

  it('ignores keys inherited from Object.prototype', () => {
    for (const key of ['__proto__', 'constructor', 'toString']) expect(getItem(board, key)).toBeUndefined()
  })
})

describe('focusAfterRemove', () => {
  const board = boardWith({ todo: ['a', 'b', 'c'], doing: ['d'], done: [] })

  it('picks the next card in the column', () => {
    expect(focusAfterRemove(board, 'b')).toEqual({ card: 'c' })
  })

  it('picks the previous card when the removed one was last', () => {
    expect(focusAfterRemove(board, 'c')).toEqual({ card: 'b' })
  })

  it('falls back to the column when it becomes empty', () => {
    expect(focusAfterRemove(board, 'd')).toEqual({ column: 'doing' })
  })

  it('returns null for an unknown item', () => {
    expect(focusAfterRemove(board, 'zzz')).toBeNull()
  })
})

describe('boardReducer', () => {
  it('loads a board, then applies moves', () => {
    const board = boardWith({ todo: ['a'], doing: [], done: [] })
    const loaded = boardReducer(null, { type: 'load', board })
    const moved = boardReducer(loaded, { type: 'move', itemId: 'a', toColumn: 'done', toIndex: 0 })
    expect(moved && findColumn(moved, 'a')).toBe('done')
  })

  it('creates, updates, and deletes items', () => {
    const board = boardWith({ todo: [], doing: [], done: [] })
    const item = { id: 'n', title: 'New', character: rick, createdAt: 1 }
    const created = boardReducer(board, { type: 'create', item, column: 'doing' })
    expect(created?.columns.doing).toEqual(['n'])
    const updated = boardReducer(created, { type: 'update', itemId: 'n', changes: { title: 'Edited', character: morty } })
    expect(updated?.items.n?.title).toBe('Edited')
    const deleted = boardReducer(updated, { type: 'delete', itemId: 'n' })
    expect(deleted).toEqual(board)
  })

  it('seeds an empty board after a retry, but never replaces items the user added', () => {
    const seeded = boardWith({ todo: ['a'], doing: [], done: [] })
    const empty = boardWith({ todo: [], doing: [], done: [] })
    const own = boardWith({ todo: [], doing: ['b'], done: [] })
    expect(boardReducer(empty, { type: 'seed', board: seeded })).toBe(seeded)
    expect(boardReducer(own, { type: 'seed', board: seeded })).toBe(own)
    expect(boardReducer(null, { type: 'seed', board: seeded })).toBe(seeded)
  })

  it('ignores changes before the board has loaded', () => {
    expect(boardReducer(null, { type: 'move', itemId: 'a', toColumn: 'done', toIndex: 0 })).toBeNull()
    expect(boardReducer(null, { type: 'delete', itemId: 'a' })).toBeNull()
  })
})

describe('createSeedBoard', () => {
  it('builds a consistent board from the loaded characters', () => {
    const board = createSeedBoard([rick])
    const placed = [...board.columns.todo, ...board.columns.doing, ...board.columns.done]
    expect(placed).toHaveLength(Object.keys(board.items).length)
    expect(placed.length).toBeGreaterThan(0)
    expect(Object.values(board.items).every((item) => item.character.id === rick.id)).toBe(true)
  })

  it('starts empty when no characters loaded', () => {
    expect(createSeedBoard([])).toEqual({ items: {}, columns: { todo: [], doing: [], done: [] } })
  })
})
