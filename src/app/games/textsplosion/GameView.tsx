import React from 'react'
import styles from './page.module.scss'
import BackwardsTyping from './challenges/BackwardsTyping'
import ColorWords from './challenges/ColorWords'
import OneLetterAtATime from './challenges/OneLetterAtATime'
import AlphabeticalOrder from './challenges/AlphabeticalOrder'
import NoMistakes from './challenges/NoMistakes'
import NoCursor from './challenges/NoCursor'
import ExitButton from '@/components/ExitButton'

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface GameViewProps {
  players: Player[]
  playerQueue: string[] // Ordered list of player IDs (excluding hot seat)
  hotSeatPlayerId: string | null
  balloonSize: number
  challengeType: 'backwards' | 'colorWords' | 'oneLetterAtATime' | 'alphabetical' | 'noMistakes' | 'noCursor'
  challengeText: string
  currentPumpWord: string
  currentCharIndex: number
  currentLineIndex: number
  hasError: boolean
  wordsTyped: Record<string, number>
  currentPlayerId: string
  numWordsUntilPop: number
  numWordsPumped: number
}

export default function GameView({
  players,
  playerQueue,
  hotSeatPlayerId,
  balloonSize,
  challengeType,
  challengeText,
  currentPumpWord,
  currentCharIndex,
  hasError,
  wordsTyped,
  currentPlayerId,
  numWordsUntilPop,
  numWordsPumped
}: GameViewProps) {
  const hotSeatPlayer = players.find(p => p.id === hotSeatPlayerId)

  console.log("Got props: ", {
    players,
    playerQueue,
    hotSeatPlayerId,
    balloonSize,
    challengeType,
    challengeText,
    currentPumpWord,
    currentCharIndex,
    hasError,
    wordsTyped,
    currentPlayerId,
    numWordsUntilPop,
    numWordsPumped
  })
  
  // Get players in queue order
  const queuedPlayers = playerQueue
    .map(id => players.find(p => p.id === id))
    .filter(p => p !== undefined) as Player[]
  
  // Render the appropriate challenge
  const renderChallenge = () => {
    console.log('I AM IN THE HOT SEAT ! Rendering challenge:', challengeType)
    switch (challengeType) {
      case 'backwards':
        return <BackwardsTyping text={challengeText} currentCharIndex={currentCharIndex} hasError={hasError} />
      case 'colorWords':
        return <ColorWords currentCharIndex={currentCharIndex} hasError={hasError} />
      case 'oneLetterAtATime':
        return <OneLetterAtATime text={challengeText} currentCharIndex={currentCharIndex} hasError={hasError} />
      case 'alphabetical':
        return <AlphabeticalOrder text={challengeText} currentCharIndex={currentCharIndex} hasError={hasError} />
      case 'noMistakes':
        return <NoMistakes text={challengeText} currentCharIndex={currentCharIndex} hasError={hasError} />
      case 'noCursor':
        return <NoCursor text={challengeText} currentCharIndex={currentCharIndex} hasError={hasError} />
      default:
        return null
    }
  }
  
  // Render pump text for non-hot seat players
  const renderPumpText = () => {
    const isHotSeat = currentPlayerId === hotSeatPlayerId
    
    if (isHotSeat) return null
    
    const chars = currentPumpWord.split('')
    
    return (
      <div className={styles.pumpTextContainer}>
        <h3 className={styles.pumpTitle}>Pump the Balloon!</h3>
        {/* <div className={styles.pumpProgress}>
          <div className={styles.progressText}>
            {numWordsPumped} / {numWordsUntilPop} words until POP!
          </div>
        </div> */}
        <div className={styles.linesCompleted}>
          Your words: {wordsTyped[currentPlayerId] || 0}
        </div>
        <div className={`${styles.textContent} ${hasError ? styles.error : ''}`}>
          {chars.map((char, idx) => {
            const isTyped = idx < currentCharIndex
            const isCurrent = idx === currentCharIndex
            
            return (
              <span
                key={idx}
                className={`${styles.char} ${isTyped ? styles.typed : ''} ${isCurrent ? styles.current : ''}`}
              >
                {char}
              </span>
            )
          })}
        </div>
      </div>
    )
  }
  
  return (
    <>
      <ExitButton gameName="textsplosion" className={styles.exitButton} />
      <div className={styles.gameContainer}>
        {/* Balloon and Hot Seat - Center Top */}
        <div className={styles.hotSeatArea}>
        <div 
          className={styles.balloon}
          style={{
            transform: `translateX(-50%) scale(${Math.min(balloonSize / 60, 5)})`
          }}
        >
          <div className={styles.balloonBody} />
        </div>
        
        {hotSeatPlayer && (
          <div className={styles.hotSeatPlayer}>
            <div 
              className={styles.playerIconLarge}
              style={{ backgroundColor: hotSeatPlayer.color }}
            >
              <img src={`/icons/${hotSeatPlayer.icon}.svg`} alt={hotSeatPlayer.alias} />
            </div>
            <div className={styles.playerAlias}>{hotSeatPlayer.alias}</div>
          </div>
        )}
      </div>
      
      {/* Player Queue - Horizontal Line */}
      <div className={styles.playerQueue}>
        {queuedPlayers.map((player) => {
          const isCurrentPlayer = player.id === currentPlayerId
          
          return (
            <div 
              key={player.id} 
              className={`${styles.queuedPlayer} ${isCurrentPlayer ? styles.currentPlayer : ''}`}
            >
              <div 
                className={styles.playerIcon}
                style={{ backgroundColor: player.color }}
              >
                <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
              </div>
              <div className={styles.playerAlias}>{player.alias}</div>
            </div>
          )
        })}
      </div>
      
      {/* Typing Area - Bottom */}
      <div className={styles.typingArea}>
        {currentPlayerId === hotSeatPlayerId ? renderChallenge() : renderPumpText()}
      </div>
    </div>
    </>
  )
}
