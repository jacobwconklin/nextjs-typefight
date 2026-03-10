"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import GameInstructionsOverlay from '../../../components/GameInstructionsOverlay'
import TextSelection from './TextSelection'
import GameView from './GameView'
import GameOverView from './GameOverView'

interface TypingText {
  id: string
  name: string
  body: string
}

interface PlayerPosition {
  index: number
  time: number | null
  errors: number
}

interface GameState {
  finished: boolean
  textName: string | null
  playerPositions: Record<string, PlayerPosition>
}

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

const QUICKKEYS_RULES = [
  'Host picks one text for everyone.',
  'Type the full text as fast and accurately as possible.',
  'Mistakes are tracked and shown on the results screen.',
  'Finish first with the best accuracy to win.'
]

export default function QuickKeysPage() {
  const router = useRouter()
  const { playerType, joinCode, playerData } = usePlayerType()
  const [texts, setTexts] = useState<TypingText[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState<GameState>({
    finished: false,
    textName: null,
    playerPositions: {}
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')
  const [hasBegun, setHasBegun] = useState(false)
  
  // Typing state
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [hasError, setHasError] = useState(false)

  // Load typing texts
  useEffect(() => {
    fetch('/typing-texts.json')
      .then(res => res.json())
      .then(data => {
        setTexts(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load texts:', err)
        setLoading(false)
      })
  }, [])

  // Listen for game state updates (for host and join players)
  useEffect(() => {
    if (playerType === 'solo') return // Solo players don't need websocket

    let mounted = true

    // Fetch initial session data for multiplayer to get players list
    if (joinCode) {
      console.log('Fetching initial session data via game-status for joinCode:', joinCode)
      wsClient.socketRequest('game-status', {}).then((response) => {
        if (!mounted || !response || !response.session) return
        console.log('game-status response:', response)
        
        const session = response.session
        
        if (session.players) {
          setPlayers(session.players)
          console.log('Players loaded from game-status:', session.players)
        }
        
        if (session.gameState) {
          setGameState({
            finished: session.gameState.finished || false,
            textName: session.gameState.textName || null,
            playerPositions: session.gameState.playerPositions || {}
          })
          console.log('Game state loaded from game-status:', session.gameState)
        }
      }).catch((err) => {
        console.error('Failed to fetch game status:', err)
      })
    }

    const onGameUpdate = (payload: any) => {
      if (!mounted) return
      console.log('game-update received:', payload)
      
      // Update game state based on delta
      if (payload.type === 'text-selected') {
        setGameState(prev => ({
          ...prev,
          textName: payload.textName
        }))
        
        // Reset all typing state when new text is selected
        setCurrentCharIndex(0)
        setCurrentWordIndex(0)
        setErrors(0)
        setStartTime(Date.now())
        setHasError(false)
        console.log('Text selected, typing state reset:', payload.textName)
      } else if (payload.type === 'word-completed') {
        console.log('Word completed update for player:', payload.playerId, 'index:', payload.index)
        setGameState(prev => ({
          ...prev,
          playerPositions: {
            ...prev.playerPositions,
            [payload.playerId]: {
              ...prev.playerPositions[payload.playerId],
              index: payload.index,
              errors: payload.errors
            }
          }
        }))
      } else if (payload.type === 'text-completed') {
        console.log('Text completed for player:', payload.playerId, 'time:', payload.time)
        setGameState(prev => ({
          ...prev,
          finished: payload.finished || prev.finished,
          playerPositions: {
            ...prev.playerPositions,
            [payload.playerId]: {
              ...prev.playerPositions[payload.playerId],
              time: payload.time,
              errors: payload.errors
            }
          }
        }))
      }
    }

    const onGameStarted = (payload: any) => {
      if (!mounted) return
      console.log('game-started received:', payload)
      
      // Check if we're exiting to game selection
      if (payload.session && payload.session.gameName === 'games') {
        console.log('Exiting to game selection')
        router.push('/games')
        return
      }

      if (payload.session && payload.session.gameName === 'quickkeys') {
        setHasBegun(true)
      }
      
      // Initialize game state from session
      if (payload.session && payload.session.gameState) {
        setGameState({
          finished: payload.session.gameState.finished || false,
          textName: payload.session.gameState.textName || null,
          playerPositions: payload.session.gameState.playerPositions || {}
        })
        console.log('Game state initialized:', payload.session.gameState)
        
        // Reset typing state when game restarts
        setCurrentCharIndex(0)
        setCurrentWordIndex(0)
        setErrors(0)
        setStartTime(null)
        setHasError(false)
        setSelectedTextId(null)
        console.log('Typing state reset on game-started')
        
        // Store players data
        if (payload.session.players) {
          setPlayers(payload.session.players)
          console.log('Players loaded from session:', payload.session.players)
        }
      }
    }
    
    const onPartyState = (payload: any) => {
      if (!mounted) return
      console.log('partyState received:', payload)
      
      if (payload.players) {
        setPlayers(payload.players)
        console.log('Players updated from partyState:', payload.players)
      }
    }

    wsClient.on('game-update', onGameUpdate)
    wsClient.on('game-started', onGameStarted)
    wsClient.on('partyState', onPartyState)

    return () => {
      mounted = false
      wsClient.off('game-update', onGameUpdate)
      wsClient.off('game-started', onGameStarted)
      wsClient.off('partyState', onPartyState)
    }
  }, [playerType, joinCode])

  // Get current player ID from context
  useEffect(() => {
    if (playerData) {
      setCurrentPlayerId(playerData.id || '')
      console.log('Current player loaded from context:', playerData)
      
      // For solo players, populate the players array
      if (playerType === 'solo') {
        setPlayers([{
          id: playerData.id || 'solo',
          alias: playerData.alias || 'Player',
          icon: playerData.icon || 'wizard',
          color: playerData.color || '#667eea',
          font: playerData.font || 'inherit'
        }])
        console.log('Solo player setup complete')
      }
    }
  }, [playerType, playerData])

  // Determine which view to show
  const showTextSelect = !gameState.textName
  const showGame = gameState.textName && !gameState.finished
  const showGameOver = gameState.textName && gameState.finished

  // Keyboard event listener for typing
  useEffect(() => {
    if (!showGame) return
    
    const selectedText = texts.find(t => t.id === gameState.textName)
    if (!selectedText) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Start timer on first keypress
      if (startTime === null) {
        setStartTime(Date.now())
      }

      const words = selectedText.body.split(/\s+/)
      const allText = selectedText.body
      
      if (currentCharIndex >= allText.length) return // Already finished

      const expectedChar = allText[currentCharIndex]
      
      if (e.key === expectedChar) {
        // Correct character
        const newCharIndex = currentCharIndex + 1
        setCurrentCharIndex(newCharIndex)
        setHasError(false)

        // Check if we completed a word (hit a space or end of text)
        if (expectedChar === ' ' || newCharIndex >= allText.length) {
          const newWordIndex = currentWordIndex + 1
          setCurrentWordIndex(newWordIndex)

          // Send update for word completion
          if (playerType === 'host' || playerType === 'join') {
            console.log('Sending word-completed update:', { type: 'word-completed', index: newWordIndex, errors: errors })
            wsClient.send('update-game', {
              type: 'word-completed',
              index: newWordIndex,
              errors: errors
            })
          } else if (playerType === 'solo') {
            // Solo player - update local state for progress bar
            console.log('Solo player word completed:', newWordIndex)
            setGameState(prev => ({
              ...prev,
              playerPositions: {
                ...prev.playerPositions,
                [currentPlayerId]: {
                  ...prev.playerPositions[currentPlayerId],
                  index: newWordIndex,
                  errors: errors
                }
              }
            }))
          }

          // Check if text is complete
          if (newCharIndex >= allText.length) {
            const timeTaken = Date.now() - (startTime || Date.now())
            
            if (playerType === 'host' || playerType === 'join') {
              wsClient.send('update-game', {
                type: 'text-completed',
                time: timeTaken,
                errors: errors
              })
            } else if (playerType === 'solo') {
              // Solo player - update local state
              setGameState(prev => ({
                ...prev,
                finished: true,
                playerPositions: {
                  ...prev.playerPositions,
                  [currentPlayerId]: {
                    ...prev.playerPositions[currentPlayerId],
                    time: timeTaken,
                    errors: errors
                  }
                }
              }))
            }
          }
        }
      } else {
        // Incorrect character
        const newErrors = errors + 1
        setErrors(newErrors)
        setHasError(true)
        setTimeout(() => setHasError(false), 300)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [showGame, gameState.textName, texts, currentCharIndex, currentWordIndex, errors, startTime, playerType, currentPlayerId])

  const handleSelectText = (textId: string) => {
    // Only host and solo players can select
    if (playerType !== 'host' && playerType !== 'solo') return

    setSelectedTextId(textId)
    console.log('Text selected:', textId, 'playerType:', playerType)

    if (playerType === 'solo') {
      // Solo player - just proceed locally (no websocket needed)
      setGameState(prev => ({
        ...prev,
        textName: textId,
        playerPositions: {
          [currentPlayerId]: {
            index: 0,
            time: null,
            errors: 0
          }
        }
      }))
      console.log('Solo game state initialized with player:', currentPlayerId)
      
      // Start timer for solo player
      setStartTime(Date.now())
    } else if (playerType === 'host') {
      // Host - emit update-game to backend
      console.log('Host sending text-selected to backend:', textId)
      wsClient.send('update-game', {
        type: 'text-selected',
        textId: textId
      })
    }
  }

  const handleBegin = () => {
    if (playerType === 'solo') {
      setHasBegun(true)
      return
    }

    if (playerType === 'host' && joinCode) {
      wsClient.send('start-game', { code: joinCode, gameName: 'quickkeys' })
    }
  }

  const handleReplay = () => {
    console.log('Replay clicked, playerType:', playerType)
    
    if (playerType === 'solo') {
      // Solo player - reset local state
      setGameState({
        finished: false,
        textName: null,
        playerPositions: {}
      })
      setCurrentCharIndex(0)
      setCurrentWordIndex(0)
      setErrors(0)
      setStartTime(null)
      setSelectedTextId(null)
      console.log('Solo game reset to text selection')
    } else if (playerType === 'host') {
      // Host - restart the QuickKeys game
      console.log('Host restarting QuickKeys game')
      wsClient.send('start-game', { code: joinCode, gameName: 'quickkeys' })
    }
  }

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

  // Get selected text
  const selectedText = texts.find(t => t.id === gameState.textName)
  const words = selectedText ? selectedText.body.split(/\s+/) : []
  const totalWordCount = words.length

  // Text Selection View
  if (!hasBegun) {
    return (
      <GameInstructionsOverlay
        title="QuickKeys"
        rules={QUICKKEYS_RULES}
        canBegin={playerType === 'host' || playerType === 'solo'}
        onBegin={handleBegin}
      />
    )
  }

  if (showTextSelect) {
    return (
      <TextSelection
        texts={texts}
        loading={loading}
        playerType={playerType}
        selectedTextId={selectedTextId}
        onSelectText={handleSelectText}
      />
    )
  }

  // Game View (typing screen)
  if (showGame) {
    return (
      <GameView
        selectedText={selectedText}
        currentCharIndex={currentCharIndex}
        hasError={hasError}
        gameState={gameState}
        players={players}
        currentPlayerId={currentPlayerId}
      />
    )
  }

  // Game Over View
  if (showGameOver) {
    return (
      <GameOverView
        players={players}
        gameState={gameState}
        totalWordCount={totalWordCount}
        playerType={playerType}
        onReplay={handleReplay}
        onExit={handleExit}
      />
    )
  }

  return null
}
