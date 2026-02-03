import React from 'react'
import styles from './Challenge.module.scss'

interface NoCursorProps {
  text: string
  currentCharIndex: number
  hasError: boolean
}

export default function NoCursor({ text, currentCharIndex, hasError }: NoCursorProps) {
  const chars = text.split('')
  
  return (
    <div className={styles.challengeContainer}>
      <h3 className={styles.challengeTitle}>No Cursor!</h3>
      <div className={styles.subtitle}>Type blind - no visual feedback!</div>
      <div className={`${styles.textContent} ${hasError ? styles.error : ''}`}>
        {chars.map((char, idx) => {
          // No visual indication of typed or current character
          return (
            <span
              key={idx}
              className={styles.char}
            >
              {char}
            </span>
          )
        })}
      </div>
    </div>
  )
}
