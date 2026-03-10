import React from 'react'
import styles from './GameInstructionsOverlay.module.scss'

interface GameInstructionsOverlayProps {
  title: string
  rules: string[]
  canBegin: boolean
  onBegin: () => void
}

export default function GameInstructionsOverlay({
  title,
  rules,
  canBegin,
  onBegin
}: GameInstructionsOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>Rules</p>

        <ul className={styles.rules}>
          {rules.map((rule, index) => (
            <li key={`${title}-rule-${index}`}>{rule}</li>
          ))}
        </ul>

        {!canBegin && (
          <p className={styles.waitingText}>Waiting for Host to begin...</p>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.beginButton}
          onClick={onBegin}
          disabled={!canBegin}
        >
          Begin
        </button>
      </div>
    </div>
  )
}
