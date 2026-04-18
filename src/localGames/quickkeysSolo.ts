export interface QuickKeysPlayerPosition {
	index: number
	time: number | null
	errors: number
}

export interface QuickKeysState {
	finished: boolean
	textName: string | null
	playerPositions: Record<string, QuickKeysPlayerPosition>
}

export const createSoloQuickKeysState = (): QuickKeysState => ({
	finished: false,
	textName: null,
	playerPositions: {}
})

export const startSoloQuickKeysText = (
	state: QuickKeysState,
	playerId: string,
	textId: string
): QuickKeysState => ({
	...state,
	finished: false,
	textName: textId,
	playerPositions: {
		[playerId]: {
			index: 0,
			time: null,
			errors: 0
		}
	}
})

export const updateSoloQuickKeysWord = (
	state: QuickKeysState,
	playerId: string,
	index: number,
	errors: number
): QuickKeysState => ({
	...state,
	playerPositions: {
		...state.playerPositions,
		[playerId]: {
			...(state.playerPositions[playerId] || { index: 0, time: null, errors: 0 }),
			index,
			errors
		}
	}
})

export const completeSoloQuickKeys = (
	state: QuickKeysState,
	playerId: string,
	time: number,
	errors: number
): QuickKeysState => ({
	...state,
	finished: true,
	playerPositions: {
		...state.playerPositions,
		[playerId]: {
			...(state.playerPositions[playerId] || { index: 0, time: null, errors: 0 }),
			time,
			errors
		}
	}
})

