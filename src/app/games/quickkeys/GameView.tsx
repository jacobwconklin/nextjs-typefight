import React from 'react'
import styles from './page.module.scss'

interface TypingText {
  id: string
  name: string
  body: string
}

interface PlayerPosition {
  index: number
  time: number | null
  errors: number
  finished?: boolean
}

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface GameViewProps {
  selectedText: TypingText | undefined
  currentCharIndex: number
  hasError: boolean
  gameState: {
    finished: boolean
    textName: string | null
    playerPositions: Record<string, PlayerPosition>
  }
  players: Player[]
  currentPlayerId: string
  playerType: 'solo' | 'host' | 'join'
  onEndGame: () => void
}

export default function GameView({
  selectedText,
  currentCharIndex,
  hasError,
  gameState,
  players,
  currentPlayerId,
  playerType,
  onEndGame
}: GameViewProps) {
  if (!selectedText) return null

  const words = selectedText.body.split(/\s+/)
  const totalWordCount = words.length

  console.log('GameView render - players:', players)
  console.log('GameView render - playerPositions:', gameState.playerPositions)
  console.log('GameView render - currentPlayerId:', currentPlayerId)
  console.log('GameView render - totalWordCount:', totalWordCount)

  // Helper to render text with proper styling
  const renderText = () => {
    const text = selectedText.body
    const chars = text.split('')
    
    return (
      <div className={styles.textContent}>
        {chars.map((char, idx) => {
          const isTyped = idx < currentCharIndex
          const isCurrent = idx === currentCharIndex
          
          if (!isTyped) {
            return (
                <span
                key={idx}
                className={`${styles.char} ${isTyped ? styles.typed : ''} ${isCurrent ? styles.current : ''}`}
                >
                {char}
                </span>
            )
            }
        })}
      </div>
    )
  }

  // Helper to render progress bar with player icons
  const renderProgressBar = () => {
    console.log('Rendering progress bar with', players.length, 'players')
    
    // Sort players by progress for z-index ordering
    const sortedPlayers = [...players].sort((a, b) => {
      const aProgress = gameState.playerPositions[a.id]?.index || 0
      const bProgress = gameState.playerPositions[b.id]?.index || 0
      return bProgress - aProgress // Descending order
    })

    return (
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBar}>
          <div className={styles.progressLine} />
          {sortedPlayers.map((player, idx) => {
            const position = gameState.playerPositions[player.id]
            const progress = position ? (position.index / totalWordCount) : 0
            const isCurrentPlayer = player.id === currentPlayerId
            
            console.log(`Player ${player.alias} (${player.id}):`, {
              position,
              progress,
              progressPercent: progress * 100,
              isCurrentPlayer
            })
            
            return (
              <div
                key={player.id}
                className={`${styles.playerIcon} ${isCurrentPlayer ? styles.currentPlayer : ''}`}
                style={{
                  left: `${progress * 100}%`,
                  zIndex: isCurrentPlayer ? 1000 : 100 - idx,
                  backgroundColor: player.color
                }}
              >
                <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.gameContainer}>
      <div className={`${styles.textBlock} ${hasError ? styles.error : ''}`}>
        {renderText()}
      </div>
      
      {renderProgressBar()}

      {playerType === 'host' && (
        <div className={styles.endGameContainer}>
          <button 
            className={styles.endGameButton}
            onClick={onEndGame}
          >
            End Game For All
          </button>
        </div>
      )}
    </div>
  )
}
