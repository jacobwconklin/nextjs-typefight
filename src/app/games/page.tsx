"use client"

import React, { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import LetterWall from "../../components/LetterWall"
import styles from "./page.module.scss"
import { usePlayerType } from "../../context/PlayerTypeContext"
import wsClient from "../../websocket/wsClient"

const GAMES = [
  { id: "quickkeys", title: "QuickKeys", color: "#ff6b6b" },
  { id: "spacebarinvaders", title: "SpaceBarInvaders", color: "#4d96ff" },
  { id: "textsplosion", title: "TextSplosion", color: "#ffb84d" },
  { id: "typeflight", title: "TypeFlight", color: "#8b6bff" },
]

export default function GamesPage() {
  const games = useMemo(() => GAMES, [])
  const { playerType, joinCode } = usePlayerType()
  const [players, setPlayers] = useState<Array<{ id: string; alias: string; icon: string; color: string }>>([])

  useEffect(() => {
    let mounted = true

    // solo players: read from localStorage and show lone icon
    if (playerType === 'solo') {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('tf_player') : null
      const p = stored ? JSON.parse(stored) : null
      if (p && mounted) setPlayers([{ id: p.id || 'solo', alias: p.alias || '', icon: p.icon || 'wizard', color: p.color || '#888' }])
      return () => { mounted = false }
    }

    // multiplayer: subscribe to party state updates to list players
    const onPartyState = (payload: any) => {
      if (!mounted) return
      setPlayers((payload.players || []).map((pp: any) => ({ id: pp.id, alias: pp.alias, icon: pp.icon, color: pp.color })))
    }

    wsClient.on('partyState', onPartyState)

    // fetch initial list if joinCode available
    if (joinCode) {
      wsClient.request('getParty', { code: joinCode }).then((res) => {
        if (!mounted) return
        setPlayers((res?.players || []).map((pp: any) => ({ id: pp.id, alias: pp.alias, icon: pp.icon, color: pp.color })))
      }).catch(() => {})
    }

    return () => {
      mounted = false
      wsClient.off('partyState', onPartyState)
    }
  }, [playerType, joinCode])

  return (
    <div className={styles.page}>
      <LetterWall />

      <main className={styles.content}>
        {/* Player icons strip centered at top */}
        <div className={styles.playersStrip} aria-hidden={players.length === 0}>
          <div className={styles.playersInner}>
            {players.map((p) => (
              <div key={p.id} className={styles.playerIcon} title={p.alias} style={{ background: p.color }}>
                <img src={`/icons/${p.icon}.svg`} alt={p.alias} width={40} height={40} />
              </div>
            ))}
          </div>
        </div>

        <h1 className={styles.title}>Games</h1>
        <div className={styles.grid}>
          {games.map((g) => (
            <Link key={g.id} href={`/games/${g.id}`} className={styles.card} style={{ ["--accent" as any]: g.color }}>
              <div className={styles.cardInner}>
                <div className={styles.cardMedia} />
                <div className={styles.cardBody}>
                  <h3>{g.title}</h3>
                  <p className={styles.hint}>Hover to preview • Click to play</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
