"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import GameView from './GameView'
import GameOverView from './GameOverView'
import { generate } from 'random-words'
import { CHALLENGE_TEXTS } from './challengeTexts'

interface Player {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

interface GameState {
  playerOrder: string[] // Current order with hot seat player first
  expiredPlayers: string[] // Players who have been eliminated
  wordsTyped: Record<string, number> // Total pump words typed by each player
  numWordsUntilPop: number
  numWordsPumped: number
  finished: boolean
  winnerId: string | null
}

// Client-side only state (not synced with server)
interface LocalGameState {
  challengeType: 'backwards' | 'colorWords' | 'oneLetterAtATime' | 'alphabetical' | 'noMistakes' | 'noCursor'
  challengeText: string
  currentPumpWord: string
}

// Generate a random word for pumping
const getRandomWord = () => {
  const words = generate({ exactly: 1, maxLength: 8 }) as string[]
  return words[0]
}

export default function TextSplosionPage() {
  const router = useRouter()
  const { playerType, joinCode, playerData } = usePlayerType()
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')
  const [gameState, setGameState] = useState<GameState>({
    playerOrder: [],
    expiredPlayers: [],
    wordsTyped: {},
    numWordsUntilPop: 0,
    numWordsPumped: 0,
    finished: false,
    winnerId: null
  })
  
  // Client-side only state
  const [localState, setLocalState] = useState<LocalGameState>({
    challengeType: 'backwards',
    challengeText: CHALLENGE_TEXTS[Math.floor(Math.random() * CHALLENGE_TEXTS.length)],
    currentPumpWord: getRandomWord()
  })
  
  // Typing state
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  // Initialize game when component mounts
  useEffect(() => {
    let mounted = true

    // Get current player ID from context
    const currentId = playerData?.id || ''
    setCurrentPlayerId(currentId)
    console.log('Current player loaded from context:', playerData)

    // Fetch initial session data
    if (joinCode) {
      wsClient.socketRequest('game-status', {}).then((response) => {
        if (!mounted || !response || !response.session) return
        
        const session = response.session
        
        console.log('Game status loaded:', {
          session,
          gameState: session.gameState
        })
        
        if (session.players) {
          setPlayers(session.players)
          
          // Load existing game state from server if available
          if (session.gameState && session.gameState.playerOrder && session.gameState.playerOrder.length > 0) {
            console.log('Loading game state:', session.gameState)
            setGameState({
              playerOrder: session.gameState.playerOrder || [],
              expiredPlayers: session.gameState.expiredPlayers || [],
              wordsTyped: session.gameState.wordsTyped || {},
              numWordsUntilPop: session.gameState.numWordsUntilPop || 0,
              numWordsPumped: session.gameState.numWordsPumped || 0,
              finished: session.gameState.finished || false,
              winnerId: session.gameState.winnerId || null
            })
          } else {
            console.log('No game state found, playerOrder empty or not initialized')
          }
        }
      }).catch((err) => {
        console.error('Failed to fetch game status:', err)
      })
    }

    // Listen for game updates
    const handleGameUpdate = (data: any) => {
      if (!mounted) return
      
      if (data.gameType === 'textsplosion') {
        handleTextSplosionUpdate(data)
      }
    }

    // Listen for game-started event to handle exit to game selection
    const handleGameStarted = (payload: any) => {
      if (!mounted) return
      console.log('game-started received:', payload)
      
      // Check if we're exiting to game selection
      if (payload.session && payload.session.gameName === 'games') {
        console.log('Exiting to game selection')
        router.push('/games')
        return
      }
      
      // Handle game restart for textsplosion
      if (payload.session && payload.session.gameName === 'textsplosion') {
        console.log('Restarting textsplosion game')
        
        // Reset game state from server
        if (payload.session.gameState) {
          setGameState({
            playerOrder: payload.session.gameState.playerOrder || [],
            expiredPlayers: payload.session.gameState.expiredPlayers || [],
            wordsTyped: payload.session.gameState.wordsTyped || {},
            numWordsUntilPop: payload.session.gameState.numWordsUntilPop || 0,
            numWordsPumped: payload.session.gameState.numWordsPumped || 0,
            finished: false,
            winnerId: null
          })
          console.log('Game state reset for restart:', payload.session.gameState)
        }
        
        // Reset local state
        setLocalState({
          challengeType: 'backwards',
          challengeText: CHALLENGE_TEXTS[Math.floor(Math.random() * CHALLENGE_TEXTS.length)],
          currentPumpWord: getRandomWord()
        })
        
        // Reset typing state
        setCurrentCharIndex(0)
        setCurrentLineIndex(0)
        setHasError(false)
        console.log('Typing state reset on game restart')
        
        // Update players if provided
        if (payload.session.players) {
          setPlayers(payload.session.players)
          console.log('Players loaded from session:', payload.session.players)
        }
      }
    }

    wsClient.on('game-update', handleGameUpdate)
    wsClient.on('game-started', handleGameStarted)

    return () => {
      mounted = false
      wsClient.off('game-update', handleGameUpdate)
      wsClient.off('game-started', handleGameStarted)
    }
  }, [joinCode, playerType, playerData, router])

  // Initialize game state
  const initializeGame = (playerList: Player[]) => {
    const initialOrder = playerList.map(p => p.id)
    const initialWordsTyped: Record<string, number> = {}
    
    playerList.forEach(player => {
      initialWordsTyped[player.id] = 0
    })
    
    // Initialize local state
    setLocalState({
      challengeType: 'backwards',
      challengeText: CHALLENGE_TEXTS[Math.floor(Math.random() * CHALLENGE_TEXTS.length)],
      currentPumpWord: getRandomWord()
    })
    
    // Note: Server will set playerOrder, expiredPlayers, numWordsUntilPop on start-game
    // No need to send game-initialized event
  }

  // Handle game updates from WebSocket
  const handleTextSplosionUpdate = (data: any) => {
    console.log('Received game update:', data)
    
    if (data.type === 'word-completed') {
      // Update word count and pump progress
      setGameState(prev => {
        const newWordsTyped = { ...prev.wordsTyped }
        newWordsTyped[data.playerId] = data.totalWords
        
        return { 
          ...prev,
          numWordsPumped: data.numWordsPumped,
          wordsTyped: newWordsTyped 
        }
      })
    } else if (data.type === 'challenge-completed') {
      // Move hot seat player to back of queue
      setGameState(prev => ({
        ...prev,
        playerOrder: data.playerOrder,
        numWordsPumped: data.numWordsPumped || 0
      }))
      
      // Generate new challenge locally
      const challengeTypes: ('backwards' | 'colorWords' | 'oneLetterAtATime' | 'alphabetical' | 'noMistakes' | 'noCursor')[] = ['backwards', 'colorWords', 'oneLetterAtATime', 'alphabetical', 'noMistakes', 'noCursor']
      setLocalState({
        challengeType: challengeTypes[Math.floor(Math.random() * challengeTypes.length)],
        challengeText: CHALLENGE_TEXTS[Math.floor(Math.random() * CHALLENGE_TEXTS.length)],
        currentPumpWord: getRandomWord()
      })
      
      // Reset typing state
      setCurrentCharIndex(0)
      setCurrentLineIndex(0)
    } else if (data.type === 'player-expired') {
      // Update game state with expired player info
      setGameState(prev => {
        // Check for winner - game ends when only 1 player remains
        if (data.finished) {
          return {
            ...prev,
            playerOrder: data.playerOrder,
            expiredPlayers: data.expiredPlayers,
            finished: true,
            winnerId: data.winnerId
          }
        }
        
        return {
          ...prev,
          playerOrder: data.playerOrder,
          expiredPlayers: data.expiredPlayers,
          numWordsUntilPop: data.numWordsUntilPop,
          numWordsPumped: data.numWordsPumped
        }
      })
      
      // Generate new challenge locally for next round
      const challengeTypes: ('backwards' | 'colorWords' | 'oneLetterAtATime' | 'alphabetical' | 'noMistakes' | 'noCursor')[] = ['backwards', 'colorWords', 'oneLetterAtATime', 'alphabetical', 'noMistakes', 'noCursor']
      setLocalState({
        challengeType: challengeTypes[Math.floor(Math.random() * challengeTypes.length)],
        challengeText: CHALLENGE_TEXTS[Math.floor(Math.random() * CHALLENGE_TEXTS.length)],
        currentPumpWord: getRandomWord()
      })
      
      // Reset typing state
      setCurrentCharIndex(0)
      setCurrentLineIndex(0)
    }
  }

  // Handle key press for typing
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.finished) return
      
