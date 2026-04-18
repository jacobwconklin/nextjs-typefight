'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '@/context/PlayerTypeContext'
import wsClient from '@/websocket/wsClient'
import styles from './ExitButton.module.scss'

/**
 * ExitButton Component - USAGE GUIDE
 * 
 * This component is DEPRECATED for game over screens. Instead, pass an onExit callback 
 * to your GameOverView component and render a custom button there.
 * 
 * CORRECT PATTERN (see quickkeys/textsplosion):
 * 
 * 1. In the main game page component, create a handleExit function:
 *    const handleExit = () => {
 *      if (playerType === 'solo') {
 *        router.push('/games')
 *      } else if (playerType === 'host') {
 *        wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'games' })
 *      }
 *    }
 * 
 * 2. CRITICAL - Add a game-started event listener to handle the navigation:
 *    const handleGameStarted = (payload: any) => {
 *      if (!mounted) return
 *      
 *      // Check if we're exiting to game selection
 *      if (payload.session && payload.session.gameName === 'games') {
 *        console.log('Exiting to game selection')
 *        router.push('/games')
 *        return
 *      }
 *    }
 *    
 *    wsClient.on('game-started', handleGameStarted)
 *    
 *    // Don't forget to clean up:
 *    return () => {
 *      wsClient.off('game-started', handleGameStarted)
 *    }
 * 
 * 3. Pass this callback to your GameOverView component:
 *    <GameOverView playerType={playerType} onExit={handleExit} ... />
 * 
 * 4. In GameOverView, render a custom button for host/solo players:
 *    {(playerType === 'host' || playerType === 'solo') && (
 *      <button onClick={onExit}>Exit</button>
 *    )}
 * 
 * This pattern gives you full control over styling and button placement within your 
 * game over screen layout, and ensures the exit logic works correctly for party hosts.
 * The game-started listener is essential because the server broadcasts this event when
 * the host changes games, allowing all clients to navigate properly.
 */

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
      // Host - send everyone back to game selection
      console.log('Host returning party to games page')
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'games' }).catch((err) => {
        console.error('Failed to return party to games page:', err)
      })
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
      tabIndex={-1}
    >
      Exit
    </button>
  )
}
