"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { usePlayerType } from "../../../context/PlayerTypeContext"
import { useSound } from "../../../context/SoundContext"
import wsClient from "../../../websocket/wsClient"
import GameInstructionsOverlay from "../../../components/GameInstructionsOverlay"
import GameOverView from "./GameOverView"
import styles from "./page.module.scss"
import { generate } from "random-words"

interface Player {
  id: string
  alias: string
  icon: string
  color: string
}

interface Coordinate {
  x: number
  y: number
}

interface PlayerState extends Coordinate {
  alive: boolean
}

interface ActionHighlight {
  x: number
  y: number
  color: string
  sourceId: string
}

type Phase = "typing" | "watching" | "finished"
type MovementDirection = "up" | "left" | "right" | "down" | "wait"
type DirectionalMovement = Exclude<MovementDirection, "wait">
type ActionType = "punch" | "kick" | "block"
type MovementWordMap = Record<DirectionalMovement, string>
type ActionWordMap = Record<ActionType, string>

const GRID_SIZE = 10
const SYMMETRIC_RING_DEPTH = Math.floor((GRID_SIZE - 3) / 2)
const PRE_SUBMIT_RESET_MS = 800

const TYPEKWANDO_RULES = [
  "There are two phases of each turn, the typing phase and the watching phase.",
  "During the typing phase type as many of the movements and actions as you can to eliminate opponents.",
  "You will see your own inputs played out but will not see how other players chose to move or act.",
  "Then all player inputs will be performed simultaneously in the watching phase.",
  "Actions are performed in the direction of the last movement and must be followed by a movement.",
  "Last fighter standing wins the match."
]

const MOVEMENT_COMMANDS: MovementDirection[] = ["up", "left", "right", "down", "wait"]
const MOVEMENT_CONTROL_ORDER: DirectionalMovement[] = ["up", "right", "left", "down"]
const ACTION_COMMANDS: ActionType[] = ["punch", "kick", "block"]

const toCellKey = (x: number, y: number) => `${x},${y}`

const createOuterRingCells = (size: number): Coordinate[] => {
  const cells: Coordinate[] = []

  for (let x = 0; x < size; x += 1) {
    cells.push({ x, y: 0 })
  }
  for (let y = 1; y < size; y += 1) {
    cells.push({ x: size - 1, y })
  }
  for (let x = size - 2; x >= 0; x -= 1) {
    cells.push({ x, y: size - 1 })
  }
  for (let y = size - 2; y >= 1; y -= 1) {
    cells.push({ x: 0, y })
  }

  return cells
}

const assignOuterRingSpawns = (players: Player[]) => {
  const cells = createOuterRingCells(GRID_SIZE)
  const nextPositions: Record<string, PlayerState> = {}

  players.forEach((player, index) => {
    const spawn = cells[index % cells.length]
    nextPositions[player.id] = { ...spawn, alive: true }
  })

  return nextPositions
}

const formatPhaseLabel = (phase: Phase) => {
  if (phase === "typing") return "Typing Phase"
  if (phase === "watching") return "Watching Phase"
  return "Game Over"
}

const isMovement = (token: string): token is MovementDirection => MOVEMENT_COMMANDS.includes(token as MovementDirection)
const isAction = (token: string): token is ActionType => ACTION_COMMANDS.includes(token as ActionType)
const isDirection = (token: string): token is DirectionalMovement =>
  token === "up" || token === "left" || token === "right" || token === "down"
const clampToBounds = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const isWithinBounds = (x: number, y: number, min: number, max: number) => x >= min && x <= max && y >= min && y <= max

const randomWord = (exclude: Set<string> = new Set()): string => {
  let next = ""
  let attempts = 0

  while (attempts < 30) {
    const generated = generate({ exactly: 1, minLength: 4, maxLength: 8 }) as string[]
    next = String(generated[0] || "")
      .toLowerCase()
      .trim()
    if (next && !exclude.has(next)) return next
    attempts += 1
  }

  return `word${Math.floor(Math.random() * 1000)}`
}

const createMovementWords = (): MovementWordMap => {
  const used = new Set<string>()
  const map = {} as MovementWordMap

  MOVEMENT_CONTROL_ORDER.forEach((direction) => {
    const word = randomWord(used)
    used.add(word)
    map[direction] = word
  })

  return map
}

const createActionWords = (): ActionWordMap => {
  const used = new Set<string>()
  const map = {} as ActionWordMap

  ACTION_COMMANDS.forEach((action) => {
    const word = randomWord(used)
    used.add(word)
    map[action] = word
  })

  return map
}

