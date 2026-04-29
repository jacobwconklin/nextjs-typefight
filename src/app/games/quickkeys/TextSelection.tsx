import React from 'react'
import styles from './page.module.scss'
import ExitButton from '@/components/ExitButton'

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
  errorPenaltySeconds: number
  onChangeErrorPenaltySeconds: (seconds: number) => void
}

export default function TextSelection({
  texts,
  loading,
  playerType,
  selectedTextId,
  onSelectText,
  errorPenaltySeconds,
  onChangeErrorPenaltySeconds
}: TextSelectionProps) {
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length
  }

  const penaltyOptions = [0, 0.1, 0.5, 1]
  const canChangePenalty = playerType === 'host' || playerType === 'solo'

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

      <div className={styles.settingRow}>
        <div className={styles.settingLabel}>error penalty (seconds)</div>
        <div className={styles.tabs} role="radiogroup" aria-label="error penalty (seconds)">
          {penaltyOptions.map((value) => {
            const selected = errorPenaltySeconds === value
            return (
              <button
                key={value}
                type="button"
                className={`${styles.tabButton} ${selected ? styles.tabSelected : ''}`}
                onClick={() => canChangePenalty && onChangeErrorPenaltySeconds(value)}
                disabled={!canChangePenalty}
                aria-pressed={selected}
              >
                {value}
              </button>
            )
          })}
        </div>
      </div>

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

      <ExitButton 
        gameName="quickkeys"
        className={styles.exitButtonMargin}
      />
    </div>
  )
}
