import { describe, expect, it } from 'vitest'
import { boardWith, rick } from './fixtures'
import { createSeedBoard } from './seed'
import { parseStoredBoard, shouldSave } from './storage'


describe('parseStoredBoard', () => {
  it('round-trips a saved board', () => {
    const board = createSeedBoard([rick])
    expect(parseStoredBoard(JSON.stringify(board))).toEqual(board)
  })

  it('returns null for missing or corrupt data', () => {
    expect(parseStoredBoard(null)).toBeNull()
    expect(parseStoredBoard('{not json')).toBeNull()
    expect(parseStoredBoard(JSON.stringify({ items: {} }))).toBeNull()
  })

  it('rejects a board whose columns and items disagree', () => {
    const board = createSeedBoard([rick])
    const [first] = board.columns.todo
    const duplicated = { ...board, columns: { ...board.columns, done: [...board.columns.done, first] } }
    expect(parseStoredBoard(JSON.stringify(duplicated))).toBeNull()

    const orphaned = { ...board, columns: { ...board.columns, todo: [] } }
    expect(parseStoredBoard(JSON.stringify(orphaned))).toBeNull()
  })

  it('rejects a board whose item keys do not match their ids', () => {
    const board = createSeedBoard([rick])
    const [id] = board.columns.todo
    const mismatched = structuredClone(board)
    mismatched.items[id!] = { ...mismatched.items[id!]!, id: 'someone-else' }
    expect(parseStoredBoard(JSON.stringify(mismatched))).toBeNull()
  })

  it('rejects a board that is missing a column', () => {
    const board = createSeedBoard([rick])
    const { done: _done, ...partial } = board.columns
    expect(parseStoredBoard(JSON.stringify({ ...board, columns: partial }))).toBeNull()
  })

  it('rejects avatar URLs that do not point at the API', () => {
    const board = createSeedBoard([rick])
    const [id] = board.columns.todo
    const tampered = structuredClone(board)
    tampered.items[id!]!.character.image = 'javascript:alert(1)'
    expect(parseStoredBoard(JSON.stringify(tampered))).toBeNull()
  })
})

describe('shouldSave', () => {
  const empty = boardWith({ todo: [], doing: [], done: [] })
  const withItem = boardWith({ todo: ['a'], doing: [], done: [] })

  it('does not save an empty board that was never saved, so a failed seed is retried', () => {
    expect(shouldSave(false, empty)).toBe(false)
  })

  it('starts saving once the board has items', () => {
    expect(shouldSave(false, withItem)).toBe(true)
  })

  it('keeps saving after the last item is deleted, so the deletion sticks', () => {
    expect(shouldSave(true, empty)).toBe(true)
  })
})
