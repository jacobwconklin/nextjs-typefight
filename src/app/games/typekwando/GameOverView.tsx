import React from "react"
import styles from "./GameOverView.module.scss"

interface Player {
  id: string
  alias: string
  icon: string
  color: string
}

interface GameOverViewProps {
  players: Player[]
  winnerId: string | null
  draw: boolean
  wordsTyped: Record<string, number>
  eliminationOrder: string[]
  playerType: "host" | "join" | "solo"
  onReplay: () => void
  onExit: () => void
}

const getEliminationLabel = (playerId: string, eliminationOrder: string[], draw: boolean) => {
  const index = eliminationOrder.indexOf(playerId)
  if (index >= 0) return String(index + 1)
  return draw ? "-" : "survived"
}

export default function GameOverView({
  players,
  winnerId,
  draw,
  wordsTyped,
  eliminationOrder,
  playerType,
  onReplay,
  onExit
}: GameOverViewProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    const aOrder = eliminationOrder.indexOf(a.id)
    const bOrder = eliminationOrder.indexOf(b.id)

    if (!draw && aOrder === -1 && bOrder !== -1) return -1
    if (!draw && bOrder === -1 && aOrder !== -1) return 1

    if (aOrder === -1 && bOrder === -1) {
      return (wordsTyped[b.id] || 0) - (wordsTyped[a.id] || 0)
    }
    if (aOrder === -1) return 1
    if (bOrder === -1) return -1
    if (aOrder !== bOrder) return aOrder - bOrder

    return (wordsTyped[b.id] || 0) - (wordsTyped[a.id] || 0)
  })

  const winnerName = winnerId ? players.find((player) => player.id === winnerId)?.alias || "Unknown" : null

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Game Over</h1>
        <p className={styles.subtitle}>{draw ? "Draw" : `Winner: ${winnerName}`}</p>

        <section className={styles.section}>
          <h2>Typekwando Stats</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Player</th>
                <th>Words Typed</th>
                <th>Elimination Order</th>
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
                  <td>{wordsTyped[player.id] || 0}</td>
                  <td>{getEliminationLabel(player.id, eliminationOrder, draw)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {(playerType === "host" || playerType === "solo") && (
          <div className={styles.actions}>
            <button onClick={onReplay}>Replay</button>
            <button className={styles.exitBtn} onClick={onExit}>Exit</button>
          </div>
        )}
      </div>
    </div>
  )
}
