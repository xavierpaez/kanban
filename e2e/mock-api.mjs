// A minimal stand-in for the Rick and Morty GraphQL API, so end-to-end tests are deterministic.
import { createServer } from 'node:http'

const port = Number(process.argv[2] ?? 4010)

const NAMES = [
  ['1', 'Rick Sanchez', 'Alive', 'Human'],
  ['2', 'Morty Smith', 'Alive', 'Human'],
  ['3', 'Summer Smith', 'Alive', 'Human'],
  ['4', 'Beth Smith', 'Alive', 'Human'],
  ['5', 'Jerry Smith', 'Alive', 'Human'],
  ['6', 'Abadango Cluster Princess', 'Alive', 'Alien'],
  ['7', 'Abradolf Lincler', 'unknown', 'Human'],
  ['8', 'Adjudicator Rick', 'Dead', 'Human'],
]
const CHARACTERS = NAMES.map(([id, name, status, species]) => ({
  id,
  name,
  status,
  species,
  image: `https://rickandmortyapi.com/api/character/avatar/${id}.jpeg`,
}))
const PAGE_SIZE = 20
// Names containing "flaky" fail on their first request, then return every character.
const failedOnce = new Set()

createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200).end('mock rick and morty api')
    return
  }
  let raw = ''
  req.on('data', (chunk) => (raw += chunk))
  req.on('end', () => {
    const { variables = {} } = JSON.parse(raw || '{}')
    const name = (variables.name ?? '').toLowerCase()
    // Lets tests exercise the app's error handling.
    if (name.includes('portal-error')) {
      res.writeHead(500).end('the citadel is down')
      return
    }
    if (name.includes('flaky') && !failedOnce.has(name)) {
      failedOnce.add(name)
      res.writeHead(500).end('try again')
      return
    }
    const filter = name.includes('flaky') ? '' : name
    const results = CHARACTERS.filter((c) => c.name.toLowerCase().includes(filter)).slice(0, PAGE_SIZE)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ data: { characters: { results } } }))
  })
}).listen(port, () => console.log(`mock api on ${port}`))
