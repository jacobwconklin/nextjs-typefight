"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import styles from './page.module.scss'
import GameOverView from './GameOverView'
import {
  moveWithWrap,
  sendTypeFlightPlayerKilled,
  sendTypeFlightMove,
  type TypeFlightDirection,
  type TypeFlightEventType,
  type TypeFlightPlayerState
} from '../../../websocket/typeflightClient'
import { generate } from 'random-words'

type DirectionWords = Record<TypeFlightDirection, string>

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface LiveEvent {
  id: string
  type: TypeFlightEventType | 'bomb'
  position: { x: number; y: number }
}

interface GameOverStats {
  elapsedMs: number
  playerDeaths: Record<string, number>
  wordsTyped: Record<string, number>
  eventCounts: {
    fire: number
    ice: number
    lightning: number
    bomb: number
    laser: number
    spikes: number
  }
}

const DIRECTIONS: TypeFlightDirection[] = ['up', 'right', 'down', 'left']
const WARNING_DURATION_MS = 1500
const ACTION_FLASH_MS = 260

const toEventType = (value: string): TypeFlightEventType | 'bomb' => {
  if (value === 'bob') return 'bomb'
  if (value === 'fire' || value === 'ice' || value === 'lightning' || value === 'bomb' || value === 'laser' || value === 'spikes') {
    return value
  }
  return 'fire'
}

const cellKey = (x: number, y: number) => `${x},${y}`

const randomWord = (exclude: Set<string> = new Set()): string => {
  let next = ''
  let attempts = 0

  while (attempts < 30) {
    const generated = generate({ exactly: 1, minLength: 4, maxLength: 8 }) as string[]
    next = String(generated[0] || '').toLowerCase().trim()
    if (next && !exclude.has(next)) return next
    attempts += 1
  }

  return `word${Math.floor(Math.random() * 1000)}`
}

const createDirectionWords = (): DirectionWords => {
  const used = new Set<string>()
  const map = {} as DirectionWords

  DIRECTIONS.forEach((direction) => {
    const word = randomWord(used)
    used.add(word)
    map[direction] = word
  })

  return map
}

const randomStart = () => ({
  x: Math.floor(Math.random() * 10),
  y: Math.floor(Math.random() * 10),
  alive: true
})

