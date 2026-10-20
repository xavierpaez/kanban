import { useEffect, useState } from 'react'
import type { Character } from '../board/schema'
import { getCharacters, type CharactersResult } from '../server/characters'

const SEARCH_DEBOUNCE_MS = 250
/** Searches repeat as people type and delete, so recent results are kept, up to this many. */
const CACHE_MAX_ENTRIES = 50

const cache = new Map<string, Promise<Character[]>>()

function searchCharacters(name: string, initial: Promise<CharactersResult>): Promise<Character[]> {
  const key = name.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const request = (async () => {
    // The route loader already fetched the unfiltered list; reuse it unless that failed.
    if (!key) {
      const result = await initial
      if (result.ok) return result.characters
    }
    return getCharacters({ data: { name: key || undefined } })
  })()
  const oldest = cache.keys().next()
  if (cache.size >= CACHE_MAX_ENTRIES && !oldest.done) cache.delete(oldest.value)
  cache.set(key, request)
  request.catch(() => cache.delete(key))
  return request
}

/**
 * Characters matching `query`, debounced. While a new search runs, the previous results
 * stay on screen. Only the latest search can update the results.
 */
export function useCharacterSearch(query: string, initial: Promise<CharactersResult>) {
  const [attempt, setAttempt] = useState(0)
  const key = `${query.trim().toLowerCase()}#${attempt}`
  const [result, setResult] = useState<{ key: string; ok: boolean; characters: Character[] } | null>(null)

  useEffect(() => {
    let current = true
    const timer = setTimeout(
      () => {
        searchCharacters(query, initial).then(
          (characters) => current && setResult({ key, ok: true, characters }),
          () => current && setResult({ key, ok: false, characters: [] }),
        )
      },
      query.trim() ? SEARCH_DEBOUNCE_MS : 0,
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [key, query, initial])

  const status: 'loading' | 'ready' | 'error' = result?.key !== key ? 'loading' : result.ok ? 'ready' : 'error'
  return { status, characters: result?.characters ?? [], retry: () => setAttempt((n) => n + 1) }
}
