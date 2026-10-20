import { emptyBoard } from './board'
import type { Board, Character, ColumnId } from './schema'

const SEED: ReadonlyArray<{ column: ColumnId; title: string; characterId: string }> = [
  { column: 'todo', title: 'Recalibrate the portal gun', characterId: '1' },
  { column: 'todo', title: "Study for Mr. Goldenfold's math test", characterId: '2' },
  { column: 'todo', title: 'Find a job. Any job.', characterId: '5' },
  { column: 'doing', title: 'Perform emergency horse surgery', characterId: '4' },
  { column: 'doing', title: 'Hide the spaceship from Mom', characterId: '3' },
  { column: 'done', title: 'Turn myself into a pickle', characterId: '1' },
]

/** Builds the first-visit board from real characters. Falls back to whichever characters were loaded. */
export function createSeedBoard(characters: readonly Character[], now = Date.now()): Board {
  const board = emptyBoard()
  if (characters.length === 0) return board

  const byId = new Map(characters.map((character) => [character.id, character]))
  SEED.forEach((seed, index) => {
    const character = byId.get(seed.characterId) ?? characters[index % characters.length]
    if (!character) return
    const id = crypto.randomUUID()
    board.items[id] = { id, title: seed.title, character, createdAt: now + index }
    board.columns[seed.column].push(id)
  })
  return board
}
