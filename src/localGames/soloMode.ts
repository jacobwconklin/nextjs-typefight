import type { PlayerType } from '../context/PlayerTypeContext'

export const isSoloPlayer = (playerType: PlayerType) => playerType === 'solo'

