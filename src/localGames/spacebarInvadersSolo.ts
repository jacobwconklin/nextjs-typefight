import { generate } from 'random-words'

export interface SoloDanger {
	id: string
	word: string
	x: number
	y: number
}

export interface SoloSpaceBarState {
	waveNumber: number
	earthHits: number
	dangers: SoloDanger[]
	gameOver: boolean
	waveTransitioning: boolean
	gameStartTime: number
	playerStats: Record<string, number>
	survivalTime: number
	finalWave: number
}

const MAX_EARTH_HITS = 3

const getDangersForWave = (waveNumber: number, playerCount: number): number => {
	let dangerTotal = 5 + (1 * playerCount)
	if (waveNumber === 1) return dangerTotal

	dangerTotal += 3 * playerCount
	if (waveNumber === 2) return dangerTotal

	dangerTotal += 3 * playerCount
	if (waveNumber === 3) return dangerTotal

	dangerTotal += 3 * playerCount
	if (waveNumber === 4) return dangerTotal

	for (let wave = 5; wave <= waveNumber; wave += 1) {
		dangerTotal += 2 * playerCount
	}

	return dangerTotal
}

const generateSpawnPosition = (wave: number): { x: number; y: number } => {
	const angle = Math.random() * Math.PI * 2
	const innerBound = 350
	const outerBound = 500
	const distance = (Math.random() * (outerBound + wave * 50 - innerBound)) + innerBound
	return {
		x: Math.cos(angle) * distance,
		y: Math.sin(angle) * distance
	}
}

const generateWordsForWave = (count: number): string[] => {
	const words: string[] = []

	for (let i = 0; i < count; i += 1) {
		let randomWord: string | string[]

		if ((i + 1) % 10 === 0) {
			randomWord = generate({ minLength: 10 })
		} else if ((i + 1) % 4 === 0) {
			randomWord = generate({ minLength: 6, maxLength: 9 })
		} else {
			randomWord = generate({ maxLength: 5 })
		}

		words.push(Array.isArray(randomWord) ? randomWord[0] : randomWord)
	}

	return words
}

const initializeWave = (waveNumber: number, playerCount: number): SoloDanger[] => {
	const dangerCount = getDangersForWave(waveNumber, Math.max(1, playerCount))
	const words = generateWordsForWave(dangerCount)

	return words.map((word, index) => {
		const position = generateSpawnPosition(waveNumber)
		return {
			id: `danger-${waveNumber}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			word,
			x: position.x,
			y: position.y
		}
	})
}

export const createSoloSpaceBarState = (playerId: string, now = Date.now()): SoloSpaceBarState => ({
	waveNumber: 1,
	earthHits: 0,
	dangers: initializeWave(1, 1),
	gameOver: false,
	waveTransitioning: false,
	gameStartTime: now,
	playerStats: { [playerId]: 0 },
	survivalTime: 0,
	finalWave: 1
})

export const applySoloWordDestroyed = (
	state: SoloSpaceBarState,
	playerId: string,
	word: string
): SoloSpaceBarState => {
	if (state.gameOver) return state

	const dangerIndex = state.dangers.findIndex((danger) => danger.word.toLowerCase() === word.toLowerCase())
	if (dangerIndex < 0) return state

	const nextDangers = [...state.dangers]
	nextDangers.splice(dangerIndex, 1)

	const nextPlayerStats = {
		...state.playerStats,
		[playerId]: (state.playerStats[playerId] || 0) + 1
	}

	return {
		...state,
		dangers: nextDangers,
		playerStats: nextPlayerStats,
		waveTransitioning: nextDangers.length === 0
	}
}

export const applySoloEarthHit = (
	state: SoloSpaceBarState,
	dangerId: string,
	now = Date.now()
): SoloSpaceBarState => {
	if (state.gameOver) return state

	const nextDangers = state.dangers.filter((danger) => danger.id !== dangerId)
	const nextEarthHits = state.earthHits + 1
	const isGameOver = nextEarthHits >= MAX_EARTH_HITS

	return {
		...state,
		earthHits: nextEarthHits,
		dangers: nextDangers,
		gameOver: isGameOver,
		survivalTime: isGameOver ? now - state.gameStartTime : state.survivalTime,
		finalWave: state.waveNumber,
		waveTransitioning: !isGameOver && nextDangers.length === 0
	}
}

export const startNextSoloWave = (
	state: SoloSpaceBarState,
	playerCount = 1
): SoloSpaceBarState => {
	if (state.gameOver) return state

	const nextWaveNumber = state.waveNumber + 1
	return {
		...state,
		waveNumber: nextWaveNumber,
		finalWave: nextWaveNumber,
		waveTransitioning: false,
		dangers: initializeWave(nextWaveNumber, playerCount)
	}
}

