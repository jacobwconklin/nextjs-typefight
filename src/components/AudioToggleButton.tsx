'use client'

import { useSound } from '../context/SoundContext'
import styles from './AudioToggleButton.module.scss'

export default function AudioToggleButton() {
  const { audioEnabled, toggleAudio } = useSound()

  return (
    <button
      aria-label={audioEnabled ? 'Mute audio' : 'Unmute audio'}
      title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
      onClick={toggleAudio}
      className={styles.audioButton}
      type="button"
    >
      {/* Music note icon (mask-based, same technique as HomeButton) */}
      <span className={styles.musicIcon} />

      {/* Diagonal slash overlay shown when muted */}
      {!audioEnabled && <span className={styles.muteSlash} aria-hidden="true" />}
    </button>
  )
}
