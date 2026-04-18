"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import GameInstructionsOverlay from '../../../components/GameInstructionsOverlay'
import styles from './page.module.scss'
import GameOverView from './GameOverView'
import { isSoloPlayer } from '../../../localGames/soloMode'
import {
  buildSoloPlayerMap,
  calculateSoloSpawnSettings,
  checkSoloGameOver,
  createEmptyEventCounts,
  createSoloEvents
} from '../../../localGames/typeflightSolo'
import {
  moveWithWrap,
  sendTypeFlightPlayerKilled,
  sendTypeFlightReviveWordTyped,
  sendTypeFlightPlayerRevived,
  sendTypeFlightMove,
  type TypeFlightDirection,
  type TypeFlightEventType,
  type TypeFlightPlayerState,
  wrapGridCoordinate
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
const CASUAL_GAME_LENGTH_MS = 60 * 1000
const INTENSE_GAME_LENGTH_MS = 45 * 1000
const START_WARNING_DURATION_MS = 2500
const CASUAL_END_WARNING_DURATION_MS = 1500
const MAX_WARNING_DURATION_MS = 500
const ACTION_FLASH_MS = 260

const TYPEFLIGHT_RULES = [
  'Type direction words to move around the grid.',
  'Avoid hazards and survive as long as possible.',
  'If downed, type revive words while a teammate stands on your tile.',
  'Longest survival with strong team support wins.'
]

type EventImpactOffset = { dx: number; dy: number }

// Update each event's offsets to define its impact pattern.
const EVENT_IMPACT_OFFSETS: Record<TypeFlightEventType, EventImpactOffset[]> = {
  fire: [
    { dx: -1, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: 2 }
  ],

  ice: [
    { dx: 0, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 }
  ],

  lightning: [
    { dx: 0, dy: 0 },
    { dx: -1, dy: 1 },
    { dx: -2, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 2, dy: 0 }
  ],

  bomb: [
    { dx: 0, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 }
  ],

  laser: [
    { dx: -2, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 2, dy: 0 }
  ],

  spikes: [
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 1, dy: -1 }
  ]
}

const toEventType = (value: string): TypeFlightEventType | 'bomb' => {
  if (value === 'fire' || value === 'ice' || value === 'lightning' || value === 'bomb' || value === 'laser' || value === 'spikes') {
    return value
  }
  return 'fire'
}

const cellKey = (x: number, y: number) => `${x},${y}`

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const lerp = (start: number, end: number, t: number) => start + (end - start) * t

const getWarningDurationMs = (elapsedMs: number) => {
  if (elapsedMs <= CASUAL_GAME_LENGTH_MS) {
    const t = clamp01(elapsedMs / CASUAL_GAME_LENGTH_MS)
    return Math.round(lerp(START_WARNING_DURATION_MS, CASUAL_END_WARNING_DURATION_MS, t))
  }

  const intenseElapsed = elapsedMs - CASUAL_GAME_LENGTH_MS
  const t = clamp01(intenseElapsed / INTENSE_GAME_LENGTH_MS)
  return Math.round(lerp(CASUAL_END_WARNING_DURATION_MS, MAX_WARNING_DURATION_MS, t))
}

const getEventImpactPositions = (event: LiveEvent): Array<{ x: number; y: number }> => {
  const offsets = EVENT_IMPACT_OFFSETS[event.type] ?? []
  return offsets.map((offset) => ({
    x: wrapGridCoordinate(event.position.x + offset.dx),
    y: wrapGridCoordinate(event.position.y + offset.dy)
  }))
}

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

const createReviveWords = (count: number): string[] => {
  const used = new Set<string>()
  return Array.from({ length: Math.max(0, count) }).map(() => {
    const next = randomWord(used)
    used.add(next)
    return next
  })
}