      // Prevent spacebar and other keys from triggering button clicks (e.g., ExitButton)
      e.preventDefault()
      
      const hotSeatPlayerId = gameState.playerOrder[0]
      const isHotSeat = currentPlayerId === hotSeatPlayerId
      
      console.log('Key press:', {
        currentPlayerId,
        hotSeatPlayerId,
        isHotSeat,
        playerOrder: gameState.playerOrder
      })
      
      let targetText = ''
      
      if (isHotSeat) {
        // Get target text based on challenge type
        if (localState.challengeType === 'backwards') {
          targetText = localState.challengeText.split('').reverse().join('')
        } else if (localState.challengeType === 'colorWords') {
          const colorPairs = [
            { word: 'RED' }, { word: 'BLUE' }, { word: 'GREEN' },
            { word: 'YELLOW' }, { word: 'PURPLE' }, { word: 'ORANGE' }
          ]
          targetText = colorPairs.map(p => p.word).join(' ')
        } else if (localState.challengeType === 'alphabetical') {
          // Sort words alphabetically and join without spaces
          const words = localState.challengeText.split(' ').filter(word => word.length > 0)
          const sortedWords = [...words].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          targetText = sortedWords.join('')
        } else if (localState.challengeType === 'noMistakes' || localState.challengeType === 'noCursor') {
          // Normal text for these challenges
          targetText = localState.challengeText
        } else {
          targetText = localState.challengeText
        }
      } else {
        // Pumping text - use current random word
        targetText = localState.currentPumpWord
      }
      
