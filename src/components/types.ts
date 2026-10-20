import type { Placement } from '../board/placement'

/** What a card can ask the board page to do, from a click or from its actions menu. */
export type CardActions = {
  edit: (itemId: string) => void
  move: (itemId: string, to: Placement) => void
  remove: (itemId: string) => void
}
