import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CharacterApiError, fetchCharacters, fetchCharactersCached } from './rickAndMorty.server'

const rick = {
  id: '1',
  name: 'Rick Sanchez',
  image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg',
  status: 'Alive',
  species: 'Human',
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

const page = (results: unknown[]) => jsonResponse({ data: { characters: { results } } })

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('RICK_AND_MORTY_API_URL', '')
  // Failures are logged on the server; keep test output quiet.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('fetchCharacters', () => {
  it('returns the parsed characters', async () => {
    fetchMock.mockResolvedValue(page([rick]))

    await expect(fetchCharacters({})).resolves.toEqual([rick])
  })

  it('posts a GraphQL query with the name filter to the public API, refusing redirects', async () => {
    fetchMock.mockResolvedValue(page([]))

    await fetchCharacters({ name: 'morty' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://rickandmortyapi.com/graphql')
    expect(init?.method).toBe('POST')
    expect(init?.redirect).toBe('error')
    const body = JSON.parse(String(init?.body))
    expect(body.query).toContain('characters(filter: { name: $name })')
    expect(body.variables).toEqual({ name: 'morty' })
  })

  it('uses the API URL from the environment when set', async () => {
    vi.stubEnv('RICK_AND_MORTY_API_URL', 'http://localhost:4010/graphql')
    fetchMock.mockResolvedValue(page([]))

    await fetchCharacters({})

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:4010/graphql')
  })

  it('returns an empty list when no character matches', async () => {
    fetchMock.mockResolvedValue(page([]))

    await expect(fetchCharacters({ name: 'zzz' })).resolves.toEqual([])
  })

  it('maps an unexpected character status to unknown', async () => {
    fetchMock.mockResolvedValue(page([{ ...rick, status: 'Pickled' }]))

    const [character] = await fetchCharacters({})
    expect(character?.status).toBe('unknown')
  })

  it('fails with a clear error when the network request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const error = await fetchCharacters({}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(CharacterApiError)
    expect(error).toHaveProperty('message', 'Could not reach the Rick and Morty API.')
  })

  it('fails when the API responds with an HTTP error', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }))

    await expect(fetchCharacters({})).rejects.toThrow('The Rick and Morty API is having trouble right now.')
  })

  it('fails on GraphQL errors without passing upstream details to the caller', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null, errors: [{ message: 'Internal: postgres://admin@db' }] }))

    const error = await fetchCharacters({}).catch((e: unknown) => e)
    expect(error).toHaveProperty('message', 'The Rick and Morty API is having trouble right now.')
    expect(String((error as Error).message)).not.toContain('postgres')
  })

  it('fails when the response is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }))

    await expect(fetchCharacters({})).rejects.toThrow('The Rick and Morty API sent an unexpected response.')
  })

  it('fails when the data has an unexpected shape', async () => {
    fetchMock.mockResolvedValue(page([{ id: 1 }]))

    await expect(fetchCharacters({})).rejects.toThrow('unexpected response')
  })

  it('refuses a configured API URL that is not HTTPS', async () => {
    vi.stubEnv('RICK_AND_MORTY_API_URL', 'http://169.254.169.254/latest')

    await expect(fetchCharacters({})).rejects.toThrow('Could not reach')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects more results than one API page holds', async () => {
    fetchMock.mockResolvedValue(page(Array.from({ length: 21 }, () => rick)))

    await expect(fetchCharacters({})).rejects.toBeInstanceOf(CharacterApiError)
  })

  it('rejects avatars hosted anywhere other than the API', async () => {
    fetchMock.mockResolvedValue(page([{ ...rick, image: 'https://evil.example/x.png' }]))

    await expect(fetchCharacters({})).rejects.toBeInstanceOf(CharacterApiError)
  })

  it('fails when the API returns no character data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { characters: null } }))

    await expect(fetchCharacters({})).rejects.toThrow('unexpected response')
  })
})

describe('fetchCharactersCached', () => {
  it('shares one upstream request between identical queries', async () => {
    fetchMock.mockImplementation(async () => page([rick]))

    const [first, second] = await Promise.all([
      fetchCharactersCached({ name: 'cache-share' }),
      fetchCharactersCached({ name: 'Cache-Share' }),
    ])

    expect(first).toEqual([rick])
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries after a failure instead of caching it', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed')).mockImplementation(async () => page([rick]))

    await expect(fetchCharactersCached({ name: 'cache-retry' })).rejects.toBeInstanceOf(CharacterApiError)
    await expect(fetchCharactersCached({ name: 'cache-retry' })).resolves.toEqual([rick])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fails fast when too many upstream requests are already running', async () => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    fetchMock.mockImplementation(async () => {
      await gate
      return page([rick])
    })

    const running = Array.from({ length: 6 }, (_, i) => fetchCharactersCached({ name: `busy-${i}` }))
    await expect(fetchCharactersCached({ name: 'busy-extra' })).rejects.toThrow('busy')
    expect(fetchMock).toHaveBeenCalledTimes(6)

    release()
    await Promise.all(running)
    await expect(fetchCharactersCached({ name: 'busy-extra' })).resolves.toEqual([rick])
  })
})
