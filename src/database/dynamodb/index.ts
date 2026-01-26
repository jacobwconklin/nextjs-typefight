// In-memory placeholder for DynamoDB operations. Useful for local development and testing.
// Replace with real AWS DynamoDB SDK calls when ready.

import {
  PlayerSchema,
  PartySessionSchema,
  IconName,
  FontName,
  GameName,
} from '../types'

const SESSIONS: Map<string, PartySessionSchema> = new Map()

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export async function generateJoinCode(): Promise<string> {
  // Generate a unique 8-char uppercase code
  let code = ''
  do {
    code = Math.random().toString(36).slice(2, 10).toUpperCase()
  } while (SESSIONS.has(code))
  return code
}

export async function createParty(code: string, selected_game?: GameName): Promise<PartySessionSchema> {
  const id = makeId()
  const session: PartySessionSchema = {
    id,
    selected_game: selected_game,
    join_code: code.slice(0, 12),
    started: false,
    createdAt: Date.now(),
    players: [],
  }
  SESSIONS.set(code, session)
  return session
}

export async function getParty(code: string): Promise<PartySessionSchema | null> {
  return SESSIONS.get(code) ?? null
}

export async function getPlayers(code: string): Promise<PlayerSchema[]> {
  const s = SESSIONS.get(code)
  return s ? s.players : []
}

export async function addPlayerToParty(code: string, player: PlayerSchema): Promise<void> {
  const s = SESSIONS.get(code)
  if (!s) throw new Error('Session not found')
  // prevent duplicates by id
  s.players = s.players.filter((p) => p.id !== player.id)
  s.players.push(player)
  SESSIONS.set(code, s)
}

export async function getGameStarted(code: string): Promise<boolean> {
  const s = SESSIONS.get(code)
  return Boolean(s && s.started)
}

export async function setGameStarted(code: string): Promise<void> {
  const s = SESSIONS.get(code)
  if (!s) throw new Error('Session not found')
  s.started = true
  SESSIONS.set(code, s)
}

export async function clearInMemoryDB() {
  SESSIONS.clear()
}

