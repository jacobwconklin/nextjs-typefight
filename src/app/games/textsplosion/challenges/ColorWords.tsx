import React from 'react'
import styles from './Challenge.module.scss'

interface ColorPair {
  word: string
  color: string
}

interface ColorWordsProps {
  currentCharIndex: number
  hasError: boolean
  colorWords: ColorPair[]
}

export default function ColorWords({ currentCharIndex, hasError, colorWords }: ColorWordsProps) {
  
  // Create the full text from color words
  const text = colorWords.map(p => p.word).join(' ')
  const chars = text.split('')
  
  // Calculate which color each character belongs to
  let charIndex = 0
  const charColors: string[] = []
  
  colorWords.forEach((pair, pairIdx) => {
    for (let i = 0; i < pair.word.length; i++) {
      charColors.push(pair.color)
    }
    if (pairIdx < colorWords.length - 1) {
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
