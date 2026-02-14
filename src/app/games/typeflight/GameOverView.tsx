import React from 'react'
import styles from './GameOverView.module.scss'

interface Player {
  id: string
  alias: string
  icon: string
  color: string
}

interface EventCounts {
  fire: number
  ice: number
  lightning: number
  bomb: number
  laser: number
  spikes: number
}

interface GameOverViewProps {
  elapsedMs: number
  players: Player[]
  playerDeaths: Record<string, number>
  wordsTyped: Record<string, number>
  eventCounts: EventCounts
  playerType: 'host' | 'join' | 'solo'
  onReplay: () => void
  onExit: () => void
}

const EVENT_ROWS: Array<{ type: keyof EventCounts; label: string; icon: string }> = [
  { type: 'fire', label: 'Fire', icon: '🔥' },
  { type: 'ice', label: 'Ice', icon: '❄️' },
  { type: 'lightning', label: 'Lightning', icon: '⚡' },
  { type: 'bomb', label: 'Bomb', icon: '💣' },
  { type: 'laser', label: 'Laser', icon: '🟢' },
  { type: 'spikes', label: 'Spikes', icon: '✶' }
]

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function GameOverView({
  elapsedMs,
  players,
  playerDeaths,
  wordsTyped,
  eventCounts,
  playerType,
  onReplay,
  onExit
}: GameOverViewProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    const aDeaths = playerDeaths[a.id] || 0
    const bDeaths = playerDeaths[b.id] || 0
    if (aDeaths !== bDeaths) return aDeaths - bDeaths
    return (wordsTyped[b.id] || 0) - (wordsTyped[a.id] || 0)
  })

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Game Over</h1>
        <div className={styles.timeLabel}>Time Survived</div>
        <div className={styles.timeValue}>{formatDuration(elapsedMs)}</div>

        <div className={styles.tables}>
          <section className={styles.section}>
            <h2>Player Stats</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Deaths</th>
                  <th>Words Typed</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <div className={styles.playerCell}>
                        <span className={styles.playerIcon} style={{ backgroundColor: player.color }}>
                          <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
                        </span>
                        <span className={styles.playerName}>{player.alias}</span>
                      </div>
                    </td>
                    <td>{playerDeaths[player.id] || 0}</td>
                    <td>{wordsTyped[player.id] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h2>Event Counts</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_ROWS.map((row) => (
                  <tr key={row.type}>
                    <td>
                      <div className={styles.eventCell}>
                        <span className={styles.eventIcon}>{row.icon}</span>
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td>{eventCounts[row.type] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {(playerType === 'host' || playerType === 'solo') && (
          <div className={styles.actions}>
            <button onClick={onReplay}>Replay</button>
            <button className={styles.exitBtn} onClick={onExit}>Exit</button>
          </div>
        )}
      </div>
    </div>
  )
}
