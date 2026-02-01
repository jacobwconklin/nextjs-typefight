import React from 'react'
import styles from './page.module.scss'

interface PlayerPosition {
  index: number
  time: number | null
  errors: number
}

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface GameOverViewProps {
  players: Player[]
  gameState: {
    finished: boolean
    textName: string | null
    playerPositions: Record<string, PlayerPosition>
  }
  totalWordCount: number
  playerType: 'solo' | 'host' | 'join'
  onReplay: () => void
  onExit: () => void
}

export default function GameOverView({
  players,
  gameState,
  totalWordCount,
  playerType,
  onReplay,
  onExit
}: GameOverViewProps) {
  // Sort players by completion time (fastest first)
  const rankedPlayers = players
    .map(player => ({
      ...player,
      position: gameState.playerPositions[player.id]
    }))
    .filter(p => p.position && p.position.time !== null)
    .sort((a, b) => (a.position.time || 0) - (b.position.time || 0))

  const getBorderColor = (rank: number) => {
    if (rank === 1) return '#FFD700' // Gold
    if (rank === 2) return '#C0C0C0' // Silver
    if (rank === 3) return '#CD7F32' // Bronze
    return '#ffffff' // White
  }

  const calculateWPM = (timeMs: number) => {
    const minutes = timeMs / 60000
    return (totalWordCount / minutes).toFixed(2)
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>QuickKeys - Results</h1>
      <p className={styles.subtitle}>Final Rankings</p>

      <div className={styles.resultsTable}>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Alias</th>
              <th>Time (s)</th>
              <th>WPM</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            {rankedPlayers.map((player, index) => (
              <tr
                key={player.id}
                style={{ borderColor: getBorderColor(index + 1) }}
                className={styles.resultRow}
              >
                <td className={styles.rankCell}>#{index + 1}</td>
                <td className={styles.iconCell}>
                  <div
                    className={styles.playerIconSmall}
                    style={{ backgroundColor: player.color }}
                  >
                    <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
                  </div>
                </td>
                <td
                  className={styles.aliasCell}
                  style={{ fontFamily: player.font || 'inherit' }}
                >
                  {player.alias}
                </td>
                <td className={styles.timeCell}>
                  {((player.position.time || 0) / 1000).toFixed(3)}
                </td>
                <td className={styles.wpmCell}>
                  {calculateWPM(player.position.time || 0)}
                </td>
                <td className={styles.errorsCell}>
                  {player.position.errors}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  )
}
