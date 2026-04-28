'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../context/PlayerTypeContext'
import wsClient from '../websocket/wsClient'

/**
 * SessionRecoveryOrchestrator
 * 
 * Handles global session recovery on app initialization.
 * Runs regardless of which page the user is on.
 * 
 * On initialization:
 * 1. Checks if there's a stored session (joinCode + playerData)
 * 2. Attempts to rejoin the session
 * 3. On success - routes to appropriate game page (existing MultiplayerSessionOrchestrator handles this)
 * 4. On failure - clears all data and routes back to home
 */
export default function SessionRecoveryOrchestrator() {
  const router = useRouter()
  const { isHydrated, playerType, joinCode, playerData, setJoinCode, setPlayerData, setPlayerType } = usePlayerType()
  const recoveryAttempted = useRef(false)

  useEffect(() => {
    // Wait for hydration before attempting recovery
    if (!isHydrated) {
      console.log('[SessionRecoveryOrchestrator] Waiting for hydration...')
      return
    }

    // Only attempt recovery once and only for multiplayer players
    if (recoveryAttempted.current || playerType === 'solo') {
      console.log('[SessionRecoveryOrchestrator] Skipping (solo mode or already attempted)')
      return
    }

    // Only attempt if we have both joinCode and playerData (stored from previous session)
    if (!joinCode || !playerData?.id) {
      console.log('[SessionRecoveryOrchestrator] No stored session to recover')
      return
    }

    recoveryAttempted.current = true
    console.log('[SessionRecoveryOrchestrator] INITIALIZING - Attempting to recover session:', joinCode, 'Player:', playerData.id)

    // Delay to ensure socket is ready
    const recoveryTimeout = setTimeout(() => {
      console.log('[SessionRecoveryOrchestrator] Sending rejoin-session event')

      wsClient
        .sendWithRetry('rejoin-session', {
          joinCode,
          playerId: playerData.id
        }, {
          maxRetries: 2,
          timeoutMs: 3500
        })
        .then((response) => {
          console.log('[SessionRecoveryOrchestrator] Rejoin SUCCESS:', response)
          // The MultiplayerSessionOrchestrator will handle routing based on session-snapshot
        })
        .catch((err) => {
          console.log('[SessionRecoveryOrchestrator] Rejoin FAILED:', err)
          console.log('[SessionRecoveryOrchestrator] Clearing session data and routing home')

          // Clear all session data
          setJoinCode(null)
          setPlayerData(null)
          setPlayerType('solo')

          // Route to home
          router.push('/')
        })
    }, 100)

    return () => {
      clearTimeout(recoveryTimeout)
    }
  }, [isHydrated, playerType, joinCode, playerData, setJoinCode, setPlayerData, setPlayerType, router])

  return null
}
