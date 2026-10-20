import { z } from 'zod/mini'

export const CHARACTER_QUERY_MAX = 100

const characterQuerySchema = z.object({
  name: z.optional(z.string().check(z.trim(), z.maxLength(CHARACTER_QUERY_MAX))),
})
export type CharacterQueryInput = z.input<typeof characterQuerySchema>
export type CharacterQuery = z.output<typeof characterQuerySchema>

/** Validates a character search. Failures report one plain message instead of the schema's internals. */
export function parseCharacterQuery(input: CharacterQueryInput): CharacterQuery {
  const result = characterQuerySchema.safeParse(input)
  if (!result.success) throw new Error('Invalid character query.')
  return { name: result.data.name || undefined }
}
