"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type PlayerType = 'host' | 'join' | 'solo' | null

interface PlayerTypeContextValue {
  playerType: PlayerType
  setPlayerType: (t: PlayerType) => void
  joinCode: string | null
  setJoinCode: (c: string | null) => void
}

const PlayerTypeContext = createContext<PlayerTypeContextValue | undefined>(undefined)

export function PlayerTypeProvider({ children }: { children: ReactNode }) {
  const [playerType, setPlayerType] = useState<PlayerType>(null)
  const [joinCode, setJoinCode] = useState<string | null>(null)
  return (
    <PlayerTypeContext.Provider value={{ playerType, setPlayerType, joinCode, setJoinCode }}>
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
