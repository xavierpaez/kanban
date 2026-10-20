import { createServerFn } from '@tanstack/react-start'
import type { Character } from '../board/schema'
import { parseCharacterQuery } from './characterQuery'
import { fetchCharactersCached } from './rickAndMorty.server'

/** What the route loader streams to the page: a settled result, never a rejection. */
export type CharactersResult = { ok: true; characters: Character[] } | { ok: false }

/**
 * Typed RPC boundary for character data. The handler runs only on the server,
 * so the browser never calls the external API directly.
 */
export const getCharacters = createServerFn({ method: 'GET' })
  .validator(parseCharacterQuery)
  .handler(({ data }) => fetchCharactersCached(data))
