import React from 'react'
import styles from './page.module.scss'

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
  const rankedPlayers = players
    .map(player => ({
      ...player,
      position: gameState.playerPositions[player.id]
    }))
    .filter(p => Boolean(p.position))
    .sort((a, b) => {
      const aFinished = Boolean(a.position?.finished) || a.position?.time !== null
      const bFinished = Boolean(b.position?.finished) || b.position?.time !== null
      if (aFinished !== bFinished) return aFinished ? -1 : 1
      const aTime = a.position?.time ?? Number.POSITIVE_INFINITY
      const bTime = b.position?.time ?? Number.POSITIVE_INFINITY
      return aTime - bTime
    })

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
              <th>Status</th>
              <th>Time (s)</th>
              <th>WPM</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            {rankedPlayers.map((player, index) => (
              (() => {
                const finished = Boolean(player.position?.finished) || player.position?.time !== null
                const timeMs = player.position?.time
                const rankText = finished && typeof timeMs === 'number' ? `#${index + 1}` : '—'
                return (
              <tr
                key={player.id}
                style={{ borderColor: getBorderColor(index + 1) }}
                className={styles.resultRow}
              >
                <td className={styles.rankCell}>{rankText}</td>
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
                  {finished ? 'Finished' : 'DNF'}
                </td>
                <td className={styles.timeCell}>
                  {typeof timeMs === 'number' ? (timeMs / 1000).toFixed(3) : '—'}
                </td>
                <td className={styles.wpmCell}>
                  {typeof timeMs === 'number' ? calculateWPM(timeMs) : '—'}
                </td>
                <td className={styles.errorsCell}>
                  {player.position?.errors ?? 0}
                </td>
              </tr>
                )
              })()
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
