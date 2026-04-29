/**
 * soundPlayer — singleton audio manager for TypeFight.
 *
 * Handles:
 *  - One-shot sound effects  (new Audio per call, fire-and-forget)
 *  - Background music        (single looping HTMLAudioElement, crossfades on track change)
 *
 * All public methods are safe to call before the browser is ready; they
 * queue or silently no-op until the environment supports HTMLAudioElement.
 */

type SoundPlayerState = {
  enabled: boolean
  bgAudio: HTMLAudioElement | null
  bgSrc: string | null
}

const state: SoundPlayerState = {
  enabled: true,
  bgAudio: null,
  bgSrc: null,
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

/**
 * Enable or disable all audio globally.
 * Disabling immediately pauses background music; re-enabling resumes it.
 */
export function setEnabled(enabled: boolean): void {
  state.enabled = enabled

  if (!isBrowser()) return

  if (!enabled) {
    state.bgAudio?.pause()
  } else if (state.bgSrc && state.bgAudio) {
    state.bgAudio.play().catch(() => {})
  }
}

/**
 * Play a one-shot sound effect.
 * @param src  Path relative to the public folder, e.g. '/sounds/effects/keypress.mp3'
 * @param volume  0–1, defaults to 1
 */
export function playEffect(src: string, volume = 1): void {
  if (!state.enabled || !isBrowser()) return

  try {
    const audio = new Audio(src)
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.play().catch(() => {})
  } catch {
    // Audio creation can throw in unusual environments; swallow silently.
  }
}

/**
 * Set (or change) the looping background music track.
 * Passing null or an empty string stops background music.
 * @param src  Path relative to the public folder, e.g. '/sounds/music/home.mp3'
 * @param volume  0–1, defaults to 0.4
 */
export function setBackgroundMusic(src: string | null, volume = 0.4): void {
  if (!isBrowser()) return

  const normalised = src?.trim() || null

  // Same track already playing — do nothing.
  if (normalised === state.bgSrc && state.bgAudio && !state.bgAudio.paused) return

  // Stop whatever is currently playing.
  if (state.bgAudio) {
    state.bgAudio.pause()
    state.bgAudio.src = ''
    state.bgAudio = null
  }

  state.bgSrc = normalised

  if (!normalised) return

  try {
    const audio = new Audio(normalised)
    audio.loop = true
    audio.volume = Math.max(0, Math.min(1, volume))
    state.bgAudio = audio

    if (state.enabled) {
      audio.play().catch(() => {})
    }
  } catch {
    state.bgSrc = null
  }
}

/**
 * Stop background music and clear the current track.
 */
export function stopBackgroundMusic(): void {
  if (state.bgAudio) {
    state.bgAudio.pause()
    state.bgAudio.src = ''
    state.bgAudio = null
  }
  state.bgSrc = null
}

/**
 * Returns whether audio is currently enabled.
 */
export function isEnabled(): boolean {
  return state.enabled
}

/**
 * Returns the src of the currently set background track (or null).
 */
export function getCurrentBgSrc(): string | null {
  return state.bgSrc
}

const soundPlayer = {
  setEnabled,
  playEffect,
  setBackgroundMusic,
  stopBackgroundMusic,
  isEnabled,
  getCurrentBgSrc,
}

export default soundPlayer
