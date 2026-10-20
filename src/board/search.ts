import { z } from 'zod/mini'
import { columnIdSchema } from './schema'

/**
 * The board's URL state. `?new=<column>` opens the create dialog for that column and
 * `?item=<id>` opens the edit dialog. Invalid values are dropped instead of erroring,
 * so a mistyped link still shows the board.
 */
export const boardSearchSchema = z.object({
  new: z.catch(z.optional(columnIdSchema), undefined),
  item: z.catch(z.optional(z.string().check(z.minLength(1), z.maxLength(64))), undefined),
})
