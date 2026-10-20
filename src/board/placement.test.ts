import { describe, expect, it } from 'vitest'
import { dropCandidates, placementFromKey, placementFromPointer } from './placement'
import { boardWith } from './fixtures'

const board = boardWith({ todo: ['a', 'b', 'c'], doing: ['d', 'e'], done: [] })
const rect = { top: 100, height: 80 } // center at 140

describe('dropCandidates', () => {
  it('resolves a card hit to its column and the other cards in it', () => {
    expect(dropCandidates(board, 'a', 'e')).toEqual({ column: 'doing', candidates: ['d', 'e'] })
  })

  it('leaves the dragged card out when it is the hit', () => {
    expect(dropCandidates(board, 'a', 'a')).toEqual({ column: 'todo', candidates: ['b', 'c'] })
  })

  it('targets an empty column directly', () => {
    expect(dropCandidates(board, 'a', 'done')).toEqual({ column: 'done', candidates: [] })
  })

  it('returns null for an unknown id', () => {
    expect(dropCandidates(board, 'a', 'zzz')).toBeNull()
  })
})

describe('placementFromPointer', () => {
  it('places the card above a hovered card when its center is in the upper half', () => {
    expect(placementFromPointer(board, 'a', 'e', 130, rect)).toEqual({ column: 'doing', index: 1 })
  })

  it('places the card below a hovered card when its center is in the lower half', () => {
    expect(placementFromPointer(board, 'a', 'e', 150, rect)).toEqual({ column: 'doing', index: 2 })
  })

  it('ignores the dragged card itself when counting positions in its own column', () => {
    expect(placementFromPointer(board, 'a', 'c', 150, rect)).toEqual({ column: 'todo', index: 2 })
    expect(placementFromPointer(board, 'c', 'a', 130, rect)).toEqual({ column: 'todo', index: 0 })
  })

  it('appends to a column hovered directly, such as an empty one', () => {
    expect(placementFromPointer(board, 'a', 'done', 0, rect)).toEqual({ column: 'done', index: 0 })
  })

  it('returns null when hovering the dragged card or an unknown id', () => {
    expect(placementFromPointer(board, 'a', 'a', 0, rect)).toBeNull()
    expect(placementFromPointer(board, 'a', 'zzz', 0, rect)).toBeNull()
  })
})

describe('placementFromKey', () => {
  it('moves up and down within a column and stops at the edges', () => {
    expect(placementFromKey(board, 'b', 'up')).toEqual({ column: 'todo', index: 0 })
    expect(placementFromKey(board, 'b', 'down')).toEqual({ column: 'todo', index: 2 })
    expect(placementFromKey(board, 'a', 'up')).toBeNull()
    expect(placementFromKey(board, 'c', 'down')).toBeNull()
  })

  it('moves to the neighboring column at the same height, clamped to its length', () => {
    expect(placementFromKey(board, 'a', 'right')).toEqual({ column: 'doing', index: 0 })
    expect(placementFromKey(board, 'c', 'right')).toEqual({ column: 'doing', index: 2 })
    expect(placementFromKey(board, 'd', 'right')).toEqual({ column: 'done', index: 0 })
    expect(placementFromKey(board, 'd', 'left')).toEqual({ column: 'todo', index: 0 })
  })

  it('stops at the first and last columns', () => {
    expect(placementFromKey(board, 'a', 'left')).toBeNull()
    expect(placementFromKey(boardWith({ todo: [], doing: [], done: ['x'] }), 'x', 'right')).toBeNull()
  })
})