export default function TypeFlightPage() {
  const router = useRouter()
  const { playerType, playerData, joinCode } = usePlayerType()
  const [players, setPlayers] = useState<Player[]>([])
  const [playerStates, setPlayerStates] = useState<Record<string, TypeFlightPlayerState>>({})
  const [currentPlayerId, setCurrentPlayerId] = useState('')
  const [directionWords, setDirectionWords] = useState<DirectionWords>(() => createDirectionWords())
  const [input, setInput] = useState('')
  const [warningEvents, setWarningEvents] = useState<LiveEvent[]>([])
  const [rowFlashes, setRowFlashes] = useState<Array<{ id: string; y: number; type: TypeFlightEventType | 'bomb' }>>([])
  const [wordsTyped, setWordsTyped] = useState<Record<string, number>>({})
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null)
  const timeoutRefs = useRef<number[]>([])
  const playerStatesRef = useRef(playerStates)
  const currentPlayerIdRef = useRef(currentPlayerId)

  useEffect(() => {
    playerStatesRef.current = playerStates
  }, [playerStates])

  useEffect(() => {
    currentPlayerIdRef.current = currentPlayerId
  }, [currentPlayerId])

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id))
      timeoutRefs.current = []
    }
  }, [])

  useEffect(() => {
    const id = playerData?.id || (playerType === 'solo' ? 'solo' : '')
    setCurrentPlayerId(id)

    if (playerType === 'solo') {
      const solo: Player = {
        id: id || 'solo',
        alias: playerData?.alias || 'Player',
        icon: playerData?.icon || 'wizard',
        color: playerData?.color || '#9aa0a6',
        font: playerData?.font
      }
      setPlayers([solo])
      setPlayerStates({ [solo.id]: randomStart() })
    }
  }, [playerData, playerType])

  useEffect(() => {
    if (playerType === 'solo') return

    let mounted = true

    wsClient.socketRequest('game-status', {})
      .then((response) => {
        if (!mounted || !response?.session) return

        if (Array.isArray(response.session.players)) {
          setPlayers(response.session.players)
        }

        const state = response.session.gameState
        if (state?.gameType === 'typeflight' && state.players) {
          setPlayerStates(state.players)
          setWordsTyped(state.wordsTyped || {})
          if (state.gameOver) {
            setGameOverStats({
              elapsedMs: state.elapsedMs || 0,
              playerDeaths: state.playerDeaths || {},
              wordsTyped: state.wordsTyped || {},
              eventCounts: {
                fire: state.eventCounts?.fire || 0,
                ice: state.eventCounts?.ice || 0,
                lightning: state.eventCounts?.lightning || 0,
                bomb: state.eventCounts?.bomb || 0,
                laser: state.eventCounts?.laser || 0,
                spikes: state.eventCounts?.spikes || 0
              }
            })
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch TypeFlight game-status:', err)
      })

    const onPartyState = (payload: any) => {
      if (!mounted) return
      if (Array.isArray(payload?.players)) {
        setPlayers(payload.players)
      }
    }

    const onGameStarted = (payload: any) => {
      if (!mounted) return
      const session = payload?.session

      // Handle party redirect when host exits back to games page.
      if (session?.gameName === 'games') {
        router.push('/games')
        return
      }

      if (session?.gameName !== 'typeflight') return

      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }

      if (session.gameState?.gameType === 'typeflight' && session.gameState.players) {
        setPlayerStates(session.gameState.players)
        setWordsTyped(session.gameState.wordsTyped || {})
        setGameOverStats(
          session.gameState.gameOver
            ? {
                elapsedMs: session.gameState.elapsedMs || 0,
                playerDeaths: session.gameState.playerDeaths || {},
                wordsTyped: session.gameState.wordsTyped || {},
                eventCounts: {
                  fire: session.gameState.eventCounts?.fire || 0,
                  ice: session.gameState.eventCounts?.ice || 0,
                  lightning: session.gameState.eventCounts?.lightning || 0,
                  bomb: session.gameState.eventCounts?.bomb || 0,
                  laser: session.gameState.eventCounts?.laser || 0,
                  spikes: session.gameState.eventCounts?.spikes || 0
                }
              }
            : null
        )
      }
    }

    const onGameUpdate = (payload: any) => {
      if (!mounted || payload?.gameType !== 'typeflight') return

      if (payload.type === 'event-spawned' && payload.event?.id) {
        const event: LiveEvent = {
          id: payload.event.id,
          type: toEventType(String(payload.event.type || 'fire')),
          position: {
            x: Number(payload.event.position?.x ?? 0),
            y: Number(payload.event.position?.y ?? 0)
          }
        }

        setWarningEvents((prev) => [...prev, event])

        const actionTimeout = window.setTimeout(() => {
          // Remove warning/icon
          setWarningEvents((prev) => prev.filter((evt) => evt.id !== event.id))

          // Flash all squares in row (temporary behavior until per-event patterns are added)
          setRowFlashes((prev) => [...prev, { id: event.id, y: event.position.y, type: event.type }])

          const clearFlashTimeout = window.setTimeout(() => {
            setRowFlashes((prev) => prev.filter((row) => row.id !== event.id))
          }, ACTION_FLASH_MS)

          timeoutRefs.current.push(clearFlashTimeout)

          // Kill all players in affected row
          setPlayerStates((prev) => {
            const next = { ...prev }
            Object.entries(prev).forEach(([pid, state]) => {
              if (state.alive && state.y === event.position.y) {
                next[pid] = { ...state, alive: false }
              }
            })
            return next
          })

          const snapshot = playerStatesRef.current
          const currentId = currentPlayerIdRef.current
          const me = currentId ? snapshot[currentId] : undefined

          if (me?.alive && me.y === event.position.y) {
            sendTypeFlightPlayerKilled({ x: me.x, y: me.y })
          }
        }, WARNING_DURATION_MS)

        timeoutRefs.current.push(actionTimeout)
        return
      }

      if (
        (payload.type === 'player-moved' ||
          payload.type === 'player-state' ||
          payload.type === 'player-killed' ||
          payload.type === 'player-revived') &&
        payload.playerId &&
        payload.player
      ) {
        setPlayerStates((prev) => ({
          ...prev,
          [payload.playerId]: payload.player
        }))
      }

      if (payload.wordsTyped) {
        setWordsTyped(payload.wordsTyped)
      }

      if ((payload.type === 'game-over' || payload.gameOver) && payload.playerDeaths && payload.eventCounts) {
        setGameOverStats({
          elapsedMs: payload.elapsedMs || 0,
          playerDeaths: payload.playerDeaths || {},
          wordsTyped: payload.wordsTyped || {},
          eventCounts: {
            fire: payload.eventCounts?.fire || 0,
            ice: payload.eventCounts?.ice || 0,
            lightning: payload.eventCounts?.lightning || 0,
            bomb: payload.eventCounts?.bomb || 0,
            laser: payload.eventCounts?.laser || 0,
            spikes: payload.eventCounts?.spikes || 0
          }
        })
      }
    }

    wsClient.on('partyState', onPartyState)
    wsClient.on('game-started', onGameStarted)
    wsClient.on('game-update', onGameUpdate)

    return () => {
      mounted = false
      wsClient.off('partyState', onPartyState)
      wsClient.off('game-started', onGameStarted)
      wsClient.off('game-update', onGameUpdate)
    }
  }, [joinCode, playerType, router])

  const indexedPlayers = useMemo(
    () => players.map((player, index) => ({ player, index })),
    [players]
  )

  const currentPlayerState = currentPlayerId ? playerStates[currentPlayerId] : undefined

  const warningCellByKey = useMemo(() => {
    const map: Record<string, TypeFlightEventType | 'bomb'> = {}
    warningEvents.forEach((event) => {
      map[cellKey(event.position.x, event.position.y)] = event.type
    })
    return map
  }, [warningEvents])

  const flashRowByY = useMemo(() => {
    const map: Record<number, TypeFlightEventType | 'bomb'> = {}
    rowFlashes.forEach((row) => {
      map[row.y] = row.type
    })
    return map
  }, [rowFlashes])

  const moveCurrentPlayer = (direction: TypeFlightDirection) => {
    if (!currentPlayerId) return
    const currentState = playerStates[currentPlayerId]
    if (!currentState?.alive) return

    const nextPosition = moveWithWrap({ x: currentState.x, y: currentState.y }, direction)

    setPlayerStates((prev) => ({
      ...prev,
      [currentPlayerId]: {
        ...prev[currentPlayerId],
        ...nextPosition,
        alive: true
      }
    }))
    setWordsTyped((prev) => ({
      ...prev,
      [currentPlayerId]: (prev[currentPlayerId] || 0) + 1
    }))

    if (playerType !== 'solo') {
      sendTypeFlightMove(direction)
    }
  }

  const replaceDirectionWord = (direction: TypeFlightDirection) => {
    setDirectionWords((prev) => {
      const used = new Set(Object.values(prev).filter(Boolean))
      used.delete(prev[direction])
      return {
        ...prev,
        [direction]: randomWord(used)
      }
    })
  }

  const tryConsumeMovementWord = (rawValue: string) => {
    const value = rawValue.toLowerCase().trim()
    if (!value) return

    const entry = (Object.entries(directionWords) as Array<[TypeFlightDirection, string]>).find(
      ([, word]) => word === value
    )

    if (!entry) return

    const [direction] = entry
    moveCurrentPlayer(direction)
    replaceDirectionWord(direction)
    setInput('')
  }

  const handleExit = () => {
    if (playerType === 'solo') {
      router.push('/games')
      return
    }

    if (playerType === 'host') {
      wsClient.send('start-game', { code: joinCode, gameName: 'games' })
    }
  }

  const handleReplay = () => {
    if (playerType === 'solo') {
      window.location.reload()
      return
    }

    if (playerType === 'host') {
      wsClient.send('start-game', { code: joinCode, gameName: 'typeflight' })
    }
  }

  if (gameOverStats) {
    return (
      <GameOverView
        elapsedMs={gameOverStats.elapsedMs}
        players={players}
        playerDeaths={gameOverStats.playerDeaths}
        wordsTyped={gameOverStats.wordsTyped}
        eventCounts={gameOverStats.eventCounts}
        playerType={playerType}
        onReplay={handleReplay}
        onExit={handleExit}
      />
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.playSurface}>
        <aside className={styles.controlsColumn}>
          <h2 className={styles.controlsTitle}>Controls</h2>

          <div className={styles.compassArea}>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowUp}`} />
              <div className={styles.directionWord}>{directionWords.up}</div>
            </div>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowRight}`} />
              <div className={styles.directionWord}>{directionWords.right}</div>
            </div>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowLeft}`} />
              <div className={styles.directionWord}>{directionWords.left}</div>
            </div>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowDown}`} />
              <div className={styles.directionWord}>{directionWords.down}</div>
            </div>
          </div>

          <input
            className={styles.playerInput}
            placeholder="Player Input"
            value={input}
            onChange={(e) => {
              const nextValue = e.target.value
              setInput(nextValue)
              tryConsumeMovementWord(nextValue)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                tryConsumeMovementWord(input)
                setInput('')
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          <div className={styles.statusLine}>
            {currentPlayerState?.alive === false ? 'You are downed' : 'You are alive'}
          </div>

          {(playerType === 'host' || playerType === 'solo') && (
            <button className={styles.exitButton} onClick={handleExit}>
              Exit
            </button>
          )}
        </aside>

        <section className={styles.gridArea}>
          <div className={styles.gridSquare}>
            <div className={styles.grid}>
              {Array.from({ length: 100 }).map((_, index) => {
                const x = index % 10
                const y = Math.floor(index / 10)
                const warningType = warningCellByKey[cellKey(x, y)]
                const flashType = flashRowByY[y]

                return (
                  <div
                    key={index}
                    className={`${styles.tile} ${warningType ? styles.tileWarning : ''} ${flashType ? styles.tileFlash : ''}`}
                    style={{
                      ['--warning-color' as string]: warningType ? `var(--event-${warningType})` : undefined,
                      ['--flash-color' as string]: flashType ? `var(--event-${flashType})` : undefined
                    }}
                  />
                )
              })}

              {warningEvents.map((event) => (
                <div
                  key={event.id}
                  className={styles.eventMarker}
                  style={{
                    left: `${(event.position.x + 0.5) * 10}%`,
                    top: `${(event.position.y + 0.5) * 10}%`,
                    ['--event-color' as string]: `var(--event-${event.type})`
                  }}
                  title={event.type}
                >
                  <div className={styles.eventMarkerInner}>{event.type.slice(0, 1).toUpperCase()}</div>
                </div>
              ))}

              {indexedPlayers.map(({ player, index }) => {
                const state = playerStates[player.id]
                if (!state) return null

                const isCurrent = player.id === currentPlayerId

                return (
                  <div
                    key={player.id}
                    className={`${styles.playerMarker} ${isCurrent ? styles.currentPlayerMarker : ''} ${
                      state.alive ? '' : styles.downedPlayer
                    }`}
                    style={{
                      left: `${(state.x + 0.5) * 10}%`,
                      top: `${(state.y + 0.5) * 10}%`,
                      zIndex: isCurrent ? 999 : 100 + (players.length - index)
                    }}
                    title={player.alias}
                  >
                    <div className={styles.markerInner} style={{ backgroundColor: player.color || '#8899aa' }}>
                      <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
