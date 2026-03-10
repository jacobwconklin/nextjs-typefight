'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayerType } from '../context/PlayerTypeContext'
import wsClient from '../websocket/wsClient'
import styles from './PersistentHomeButton.module.scss'

type Role = 'host' | 'join' | 'solo'

const MESSAGE_BY_ROLE: Record<Role, string> = {
  solo: 'This will take you back to the home screen. Are you sure?',
  join: 'This will cause you to leave your session and you cannot rejoin if the session has already started. Are you sure?',
  host: 'This will cause you to leave your session and end the session for everyone in it. Are you sure?'
}

export default function PersistentHomeButton() {
  const pathname = usePathname()
  const router = useRouter()
  const {
    playerType,
    setPlayerType,
    joinCode,
    setJoinCode,
    setPlayerData
  } = usePlayerType()
  const [open, setOpen] = useState(false)

  const hiddenOnRoute = pathname === '/'

  const effectiveRole = useMemo<Role>(() => {
    if (playerType === 'host' || playerType === 'join' || playerType === 'solo') {
      return playerType
    }

    if (pathname?.startsWith('/player/host')) return 'host'
    if (pathname?.startsWith('/player/join')) return 'join'
    return 'solo'
  }, [pathname, playerType])

  useEffect(() => {
    const onSessionEnded = () => {
      setOpen(false)
      setJoinCode(null)
      setPlayerData(null)
      setPlayerType('solo')
      router.push('/')
    }

    wsClient.on('session-ended', onSessionEnded)
    return () => {
      wsClient.off('session-ended', onSessionEnded)
    }
  }, [router, setJoinCode, setPlayerData, setPlayerType])

  const handleConfirm = () => {
    if (effectiveRole === 'solo') {
      setOpen(false)
      setJoinCode(null)
      setPlayerData(null)
      setPlayerType('solo')
      router.push('/')
      return
    }

    wsClient.send('leave-session', {
      code: joinCode,
      role: effectiveRole
    })

    setOpen(false)
    setJoinCode(null)
    setPlayerData(null)
    setPlayerType('solo')
    router.push('/')
  }

  if (hiddenOnRoute) {
    return null
  }

  return (
    <>
      <button
        aria-label="Home"
        title="Home"
        onClick={() => setOpen(true)}
        className={styles.homeButton}
        type="button"
      >
        <span className={styles.homeIcon} />
      </button>

      {open && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Confirm leaving session">
          <div className={styles.modalCard}>
            <p className={styles.modalText}>{MESSAGE_BY_ROLE[effectiveRole]}</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.confirmButton} onClick={handleConfirm}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
