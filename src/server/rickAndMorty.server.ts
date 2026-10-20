import { z } from 'zod/mini'
import { characterSchema, type Character } from '../board/schema'
import type { CharacterQuery } from './characterQuery'

const DEFAULT_API_URL = 'https://rickandmortyapi.com/graphql'
const REQUEST_TIMEOUT_MS = 4_000
const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 200
/** Upstream calls allowed at once, so a flood of distinct searches can't pile up requests to the API. */
const MAX_IN_FLIGHT = 6
/** The API returns at most 20 characters per page. */
const PAGE_SIZE = 20

const CHARACTERS_QUERY = /* GraphQL */ `
  query Characters($name: String) {
    characters(filter: { name: $name }) {
      results {
        id
        name
        image
        status
        species
      }
    }
  }
`

const responseSchema = z.object({
  data: z.optional(
    z.nullable(
      z.object({
        characters: z.nullable(z.object({ results: z.array(characterSchema).check(z.maxLength(PAGE_SIZE)) })),
      }),
    ),
  ),
  errors: z.optional(z.array(z.object({ message: z.string() }))),
})

/**
 * Raised for any failure talking to the API. The message is safe to show to users;
 * upstream details are logged on the server only.
 */
export class CharacterApiError extends Error {
  override name = 'CharacterApiError'
}

function fail(message: string, detail: unknown): never {
  console.error(`[characters] ${message}`, detail)
  throw new CharacterApiError(message)
}

/** The API endpoint. An override must be HTTPS, except for a local test server. */
function apiUrl(): string {
  const configured = process.env.RICK_AND_MORTY_API_URL || DEFAULT_API_URL
  const url = URL.parse(configured)
  const local = url?.hostname === 'localhost' || url?.hostname === '127.0.0.1'
  if (!url || !(url.protocol === 'https:' || (local && url.protocol === 'http:'))) {
    fail('Could not reach the Rick and Morty API.', `invalid RICK_AND_MORTY_API_URL: ${configured}`)
  }
  return url.href
}

/** Fetches up to one page of characters matching `name` and validates the response. */
export async function fetchCharacters({ name }: CharacterQuery): Promise<Character[]> {
  const url = apiUrl()

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: CHARACTERS_QUERY, variables: { name: name || undefined } }),
      // Never follow redirects, so the server can't be bounced to internal addresses.
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (cause) {
    fail('Could not reach the Rick and Morty API.', cause)
  }

  if (!response.ok) fail('The Rick and Morty API is having trouble right now.', `HTTP ${response.status}`)
  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    fail('The Rick and Morty API sent an unexpected response.', cause)
  }

  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) fail('The Rick and Morty API sent an unexpected response.', parsed.error)

  const { data, errors } = parsed.data
  if (errors?.length) fail('The Rick and Morty API is having trouble right now.', errors)
  if (!data?.characters) fail('The Rick and Morty API sent an unexpected response.', 'no character data')

  return data.characters.results
}

const cache = new Map<string, { expires: number; characters: Promise<Character[]> }>()
let inFlight = 0

/**
 * Character data rarely changes, so results are kept in memory for an hour. Concurrent
 * requests share one upstream call, and failures are dropped so the next request retries.
 * When too many upstream calls are already running, new searches fail fast instead of queueing.
 */
export function fetchCharactersCached(query: CharacterQuery): Promise<Character[]> {
  const key = query.name?.toLowerCase() ?? ''
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.characters

  if (inFlight >= MAX_IN_FLIGHT) {
    return Promise.reject(new CharacterApiError('The Rick and Morty API is busy right now. Try again in a moment.'))
  }
  inFlight++
  const characters = fetchCharacters(query).finally(() => inFlight--)
  cache.delete(key)
  const oldest = cache.keys().next()
  if (cache.size >= CACHE_MAX_ENTRIES && !oldest.done) cache.delete(oldest.value)
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, characters })
  characters.catch(() => {
    if (cache.get(key)?.characters === characters) cache.delete(key)
  })
  return characters
}
