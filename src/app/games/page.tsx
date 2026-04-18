"use client"

import React, { useMemo, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import LetterWall from "../../components/LetterWall"
import styles from "./page.module.scss"
import { usePlayerType } from "../../context/PlayerTypeContext"
import wsClient from "../../websocket/wsClient"

type GameCard = {
  id: string
  title: string
  color: string
  disabled?: boolean
  mediaLabel?: string
  image?: string
}

const GAMES: GameCard[] = [
  { id: "quickkeys", title: "QuickKeys", color: "#ff6b6b", image: "quickkeys-ai-slop.png" },
  { id: "spacebarinvaders", title: "SpaceBarInvaders", color: "#4d96ff", image: "spacebarinvaders-ai-slop.png" },
  { id: "textsplosion", title: "TextSplosion", color: "#ffb84d", image: "textsplosion-ai-slop.png" },
  { id: "typeflight", title: "TypeFlight", color: "#8b6bff", image: "typeflight-ai-slop.png" },
  { id: "typekwando", title: "Typekwando", color: "#34d399", image: "typekwando-ai-slop.png" },
]

const WORD_WAR_1: GameCard = {
  id: "wordwar1",
  title: "Word War 1",
  color: "#888",
  disabled: true,
  mediaLabel: "Coming Soon",
  image: "wordwar1-ai-slop.png",
}

const MULTIPLAYER_ONLY_GAME_IDS = new Set(["textsplosion", "typekwando"])

export default function GamesPage() {
  const games = useMemo(() => [...GAMES, WORD_WAR_1], [])
  const router = useRouter()
  const { playerType, joinCode, playerData } = usePlayerType()
  const [players, setPlayers] = useState<Array<{ id: string; alias: string; icon: string; color: string }>>([])
  const [votes, setVotes] = useState<Record<string, string[]>>({})
  const isMultiplayerUnavailable = playerType === 'solo' || players.length <= 1

  const isGameUnavailable = (game: GameCard) => {
    return game.disabled || (MULTIPLAYER_ONLY_GAME_IDS.has(game.id) && isMultiplayerUnavailable)
  }

  useEffect(() => {
    let mounted = true

    // solo players: read from context and show lone icon
    if (playerType === 'solo' && playerData) {
      if (mounted) setPlayers([{ id: playerData.id || 'solo', alias: playerData.alias || '', icon: playerData.icon || 'wizard', color: playerData.color || '#888' }])
      return () => { mounted = false }
    }

    // multiplayer: subscribe to party state updates to list players
    const onPartyState = (payload: any) => {
      if (!mounted) return
      setPlayers((payload.players || []).map((pp: any) => ({ id: pp.id, alias: pp.alias, icon: pp.icon, color: pp.color })))
    }

    const onGameStarted = (payload: any) => {
      if (!mounted) return
      // Navigate to the selected game
      if (payload.session && payload.session.gameName) {
        // If gameName is 'games', stay on the games page (don't navigate)
        // Otherwise navigate to the specific game
        if (payload.session.gameName !== 'games') {
          router.push(`/games/${payload.session.gameName}`)
        }
        // If gameName is 'games', we're already on the right page
      }
    }

    const onGameUpdate = (payload: any) => {
      if (!mounted) return
      if (payload.type === 'vote-update') {
        console.log('Vote update received:', payload.votes)
        setVotes(payload.votes || {})
      }
    }

    const onSessionPhaseChanged = (payload: any) => {
      if (!mounted) return
      if (payload?.phase === 'lobby' && joinCode) {
        router.push(`/party/${joinCode}`)
      }
    }

    wsClient.on('partyState', onPartyState)
    wsClient.on('game-started', onGameStarted)
    wsClient.on('game-update', onGameUpdate)
    wsClient.on('session-phase-changed', onSessionPhaseChanged)

    // Fetch initial game status to get current votes
    if (joinCode) {
      wsClient.socketRequest('game-status', {}).then((response) => {
        if (!mounted || !response || !response.session) return
        if (response.session.gameState && response.session.gameState.votes) {
          console.log('Initial votes loaded:', response.session.gameState.votes)
          setVotes(response.session.gameState.votes)
        }
      }).catch((err) => {
        console.error('Failed to fetch game status for votes:', err)
      })
    }

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
      wsClient.off('game-started', onGameStarted)
      wsClient.off('game-update', onGameUpdate)
      wsClient.off('session-phase-changed', onSessionPhaseChanged)
    }
  }, [playerType, joinCode, router])

  const handleReturnToParty = () => {
    if (playerType !== 'host' || !joinCode) return
    void wsClient.sendWithRetry('host-return-to-lobby', { code: joinCode }).catch((err) => {
      console.error('Failed to return party to lobby:', err)
    })
  }

  const handleGameClick = (game: GameCard) => {
    if (isGameUnavailable(game)) {
      return
    }

    const gameId = game.id
    if (playerType === 'solo') {
      // Solo player - just navigate
      router.push(`/games/${gameId}`)
    } else if (playerType === 'host') {
      // Host - start the game via websocket
      console.log(`Host starting game ${gameId} in session ${joinCode}`)
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: gameId }).catch((err) => {
        console.error('Failed to start game:', err)
      })
    } else if (playerType === 'join') {
      // Join player - vote for the game
      console.log(`Join player voting for game ${gameId}`)
      wsClient.send('update-game', {
        type: 'vote',
        gameName: gameId
      })
    }
  }

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
        {playerType === 'host' && (
          <button className={styles.returnToPartyButton} onClick={handleReturnToParty}>
            Return To Party
          </button>
        )}
        <div className={styles.grid}>
          {games.map((g) => {
            const isMultiplayerOnly = MULTIPLAYER_ONLY_GAME_IDS.has(g.id)
            const showMultiplayerOnly = isMultiplayerOnly && isMultiplayerUnavailable
            const isUnavailable = isGameUnavailable(g)
            const gameVotes = votes[g.id] || []
            const voters = gameVotes.map(playerId => players.find(p => p.id === playerId)).filter(Boolean)
            
            return (
              <div key={g.id} className={styles.cardWrapper}>
                <div 
                  onClick={() => handleGameClick(g)}
                  className={`${styles.card} ${isUnavailable ? styles.cardDisabled : ''}`}
                  style={{ ["--accent" as any]: g.color }}
                >
                  <div className={styles.cardInner}>
                    <div className={styles.cardMedia}>
                      {g.image && <img src={`/icons/gamecards/${g.image}`} alt={g.title} className={styles.cardImage} />}
                      {showMultiplayerOnly && <span className={styles.cardMediaOverlay}>Multiplayer Only</span>}
                      {g.mediaLabel && <span className={styles.cardMediaLabel}>{g.mediaLabel}</span>}
                    </div>
                    <div className={styles.cardBody}>
                      <h3>{g.title}</h3>
                      <p className={styles.hint}>
                        {g.disabled
                          ? 'Coming Soon'
                          : showMultiplayerOnly
                            ? 'Multiplayer Only'
                            : playerType === 'join'
                              ? 'Click to vote'
                              : playerType === 'host'
                                ? 'Click to start'
                                : 'Click to play'}
                      </p>
                    </div>
                  </div>
                </div>
                {voters.length > 0 && (
                  <div className={styles.voters}>
                    {voters.map((voter) => (
                        voter ?
                        <div 
                          key={voter.id} 
                          className={styles.voterIcon} 
                          title={voter.alias}
                          style={{ backgroundColor: voter.color }}
                        >
                          <img src={`/icons/${voter.icon}.svg`} alt={voter.alias} width={24} height={24} />
                        </div>
                        :
                        <></>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
