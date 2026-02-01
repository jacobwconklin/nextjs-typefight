import React from 'react'
import styles from './page.module.scss'

interface TypingText {
  id: string
  name: string
  body: string
}

interface TextSelectionProps {
  texts: TypingText[]
  loading: boolean
  playerType: 'solo' | 'host' | 'join'
  selectedTextId: string | null
  onSelectText: (textId: string) => void
}

export default function TextSelection({
  texts,
  loading,
  playerType,
  selectedTextId,
  onSelectText
}: TextSelectionProps) {
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading texts...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>QuickKeys</h1>
      <p className={styles.subtitle}>Select a text to type</p>

      {playerType === 'join' && (
        <div className={styles.waitingMessage}>
          Waiting for host to select a text...
        </div>
      )}

      <div className={styles.textList}>
        {texts.map(text => (
          <div
            key={text.id}
            className={`${styles.textCard} ${
              selectedTextId === text.id ? styles.selected : ''
            } ${
              playerType !== 'host' && playerType !== 'solo' ? styles.disabled : ''
            }`}
            onClick={() => onSelectText(text.id)}
          >
            <div className={styles.textName}>{text.name}</div>
            <div className={styles.textInfo}>
              {getWordCount(text.body)} words
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
