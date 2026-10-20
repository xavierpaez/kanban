// zod/mini keeps the client bundle small; the board schema ships to the browser to parse storage.
import { z } from 'zod/mini'

export const COLUMN_IDS = ['todo', 'doing', 'done'] as const

export const columnIdSchema = z.enum(COLUMN_IDS)
export type ColumnId = z.infer<typeof columnIdSchema>

export const characterStatusSchema = z.enum(['Alive', 'Dead', 'unknown'])
export type CharacterStatus = z.infer<typeof characterStatusSchema>

/**
 * A character as the board stores it. Cards keep this snapshot so they render
 * without refetching and survive the API being down.
 */
export const characterSchema = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(20)),
  name: z.string().check(z.minLength(1), z.maxLength(200)),
  // Only avatars from the API's own host are accepted, so stored data can't point images elsewhere.
  image: z.url({ protocol: /^https$/, hostname: /^rickandmortyapi\.com$/ }).check(
    z.refine((value) => {
      const url = new URL(value)
      return !url.port && !url.username && !url.password
    }),
  ),
  // The API documents three statuses; anything unexpected is shown as unknown rather than rejected.
  status: z.catch(characterStatusSchema, 'unknown'),
  species: z.string().check(z.maxLength(200)),
})
export type Character = z.infer<typeof characterSchema>

export const ITEM_TITLE_MAX = 120

export const itemSchema = z.object({
  id: z.string().check(z.minLength(1)),
  title: z.string().check(z.trim(), z.minLength(1), z.maxLength(ITEM_TITLE_MAX)),
  character: characterSchema,
  createdAt: z.number(),
})
export type Item = z.infer<typeof itemSchema>

/**
 * Column arrays are the single source of truth for which column an item is in
 * and where it sits, so moving a card is one remove and one insert.
 */
export const boardSchema = z
  .object({
    items: z.record(z.string(), itemSchema),
    // A record keyed by the column enum requires every column to be present.
    columns: z.record(columnIdSchema, z.array(z.string())),
  })
  .check(
    z.refine(
      (board) => {
        const placed = COLUMN_IDS.flatMap((column) => board.columns[column])
        const unique = new Set(placed)
        const itemIds = Object.keys(board.items)
        return (
          unique.size === placed.length &&
          unique.size === itemIds.length &&
          itemIds.every((id) => unique.has(id) && board.items[id]?.id === id)
        )
      },
      { message: 'Every item must appear in exactly one column' },
    ),
  )
export type Board = z.infer<typeof boardSchema>
