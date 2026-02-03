import React from 'react'
import styles from './Challenge.module.scss'

interface BackwardsTypingProps {
  text: string
  currentCharIndex: number
  hasError: boolean
}

export default function BackwardsTyping({ text, currentCharIndex, hasError }: BackwardsTypingProps) {
  // Reverse the text for display
  const reversedText = text.split('').reverse().join('')
  const chars = reversedText.split('')
  
  return (
    <div className={styles.challengeContainer}>
      <h3 className={styles.challengeTitle}>Type Backwards!</h3>
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
