import React, { useMemo } from 'react'
import styles from './Challenge.module.scss'

interface ColorWordsProps {
  currentCharIndex: number
  hasError: boolean
}

const allColorPairs = [
  { word: 'RED', color: '#00FF00' },     // Green
  { word: 'BLUE', color: '#FF0000' },    // Red
  { word: 'GREEN', color: '#0000FF' },   // Blue
  { word: 'YELLOW', color: '#FF00FF' },  // Magenta
  { word: 'PURPLE', color: '#FFFF00' },  // Yellow
  { word: 'ORANGE', color: '#00FFFF' },  // Cyan
  { word: 'RED', color: '#0000FF' },     // Blue
  { word: 'BLUE', color: '#FFFF00' },    // Yellow
  { word: 'GREEN', color: '#FF00FF' },   // Magenta
  { word: 'YELLOW', color: '#00FFFF' },  // Cyan
  { word: 'PURPLE', color: '#FF0000' },  // Red
  { word: 'ORANGE', color: '#00FF00' },  // Green
  { word: 'RED', color: '#FF00FF' },     // Magenta
  { word: 'BLUE', color: '#00FFFF' },    // Cyan
  { word: 'GREEN', color: '#FFFF00' },   // Yellow
  { word: 'YELLOW', color: '#0000FF' },  // Blue
  { word: 'PURPLE', color: '#00FFFF' },  // Cyan
  { word: 'ORANGE', color: '#FF0000' },  // Red
  { word: 'PINK', color: '#00FF00' },    // Green
  { word: 'WHITE', color: '#FF0000' },   // Red
  { word: 'MAGENTA', color: '#00FF00' }, // Green
  { word: 'PERIWINKLE', color: '#FF0000' }, // Red
  { word: 'TURQUOISE', color: '#FFFF00' }, // Yellow
  { word: 'INDIGO', color: '#00FFFF' },  // Cyan
  { word: 'CRIMSON', color: '#0000FF' }, // Blue
  { word: 'CORAL', color: '#FF00FF' },   // Magenta
  { word: 'TEAL', color: '#FF0000' },    // Red
  { word: 'LAVENDER', color: '#00FF00' }, // Green
  { word: 'MAROON', color: '#00FFFF' },  // Cyan
  { word: 'CHARTREUSE', color: '#0000FF' }, // Blue
]

export default function ColorWords({ currentCharIndex, hasError }: ColorWordsProps) {
  // Select 10 random color pairs each time the challenge appears
  const colorPairs = useMemo(() => {
    const shuffled = [...allColorPairs].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 10)
  }, [])
  
  // Create the full text from color words
  const text = colorPairs.map(p => p.word).join(' ')
  const chars = text.split('')
  
  // Calculate which color each character belongs to
  let charIndex = 0
  const charColors: string[] = []
  
  colorPairs.forEach((pair, pairIdx) => {
    for (let i = 0; i < pair.word.length; i++) {
      charColors.push(pair.color)
    }
    if (pairIdx < colorPairs.length - 1) {
      charColors.push('#FFFFFF') // Space color
    }
  })
  
  return (
    <div className={styles.challengeContainer}>
      <h3 className={styles.challengeTitle}>Type the Word not the Color!</h3>
      <div className={`${styles.textContent} ${hasError ? styles.error : ''}`}>
        {chars.map((char, idx) => {
          const isTyped = idx < currentCharIndex
          const isCurrent = idx === currentCharIndex
          
          return (
            <span
              key={idx}
              className={`${styles.char} ${isTyped ? styles.typed : ''} ${isCurrent ? styles.current : ''}`}
              style={{ color: charColors[idx] }}
            >
              {char}
            </span>
          )
        })}
      </div>
    </div>
  )
}
