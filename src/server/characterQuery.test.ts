import { describe, expect, it } from 'vitest'
import { CHARACTER_QUERY_MAX, parseCharacterQuery } from './characterQuery'

describe('parseCharacterQuery', () => {
  it('trims the name and treats a blank name as no filter', () => {
    expect(parseCharacterQuery({ name: '  morty ' })).toEqual({ name: 'morty' })
    expect(parseCharacterQuery({ name: '   ' })).toEqual({ name: undefined })
    expect(parseCharacterQuery({})).toEqual({ name: undefined })
  })

  it('rejects names that are too long or not text, without exposing schema details', () => {
    expect(() => parseCharacterQuery({ name: 'x'.repeat(CHARACTER_QUERY_MAX + 1) })).toThrow('Invalid character query.')
    expect(() => parseCharacterQuery({ name: 42 } as never)).toThrow('Invalid character query.')
  })
})