const getDirectionOffset = (direction: string) => {
  if (direction === "up") return { x: 0, y: -1 }
  if (direction === "down") return { x: 0, y: 1 }
  if (direction === "left") return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

const getPerpendicularOffsets = (direction: string) => {
  if (direction === "up" || direction === "down") {
    return [{ x: -1, y: 0 }, { x: 1, y: 0 }]
  }

  return [{ x: 0, y: -1 }, { x: 0, y: 1 }]
}

const getQueuedActionHighlights = (
  start: PlayerState,
  commands: string[],
  ringDepth: number,
  color: string,
  sourceId: string
): ActionHighlight[] => {
  const min = Math.min(ringDepth, SYMMETRIC_RING_DEPTH)
  const max = GRID_SIZE - 1 - ringDepth
  const position = { x: start.x, y: start.y }
  let lastDirection: DirectionalMovement | null = null
  let latestActionHighlights: ActionHighlight[] = []
  let latestActionEndIndex = -1
  let requiresMoveBeforeAction = true

  for (let index = 0; index < commands.length; index += 1) {
    const token = commands[index]

    if (isMovement(token)) {
      if (token === "up") position.y = clampToBounds(position.y - 1, min, max)
      if (token === "down") position.y = clampToBounds(position.y + 1, min, max)
      if (token === "left") position.x = clampToBounds(position.x - 1, min, max)
      if (token === "right") position.x = clampToBounds(position.x + 1, min, max)
      if (isDirection(token)) {
        lastDirection = token
      }

      requiresMoveBeforeAction = false
      continue
    }

    if (!isAction(token) || requiresMoveBeforeAction || !lastDirection) {
      continue
    }

    const direction = lastDirection

    const actionHighlights: ActionHighlight[] = []

    if (token === "punch") {
      const offset = getDirectionOffset(direction)
      const punchTargets = [
        { x: position.x, y: position.y },
        { x: position.x + offset.x, y: position.y + offset.y },
        { x: position.x + offset.x * 2, y: position.y + offset.y * 2 }
      ]

      punchTargets.forEach((target) => {
        if (!isWithinBounds(target.x, target.y, min, max)) return
        actionHighlights.push({ x: target.x, y: target.y, color, sourceId })
      })
    }

    if (token === "kick") {
      const offset = getDirectionOffset(direction)
      const centerTarget = {
        x: position.x + offset.x,
        y: position.y + offset.y
      }
      const [perpendicularA, perpendicularB] = getPerpendicularOffsets(direction)
      const kickTargets = [
        centerTarget,
        { x: centerTarget.x + perpendicularA.x, y: centerTarget.y + perpendicularA.y },
        { x: centerTarget.x + perpendicularB.x, y: centerTarget.y + perpendicularB.y }
      ]

      kickTargets.forEach((target) => {
        if (!isWithinBounds(target.x, target.y, min, max)) return
        actionHighlights.push({
          x: target.x,
          y: target.y,
          color,
          sourceId
        })
      })
    }

    if (token === "block") {
      actionHighlights.push({
        x: position.x,
        y: position.y,
        color: "#ffffff",
        sourceId
      })
    }

    latestActionHighlights = actionHighlights
    latestActionEndIndex = index

    requiresMoveBeforeAction = true
  }

  if (latestActionEndIndex !== commands.length - 1) {
    return []
  }

  return latestActionHighlights
}

const validateQueuedCommands = (commands: string[]) => {
  let requiresMoveBeforeAction = true
  let lastDirection: DirectionalMovement | null = null
  let hasAction = false

  for (let index = 0; index < commands.length; index += 1) {
    const token = commands[index]

    if (isMovement(token)) {
      if (isDirection(token)) {
        lastDirection = token
      }
      requiresMoveBeforeAction = false
      continue
    }

    if (isAction(token)) {
      hasAction = true

      if (requiresMoveBeforeAction) {
        return { isValid: false, message: "Type a movement before your next action." }
      }

      if (!lastDirection) {
        return { isValid: false, message: "Actions use your last moved direction." }
      }

      requiresMoveBeforeAction = true
      continue
    }

    return { isValid: false, message: `Unknown command: ${token}` }
  }

  if (requiresMoveBeforeAction && hasAction) {
    return { isValid: false, message: "Add a movement or wait after your last action." }
  }

  return { isValid: true, message: "Commands ready to submit." }
}

const getActionLockState = (commands: string[]) => {
  let requiresMoveBeforeAction = true
  let lastDirection: DirectionalMovement | null = null

  commands.forEach((token) => {
    if (isMovement(token)) {
      if (isDirection(token)) {
        lastDirection = token
      }
      requiresMoveBeforeAction = false
      return
    }

    if (isAction(token) && !requiresMoveBeforeAction && lastDirection) {
      requiresMoveBeforeAction = true
    }
  })

  return {
    actionsDisabled: requiresMoveBeforeAction || !lastDirection,
    lastDirection
  }
}

const simulatePreviewPosition = (start: PlayerState | null, commands: string[], ringDepth: number): Coordinate | null => {
  if (!start) return null

  const min = Math.min(ringDepth, SYMMETRIC_RING_DEPTH)
  const max = GRID_SIZE - 1 - ringDepth
  const next = { x: start.x, y: start.y }

  for (let index = 0; index < commands.length; index += 1) {
    const token = commands[index]

    if (isMovement(token)) {
      if (token === "up") next.y = Math.max(min, next.y - 1)
      if (token === "down") next.y = Math.min(max, next.y + 1)
      if (token === "left") next.x = Math.max(min, next.x - 1)
      if (token === "right") next.x = Math.min(max, next.x + 1)
    }
  }

  return next
}

export default function TypekwandoPage() {
  const router = useRouter()
  const { playerType, joinCode, playerData } = usePlayerType()
  const { playEffect } = useSound()

  const [players, setPlayers] = useState<Player[]>([])
  const [playerStates, setPlayerStates] = useState<Record<string, PlayerState>>({})
  const [phase, setPhase] = useState<Phase>("typing")
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null)
  const [typingStartsAt, setTypingStartsAt] = useState<number | null>(null)
  const [turnNumber, setTurnNumber] = useState(1)
  const [ringDepth, setRingDepth] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number>(35)
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const [submittedPlayerIds, setSubmittedPlayerIds] = useState<string[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState("")
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [draw, setDraw] = useState(false)
  const [wordsTyped, setWordsTyped] = useState<Record<string, number>>({})
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([])
  const [lastTickSummary, setLastTickSummary] = useState("")
  const [inputFeedback, setInputFeedback] = useState("")
  const [recentlyEliminatedIds, setRecentlyEliminatedIds] = useState<string[]>([])
  const [watchActionHighlights, setWatchActionHighlights] = useState<ActionHighlight[]>([])
  const [commandInput, setCommandInput] = useState("")
  const [queuedCommands, setQueuedCommands] = useState<string[]>([])
  const [movementWords, setMovementWords] = useState<MovementWordMap>(() => createMovementWords())
  const [actionWords, setActionWords] = useState<ActionWordMap>(() => createActionWords())
  const [hasBegun, setHasBegun] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const syncFromGameState = (state: any) => {
    if (!state || state.gameType !== "typekwando") return

    if (state.players && typeof state.players === "object") {
      setPlayerStates(state.players)
    }
    if (state.phase === "typing" || state.phase === "watching" || state.phase === "finished") {
      setPhase(state.phase)
    }
    if (typeof state.phaseEndsAt === "number") {
      setPhaseEndsAt(state.phaseEndsAt)
    } else {
      setPhaseEndsAt(null)
    }
    if (typeof state.typingStartsAt === "number") {
      setTypingStartsAt(state.typingStartsAt)
    } else {
      setTypingStartsAt(null)
    }
    if (typeof state.turnNumber === "number") {
      setTurnNumber(state.turnNumber)
    }
    if (typeof state.ringDepth === "number") {
      setRingDepth(state.ringDepth)
    }
    if (Array.isArray(state.submittedPlayerIds)) {
      setSubmittedPlayerIds(state.submittedPlayerIds)
    }
    if (typeof state.winnerId === "string" || state.winnerId === null) {
      setWinnerId(state.winnerId)
    }
    if (typeof state.draw === "boolean") {
      setDraw(state.draw)
    }
    if (state.wordsTyped && typeof state.wordsTyped === "object") {
      setWordsTyped(state.wordsTyped)
    }
    if (Array.isArray(state.eliminationOrder)) {
      setEliminationOrder(state.eliminationOrder)
    }
  }

  useEffect(() => {
    setCurrentPlayerId(playerData?.id || (playerType === "solo" ? "solo" : ""))

    if (playerType === "solo" && playerData) {
      const soloPlayer: Player = {
        id: playerData.id || "solo",
        alias: playerData.alias || "Player",
        icon: playerData.icon || "wizard",
        color: playerData.color || "#9aa0a6"
      }

      setPlayers([soloPlayer])
      setPlayerStates(assignOuterRingSpawns([soloPlayer]))
      return
    }

    if (playerType === "solo") {
      return
    }

    let mounted = true

    const onPartyState = (payload: any) => {
      if (!mounted) return
      if (Array.isArray(payload.players)) {
        setPlayers(payload.players)
      }
    }

    const onGameStarted = (payload: any) => {
      if (!mounted) return
      if (payload.session && payload.session.gameName === "games") {
        router.push("/games")
        return
      }

      if (payload.session && payload.session.gameName === "typekwando") {
        const showInstructions = Boolean(payload.session?.['show-instructions'])
        setHasBegun(!showInstructions)

        if (Array.isArray(payload.session.players)) {
          setPlayers(payload.session.players)
        }
        syncFromGameState(payload.session.gameState)
      }
    }

    const onGameUpdate = (payload: any) => {
      if (!mounted) return
      if (payload.gameType !== "typekwando") return

      if (payload.type === "typekwando-phase-changed") {
        if (payload.phase === "typing") {
          setQueuedCommands([])
          setCommandInput("")
          setInputFeedback("")
          setSubmittedPlayerIds([])
          setWatchActionHighlights([])
        }

        if (payload.phase === "typing" || payload.phase === "watching" || payload.phase === "finished") {
          setPhase(payload.phase)
        }
        setTurnNumber(typeof payload.turnNumber === "number" ? payload.turnNumber : 1)
        setRingDepth(typeof payload.ringDepth === "number" ? payload.ringDepth : 0)
        setPhaseEndsAt(typeof payload.phaseEndsAt === "number" ? payload.phaseEndsAt : null)
        setTypingStartsAt(typeof payload.typingStartsAt === "number" ? payload.typingStartsAt : null)
        if (payload.players) {
          setPlayerStates(payload.players)
        }
      }

      if (payload.type === "typekwando-turn-submitted") {
        if (Array.isArray(payload.submittedPlayerIds)) {
          setSubmittedPlayerIds(payload.submittedPlayerIds)
        }
      }

      if (payload.type === "typekwando-watch-tick") {
        if (payload.players) {
          setPlayerStates(payload.players)
        }
        // Play sounds for every distinct action type in this tick (watching phase)
        if (Array.isArray(payload.actionHighlights) && payload.actionHighlights.length > 0) {
          const tickActions = new Set<string>(
            payload.actionHighlights.map((h: any) => h.action).filter(Boolean)
          )
          if (tickActions.has("punch")) playEffect("/sounds/effects/kung-fu-punch.mp3")
          if (tickActions.has("kick"))  playEffect("/sounds/effects/kung-fu-kick.mp3")
          if (tickActions.has("block")) playEffect("/sounds/effects/kung-fu-block.mp3")
        }
        if (Array.isArray(payload.actionHighlights)) {
          const highlights = payload.actionHighlights
            .map((highlight: any, index: number) => {
              if (typeof highlight?.x !== "number" || typeof highlight?.y !== "number") return null

              return {
                x: highlight.x,
                y: highlight.y,
                color:
                  typeof highlight?.color === "string"
                    ? highlight.color
                    : highlight?.action === "block"
                      ? "#ffffff"
                      : "rgba(103, 232, 249, 0.7)",
                sourceId: `${highlight.playerId || "unknown"}-${index}`
              } as ActionHighlight
            })
            .filter((highlight: ActionHighlight | null): highlight is ActionHighlight => Boolean(highlight))

          setWatchActionHighlights(highlights)
        } else {
          setWatchActionHighlights([])
        }
        const eliminatedIds = Array.isArray(payload.eliminatedPlayerIds) ? payload.eliminatedPlayerIds : []
        setRecentlyEliminatedIds(eliminatedIds)
        if (eliminatedIds.length > 0) {
          window.setTimeout(() => {
            setRecentlyEliminatedIds((previous) => {
              const nextSet = new Set(previous)
              eliminatedIds.forEach((id: string) => nextSet.delete(id))
              return Array.from(nextSet)
            })
          }, 900)
        }
        const eliminatedCount = Array.isArray(payload.eliminatedPlayerIds) ? payload.eliminatedPlayerIds.length : 0
        const tick = typeof payload.tick === "number" ? payload.tick : 0
        const watchLength = typeof payload.watchLength === "number" ? payload.watchLength : 0
        setLastTickSummary(`Tick ${tick}/${watchLength} • Eliminated: ${eliminatedCount}`)
      }

      if (payload.type === "typekwando-ring-updated") {
        if (typeof payload.ringDepth === "number") {
          setRingDepth(payload.ringDepth)
        }
        if (payload.players) {
          setPlayerStates(payload.players)
        }
      }

      if (payload.type === "typekwando-game-over") {
        setPhase("finished")
        setWinnerId(typeof payload.winnerId === "string" ? payload.winnerId : null)
        setDraw(Boolean(payload.draw))
        if (payload.wordsTyped && typeof payload.wordsTyped === "object") {
          setWordsTyped(payload.wordsTyped)
        }
        if (Array.isArray(payload.eliminationOrder)) {
          setEliminationOrder(payload.eliminationOrder)
        }
        setPhaseEndsAt(null)
        setTypingStartsAt(null)
        setWatchActionHighlights([])
        if (payload.players) {
          setPlayerStates(payload.players)
        }
      }
    }

    const onSessionPhaseChanged = (payload: any) => {
      if (!mounted) return
      if (payload?.phase === "lobby" && joinCode) {
        router.push(`/party/${joinCode}`)
      }
    }

    const onSessionSnapshot = (payload: any) => {
      if (!mounted) return
      const session = payload?.session
      if (!session || session.gameName !== 'typekwando') return

      const showInstructions = Boolean(session?.['show-instructions'])
      setHasBegun(!showInstructions)
      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }
      syncFromGameState(session.gameState)
    }

    const onRejoinSuccess = (payload: any) => {
      if (!mounted) return
      const session = payload?.session
      if (!session || session.gameName !== 'typekwando') return

      const showInstructions = Boolean(session?.['show-instructions'])
      setHasBegun(!showInstructions)
      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }
      syncFromGameState(session.gameState)
    }

    wsClient.on("partyState", onPartyState)
    wsClient.on("game-started", onGameStarted)
    wsClient.on("game-update", onGameUpdate)
    wsClient.on("session-snapshot", onSessionSnapshot)
    wsClient.on("rejoin-success", onRejoinSuccess)
    wsClient.on("session-phase-changed", onSessionPhaseChanged)

    wsClient
      .socketRequest("game-status", {})
      .then((response) => {
        if (!mounted || !response?.session) return
        if (Array.isArray(response.session.players)) {
          setPlayers(response.session.players)
        }
        if (response.session.gameState) {
          const showInstructions = Boolean(response.session?.['show-instructions'])
          setHasBegun(!showInstructions)
        }
        syncFromGameState(response.session.gameState)
      })
      .catch((error) => {
        console.error("Failed to fetch Typekwando game status:", error)
      })

    return () => {
      mounted = false
      wsClient.off("partyState", onPartyState)
      wsClient.off("game-started", onGameStarted)
      wsClient.off("game-update", onGameUpdate)
      wsClient.off("session-snapshot", onSessionSnapshot)
      wsClient.off("rejoin-success", onRejoinSuccess)
      wsClient.off("session-phase-changed", onSessionPhaseChanged)
    }
  }, [playerType, playerData, router])

  useEffect(() => {
    if (Object.keys(playerStates).length > 0) return
    setPlayerStates(assignOuterRingSpawns(players))
  }, [players, playerStates])

  useEffect(() => {
    if (phase !== "typing") {
      setSecondsLeft(0)
      return
    }

    const updateTime = () => {
      const now = Date.now()
      setNowMs(now)
      if (!phaseEndsAt) {
        setSecondsLeft(0)
        return
      }

      const remainingMs = Math.max(0, phaseEndsAt - now)
      setSecondsLeft(Math.ceil(remainingMs / 1000))
    }

    updateTime()
    const timer = window.setInterval(updateTime, 100)
    return () => window.clearInterval(timer)
  }, [phase, phaseEndsAt])

  const currentPlayerState = currentPlayerId ? playerStates[currentPlayerId] : null
  const countdownActive = phase === "typing" && Boolean(typingStartsAt && nowMs < typingStartsAt)
  const canType = phase === "typing" && Boolean(currentPlayerState?.alive) && !countdownActive
  const alreadySubmitted = currentPlayerId ? submittedPlayerIds.includes(currentPlayerId) : false
  const validationState = useMemo(() => validateQueuedCommands(queuedCommands), [queuedCommands])
  const actionLockState = useMemo(() => getActionLockState(queuedCommands), [queuedCommands])
  const actionsDisabled = !canType || alreadySubmitted || actionLockState.actionsDisabled
  const previewPosition = useMemo(
    () => simulatePreviewPosition(currentPlayerState, queuedCommands, ringDepth),
    [currentPlayerState, queuedCommands, ringDepth]
  )

  const shouldRenderQueuedMovement = useMemo(() => {
    if (phase !== "typing") return false
    if (!currentPlayerId || !currentPlayerState?.alive) return false
    if (!phaseEndsAt) return false
    if (countdownActive) return false
    return nowMs < phaseEndsAt - PRE_SUBMIT_RESET_MS
  }, [phase, currentPlayerId, currentPlayerState?.alive, phaseEndsAt, countdownActive, nowMs])

  const playerColorsById = useMemo(() => {
    const map: Record<string, string> = {}
    players.forEach((player) => {
      map[player.id] = player.color
    })
    return map
  }, [players])

  const displayPlayerStates = useMemo(() => {
    if (!shouldRenderQueuedMovement || !previewPosition || !currentPlayerId) {
      return playerStates
    }

    const current = playerStates[currentPlayerId]
    if (!current) return playerStates

    return {
      ...playerStates,
      [currentPlayerId]: {
        ...current,
        x: previewPosition.x,
        y: previewPosition.y
      }
    }
  }, [shouldRenderQueuedMovement, previewPosition, currentPlayerId, playerStates])

  const previewActionHighlights = useMemo(() => {
    if (!shouldRenderQueuedMovement || !currentPlayerId || !currentPlayerState?.alive) {
      return []
    }

    const color = playerColorsById[currentPlayerId] || "rgba(103, 232, 249, 0.5)"
    return getQueuedActionHighlights(currentPlayerState, queuedCommands, ringDepth, color, currentPlayerId)
  }, [shouldRenderQueuedMovement, currentPlayerId, currentPlayerState, queuedCommands, ringDepth, playerColorsById])

  const activeActionHighlights = useMemo(() => {
    if (phase === "typing") return previewActionHighlights
    if (phase === "watching") return watchActionHighlights
    return []
  }, [phase, previewActionHighlights, watchActionHighlights])

  const actionHighlightsByCell = useMemo(() => {
    const map = new Map<string, ActionHighlight[]>()

    activeActionHighlights.forEach((highlight, index) => {
      const key = toCellKey(highlight.x, highlight.y)
      const withId = {
        ...highlight,
        sourceId: `${highlight.sourceId}-${highlight.x}-${highlight.y}-${index}`
      }

      const existing = map.get(key)
      if (existing) {
        existing.push(withId)
      } else {
        map.set(key, [withId])
      }
    })

    return map
  }, [activeActionHighlights])

  const playersByCell = useMemo(() => {
    const map = new Map<string, Player[]>()

    players.forEach((player) => {
      const coordinate = displayPlayerStates[player.id]
      if (!coordinate) return
      if (!coordinate.alive) return

      const key = toCellKey(coordinate.x, coordinate.y)
      const existing = map.get(key)
      if (existing) {
        existing.push(player)
      } else {
        map.set(key, [player])
      }
    })

    return map
  }, [players, displayPlayerStates])

  const cells = useMemo(() => {
    const output: Coordinate[] = []
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        output.push({ x, y })
      }
    }
    return output
  }, [])

  const handleQueueCommand = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canType || alreadySubmitted) return
    const consumed = tryConsumeCommandWord(commandInput, true)
    if (!consumed) {
      setInputFeedback((previous) => previous || validationState.message)
    }
  }

  const replaceMovementWord = (direction: DirectionalMovement) => {
    setMovementWords((previous) => {
      const used = new Set([...Object.values(previous), ...Object.values(actionWords)].filter(Boolean))
      used.delete(previous[direction])
      return {
        ...previous,
        [direction]: randomWord(used)
      }
    })
  }

  const replaceActionWord = (action: ActionType) => {
    setActionWords((previous) => {
      const used = new Set([...Object.values(previous), ...Object.values(movementWords)].filter(Boolean))
      used.delete(previous[action])
      return {
        ...previous,
        [action]: randomWord(used)
      }
    })
  }

  const tryConsumeCommandWord = (rawValue: string, showError = false) => {
    if (!canType || alreadySubmitted) return false

    const value = rawValue.toLowerCase().trim()
    if (!value) return false

    const movementEntry = (Object.entries(movementWords) as Array<[DirectionalMovement, string]>).find(
      ([, word]) => word === value
    )

    if (movementEntry) {
      const [direction] = movementEntry
      setQueuedCommands((previous) => [...previous, direction])
      replaceMovementWord(direction)
      setInputFeedback("")
      setCommandInput("")
      return true
    }

    const actionEntry = (Object.entries(actionWords) as Array<[ActionType, string]>).find(([, word]) => word === value)

    if (actionEntry) {
      if (actionLockState.actionsDisabled) {
        if (showError) {
          setInputFeedback("Type a movement word before your next action.")
        }
        return false
      }

      const [action] = actionEntry
      setQueuedCommands((previous) => [...previous, action])
      replaceActionWord(action)
      // Play the kung-fu sound for the typing player's own action
      if (action === "punch") playEffect("/sounds/effects/kung-fu-punch.mp3")
      else if (action === "kick") playEffect("/sounds/effects/kung-fu-kick.mp3")
      else if (action === "block") playEffect("/sounds/effects/kung-fu-block.mp3")
      setInputFeedback("")
      setCommandInput("")
      return true
    }

    if (showError) {
      setInputFeedback(`Unknown word: ${value}`)
    }

    return false
  }

  useEffect(() => {
    if (phase !== "typing") return
    if (!currentPlayerState?.alive) return

    wsClient.send("update-game", {
      type: "typekwando-sync-turn",
      commands: queuedCommands
    })
  }, [phase, currentPlayerState?.alive, queuedCommands, turnNumber])

  useEffect(() => {
    if (!canType || alreadySubmitted) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [canType, alreadySubmitted, turnNumber])

  const countdownText = useMemo(() => {
    if (!countdownActive || !typingStartsAt) return ""

    const remainingMs = typingStartsAt - nowMs
    if (remainingMs > 3000) return "3"
    if (remainingMs > 2000) return "2"
    if (remainingMs > 1000) return "1"
    return "Begin Typing"
  }, [countdownActive, nowMs, typingStartsAt])

  const handleExit = () => {
    if (playerType === "solo") {
      router.push("/games")
      return
    }

    if (playerType === "host") {
      void wsClient.sendWithRetry("start-game", { code: joinCode, gameName: "games" }).catch((err) => {
        console.error('Failed to return party to games page:', err)
      })
    }
  }

  const handleReplay = () => {
    if (playerType === "solo") {
      window.location.reload()
      return
    }

    if (playerType === "host") {
      void wsClient.sendWithRetry("start-game", { code: joinCode, gameName: "typekwando" }).catch((err) => {
        console.error('Failed to replay Typekwando:', err)
      })
    }
  }

  const handleBegin = () => {
    if (playerType === "solo") {
      setHasBegun(true)
      return
    }

    if (playerType === "host") {
      wsClient.send('update-game', { type: 'hide-instructions' })
    }
  }

  if (!hasBegun) {
    return (
      <GameInstructionsOverlay
        title="TypeKwando"
        rules={TYPEKWANDO_RULES}
        canBegin={playerType === "host" || playerType === "solo"}
        onBegin={handleBegin}
      />
    )
  }

  if (phase === "finished") {
    return (
      <GameOverView
        players={players}
        winnerId={winnerId}
        draw={draw}
        wordsTyped={wordsTyped}
        eliminationOrder={eliminationOrder}
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
          <p className={styles.phase}>{formatPhaseLabel(phase)}</p>
          <p className={styles.meta}>Turn {turnNumber} • Ring {ringDepth}</p>
          {phase === "typing" && <p className={styles.timer}>Time Left: {secondsLeft}s</p>}
          {phase === "watching" && <p className={styles.timer}>{lastTickSummary || "Resolving commands..."}</p>}

          <h2 className={styles.controlsTitle}>Movement</h2>
          <section className={styles.compassArea}>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowUp}`} />
              <div className={styles.directionWord}>{movementWords.up}</div>
            </div>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowRight}`} />
              <div className={styles.directionWord}>{movementWords.right}</div>
            </div>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowLeft}`} />
              <div className={styles.directionWord}>{movementWords.left}</div>
            </div>
            <div className={styles.directionRow}>
              <div className={`${styles.directionArrow} ${styles.arrowDown}`} />
              <div className={styles.directionWord}>{movementWords.down}</div>
            </div>
          </section>

          <h2 className={styles.controlsTitle}>Actions</h2>
          <section className={styles.compassArea}>
            <div className={`${styles.directionRow} ${actionsDisabled ? styles.disabledRow : ""}`}>
              <div className={styles.actionIconWrap}>
                <span className={`${styles.actionGlyph} ${styles.actionGlyphPunch}`} aria-hidden="true" />
              </div>
              <div className={styles.directionWord}>{actionsDisabled ? "******" : actionWords.punch}</div>
            </div>
            <div className={`${styles.directionRow} ${actionsDisabled ? styles.disabledRow : ""}`}>
              <div className={styles.actionIconWrap}>
                <span className={`${styles.actionGlyph} ${styles.actionGlyphKick}`} aria-hidden="true" />
              </div>
              <div className={styles.directionWord}>{actionsDisabled ? "******" : actionWords.kick}</div>
            </div>
            <div className={`${styles.directionRow} ${actionsDisabled ? styles.disabledRow : ""}`}>
              <div className={styles.actionIconWrap}>
                <span className={`${styles.actionGlyph} ${styles.actionGlyphBlock}`} aria-hidden="true" />
              </div>
              <div className={styles.directionWord}>{actionsDisabled ? "******" : actionWords.block}</div>
            </div>
          </section>

          <form className={styles.inputForm} onSubmit={handleQueueCommand}>
            <input
              ref={inputRef}
              className={styles.playerInput}
              value={commandInput}
              onChange={(event) => {
                const nextValue = event.target.value
                setCommandInput(nextValue)
                tryConsumeCommandWord(nextValue)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  tryConsumeCommandWord(commandInput, true)
                }
              }}
              onBlur={() => {
                if (!canType || alreadySubmitted) return
                window.setTimeout(() => {
                  inputRef.current?.focus()
                }, 0)
              }}
              placeholder={canType ? "Player Input" : "Typing is locked"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={!canType || alreadySubmitted}
            />
          </form>
          {/* <p className={styles.feedback}>{inputFeedback || validationState.message}</p> */}
          {/* {previewPosition && phase === "typing" && (
            <p className={styles.preview}>Preview End: ({previewPosition.x}, {previewPosition.y})</p>
          )} */}

          {/* <div className={styles.queuePanel}>
            <h3>Queued Commands</h3>
            {queuedCommands.length === 0 ? (
              <p>Start typing to queue your turn.</p>
            ) : (
              <ul>
                {queuedCommands.slice(-8).map((command, index) => (
                  <li key={`${command}-${index}`}>{command}</li>
                ))}
              </ul>
            )}
          </div> */}

          {(playerType === "host" || playerType === "solo") && (
            <button className={styles.exitButton} onClick={handleExit}>
              Exit
            </button>
          )}
        </aside>

        <main className={styles.gridArea}>
          <div className={styles.gridWrap}>
            {countdownText && <div className={styles.turnCountdownOverlay}>{countdownText}</div>}
            <div className={styles.grid}>
            {cells.map((cell) => {
              const key = toCellKey(cell.x, cell.y)
              const occupants = playersByCell.get(key) || []
              const stackedOccupants = [...occupants].sort((a, b) => {
                if (a.id === currentPlayerId) return 1
                if (b.id === currentPlayerId) return -1
                return 0
              })
              const cellHighlights = actionHighlightsByCell.get(key) || []
              const minBound = Math.min(ringDepth, SYMMETRIC_RING_DEPTH)
              const maxBound = GRID_SIZE - 1 - ringDepth
              const cellDisabled =
                cell.x < minBound ||
                cell.y < minBound ||
                cell.x > maxBound ||
                cell.y > maxBound

              return (
                <div key={key} className={`${styles.cell} ${cellDisabled ? styles.cellInactive : ""}`}>
                  {cellHighlights.length > 0 && (
                    <div className={styles.cellHighlights}>
                      {cellHighlights.map((highlight) => (
                        <span
                          key={highlight.sourceId}
                          className={styles.cellHighlight}
                          style={{ backgroundColor: highlight.color }}
                        />
                      ))}
                    </div>
                  )}
                  <div className={styles.occupants}>
                    {stackedOccupants.map((player, index) => (
                      <div
                        key={player.id}
                        className={`${styles.playerIcon} ${player.id === currentPlayerId ? styles.currentPlayerIcon : ""} ${recentlyEliminatedIds.includes(player.id) ? styles.playerEliminated : ""}`}
                        style={{ backgroundColor: player.color, zIndex: index + 1 }}
                        title={player.alias}
                      >
                        <img src={`/icons/${player.icon}.svg`} alt={player.alias} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
