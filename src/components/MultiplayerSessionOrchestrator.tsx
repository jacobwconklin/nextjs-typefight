"use client"

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayerType } from '../context/PlayerTypeContext'
import wsClient from '../websocket/wsClient'

type SessionSnapshot = {
  joinCode?: string
  phase?: 'lobby' | 'in_game' | 'game_select' | 'ended'
  gameName?: string | null
}

function resolveTargetRoute(session: SessionSnapshot, fallbackJoinCode: string | null): string | null {
  const joinCode = session.joinCode || fallbackJoinCode

  if (session.phase === 'lobby') {
    return joinCode ? `/party/${joinCode}` : null
  }

  if (session.phase === 'game_select') {
    return '/games'
  }

  if (session.phase === 'in_game' && session.gameName) {
    return `/games/${session.gameName}`
  }

  return null
}

export default function MultiplayerSessionOrchestrator() {
  const router = useRouter()
  const pathname = usePathname()
  const { playerType, joinCode, setJoinCode } = usePlayerType()

  useEffect(() => {
    if (playerType === 'solo') return

    const routeIfNeeded = (target: string | null) => {
      if (!target || target === pathname) return
      router.push(target)
    }

    const onSessionSnapshot = (payload: any) => {
      const session = payload?.session as SessionSnapshot | undefined
      if (!session) return

      if (session.joinCode) {
        setJoinCode(session.joinCode)
      }

      routeIfNeeded(resolveTargetRoute(session, joinCode))
    }

    const onSessionPhaseChanged = (payload: any) => {
      const snapshot: SessionSnapshot = {
        joinCode: joinCode || undefined,
        phase: payload?.phase,
        gameName: payload?.gameName
      }

      routeIfNeeded(resolveTargetRoute(snapshot, joinCode))
    }

    const onGameStarted = (payload: any) => {
      const session = payload?.session as SessionSnapshot | undefined
      if (!session) return
      routeIfNeeded(resolveTargetRoute(session, joinCode))
    }

    const onReturnedToLobby = (payload: any) => {
      const session = payload?.session as SessionSnapshot | undefined
      if (!session) return
      routeIfNeeded(resolveTargetRoute(session, joinCode))
    }

    const onSocketConnected = () => {
      if (!joinCode) return
      wsClient
        .socketRequest('game-status', {})
        .then((response) => {
          const session = response?.session as SessionSnapshot | undefined
          if (!session) return
          routeIfNeeded(resolveTargetRoute(session, joinCode))
        })
        .catch(() => {
          // Ignore when not currently in an active game context.
        })
    }

    wsClient.on('session-snapshot', onSessionSnapshot)
    wsClient.on('session-phase-changed', onSessionPhaseChanged)
    wsClient.on('game-started', onGameStarted)
    wsClient.on('returned-to-lobby', onReturnedToLobby)
    wsClient.on('connect', onSocketConnected)

    return () => {
      wsClient.off('session-snapshot', onSessionSnapshot)
      wsClient.off('session-phase-changed', onSessionPhaseChanged)
      wsClient.off('game-started', onGameStarted)
      wsClient.off('returned-to-lobby', onReturnedToLobby)
      wsClient.off('connect', onSocketConnected)
    }
  }, [playerType, joinCode, pathname, router, setJoinCode])

  return null
}
