import React from 'react'
import styles from './page.module.scss'

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface GameOverViewProps {
  players: Player[]
  winnerId: string
  wordsTyped: Record<string, number>
  playerType: 'solo' | 'host' | 'join'
  onReplay: () => void
  onExit: () => void
}

export default function GameOverView({ players, winnerId, wordsTyped, playerType, onReplay, onExit }: GameOverViewProps) {
  const winner = players.find(p => p.id === winnerId)
  
  // Calculate total words typed by all players
  const totalWords = Object.values(wordsTyped).reduce((sum, count) => sum + count, 0)
  
  // Sort players by words typed for leaderboard
  const sortedPlayers = [...players].sort((a, b) => {
    const aWords = wordsTyped[a.id] || 0
    const bWords = wordsTyped[b.id] || 0
    return bWords - aWords
  })
  
  return (
    <div className={styles.gameOverContainer}>
      <div className={styles.gameOverContent}>
        <h1 className={styles.gameOverTitle}>Game Over!</h1>
        
        {winner && (
          <div className={styles.winnerSection}>
            <h2 className={styles.winnerLabel}>🎉 Winner 🎉</h2>
            <div 
              className={styles.winnerIcon}
              style={{ backgroundColor: winner.color }}
            >
              <img src={`/icons/${winner.icon}.svg`} alt={winner.alias} />
            </div>
            <h3 className={styles.winnerName}>{winner.alias}</h3>
          </div>
        )}
        
        <div className={styles.statsSection}>
          <div className={styles.totalStat}>
            <h3>Total Pump Words Typed</h3>
            <div className={styles.totalNumber}>{totalWords}</div>
          </div>
          
          <div className={styles.leaderboard}>
            <h3>Words Typed (Pumping)</h3>
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className={styles.leaderboardRow}>
                <span className={styles.rank}>#{index + 1}</span>
                <div 
                  className={styles.playerIconSmall}
                  style={{ backgroundColor: player.color }}
                >
                  <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
                </div>
                <span className={styles.playerName}>{player.alias}</span>
                <span className={styles.wordCount}>{wordsTyped[player.id] || 0} words</span>
              </div>
            ))}
          </div>
        </div>

        {(playerType === 'host' || playerType === 'solo') && (
          <div className={styles.gameOverButtons}>
            <button className={styles.replayButton} onClick={onReplay}>
              Replay
            </button>
            <button className={styles.exitButton} onClick={onExit}>
              Exit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
