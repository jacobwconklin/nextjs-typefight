'use client'

/**
 * BackgroundMusicManager
 *
 * Sits in the root layout (inside SoundProvider) and watches the current
 * pathname. When the route changes it calls setBackgroundMusic with the
 * appropriate track.
 *
 * The seamless-navigation guarantee:
 *   soundPlayer.setBackgroundMusic() is a no-op when the same src is already
 *   playing, so navigating between pages that share a track (e.g. / → /player
 *   → /party → /games) never restarts the music mid-playthrough.
 *
 * Track map
 * ─────────
 *  epic.mp3  →  /  |  /games  |  /player/*  |  /party/*
 *  hype.mp3  →  /games/<any-individual-game>
 *  null      →  everything else (music stops)
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSound } from '../context/SoundContext'

// Centralised music catalogue — update filenames here when tracks are swapped.
const TRACKS = {
  epic: '/sounds/music/epic.mp3',
  hype: '/sounds/music/hype.mp3',
} as const

type TrackKey = keyof typeof TRACKS

/**
 * Returns the track key (or null) for a given pathname.
 * Adding a new game page? Just ensure it starts with /games/ — it will
 * automatically pick up hype.mp3 without any extra work here.
 */
function getTrackForPath(pathname: string): TrackKey | null {
  // Individual game sub-pages  e.g. /games/quickkeys, /games/typeflight
  if (pathname.startsWith('/games/')) return 'hype'

  // Hub / lobby pages
  if (
    pathname === '/' ||
    pathname === '/games' ||
    pathname.startsWith('/player') ||
    pathname.startsWith('/party')
  ) {
    return 'epic'
  }

  return null
}

export default function BackgroundMusicManager() {
  const pathname = usePathname()
  const { setBackgroundMusic } = useSound()

  useEffect(() => {
    const key = getTrackForPath(pathname ?? '/')
    setBackgroundMusic(key ? TRACKS[key] : null)
  }, [pathname, setBackgroundMusic])

  // Renders nothing — purely a side-effect component.
  return null
}
