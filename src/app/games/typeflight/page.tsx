"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import styles from './page.module.scss'
import {
  moveWithWrap,
  sendTypeFlightMove,
  type TypeFlightDirection,
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

const DIRECTIONS: TypeFlightDirection[] = ['up', 'right', 'down', 'left']

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
  const { playerType, playerData, joinCode } = usePlayerType()
  const [players, setPlayers] = useState<Player[]>([])
  const [playerStates, setPlayerStates] = useState<Record<string, TypeFlightPlayerState>>({})
  const [currentPlayerId, setCurrentPlayerId] = useState('')
  const [directionWords, setDirectionWords] = useState<DirectionWords>(() => createDirectionWords())
  const [input, setInput] = useState('')

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
      if (session?.gameName !== 'typeflight') return

      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }

      if (session.gameState?.gameType === 'typeflight' && session.gameState.players) {
        setPlayerStates(session.gameState.players)
      }
    }

    const onGameUpdate = (payload: any) => {
      if (!mounted || payload?.gameType !== 'typeflight') return

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
  }, [joinCode, playerType])

  const indexedPlayers = useMemo(
    () => players.map((player, index) => ({ player, index })),
    [players]
  )

  const currentPlayerState = currentPlayerId ? playerStates[currentPlayerId] : undefined

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
        </aside>

        <section className={styles.gridArea}>
          <div className={styles.gridSquare}>
            <div className={styles.grid}>
              {Array.from({ length: 100 }).map((_, index) => (
                <div key={index} className={styles.tile} />
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
