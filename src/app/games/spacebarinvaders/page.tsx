"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import GameInstructionsOverlay from '../../../components/GameInstructionsOverlay'
import ExitButton from '@/components/ExitButton'
import { isSoloPlayer } from '../../../localGames/soloMode'
import {
  applySoloEarthHit,
  applySoloWordDestroyed,
  createSoloSpaceBarState,
  startNextSoloWave
} from '../../../localGames/spacebarInvadersSolo'
import { preloadImages, spaceBarInvadersAssets } from '../../../utils/imagePreloader'
import GameView from './GameView'
import GameOverView from './GameOverView'
import styles from './GameView.module.scss'

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
  waveTransitioning: boolean
  gameStartTime: number
  survivalTime: number
  finalWave: number
  playerStats: Record<string, number>
}

// Interface for player
interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

const SPACEBAR_INVADERS_RULES = [
  'Earth is being bombarded by space debris.',
  'Type the words as they approach to destroy them.',
  'Each cleared wave brings increased danger, and the planet can only survive 2 hits.',
  'Defend for as long as possible.'
]

export default function SpaceBarInvadersPage() {
  const router = useRouter()
  const { playerType, joinCode, playerData } = usePlayerType()
  const isSolo = isSoloPlayer(playerType)
  const [gameState, setGameState] = useState<GameState>({
    waveNumber: 1,
    earthHits: 0,
    dangers: [],
    gameOver: false,
    waveTransitioning: false,
    gameStartTime: Date.now(),
    survivalTime: 0,
    finalWave: 1,
    playerStats: {}
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')
  const [hasBegun, setHasBegun] = useState(false)

  // Preload game assets
  useEffect(() => {
    preloadImages(spaceBarInvadersAssets).catch(err => {
      console.warn('Image preload partial failure:', err)
    })
  }, [])

  // Initialize game state and listen for updates
  useEffect(() => {
    if (isSolo) {
      // Solo mode - set up local player
      if (playerData) {
        const soloPlayer = {
          id: playerData.id || 'solo',
          alias: playerData.alias || 'Player',
          icon: playerData.icon || 'wizard',
          color: playerData.color || '#667eea',
          font: playerData.font || 'inherit'
        }
        setCurrentPlayerId(soloPlayer.id)
        setPlayers([soloPlayer])
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
          const showInstructions = Boolean(session?.['show-instructions'])
          setHasBegun(!showInstructions)
          setGameState({
            waveNumber: session.gameState.waveNumber || 1,
            survivalTime: session.gameState.survivalTime || 0,
            finalWave: session.gameState.waveNumber || 1,
            playerStats: session.gameState.playerStats || {},
            earthHits: session.gameState.earthHits || 0,
            dangers: session.gameState.dangers || [],
            gameOver: session.gameState.gameOver || false,
            waveTransitioning: session.gameState.waveTransitioning || false,
            gameStartTime: session.gameState.gameStartTime || Date.now()
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

      if (payload.session && payload.session.gameName === 'spacebarinvaders') {
        const showInstructions = Boolean(payload.session?.['show-instructions'])
        setHasBegun(!showInstructions)
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
            gameOver: false, // Reset game over state
            waveTransitioning: session.gameState.waveTransitioning || false,
            gameStartTime: session.gameState.gameStartTime || Date.now()
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

    const onSessionSnapshot = (payload: any) => {
      if (!mounted) return
      const session = payload?.session
      if (!session || session.gameName !== 'spacebarinvaders') return

      const showInstructions = Boolean(session?.['show-instructions'])
      setHasBegun(!showInstructions)

      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }

      if (session.gameState) {
        setGameState({
          waveNumber: session.gameState.waveNumber || 1,
          survivalTime: session.gameState.survivalTime || 0,
          finalWave: session.gameState.waveNumber || 1,
          playerStats: session.gameState.playerStats || {},
          earthHits: session.gameState.earthHits || 0,
          dangers: session.gameState.dangers || [],
          gameOver: session.gameState.gameOver || false,
          waveTransitioning: session.gameState.waveTransitioning || false,
          gameStartTime: session.gameState.gameStartTime || Date.now()
        })
      }
    }

    const onRejoinSuccess = (payload: any) => {
      if (!mounted) return
      const session = payload?.session
      if (!session || session.gameName !== 'spacebarinvaders') return

      const showInstructions = Boolean(session?.['show-instructions'])
      setHasBegun(!showInstructions)

      if (Array.isArray(session.players)) {
        setPlayers(session.players)
      }

      if (session.gameState) {
        setGameState({
          waveNumber: session.gameState.waveNumber || 1,
          survivalTime: session.gameState.survivalTime || 0,
          finalWave: session.gameState.waveNumber || 1,
          playerStats: session.gameState.playerStats || {},
          earthHits: session.gameState.earthHits || 0,
          dangers: session.gameState.dangers || [],
          gameOver: session.gameState.gameOver || false,
          waveTransitioning: session.gameState.waveTransitioning || false,
          gameStartTime: session.gameState.gameStartTime || Date.now()
        })
      }
    }

    const onSessionPhaseChanged = (payload: any) => {
      if (!mounted) return
      if (payload?.phase === 'lobby' && joinCode) {
        router.push(`/party/${joinCode}`)
      }
    }

    wsClient.on('game-started', onGameStarted)
    wsClient.on('game-update', onGameUpdate)
    wsClient.on('session-snapshot', onSessionSnapshot)
    wsClient.on('rejoin-success', onRejoinSuccess)
    wsClient.on('session-phase-changed', onSessionPhaseChanged)

    return () => {
      mounted = false
      wsClient.off('game-started', onGameStarted)
      wsClient.off('game-update', onGameUpdate)
      wsClient.off('session-snapshot', onSessionSnapshot)
      wsClient.off('rejoin-success', onRejoinSuccess)
      wsClient.off('session-phase-changed', onSessionPhaseChanged)
    }
  }, [isSolo, joinCode, playerData, playerType, router])

  useEffect(() => {
    if (!isSolo || !hasBegun || gameState.gameOver || !gameState.waveTransitioning) return

    const timeout = window.setTimeout(() => {
      setGameState((prev) => {
        if (!prev.waveTransitioning || prev.gameOver) return prev
        return startNextSoloWave(prev, 1)
      })
    }, 5000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [gameState.gameOver, gameState.waveTransitioning, hasBegun, isSolo])

  // Function to notify server when a word is successfully typed
  const onWordDestroyed = (word: string) => {
    if (isSolo) {
      // Solo mode - handle fully local state updates.
      console.log('Solo mode: Word destroyed:', word)
      setGameState((prev) => applySoloWordDestroyed(prev, currentPlayerId || 'solo', word))
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
    if (isSolo) {
      // Solo mode - handle locally
      console.log('Solo mode: Earth hit by danger:', dangerId)
      setGameState((prev) => applySoloEarthHit(prev, dangerId))
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
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'spacebarinvaders' }).catch((err) => {
        console.error('Failed to start SpaceBarInvaders:', err)
      })
    }
  }

  const handleBegin = () => {
    if (isSolo) {
      const soloId = currentPlayerId || playerData?.id || 'solo'
      setGameState(createSoloSpaceBarState(soloId))
      setHasBegun(true)
      return
    }

    if (playerType === 'host') {
      wsClient.send('update-game', { type: 'hide-instructions' })
    }
  }

  // Handle replay - restart the game
  const handleReplay = () => {
    console.log('handleReplay called, playerType:', playerType, 'joinCode:', joinCode)
    if (isSolo) {
      // Reset local state for solo player
      const soloId = currentPlayerId || playerData?.id || 'solo'
      setGameState(createSoloSpaceBarState(soloId))
      setHasBegun(true)
    } else if (playerType === 'host') {
      // Host - restart SpaceBarInvaders game
      console.log('Sending start-game for spacebarinvaders')
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'spacebarinvaders' }).catch((err) => {
        console.error('Failed to replay SpaceBarInvaders:', err)
      })
    }
  }

  // Handle exit - go back to game selection
  const handleExit = () => {
    console.log('handleExit called, playerType:', playerType, 'joinCode:', joinCode)
    if (isSolo) {
      // Solo player - navigate back to games
      console.log('Navigating to /games')
      router.push('/games')
    } else if (playerType === 'host') {
      // Host - send everyone back to game selection
      console.log('Sending start-game for games page')
      void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'games' }).catch((err) => {
        console.error('Failed to return party to games page:', err)
      })
    }
  }

  if (!hasBegun) {
    return (
      <>
        <ExitButton gameName="spacebarinvaders" className={styles.exitButton} />
        <GameInstructionsOverlay
          title="SpaceBarInvaders"
          rules={SPACEBAR_INVADERS_RULES}
          canBegin={playerType === 'host' || isSolo}
          onBegin={handleBegin}
        />
      </>
    )
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
        <>
          <ExitButton gameName="spacebarinvaders" className={styles.exitButton} />
          <GameView
            dangers={gameState.dangers}
            earthHits={gameState.earthHits}
            waveNumber={gameState.waveNumber}
            onWordDestroyed={onWordDestroyed}
            onEarthHit={onEarthHit}
            isHost={playerType === 'host' || playerType === 'solo'}
          />
        </>
      )}
    </>
  )
}
