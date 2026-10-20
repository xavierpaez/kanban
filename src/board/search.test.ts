import { describe, expect, it } from 'vitest'
import { boardSearchSchema } from './search'

describe('boardSearchSchema', () => {
  it('accepts a column for the create dialog and an item id for the edit dialog', () => {
    expect(boardSearchSchema.parse({ new: 'doing' })).toEqual({ new: 'doing' })
    expect(boardSearchSchema.parse({ item: 'abc-123' })).toEqual({ item: 'abc-123' })
  })

  it('drops values it does not recognize instead of failing', () => {
    expect(boardSearchSchema.parse({ new: 'someday', item: '' })).toEqual({})
    expect(boardSearchSchema.parse({ item: 'x'.repeat(65) })).toEqual({})
    expect(boardSearchSchema.parse({ new: 42, item: ['a'] })).toEqual({})
  })

  it('ignores unrelated params', () => {
    expect(boardSearchSchema.parse({ utm_source: 'portal' })).toEqual({})
  })
})