export default function TypeFlightPage() {
  const router = useRouter()
  const { playerType, playerData, joinCode } = usePlayerType()
  const isSolo = isSoloPlayer(playerType)
  const [players, setPlayers] = useState<Player[]>([])
  const [playerStates, setPlayerStates] = useState<Record<string, TypeFlightPlayerState>>({})
  const [currentPlayerId, setCurrentPlayerId] = useState('')
  const [directionWords, setDirectionWords] = useState<DirectionWords>(() => createDirectionWords())
  const [input, setInput] = useState('')
  const [warningEvents, setWarningEvents] = useState<LiveEvent[]>([])
  const [flashEvents, setFlashEvents] = useState<
    Array<{ id: string; type: TypeFlightEventType | 'bomb'; positions: Array<{ x: number; y: number }> }>
  >([])
  const [playerDeaths, setPlayerDeaths] = useState<Record<string, number>>({})
  const [wordsTyped, setWordsTyped] = useState<Record<string, number>>({})
  const [eventCounts, setEventCounts] = useState(createEmptyEventCounts())
  const [gameElapsedMs, setGameElapsedMs] = useState(0)
  const [reviveWords, setReviveWords] = useState<string[]>([])
  const [reviveProgress, setReviveProgress] = useState(0)
  const [reviveDeathCount, setReviveDeathCount] = useState(0)
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null)
  const [hasBegun, setHasBegun] = useState(false)
  const timeoutRefs = useRef<number[]>([])
  const playerStatesRef = useRef(playerStates)
  const currentPlayerIdRef = useRef(currentPlayerId)
  const gameElapsedMsRef = useRef(gameElapsedMs)
  const wordsTypedRef = useRef(wordsTyped)
  const eventCountsRef = useRef(eventCounts)
  const soloStartedAtRef = useRef<number | null>(null)
  const soloSpawnTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    playerStatesRef.current = playerStates
  }, [playerStates])

  useEffect(() => {
    currentPlayerIdRef.current = currentPlayerId
  }, [currentPlayerId])

  useEffect(() => {
    gameElapsedMsRef.current = gameElapsedMs
  }, [gameElapsedMs])

  useEffect(() => {
    wordsTypedRef.current = wordsTyped
  }, [wordsTyped])

  useEffect(() => {
    eventCountsRef.current = eventCounts
  }, [eventCounts])

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id))
      timeoutRefs.current = []
      if (soloSpawnTimeoutRef.current !== null) {
        window.clearTimeout(soloSpawnTimeoutRef.current)
        soloSpawnTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const id = playerData?.id || (isSolo ? 'solo' : '')
    setCurrentPlayerId(id)

    if (isSolo) {
      const solo: Player = {
        id: id || 'solo',
        alias: playerData?.alias || 'Player',
        icon: playerData?.icon || 'wizard',
        color: playerData?.color || '#9aa0a6',
        font: playerData?.font
      }
      setPlayers([solo])
      setPlayerStates(buildSoloPlayerMap([solo.id]))
      setPlayerDeaths({ [solo.id]: 0 })
      setWordsTyped({ [solo.id]: 0 })
      setEventCounts(createEmptyEventCounts())
    }
  }, [isSolo, playerData])

  useEffect(() => {
    if (isSolo) return

    let mounted = true

    wsClient.socketRequest('game-status', {})
      .then((response) => {
        if (!mounted || !response?.session) return

        if (Array.isArray(response.session.players)) {
          setPlayers(response.session.players)
        }

        const state = response.session.gameState
        if (state?.gameType === 'typeflight' && state.players) {
          setHasBegun(Boolean(state.hasBegun))
          setPlayerStates(state.players)
          setPlayerDeaths(state.playerDeaths || {})
          setWordsTyped(state.wordsTyped || {})
          setGameElapsedMs(state.elapsedMs || 0)
          setEventCounts({
            fire: state.eventCounts?.fire || 0,
            ice: state.eventCounts?.ice || 0,
            lightning: state.eventCounts?.lightning || 0,
            bomb: state.eventCounts?.bomb || 0,
            laser: state.eventCounts?.laser || 0,
            spikes: state.eventCounts?.spikes || 0
          })
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

      setHasBegun(Boolean(session.gameState?.hasBegun))

      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }

      if (session.gameState?.gameType === 'typeflight' && session.gameState.players) {
        setPlayerStates(session.gameState.players)
        setPlayerDeaths(session.gameState.playerDeaths || {})
        setWordsTyped(session.gameState.wordsTyped || {})
        setGameElapsedMs(session.gameState.elapsedMs || 0)
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

      if (payload.type === 'typeflight-begin') {
        setHasBegun(true)
        setPlayerStates(payload.players || {})
        setPlayerDeaths(payload.playerDeaths || {})
        setWordsTyped(payload.wordsTyped || {})
        setEventCounts({
          fire: payload.eventCounts?.fire || 0,
          ice: payload.eventCounts?.ice || 0,
          lightning: payload.eventCounts?.lightning || 0,
          bomb: payload.eventCounts?.bomb || 0,
          laser: payload.eventCounts?.laser || 0,
          spikes: payload.eventCounts?.spikes || 0
        })
        setGameElapsedMs(0)
        setGameOverStats(null)
        return
      }

      if (typeof payload.elapsedMs === 'number') {
        setGameElapsedMs(payload.elapsedMs)
      }

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

        const impactedPositions = getEventImpactPositions(event)
        const impactedKeys = new Set(impactedPositions.map((position) => cellKey(position.x, position.y)))

        const warningDurationMs = getWarningDurationMs(
          typeof payload.elapsedMs === 'number' ? payload.elapsedMs : gameElapsedMsRef.current
        )

        const actionTimeout = window.setTimeout(() => {
          // Remove warning/icon
          setWarningEvents((prev) => prev.filter((evt) => evt.id !== event.id))

          setFlashEvents((prev) => [...prev, { id: event.id, type: event.type, positions: impactedPositions }])

          const clearFlashTimeout = window.setTimeout(() => {
            setFlashEvents((prev) => prev.filter((flash) => flash.id !== event.id))
          }, ACTION_FLASH_MS)

          timeoutRefs.current.push(clearFlashTimeout)

          // Kill all players in affected row
          setPlayerStates((prev) => {
            const next = { ...prev }
            Object.entries(prev).forEach(([pid, state]) => {
              if (state.alive && impactedKeys.has(cellKey(state.x, state.y))) {
                next[pid] = { ...state, alive: false }
              }
            })
            return next
          })

          const snapshot = playerStatesRef.current
          const currentId = currentPlayerIdRef.current
          const me = currentId ? snapshot[currentId] : undefined

          if (me?.alive && impactedKeys.has(cellKey(me.x, me.y))) {
            sendTypeFlightPlayerKilled({ x: me.x, y: me.y })
          }
        }, warningDurationMs)

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

      if (payload.playerDeaths) {
        setPlayerDeaths(payload.playerDeaths)
      }

      if ((payload.type === 'game-over' || payload.gameOver) && payload.playerDeaths && payload.eventCounts) {
        const nextEventCounts = {
          fire: payload.eventCounts?.fire || 0,
          ice: payload.eventCounts?.ice || 0,
          lightning: payload.eventCounts?.lightning || 0,
          bomb: payload.eventCounts?.bomb || 0,
          laser: payload.eventCounts?.laser || 0,
          spikes: payload.eventCounts?.spikes || 0
        }
        setEventCounts(nextEventCounts)
        setGameOverStats({
          elapsedMs: payload.elapsedMs || 0,
          playerDeaths: payload.playerDeaths || {},
          wordsTyped: payload.wordsTyped || {},
          eventCounts: nextEventCounts
        })
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

    return () => {
      mounted = false
      wsClient.off('partyState', onPartyState)
      wsClient.off('game-started', onGameStarted)
      wsClient.off('game-update', onGameUpdate)
      wsClient.off('session-phase-changed', onSessionPhaseChanged)
    }
  }, [isSolo, joinCode, router])

  useEffect(() => {
    if (!isSolo || !hasBegun || gameOverStats) {
      if (soloSpawnTimeoutRef.current !== null) {
        window.clearTimeout(soloSpawnTimeoutRef.current)
        soloSpawnTimeoutRef.current = null
      }
      return
    }

    if (soloStartedAtRef.current === null) {
      soloStartedAtRef.current = Date.now()
    }

    const scheduleNextSpawn = () => {
      if (soloStartedAtRef.current === null) return

      const elapsed = Date.now() - soloStartedAtRef.current
      setGameElapsedMs(elapsed)

      const { intervalMs, eventsPerSpawn } = calculateSoloSpawnSettings(elapsed)

      soloSpawnTimeoutRef.current = window.setTimeout(() => {
        if (soloStartedAtRef.current === null) return

        const nextElapsed = Date.now() - soloStartedAtRef.current
        setGameElapsedMs(nextElapsed)

        const events = createSoloEvents(eventsPerSpawn)

        events.forEach((soloEvent) => {
          const event: LiveEvent = {
            id: soloEvent.id,
            type: soloEvent.type,
            position: soloEvent.position
          }

          setWarningEvents((prev) => [...prev, event])

          setEventCounts((prev) => ({
            ...prev,
            [event.type]: (prev[event.type] || 0) + 1
          }))

          const impactedPositions = getEventImpactPositions(event)
          const impactedKeys = new Set(impactedPositions.map((position) => cellKey(position.x, position.y)))
          const warningDurationMs = getWarningDurationMs(nextElapsed)

          const actionTimeout = window.setTimeout(() => {
            setWarningEvents((prev) => prev.filter((evt) => evt.id !== event.id))
            setFlashEvents((prev) => [...prev, { id: event.id, type: event.type, positions: impactedPositions }])

            const clearFlashTimeout = window.setTimeout(() => {
              setFlashEvents((prev) => prev.filter((flash) => flash.id !== event.id))
            }, ACTION_FLASH_MS)
            timeoutRefs.current.push(clearFlashTimeout)

            const snapshot = playerStatesRef.current
            const nextStates = { ...snapshot }
            const killedIds: string[] = []

            Object.entries(snapshot).forEach(([pid, state]) => {
              if (state.alive && impactedKeys.has(cellKey(state.x, state.y))) {
                nextStates[pid] = { ...state, alive: false }
                killedIds.push(pid)
              }
            })

            if (killedIds.length > 0) {
              setPlayerStates(nextStates)

              setPlayerDeaths((prev) => {
                const nextDeaths = { ...prev }
                killedIds.forEach((pid) => {
                  nextDeaths[pid] = (nextDeaths[pid] || 0) + 1
                })

                if (checkSoloGameOver(nextStates)) {
                  const elapsedMs = soloStartedAtRef.current ? Date.now() - soloStartedAtRef.current : gameElapsedMsRef.current
                  setGameElapsedMs(elapsedMs)
                  setGameOverStats({
                    elapsedMs,
                    playerDeaths: nextDeaths,
                    wordsTyped: wordsTypedRef.current,
                    eventCounts: eventCountsRef.current
                  })
                }

                return nextDeaths
              })
            }
          }, warningDurationMs)

          timeoutRefs.current.push(actionTimeout)
        })

        if (!gameOverStats) {
          scheduleNextSpawn()
        }
      }, intervalMs)
    }

    scheduleNextSpawn()

    return () => {
      if (soloSpawnTimeoutRef.current !== null) {
        window.clearTimeout(soloSpawnTimeoutRef.current)
        soloSpawnTimeoutRef.current = null
      }
    }
  }, [gameOverStats, hasBegun, isSolo])

  const indexedPlayers = useMemo(
    () => players.map((player, index) => ({ player, index })),
    [players]
  )

  const currentPlayerState = currentPlayerId ? playerStates[currentPlayerId] : undefined
  const currentDeathCount = currentPlayerId ? playerDeaths[currentPlayerId] || 0 : 0
  const requiredReviveWords = currentDeathCount * 5

  const canAttemptRevive = useMemo(() => {
    if (!currentPlayerId || currentPlayerState?.alive !== false) return false

    return Object.entries(playerStates).some(([playerId, state]) => {
      if (playerId === currentPlayerId) return false
      return state.alive && state.x === currentPlayerState.x && state.y === currentPlayerState.y
    })
  }, [currentPlayerId, currentPlayerState, playerStates])

  useEffect(() => {
    if (!currentPlayerId) return

    if (currentPlayerState?.alive !== false) {
      if (reviveWords.length || reviveProgress > 0) {
        setReviveWords([])
        setReviveProgress(0)
      }
      return
    }

    if (requiredReviveWords <= 0) {
      return
    }

    if (reviveDeathCount !== currentDeathCount || reviveWords.length !== requiredReviveWords) {
      setReviveWords(createReviveWords(requiredReviveWords))
      setReviveProgress(0)
      setReviveDeathCount(currentDeathCount)
    }
  }, [
    currentDeathCount,
    currentPlayerId,
    currentPlayerState?.alive,
    requiredReviveWords,
    reviveDeathCount,
    reviveProgress,
    reviveWords.length
  ])

  const warningCellByKey = useMemo(() => {
    const map: Record<string, TypeFlightEventType | 'bomb'> = {}
    warningEvents.forEach((event) => {
      getEventImpactPositions(event).forEach((position) => {
        map[cellKey(position.x, position.y)] = event.type
      })
    })
    return map
  }, [warningEvents])

  const flashCellByKey = useMemo(() => {
    const map: Record<string, TypeFlightEventType | 'bomb'> = {}
    flashEvents.forEach((flash) => {
      flash.positions.forEach((position) => {
        map[cellKey(position.x, position.y)] = flash.type
      })
    })
    return map
  }, [flashEvents])

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

    if (!isSolo) {
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

  const completeRevive = () => {
    if (!currentPlayerId || !currentPlayerState) return

    const revivePosition = { x: currentPlayerState.x, y: currentPlayerState.y }

    setPlayerStates((prev) => {
      const existing = prev[currentPlayerId]
      if (!existing) return prev

      return {
        ...prev,
        [currentPlayerId]: {
          ...existing,
          alive: true
        }
      }
    })

    if (!isSolo) {
      sendTypeFlightPlayerRevived(revivePosition)
    }

    setReviveWords([])
    setReviveProgress(0)
    setInput('')
  }

  const tryConsumeReviveWord = (rawValue: string) => {
    const value = rawValue.toLowerCase().trim()
    if (!value || currentPlayerState?.alive !== false) return
    if (!canAttemptRevive || reviveWords.length === 0) return

    const targetWord = reviveWords[reviveProgress]
    if (!targetWord || targetWord !== value) return

    if (currentPlayerId) {
      setWordsTyped((prev) => ({
        ...prev,
        [currentPlayerId]: (prev[currentPlayerId] || 0) + 1
      }))
    }

    if (!isSolo) {
      sendTypeFlightReviveWordTyped()
    }

    const nextProgress = reviveProgress + 1
    if (nextProgress >= reviveWords.length) {
      completeRevive()
      return
    }

    setReviveProgress(nextProgress)
    setInput('')
  }

  const resetSoloTypeFlightState = () => {
    const soloId = currentPlayerId || playerData?.id || 'solo'
    const soloPlayer: Player = {
      id: soloId,
      alias: playerData?.alias || 'Player',
      icon: playerData?.icon || 'wizard',
      color: playerData?.color || '#9aa0a6',
      font: playerData?.font
    }

    setPlayers([soloPlayer])
    setCurrentPlayerId(soloId)
    setPlayerStates(buildSoloPlayerMap([soloId]))
    setPlayerDeaths({ [soloId]: 0 })
    setWordsTyped({ [soloId]: 0 })
    setEventCounts(createEmptyEventCounts())
    setWarningEvents([])
    setFlashEvents([])
    setReviveWords([])
    setReviveProgress(0)
    setReviveDeathCount(0)
    setGameElapsedMs(0)
    setGameOverStats(null)
    setDirectionWords(createDirectionWords())
    setInput('')
    soloStartedAtRef.current = Date.now()
  }

  const handleExit = () => {
    if (isSolo) {
      router.push('/games')
      return
    }

    if (playerType === 'host') {
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'games' }).catch((err) => {
        console.error('Failed to return party to games page:', err)
      })
    }
  }

  const handleReplay = () => {
    if (isSolo) {
      resetSoloTypeFlightState()
      setHasBegun(true)
      return
    }

    if (playerType === 'host') {
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'typeflight' }).catch((err) => {
        console.error('Failed to replay TypeFlight:', err)
      })
    }
  }

  const handleBegin = () => {
    if (isSolo) {
      resetSoloTypeFlightState()
      setHasBegun(true)
      return
    }

    if (playerType === 'host' && joinCode) {
      wsClient.send('update-game', { type: 'typeflight-begin' })
    }
  }

  if (!hasBegun) {
    return (
      <GameInstructionsOverlay
        title="TypeFlight"
        rules={TYPEFLIGHT_RULES}
        canBegin={playerType === 'host' || isSolo}
        onBegin={handleBegin}
      />
    )
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
              if (currentPlayerState?.alive === false) {
                tryConsumeReviveWord(nextValue)
              } else {
                tryConsumeMovementWord(nextValue)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (currentPlayerState?.alive === false) {
                  tryConsumeReviveWord(input)
                } else {
                  tryConsumeMovementWord(input)
                  setInput('')
                }
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {currentPlayerState?.alive === false && reviveWords.length > 0 && (
            <div className={styles.revivePanel}>
              <h3 className={styles.reviveTitle}>Type To Revive</h3>
              <div className={styles.reviveWords}>
                <span className={`${styles.reviveWord} ${styles.reviveWordCurrent}`}>
                  {reviveWords[reviveProgress]}
                </span>
              </div>
              <div className={styles.reviveHint}>
                {canAttemptRevive
                  ? `${reviveProgress}/${reviveWords.length}`
                  : 'A living teammate must stand on your tile'}
              </div>
            </div>
          )}

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
                const flashType = flashCellByKey[cellKey(x, y)]

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
                  <div className={styles.eventMarkerInner}>
                    <img src={`/icons/typeflight/${event.type}.png`} alt={event.type} />
                  </div>
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
