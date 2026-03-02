import wsClient from './wsClient'

export const TYPEFLIGHT_GRID_SIZE = 10

export type TypeFlightEventType =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'bomb'
  | 'laser'
  | 'spikes'

export type TypeFlightDirection = 'up' | 'right' | 'down' | 'left'

export interface GridPosition {
  x: number
  y: number
}

export interface TypeFlightPlayerState extends GridPosition {
  alive: boolean
}

export interface TypeFlightServerEvent {
  id: string
  type: TypeFlightEventType
  position: GridPosition
  createdAt: number
}

export interface TypeFlightGameState {
  gameType: 'typeflight'
  startedAt: number
  endedAt: number | null
  elapsedMs: number
  gameOver: boolean
  players: Record<string, TypeFlightPlayerState>
  playerDeaths: Record<string, number>
  eventCounts: Record<TypeFlightEventType, number>
  events: TypeFlightServerEvent[]
}

export interface TypeFlightGameUpdatePayload {
  gameType: 'typeflight'
  type: string
  playerId?: string
  player?: TypeFlightPlayerState
  event?: TypeFlightServerEvent
  gameOver?: boolean
  elapsedMs?: number
  eventCounts?: Record<TypeFlightEventType, number>
  playerDeaths?: Record<string, number>
  [key: string]: unknown
}

export interface TypeFlightSubscriptions {
  onGameUpdate?: (payload: TypeFlightGameUpdatePayload) => void
  onGameStarted?: (payload: TypeFlightGameState) => void
}

export const TYPEFLIGHT_EVENT_TYPES: TypeFlightEventType[] = [
  'fire',
  'ice',
  'lightning',
  'bomb',
  'laser',
  'spikes'
]

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const clampGridCoordinate = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(TYPEFLIGHT_GRID_SIZE - 1, Math.floor(value)))
}

export const wrapGridCoordinate = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return ((Math.floor(value) % TYPEFLIGHT_GRID_SIZE) + TYPEFLIGHT_GRID_SIZE) % TYPEFLIGHT_GRID_SIZE
}

export const normalizePosition = (position: GridPosition): GridPosition => ({
  x: clampGridCoordinate(position.x),
  y: clampGridCoordinate(position.y)
})

export const isValidGridPosition = (value: unknown): value is GridPosition => {
  if (!value || typeof value !== 'object') return false

  const maybePosition = value as Partial<GridPosition>
  return (
    isFiniteNumber(maybePosition.x) &&
    isFiniteNumber(maybePosition.y) &&
    maybePosition.x >= 0 &&
    maybePosition.x < TYPEFLIGHT_GRID_SIZE &&
    maybePosition.y >= 0 &&
    maybePosition.y < TYPEFLIGHT_GRID_SIZE
  )
}

export const moveWithWrap = (position: GridPosition, direction: TypeFlightDirection): GridPosition => {
  const normalized = normalizePosition(position)

  switch (direction) {
    case 'up':
      return { x: normalized.x, y: wrapGridCoordinate(normalized.y - 1) }
    case 'right':
      return { x: wrapGridCoordinate(normalized.x + 1), y: normalized.y }
    case 'down':
      return { x: normalized.x, y: wrapGridCoordinate(normalized.y + 1) }
    case 'left':
      return { x: wrapGridCoordinate(normalized.x - 1), y: normalized.y }
    default:
      return normalized
  }
}

export const createEmptyEventCounts = (): Record<TypeFlightEventType, number> => ({
  fire: 0,
  ice: 0,
  lightning: 0,
  bomb: 0,
  laser: 0,
  spikes: 0
})

export const sendTypeFlightPlayerState = (player: TypeFlightPlayerState) => {
  wsClient.send('update-game', {
    type: 'player-state',
    player: {
      x: clampGridCoordinate(player.x),
      y: clampGridCoordinate(player.y),
      alive: !!player.alive
    }
  })
}

export const sendTypeFlightPlayerKilled = (position: GridPosition) => {
  wsClient.send('update-game', {
    type: 'player-killed',
    position: normalizePosition(position)
  })
}

export const sendTypeFlightPlayerRevived = (position: GridPosition) => {
  wsClient.send('update-game', {
    type: 'player-revived',
    position: normalizePosition(position)
  })
}

export const sendTypeFlightMove = (direction: TypeFlightDirection) => {
  wsClient.send('update-game', {
    type: 'move',
    direction
  })
}

export const requestTypeFlightStatus = async (): Promise<TypeFlightGameState | null> => {
  const response = await wsClient.socketRequest('game-status', {})
  if (!response?.session?.gameState) {
    return null
  }

  const gameState = response.session.gameState as Partial<TypeFlightGameState>
  if (gameState.gameType !== 'typeflight') {
    return null
  }

  return gameState as TypeFlightGameState
}

export const subscribeTypeFlight = (subscriptions: TypeFlightSubscriptions): (() => void) => {
  const onGameUpdate = (payload: unknown) => {
    const typed = payload as Partial<TypeFlightGameUpdatePayload>
    if (typed?.gameType !== 'typeflight') return
    subscriptions.onGameUpdate?.(typed as TypeFlightGameUpdatePayload)
  }

  const onGameStarted = (payload: unknown) => {
    const maybeSession = (payload as { session?: { gameState?: unknown } })?.session
    const gameState = maybeSession?.gameState as Partial<TypeFlightGameState> | undefined

    if (!gameState || gameState.gameType !== 'typeflight') return
    subscriptions.onGameStarted?.(gameState as TypeFlightGameState)
  }

  wsClient.on('game-update', onGameUpdate)
  wsClient.on('game-started', onGameStarted)

  return () => {
    wsClient.off('game-update', onGameUpdate)
    wsClient.off('game-started', onGameStarted)
  }
}
