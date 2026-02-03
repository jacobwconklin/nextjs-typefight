import React from 'react'
import styles from './Challenge.module.scss'

interface NoMistakesProps {
  text: string
  currentCharIndex: number
  hasError: boolean
}

export default function NoMistakes({ text, currentCharIndex, hasError }: NoMistakesProps) {
  const chars = text.split('')
  
  return (
    <div className={styles.challengeContainer}>
      <h3 className={styles.challengeTitle}>No Mistakes!</h3>
      <div className={styles.subtitle}>One mistake resets everything!</div>
      <div className={`${styles.textContent} ${hasError ? styles.error : ''}`}>
        {chars.map((char, idx) => {
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
