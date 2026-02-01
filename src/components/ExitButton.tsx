'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '@/context/PlayerTypeContext'
import wsClient from '@/websocket/wsClient'
import styles from './ExitButton.module.scss'

interface ExitButtonProps {
  gameName: string
  className?: string
}

export default function ExitButton({ gameName, className }: ExitButtonProps) {
  const router = useRouter()
  const { playerType, joinCode } = usePlayerType()

  const handleExit = () => {
    console.log('Exit clicked, playerType:', playerType)
    
    if (playerType === 'solo') {
      // Solo player - navigate back to games
      router.push('/games')
    } else if (playerType === 'host') {
      // Host - go back to game selection
      console.log('Host exiting to game selection')
      wsClient.send('start-game', { code: joinCode, gameName: 'games' })
    }
  }

  // Only show for host and solo players
  if (playerType !== 'host' && playerType !== 'solo') {
    return null
  }

  return (
    <button 
      className={`${styles.exitButton} ${className || ''}`}
      onClick={handleExit}
    >
      Exit
    </button>
  )
}
