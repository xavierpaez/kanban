// Shared test data for the board's unit tests.
import type { Board, Character } from './schema'

export const rick: Character = {
  id: '1',
  name: 'Rick Sanchez',
  image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
  status: 'Alive',
  species: 'Human',
}

export const morty: Character = {
  id: '2',
  name: 'Morty Smith',
  image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg',
  status: 'Alive',
  species: 'Human',
}

/** A board whose items are named after their ids. */
export function boardWith(columns: Board['columns']): Board {
  const ids = [...columns.todo, ...columns.doing, ...columns.done]
  return {
    items: Object.fromEntries(ids.map((id) => [id, { id, title: id, character: rick, createdAt: 0 }])),
    columns,
  }
}
