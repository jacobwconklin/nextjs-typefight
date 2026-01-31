"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import styles from './page.module.scss'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'

interface PlayerRow {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

export default function PartyPage() {
  const router = useRouter()
  const { playerType, joinCode: ctxJoinCode, setJoinCode } = usePlayerType()
  const params = useParams()
  const code = params.code as string

  const [joinCode, setJoinCodeState] = useState<string>(code || '')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [gameStarted, setGameStarted] = useState<boolean>(false)

  // if solo skip to games
  useEffect(() => {
    if (playerType === 'solo') {
      router.push('/games')
    }
  }, [playerType, router])

  // on mount, use code from params, set in context
  useEffect(() => {
    setJoinCode(code)
    setJoinCodeState(code)
  }, [code, setJoinCode])

  // build QR whenever joinCode changes
  useEffect(() => {
    if (!joinCode) return
    const fullUrl = `http://localhost:3000/player/join/${joinCode}`
    QRCode.toDataURL(fullUrl).then(setQrDataUrl).catch(console.error)
  }, [joinCode])

  // join the session and subscribe to socket events
  useEffect(() => {
    if (!joinCode) return
    let mounted = true

    const stored = typeof window !== 'undefined' ? localStorage.getItem('tf_player') : null
    const player = stored ? JSON.parse(stored) : null

    const onJoinSuccess = (payload: any) => {
      if (!mounted) return
      setPlayers(payload.players || [])
      setGameStarted(Boolean(payload.gameState?.started))
    }

    const onPlayerJoined = (payload: any) => {
      if (!mounted) return
      setPlayers(payload.players || [])
    }

    const onPlayerLeft = (payload: any) => {
      if (!mounted) return
      setPlayers(payload.players || [])
    }

    const onPartyState = (payload: any) => {
      if (!mounted) return
      setPlayers(payload.players || [])
      setGameStarted(Boolean(payload.gameStarted))
      if (payload.gameStarted) router.push('/games')
    }

    const onJoinError = (payload: any) => {
      if (!mounted) return
      alert(payload?.error || 'Failed to join session')
      router.push('/player/join')
    }

    wsClient.on('join-success', onJoinSuccess)
    wsClient.on('player-joined', onPlayerJoined)
    wsClient.on('player-left', onPlayerLeft)
    wsClient.on('partyState', onPartyState)
    wsClient.on('join-error', onJoinError)

    // attempt to fetch current session info (optional) - useful for viewing empty parties
    wsClient.request('getParty', { code: joinCode }).then((res) => {
      if (!mounted) return
      setPlayers(res?.players || [])
      setGameStarted(Boolean(res?.gameState?.started))
    }).catch(() => {})

    // emit join-session using stored player customization (host or join flow saved earlier)
    const payload = {
      joinCode,
      alias: player?.alias || 'Guest',
      color: player?.color || '#888',
      font: player?.font || 'Calibri',
      icon: player?.icon || 'wizard'
    }

    // Before emitting join-session, ensure the session exists on the server.
    const ensureSessionExists = async (code: string, retries = 12, delay = 250) => {
      for (let i = 0; i < retries; i++) {
        try {
          const s = await wsClient.request('getParty', { code })
          if (s) return s
        } catch (e) {
          // ignore and retry
        }
        // small backoff
        await new Promise((r) => setTimeout(r, delay))
      }
      return null
    }

    ;(async () => {
      const s = await ensureSessionExists(joinCode)
      if (!s) {
        // show helpful message and navigate back to create/join
        alert('Session not available yet. Try refreshing or creating a new session.')
        router.push('/player/host')
        return
      }
      wsClient.send('join-session', payload)
    })()

    return () => {
      mounted = false
      wsClient.off('join-success', onJoinSuccess)
      wsClient.off('player-joined', onPlayerJoined)
      wsClient.off('player-left', onPlayerLeft)
      wsClient.off('partyState', onPartyState)
      wsClient.off('join-error', onJoinError)
      wsClient.send('leave-session', { code: joinCode })
    }
  }, [joinCode, router])

  const [codeBurst, setCodeBurst] = useState(false)
  const [urlBurst, setUrlBurst] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode)
      setCodeBurst(true)
      setTimeout(() => setCodeBurst(false), 800)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  const handleCopyUrl = async () => {
    try {
      const url = `http://localhost:3000/player/join/${joinCode}`
      await navigator.clipboard.writeText(url)
      setUrlBurst(true)
      setTimeout(() => setUrlBurst(false), 800)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  const handleStart = async () => {
    if (!joinCode) return
    wsClient.send('start-game', { code: joinCode })
  }

  return (
    <div className={styles.container}>

      {/* QR centered at top */}
      <div className={styles.topQR}>{qrDataUrl && <img src={qrDataUrl} alt="join-qr" className={styles.qr} />}</div>

      <div className={styles.codeRow}>
        <div className={styles.codeBox}>
          <div className={styles.codeText}>{joinCode || '—'}</div>
          <button className={`${styles.copyButton} ${codeBurst ? styles.active : ''}`} onClick={handleCopyCode}>
            Copy
            <div className={`${styles.sparks} ${codeBurst ? styles.active : ''}`}>
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
            </div>
          </button>
        </div>

        <div className={styles.urlBox}>
          <div className={styles.urlText}>http://localhost:3000/player/join/{joinCode}</div>
          <button className={`${styles.copyButton} ${urlBurst ? styles.active : ''}`} onClick={handleCopyUrl}>
            Copy
            <div className={`${styles.sparks} ${urlBurst ? styles.active : ''}`}>
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
              <span className={styles.spark} />
            </div>
          </button>
        </div>
      </div>
      
      <h1 className={styles.title}>Party</h1>

      <div className={styles.playersTableWrap}>
        <table className={styles.playersTable}>
          <thead>
            <tr>
              <th>Icon</th>
              <th>Alias</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className={styles.iconCell} style={{ background: p.color }}>
                    <img src={`/icons/${p.icon}.svg`} alt={p.icon} width={36} height={36} />
                  </div>
                </td>
                <td style={{ fontFamily: p.font || 'inherit' }}>{p.alias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {playerType === 'host' && (
        <div className={styles.hostControls}>
          <button className={styles.startButton} onClick={handleStart}>
            Start Game
          </button>
        </div>
      )}
    </div>
  )
}
