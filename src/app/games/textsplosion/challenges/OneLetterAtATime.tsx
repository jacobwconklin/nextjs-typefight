import React from 'react'
import styles from './Challenge.module.scss'

interface OneLetterAtATimeProps {
  text: string
  currentCharIndex: number
  hasError: boolean
}

export default function OneLetterAtATime({ text, currentCharIndex, hasError }: OneLetterAtATimeProps) {
  const chars = text.split('')
  
  // Only show characters up to current + 1
  const visibleChars = chars.slice(0, currentCharIndex + 1)
  
  return (
    <div className={styles.challengeContainer}>
      <h3 className={styles.challengeTitle}>One Letter at a Time!</h3>
      <div className={`${styles.textContent} ${hasError ? styles.error : ''}`}>
        {visibleChars.map((char, idx) => {
          const isTyped = idx < currentCharIndex
          const isCurrent = idx === currentCharIndex
          
          return (
            <span
              key={idx}
              className={`${styles.char} ${isTyped ? styles.typed : ''} ${isCurrent ? styles.current : ''}`}
            >
              {char}
            </span>
          )
        })}
      </div>
    </div>
  )
}
