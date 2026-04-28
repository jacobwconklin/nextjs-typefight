"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import wsClient from '../websocket/wsClient'

export type PlayerType = 'host' | 'join' | 'solo'

export interface PlayerData {
  id: string
  alias: string
  icon: string
  font: string
  color: string
}

interface PlayerTypeContextValue {
  isHydrated: boolean
  playerType: PlayerType
  setPlayerType: (t: PlayerType) => void
  joinCode: string | null
  setJoinCode: (c: string | null) => void
  playerData: PlayerData | null
  setPlayerData: (p: PlayerData | null) => void
}

const PlayerTypeContext = createContext<PlayerTypeContextValue | undefined>(undefined)

const STORAGE_KEY = 'typefight.player-context.v1'

interface StoredPlayerContext {
  playerType: PlayerType
  joinCode: string | null
  playerData: PlayerData | null
}

export function PlayerTypeProvider({ children }: { children: ReactNode }) {
  const [playerType, setPlayerType] = useState<PlayerType>("solo")
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Restore multiplayer identity after accidental refreshes.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as StoredPlayerContext
      if (stored.playerType) setPlayerType(stored.playerType)
      if (typeof stored.joinCode !== 'undefined') setJoinCode(stored.joinCode)
      if (stored.playerData) setPlayerData(stored.playerData)
    } catch (err) {
      console.error('Failed to restore player context from sessionStorage', err)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      const payload: StoredPlayerContext = {
        playerType,
        joinCode,
        playerData
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      console.error('Failed to persist player context to sessionStorage', err)
    }
  }, [isHydrated, playerType, joinCode, playerData])

  // Handle host moderation kick globally from any UI route.
  useEffect(() => {
    const onPlayerKicked = () => {
      alert('You were kicked by the host.')
      setPlayerType('solo')
      setJoinCode(null)
      setPlayerData(null)
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (err) {
        console.error('Failed to clear player context from sessionStorage', err)
      }
      window.location.href = '/'
    }

    wsClient.on('player-kicked', onPlayerKicked)
    return () => {
      wsClient.off('player-kicked', onPlayerKicked)
    }
  }, [])

  return (
    <PlayerTypeContext.Provider value={{ isHydrated, playerType, setPlayerType, joinCode, setJoinCode, playerData, setPlayerData }}>
      {children}
    </PlayerTypeContext.Provider>
  )
}

export function usePlayerType() {
  const ctx = useContext(PlayerTypeContext)
  if (!ctx) throw new Error('usePlayerType must be used within PlayerTypeProvider')
  return ctx
}

export default PlayerTypeContext
