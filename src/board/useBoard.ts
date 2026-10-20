import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { getCharacters, type CharactersResult } from '../server/characters'
import { boardReducer, emptyBoard } from './board'
import { createSeedBoard } from './seed'
import { loadBoard, saveBoard, shouldSave } from './storage'

/**
 * Board state lives in the browser, so it is loaded after hydration. A first-time
 * visitor gets a board seeded from the characters the route loader streamed in.
 */
const RETRY_MIN_MS = 600

export function useBoard(characters: Promise<CharactersResult>) {
  const [board, dispatch] = useReducer(boardReducer, null)
  // 'failed' and 'retrying' while the API that seeds a first visit is unreachable.
  const [seed, setSeed] = useState<'ok' | 'failed' | 'retrying'>('ok')
  // How many times reaching the API has failed: the first load, then each failed retry.
  const [seedFailures, setSeedFailures] = useState(0)
  // A board from storage or a successful seed is saved from the start; see `shouldSave` for the rest.
  const persist = useRef(false)
  const started = useRef(false)
  const boardRef = useRef(board)
  useEffect(() => {
    boardRef.current = board
  })

  useEffect(() => {
    // Load once. Later loader runs must not replace a board the user is working on.
    if (started.current) return
    started.current = true
    const saved = loadBoard()
    if (saved) {
      persist.current = true
      dispatch({ type: 'load', board: saved })
      return
    }
    void characters.then((result) => {
      persist.current = result.ok
      setSeed(result.ok ? 'ok' : 'failed')
      if (!result.ok) setSeedFailures(1)
      dispatch({ type: 'load', board: result.ok ? createSeedBoard(result.characters) : emptyBoard() })
    })
  }, [characters])

  useEffect(() => {
    if (!board) return
    persist.current = shouldSave(persist.current, board)
    if (persist.current) saveBoard(board)
  }, [board])

  /**
   * Tries the API again. On success an empty board gets the seed items, reported as `seeded`;
   * a board the user has added to stays as it is.
   */
  const retrySeed = useCallback(async (): Promise<{ ok: false } | { ok: true; seeded: number }> => {
    setSeed('retrying')
    // A failure can come back in milliseconds; keep "retrying" on screen long enough to read.
    const minimum = new Promise((resolve) => setTimeout(resolve, RETRY_MIN_MS))
    try {
      const characters = await getCharacters({ data: {} }).finally(() => minimum)
      const seedBoard = createSeedBoard(characters)
      const current = boardRef.current
      const seeded = !current || Object.keys(current.items).length === 0 ? Object.keys(seedBoard.items).length : 0
      persist.current = true
      dispatch({ type: 'seed', board: seedBoard })
      setSeed('ok')
      return { ok: true, seeded }
    } catch {
      setSeedFailures((n) => n + 1)
      setSeed('failed')
      return { ok: false }
    }
  }, [])

  return { board, dispatch, seed, seedFailures, retrySeed }
}