      const expectedChar = targetText[currentCharIndex]
      
      if (e.key === expectedChar) {
        setHasError(false)
        setCurrentCharIndex(prev => prev + 1)
        
        // Check if completed
        if (currentCharIndex + 1 === targetText.length) {
          if (isHotSeat) {
            // Challenge completed!
            wsClient.send('update-game', {
              type: 'challenge-completed',
              playerId: currentPlayerId
            })
            setCurrentCharIndex(0)
          } else {
            // Word completed - pump air!
            const newTotalWords = (gameState.wordsTyped[currentPlayerId] || 0) + 1
            
            console.log('Word completed! Generating new word...')
            
            // Generate new word immediately (don't wait for server response)
            setLocalState(prev => ({
              ...prev,
              currentPumpWord: getRandomWord()
            }))
            setCurrentCharIndex(0)
            
            // Notify server
            wsClient.send('update-game', {
              type: 'word-completed',
              playerId: currentPlayerId,
              totalWords: newTotalWords
            })
          }
        }
      } else {
        setHasError(true)
        setTimeout(() => setHasError(false), 200)
        
        // For NoMistakes challenge, reset to beginning on error
        if (isHotSeat && localState.challengeType === 'noMistakes') {
          setCurrentCharIndex(0)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentCharIndex, currentLineIndex, gameState, localState, currentPlayerId])

  // Handle replay - restart the game
  const handleReplay = () => {
    if (playerType === 'solo') {
      // Reset local state for solo player
      window.location.reload()
    } else if (playerType === 'host') {
      // Host - restart TextSplosion game
      wsClient.send('start-game', { code: joinCode, gameName: 'textsplosion' })
    }
  }

  // Handle exit - go back to game selection
  const handleExit = () => {
    if (playerType === 'solo') {
      // Solo player - navigate back to games
      router.push('/games')
    } else if (playerType === 'host') {
      // Host - go back to game selection
      wsClient.send('start-game', { code: joinCode, gameName: 'games' })
    }
  }

  if (gameState.finished && gameState.winnerId) {
    return (
      <GameOverView 
        players={players}
        winnerId={gameState.winnerId}
        wordsTyped={gameState.wordsTyped}
        playerType={playerType || 'solo'}
        onReplay={handleReplay}
        onExit={handleExit}
      />
    )
  }

  const hotSeatPlayerId = gameState.playerOrder[0] || null
  const playerQueue = gameState.playerOrder.slice(1)
  
  // Calculate balloon size based on pump progress
  const MIN_BALLOON_SIZE = 60
  const MAX_BALLOON_SIZE = 300
  const balloonSize = gameState.numWordsUntilPop > 0
    ? (gameState.numWordsPumped / gameState.numWordsUntilPop) * (MAX_BALLOON_SIZE - MIN_BALLOON_SIZE) + MIN_BALLOON_SIZE
    : MIN_BALLOON_SIZE

  return (
    <GameView
      players={players}
      playerQueue={playerQueue}
      hotSeatPlayerId={hotSeatPlayerId}
      balloonSize={balloonSize}
      challengeType={localState.challengeType}
      challengeText={localState.challengeText}
      currentPumpWord={localState.currentPumpWord}
      currentCharIndex={currentCharIndex}
      currentLineIndex={currentLineIndex}
      hasError={hasError}
      wordsTyped={gameState.wordsTyped}
      currentPlayerId={currentPlayerId}
      numWordsUntilPop={gameState.numWordsUntilPop}
      numWordsPumped={gameState.numWordsPumped}
    />
  )
}
