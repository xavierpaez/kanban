import { boardSchema, type Board } from './schema'

const STORAGE_KEY = 'portal-board:v1'

/** Parses a stored board, returning null for anything missing, corrupt, or inconsistent. */
export function parseStoredBoard(raw: string | null): Board | null {
  if (!raw) return null
  try {
    const result = boardSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/**
 * Whether a board should be saved. Once saving starts it continues, so emptying the board is
 * saved too. Before that, an empty board from a failed seed isn't saved, so a refresh retries
 * the seed instead of loading the empty board.
 */
export function shouldSave(alreadySaving: boolean, board: Board): boolean {
  return alreadySaving || Object.keys(board.items).length > 0
}

export function loadBoard(): Board | null {
  try {
    return parseStoredBoard(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Storage can be unavailable, for example when site data is blocked.
    return null
  }
}

export function saveBoard(board: Board): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  } catch {
    // Saving is best effort; the board keeps working in memory.
  }
}
