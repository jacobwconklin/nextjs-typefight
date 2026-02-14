"use client"

import React, { useEffect, useRef, useState } from 'react'
import styles from './GameView.module.scss'

// Interface for a danger object
interface Danger {
  id: string
  word: string
  x: number
  y: number
}

interface GameViewProps {
  dangers: Danger[]
  earthHits: number
  waveNumber: number
  onWordDestroyed: (word: string) => void
  onEarthHit: (dangerId: string) => void
  isHost: boolean
}

interface DangerState extends Danger {
  type: 'asteroid' | 'satellite' | 'ufo'
  speed: number
  svgIndex: number
  startTime: number
  colliding: boolean
  destroyed: boolean
  destroyedTime?: number
}

export default function GameView({
  dangers,
  earthHits,
  waveNumber,
  onWordDestroyed,
  onEarthHit,
  isHost
}: GameViewProps) {
  const [dangerStates, setDangerStates] = useState<Map<string, DangerState>>(new Map())
  const [inputValue, setInputValue] = useState('')
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
  const [showWaveNumber, setShowWaveNumber] = useState(false)
  const [showEarthCollision, setShowEarthCollision] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const animationFrameRef = useRef<number>()
  const waveStartTimeRef = useRef<number>(Date.now())
  const previousEarthHitsRef = useRef<number>(earthHits)

  // Get screen size
  useEffect(() => {
    const updateSize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Show earth collision effect when earth is hit
  useEffect(() => {
    if (earthHits > previousEarthHitsRef.current) {
      setShowEarthCollision(true)
      setTimeout(() => setShowEarthCollision(false), 1000)
    }
    previousEarthHitsRef.current = earthHits
  }, [earthHits])

  // Initialize danger states when dangers change
  useEffect(() => {
    setDangerStates(prev => {
      const newStates = new Map(prev)
      
      // Add new dangers
      dangers.forEach((danger, dangerIndex) => {
        if (!newStates.has(danger.id)) {
          const wordLength = danger.word.length
          let type: 'asteroid' | 'satellite' | 'ufo'
          let speed: number
          let svgIndex: number
          
          // Extract index from danger ID for consistent icon assignment
          // danger.id format: danger-{waveNumber}-{index}-{timestamp}
          const idParts = danger.id.split('-')
          const indexFromId = idParts.length >= 3 ? parseInt(idParts[2]) : dangerIndex
          
          if (wordLength >= 10) {
            type = 'ufo'
            speed = 60 // pixels per second
            svgIndex = (indexFromId % 2) + 1 // Loop through 1-2
          } else if (wordLength >= 6) {
            type = 'satellite'
            speed = 35
            svgIndex = (indexFromId % 4) + 1 // Loop through 1-4
          } else {
            type = 'asteroid'
            speed = 20
            svgIndex = (indexFromId % 4) + 1 // Loop through 1-4
          }
          
          newStates.set(danger.id, {
            ...danger,
            type,
            speed,
            svgIndex,
            startTime: Date.now(),
            colliding: false,
            destroyed: false
          })
        }
      })
      
      // Mark dangers as destroyed if they're no longer in the dangers list
      const currentDangerIds = new Set(dangers.map(d => d.id))
      newStates.forEach((dangerState, id) => {
        if (!currentDangerIds.has(id) && !dangerState.destroyed) {
          dangerState.destroyed = true
          dangerState.destroyedTime = Date.now()
          // Remove after 1 second
          setTimeout(() => {
            setDangerStates(prev => {
              const updated = new Map(prev)
              updated.delete(id)
              return updated
            })
          }, 1000)
        }
      })
      
      return newStates
    })
  }, [dangers])

  // Reset wave start time when wave changes
  useEffect(() => {
    waveStartTimeRef.current = Date.now()
    if (waveNumber > 1) {
      setShowWaveNumber(true)
      setTimeout(() => setShowWaveNumber(false), 3000)
    }
  }, [waveNumber])

  // Animation loop for moving dangers and rockets
  useEffect(() => {
    const animate = () => {
      const now = Date.now()
      
      // Update danger positions
      setDangerStates(prev => {
        const updated = new Map(prev)
        
        updated.forEach((danger, id) => {
          if (danger.colliding || danger.destroyed) return
          
          // Calculate time elapsed since this danger spawned
          const elapsed = (now - danger.startTime) / 1000 // seconds
          
          // Calculate how far the danger has moved towards earth
          const distance = Math.sqrt(danger.x ** 2 + danger.y ** 2)
          const progress = (elapsed * danger.speed) / distance
          
          // Check if reached earth (center)
          if (progress >= 1 && !danger.colliding) {
            danger.colliding = true
            if (isHost) {
              onEarthHit(danger.id)
            }
          }
        })
        
        return updated
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isHost, onEarthHit])

  // Calculate current position of a danger
  const getDangerPosition = (danger: DangerState) => {
    if (danger.colliding) {
      return { x: 0, y: 0 } // Center for earth collision
    }
    
    // If destroyed, freeze at position when it was destroyed
    if (danger.destroyed && danger.destroyedTime) {
      const elapsed = (danger.destroyedTime - danger.startTime) / 1000
      const distance = Math.sqrt(danger.x ** 2 + danger.y ** 2)
      const progress = Math.min((elapsed * danger.speed) / distance, 1)
      const currentX = danger.x * (1 - progress)
      const currentY = danger.y * (1 - progress)
      return { x: currentX, y: currentY }
    }
    
    const elapsed = (Date.now() - danger.startTime) / 1000
    const distance = Math.sqrt(danger.x ** 2 + danger.y ** 2)
    const progress = Math.min((elapsed * danger.speed) / distance, 1)
    
    // Linear interpolation from spawn position to center
    const currentX = danger.x * (1 - progress)
    const currentY = danger.y * (1 - progress)
    
    return { x: currentX, y: currentY }
  }

  // Convert game coordinates to screen coordinates
  const toScreenCoords = (x: number, y: number) => {
    const centerX = screenSize.width / 2
    const centerY = screenSize.height / 2
    
    // Scale factor: outerbound (500) should reach edge of screen
    const maxReach = Math.min(screenSize.width, screenSize.height) / 2
    const scaleFactor = maxReach / 500
    
    return {
      x: centerX + (x * scaleFactor),
      y: centerY + (y * scaleFactor)
    }
  }

  // Get SVG path for danger
  const getDangerSvg = (danger: DangerState) => {
    if (danger.destroyed || danger.colliding) {
      return '/icons/collision.svg'
    }
    
    if (danger.type === 'ufo') {
      return `/icons/ufo-${danger.svgIndex}.svg`
    } else if (danger.type === 'satellite') {
      const suffix = danger.svgIndex === 1 ? '' : `-${danger.svgIndex}`
      return `/icons/satellite${suffix}.svg`
    } else {
      const suffix = danger.svgIndex === 1 ? '' : `-${danger.svgIndex}`
      return `/icons/asteroid${suffix}.svg`
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().trim()
    setInputValue(value)
    
    // Check if any danger word matches
    const matchingDanger = dangers.find(d => d.word.toLowerCase() === value)
    if (matchingDanger) {
      // Notify parent immediately
      onWordDestroyed(matchingDanger.word)
      setInputValue('')
    }
  }

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setInputValue('')
    }
  }

  return (
    <div className={styles.gameContainer}>
      {/* Background */}
      <div 
        className={styles.background}
        style={{
          backgroundImage: 'url(/icons/space-stars-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Earth */}
      <div className={styles.earth}>
        <img src="/icons/planet-earth.png" alt="Earth" />
        {showEarthCollision && (
          <div className={styles.earthCollision}>
            <img src="/icons/collision.svg" alt="Collision" />
          </div>
        )}
      </div>
      
      {/* Dangers */}
      {Array.from(dangerStates.values()).map(danger => {
        const currentPos = getDangerPosition(danger)
        const screenPos = toScreenCoords(currentPos.x, currentPos.y)
        
        return (
          <div
            key={danger.id}
            className={styles.danger}
            style={{
              left: `${screenPos.x}px`,
              top: `${screenPos.y}px`
            }}
          >
            <img 
              src={getDangerSvg(danger)} 
              alt={danger.type}
              className={`${styles.dangerIcon} ${
                danger.type === 'asteroid' ? styles.spinFast :
                danger.type === 'satellite' ? styles.spinSlow : ''
              }`}
            />
            {!danger.destroyed && !danger.colliding && (
              <div className={styles.dangerWord}>{danger.word}</div>
            )}
          </div>
        )
      })}
      
      {/* Wave number display */}
      {showWaveNumber && (
        <div className={styles.waveDisplay}>
          Wave {waveNumber}
        </div>
      )}
      
      {/* Input field */}
      <div className={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={styles.wordInput}
          placeholder="Type To Protect"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      
      {/* HUD */}
      <div className={styles.hud}>
        <div>Wave: {waveNumber}</div>
        <div>Earth Hits: {earthHits} / 3</div>
      </div>
    </div>
  )
}
