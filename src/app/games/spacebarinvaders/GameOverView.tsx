"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import styles from './GameOverView.module.scss'

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface GameOverViewProps {
  survivalTime: number
  playerStats: Record<string, number>
  players: Player[]
  finalWave: number
  playerType: 'solo' | 'host' | 'join'
  onReplay: () => void
  onExit: () => void
}

export default function GameOverView({
  survivalTime,
  playerStats,
  players,
  finalWave,
  playerType,
  onReplay,
  onExit
}: GameOverViewProps) {
  const router = useRouter()

  // Format time as MM:SS
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Create sorted player list with stats
  const playerList = players.map(player => ({
    ...player,
    dangersDestroyed: playerStats[player.id] || 0
  })).sort((a, b) => b.dangersDestroyed - a.dangersDestroyed)

  // Calculate total dangers destroyed
  const totalDestroyed = Object.values(playerStats).reduce((sum, count) => sum + count, 0)

  console.log('GameOverView rendered, playerType:', playerType, 'onReplay:', typeof onReplay, 'onExit:', typeof onExit)

  return (
    <div className={styles.gameOverContainer}>
      {/* Background */}
      <div 
        className={styles.background}
        style={{
          backgroundImage: 'url(/icons/exploding-earth.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Content overlay */}
      <div className={styles.content}>
        <h1 className={styles.title}>GAME OVER</h1>
        
        <div className={styles.statsCard}>
          <div className={styles.survivalInfo}>
            <div className={styles.statLabel}>Time Survived</div>
            <div className={styles.survivalTime}>{formatTime(survivalTime)}</div>
            <div className={styles.waveInfo}>Wave {finalWave} Reached</div>
          </div>
          
          <div className={styles.divider}></div>
          
          <div className={styles.playerStatsSection}>
            <h2 className={styles.sectionTitle}>Dangers Destroyed</h2>
            <table className={styles.playerTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Icon</th>
                  <th>Player</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {playerList.map((player, index) => (
                  <tr key={player.id}>
                    <td className={styles.rank}>#{index + 1}</td>
                    <td className={styles.iconCell}>
                      <div
                        className={styles.playerIcon}
                        style={{ backgroundColor: player.color }}
                      >
                        <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
                      </div>
                    </td>
                    <td className={styles.playerAlias}>
                      {player.alias}
                    </td>
                    <td className={styles.count}>{player.dangersDestroyed}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className={styles.totalLabel}>Total</td>
                  <td className={styles.totalCount}>{totalDestroyed}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {(playerType === 'host' || playerType === 'solo') && (
          <div className={styles.buttons}>
            <button 
              onClick={() => {
                console.log('Replay button clicked')
                onReplay()
              }} 
              className={styles.playAgainButton}
            >
              Replay
            </button>
            <button 
              onClick={() => {
                console.log('Exit button clicked')
                onExit()
              }} 
              className={styles.returnButton}
            >
              Exit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
