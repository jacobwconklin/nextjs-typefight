"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import GameView from './GameView'
import GameOverView from './GameOverView'

// Interface for a danger object
interface Danger {
  id: string
  word: string
  x: number
  y: number
}

// Interface for game state
interface GameState {
  waveNumber: number
  earthHits: number
  dangers: Danger[]
  gameOver: boolean
  survivalTime?: number
  finalWave?: number
  playerStats?: Record<string, number>
}

// Interface for player
interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

export default function SpaceBarInvadersPage() {
  const router = useRouter()
  const { playerType, joinCode, playerData } = usePlayerType()
  const [gameState, setGameState] = useState<GameState>({
    waveNumber: 1,
    earthHits: 0,
    dangers: [],
    gameOver: false,
    survivalTime: 0,
    finalWave: 1,
    playerStats: {}
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')

  // Initialize game state and listen for updates
  useEffect(() => {
    if (playerType === 'solo') {
      // Solo mode - set up local player
      if (playerData) {
        setCurrentPlayerId(playerData.id)
        setPlayers([playerData])
      }
      return
    }

    let mounted = true

    // Fetch initial session data for multiplayer
    if (joinCode) {
      console.log('Fetching initial session data for SpaceBarInvaders, joinCode:', joinCode)
      wsClient.socketRequest('game-status', {}).then((response) => {
        if (!mounted || !response || !response.session) return
        console.log('game-status response:', response)
        
        const session = response.session
        
        if (session.players) {
          setPlayers(session.players)
          console.log('Players loaded:', session.players)
          
          // Find current player ID
          const currentPlayer = session.players.find((p: Player) => 
            p.alias === playerData?.alias
          )
          if (currentPlayer) {
            setCurrentPlayerId(currentPlayer.id)
          }
        }
        
        if (session.gameState) {
          setGameState({
            waveNumber: session.gameState.waveNumber || 1,
            survivalTime: session.gameState.survivalTime || 0,
            finalWave: session.gameState.waveNumber || 1,
            playerStats: session.gameState.playerStats || {},
            earthHits: session.gameState.earthHits || 0,
            dangers: session.gameState.dangers || [],
            gameOver: session.gameState.gameOver || false
          })
          console.log('Game state loaded:', session.gameState)
        }
      }).catch((err) => {
        console.error('Failed to fetch game status:', err)
      })
    }

    // Listen for game started (when replay is clicked or game first starts)
    const onGameStarted = (payload: any) => {
      if (!mounted) return
      console.log('game-started received:', payload)
      
      // Check if we're exiting to game selection
      if (payload.session && payload.session.gameName === 'games') {
        console.log('Exiting to game selection')
        router.push('/games')
        return
      }
      
      if (payload.success && payload.session) {
        const session = payload.session
        
        // Update players if provided
        if (session.players) {
          setPlayers(session.players)
        }
        
        // Reset game state to initial values
        if (session.gameState) {
          setGameState({
            waveNumber: session.gameState.waveNumber || 1,
            survivalTime: session.gameState.survivalTime || 0,
            finalWave: session.gameState.waveNumber || 1,
            playerStats: session.gameState.playerStats || {},
            earthHits: session.gameState.earthHits || 0,
            dangers: session.gameState.dangers || [],
            gameOver: false // Reset game over state
          })
          console.log('Game state reset for new game:', session.gameState)
        }
      }
    }

    // Listen for game updates
    const onGameUpdate = (payload: any) => {
      if (!mounted) return
      console.log('game-update received:', payload)
      
      // Handle word destroyed
      if (payload.type === 'word-destroyed') {
        setGameState(prev => ({
          ...prev,
          dangers: prev.dangers.filter(d => d.id !== payload.dangerId),
          playerStats: payload.playerStats || prev.playerStats
        }))
      }
      
      // Handle wave completion (triggers 5-second delay on server)
      else if (payload.type === 'word-destroyed' && payload.waveComplete) {
        console.log('Wave complete! Waiting for next wave...')
        setGameState(prev => ({
          ...prev,
          dangers: prev.dangers.filter(d => d.id !== payload.dangerId)
        }))
      }
      
      // Handle new wave started (after delay)
      else if (payload.type === 'wave-started') {
        console.log('New wave started! Wave', payload.waveNumber)
        setGameState(prev => ({
          ...prev,
          waveNumber: payload.waveNumber,
          dangers: payload.dangers
        }))
      }
      
      // Handle earth hit
      else if (payload.type === 'earth-hit') {
        setGameState(prev => ({
          ...prev,
          earthHits: payload.earthHits,
          dangers: prev.dangers.filter(d => d.id !== payload.dangerId),
          gameOver: payload.gameOver || prev.gameOver,
          survivalTime: payload.survivalTime || prev.survivalTime,
          finalWave: payload.finalWave || prev.finalWave,
          playerStats: payload.playerStats || prev.playerStats
        }))
        
        if (payload.gameOver) {
          console.log('Game Over! Final wave:', payload.finalWave)
          console.log('Survival time:', payload.survivalTime)
          console.log('Player stats:', payload.playerStats)
        }
      }
      
      // Handle word not found (for debugging)
      else if (payload.type === 'word-not-found') {
        console.warn('Word not found in dangers list:', payload.word)
      }
    }

    wsClient.on('game-started', onGameStarted)
    wsClient.on('game-update', onGameUpdate)

    return () => {
      mounted = false
      wsClient.off('game-started', onGameStarted)
      wsClient.off('game-update', onGameUpdate)
    }
  }, [playerType, joinCode, playerData])

  // Function to notify server when a word is successfully typed
  const onWordDestroyed = (word: string) => {
    if (playerType === 'solo') {
      // Solo mode - handle locally (would need to implement solo game logic)
      console.log('Solo mode: Word destroyed:', word)
      setGameState(prev => ({
        ...prev,
        dangers: prev.dangers.filter(d => d.word !== word)
      }))
      // TODO: Check if wave complete and generate new wave locally
    } else if (playerType === 'host' || playerType === 'join') {
      // Multiplayer - send to server
      console.log('Sending word-destroyed event:', word)
      wsClient.send('update-game', {
        type: 'word-destroyed',
        word: word
      })
    }
  }

  // Function to notify server when earth is hit (only host/solo should call this)
  const onEarthHit = (dangerId: string) => {
    if (playerType === 'solo') {
      // Solo mode - handle locally
      console.log('Solo mode: Earth hit by danger:', dangerId)
      setGameState(prev => ({
        ...prev,
        earthHits: prev.earthHits + 1,
        dangers: prev.dangers.filter(d => d.id !== dangerId),
        gameOver: prev.earthHits + 1 >= 3
      }))
    } else if (playerType === 'host') {
      // Only host sends earth-hit events in multiplayer to avoid duplicates
      console.log('Host sending earth-hit event:', dangerId)
      wsClient.send('update-game', {
        type: 'earth-hit',
        dangerId: dangerId
      })
    }
    // Join players do not send earth-hit events
  }

  // Start game function (for host to initialize the game)
  const startGame = () => {
    if (playerType === 'host' && joinCode) {
      console.log('Host starting SpaceBarInvaders game')
      wsClient.send('start-game', { code: joinCode, gameName: 'spacebarinvaders' })
    }
  }

  // Handle replay - restart the game
  const handleReplay = () => {
    console.log('handleReplay called, playerType:', playerType, 'joinCode:', joinCode)
    if (playerType === 'solo') {
      // Reset local state for solo player
      window.location.reload()
    } else if (playerType === 'host') {
      // Host - restart SpaceBarInvaders game
      console.log('Sending start-game for spacebarinvaders')
      wsClient.send('start-game', { code: joinCode, gameName: 'spacebarinvaders' })
    }
  }

  // Handle exit - go back to game selection
  const handleExit = () => {
    console.log('handleExit called, playerType:', playerType, 'joinCode:', joinCode)
    if (playerType === 'solo') {
      // Solo player - navigate back to games
      console.log('Navigating to /games')
      router.push('/games')
    } else if (playerType === 'host') {
      // Host - go back to game selection
      console.log('Sending start-game for games')
      wsClient.send('start-game', { code: joinCode, gameName: 'games' })
    }
  }

  return (
    <>
      {gameState.gameOver ? (
        <GameOverView
          survivalTime={gameState.survivalTime || 0}
          playerStats={gameState.playerStats || {}}
          players={players}
          finalWave={gameState.finalWave || gameState.waveNumber}
          playerType={playerType || 'solo'}
          onReplay={handleReplay}
          onExit={handleExit}
        />
      ) : (
        <GameView
          dangers={gameState.dangers}
          earthHits={gameState.earthHits}
          waveNumber={gameState.waveNumber}
          onWordDestroyed={onWordDestroyed}
          onEarthHit={onEarthHit}
          isHost={playerType === 'host' || playerType === 'solo'}
        />
      )}
    </>
  )
}
