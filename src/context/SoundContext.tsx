'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import soundPlayer from '../utils/soundPlayer'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SoundContextValue {
  /** Whether audio (effects + music) is globally enabled. */
  audioEnabled: boolean
  /** Toggle audio on / off. Persisted to localStorage. */
  toggleAudio: () => void
  /**
   * Play a one-shot sound effect.
   * @param src  Path under /public, e.g. '/sounds/effects/keypress.mp3'
   * @param volume  0-1 (default 1)
   */
  playEffect: (src: string, volume?: number) => void
  /**
   * Set the looping background music for the current page/view.
   * Pass null to stop music.
   * @param src  Path under /public, e.g. '/sounds/music/home.mp3'
   * @param volume  0-1 (default 0.4)
   */
  setBackgroundMusic: (src: string | null, volume?: number) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SoundContext = createContext<SoundContextValue | undefined>(undefined)

const STORAGE_KEY = 'typefight.audio-enabled.v1'

// ─── Provider ────────────────────────────────────────────────────────────────

export function SoundProvider({ children }: { children: ReactNode }) {
  // Default to false — browsers block autoplay until a user gesture.
  // The user must click the audio toggle to enable sound for the first time.
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false)

  // Rehydrate preference from localStorage on mount.
  // If the user has never set a preference, we stay at false (off by default).
  useEffect(() => {
    soundPlayer.setEnabled(false) // ensure player starts muted
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        const enabled = stored !== 'false'
        setAudioEnabled(enabled)
        soundPlayer.setEnabled(enabled)
      }
    } catch {
      // localStorage unavailable (e.g. private browsing restrictions) — ignore.
    }
  }, [])

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev
      soundPlayer.setEnabled(next)
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const playEffect = useCallback((src: string, volume = 1) => {
    soundPlayer.playEffect(src, volume)
  }, [])

  const setBackgroundMusic = useCallback((src: string | null, volume = 0.4) => {
    soundPlayer.setBackgroundMusic(src, volume)
  }, [])

  return (
    <SoundContext.Provider
      value={{ audioEnabled, toggleAudio, playEffect, setBackgroundMusic }}
    >
      {children}
    </SoundContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access the sound system from any client component.
 *
 * @example
 * const { playEffect, setBackgroundMusic, audioEnabled } = useSound()
 * useEffect(() => { setBackgroundMusic('/sounds/music/game.mp3') }, [])
 * <button onClick={() => playEffect('/sounds/effects/click.mp3')}>Click</button>
 */
export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used within a SoundProvider')
  return ctx
}

export default SoundContext
