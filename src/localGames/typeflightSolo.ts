import {
	TYPEFLIGHT_EVENT_TYPES,
	wrapGridCoordinate,
	type TypeFlightEventType,
	type TypeFlightPlayerState
} from '../websocket/typeflightClient'

export interface SoloTypeFlightEvent {
	id: string
	type: TypeFlightEventType
	position: { x: number; y: number }
	createdAt: number
}

export interface SoloTypeFlightStats {
	playerStates: Record<string, TypeFlightPlayerState>
	playerDeaths: Record<string, number>
	wordsTyped: Record<string, number>
	eventCounts: Record<TypeFlightEventType, number>
	elapsedMs: number
}

const GRID_SIZE = 10
const CASUAL_GAME_LENGTH_MS = 60 * 1000
const INTENSE_GAME_LENGTH_MS = 45 * 1000
const START_EVENT_INTERVAL_MS = 2500
const CASUAL_END_EVENT_INTERVAL_MS = 1000
const MAX_EVENT_PAIR_INTERVAL_MS = 500
const CASUAL_EVENTS_PER_SPAWN = 3
const INTENSE_EVENTS_PER_SPAWN = 4
const MAX_EVENTS_PER_SPAWN = 5

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const lerp = (start: number, end: number, t: number) => start + (end - start) * t

export const createEmptyEventCounts = (): Record<TypeFlightEventType, number> => ({
	fire: 0,
	ice: 0,
	lightning: 0,
	bomb: 0,
	laser: 0,
	spikes: 0
})

const randomInt = (maxExclusive: number) => Math.floor(Math.random() * maxExclusive)

const randomPosition = () => ({ x: randomInt(GRID_SIZE), y: randomInt(GRID_SIZE) })

export const buildSoloPlayerMap = (playerIds: string[]): Record<string, TypeFlightPlayerState> => {
	const used = new Set<string>()
	const players: Record<string, TypeFlightPlayerState> = {}

	playerIds.forEach((playerId) => {
		let position = randomPosition()
		let key = `${position.x},${position.y}`
		let tries = 0

		while (used.has(key) && tries < GRID_SIZE * GRID_SIZE) {
			position = randomPosition()
			key = `${position.x},${position.y}`
			tries += 1
		}

		used.add(key)
		players[playerId] = {
			x: position.x,
			y: position.y,
			alive: true
		}
	})

	return players
}

export const calculateSoloSpawnSettings = (elapsedMs: number): { intervalMs: number; eventsPerSpawn: number } => {
	if (elapsedMs <= CASUAL_GAME_LENGTH_MS) {
		const t = clamp01(elapsedMs / CASUAL_GAME_LENGTH_MS)
		return {
			intervalMs: Math.round(lerp(START_EVENT_INTERVAL_MS, CASUAL_END_EVENT_INTERVAL_MS, t)),
			eventsPerSpawn: CASUAL_EVENTS_PER_SPAWN
		}
	}

	const intenseElapsed = elapsedMs - CASUAL_GAME_LENGTH_MS
	if (intenseElapsed <= INTENSE_GAME_LENGTH_MS) {
		const t = clamp01(intenseElapsed / INTENSE_GAME_LENGTH_MS)
		return {
			intervalMs: Math.round(lerp(CASUAL_END_EVENT_INTERVAL_MS, MAX_EVENT_PAIR_INTERVAL_MS, t)),
			eventsPerSpawn: INTENSE_EVENTS_PER_SPAWN
		}
	}

	return {
		intervalMs: MAX_EVENT_PAIR_INTERVAL_MS,
		eventsPerSpawn: MAX_EVENTS_PER_SPAWN
	}
}

export const createSoloEvents = (eventsPerSpawn: number): SoloTypeFlightEvent[] => {
	const usedKeys = new Set<string>()
	const events: SoloTypeFlightEvent[] = []

	for (let i = 0; i < eventsPerSpawn; i += 1) {
		let position = randomPosition()
		let key = `${position.x},${position.y}`
		let tries = 0

		while (usedKeys.has(key) && tries < GRID_SIZE * GRID_SIZE) {
			position = randomPosition()
			key = `${position.x},${position.y}`
			tries += 1
		}

		usedKeys.add(key)

		events.push({
			id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			type: TYPEFLIGHT_EVENT_TYPES[randomInt(TYPEFLIGHT_EVENT_TYPES.length)],
			position,
			createdAt: Date.now()
		})
	}

	return events
}

export const isCellImpacted = (
	eventType: TypeFlightEventType,
	eventPosition: { x: number; y: number },
	playerPosition: { x: number; y: number },
	eventImpactOffsets: Record<TypeFlightEventType, Array<{ dx: number; dy: number }>>
) => {
	const offsets = eventImpactOffsets[eventType] || []

	return offsets.some((offset) => {
		const x = wrapGridCoordinate(eventPosition.x + offset.dx)
		const y = wrapGridCoordinate(eventPosition.y + offset.dy)
		return x === playerPosition.x && y === playerPosition.y
	})
}

export const checkSoloGameOver = (states: Record<string, TypeFlightPlayerState>) => {
	const values = Object.values(states)
	return values.length > 0 && values.every((state) => state.alive === false)
}

