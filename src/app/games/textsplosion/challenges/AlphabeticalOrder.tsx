import React, { useMemo } from 'react'
import styles from './Challenge.module.scss'

interface AlphabeticalOrderProps {
  text: string
  currentCharIndex: number
  hasError: boolean
}

export default function AlphabeticalOrder({ text, currentCharIndex, hasError }: AlphabeticalOrderProps) {
  // Split text into words and sort them alphabetically
  const { sortedWords, originalPositions, targetText } = useMemo(() => {
    const words = text.split(' ').filter(word => word.length > 0)
    
    // Create array with words and their original positions
    const wordsWithPositions = words.map((word, idx) => ({ word, originalIndex: idx }))
    
    // Sort words alphabetically (case-insensitive)
    const sorted = [...wordsWithPositions].sort((a, b) => 
      a.word.toLowerCase().localeCompare(b.word.toLowerCase())
    )
    
    // Build target text (what player needs to type - sorted words without spaces)
    const target = sorted.map(w => w.word).join('')
    
    // Map to track which original position each character belongs to
    const positions = sorted.map(w => w.originalIndex)
    
    return {
      sortedWords: sorted.map(w => w.word),
      originalPositions: positions,
      targetText: target
    }
  }, [text])
  
  // Calculate which word and character position we're currently typing
  const getCurrentWordAndChar = (charIndex: number) => {
    let charCount = 0
    for (let i = 0; i < sortedWords.length; i++) {
      if (charIndex < charCount + sortedWords[i].length) {
        return { wordIndex: i, charInWord: charIndex - charCount }
      }
      charCount += sortedWords[i].length
    }
    return { wordIndex: sortedWords.length - 1, charInWord: sortedWords[sortedWords.length - 1].length - 1 }
  }
  
  const currentPos = getCurrentWordAndChar(currentCharIndex)
  
  // Display words in original order with highlighting
  const originalWords = text.split(' ').filter(word => word.length > 0)
  
  return (
    <div className={styles.challengeContainer}>
      <h3 className={styles.challengeTitle}>Type in Alphabetical Order!</h3>
      <div className={`${styles.textContent} ${hasError ? styles.error : ''}`}>
        {originalWords.map((word, wordIdx) => {
          // Find this word's position in the sorted array
          const sortedIndex = sortedWords.findIndex((sw, idx) => 
            originalPositions[idx] === wordIdx
          )
          
          // Check if this word is currently being typed
          const isCurrentWord = sortedIndex === currentPos.wordIndex
          
          // Calculate how many characters have been typed in this word
          let typedChars = 0
          if (sortedIndex < currentPos.wordIndex) {
            typedChars = word.length // Fully typed
          } else if (sortedIndex === currentPos.wordIndex) {
            typedChars = currentPos.charInWord // Partially typed
          }
          
          return (
            <React.Fragment key={wordIdx}>
              <span className={styles.word}>
                {word.split('').map((char, charIdx) => {
                  const isTyped = charIdx < typedChars
                  const isCurrent = isCurrentWord && charIdx === currentPos.charInWord
                  
                  return (
                    <span
                      key={charIdx}
                      className={`${styles.char} ${isTyped ? styles.typed : ''} ${isCurrent ? styles.currentSubtle : ''}`}
                    >
                      {char}
                    </span>
                  )
                })}
              </span>
              {wordIdx < originalWords.length - 1 && <span className={styles.char}> </span>}
            </React.Fragment>
          )
        })}
      </div>
      {/* <div className={styles.hint}>
        Type: {sortedWords.join(' → ')}
      </div> */}
    </div>
  )
}
