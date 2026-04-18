"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import styles from './page.module.scss'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import wsClient from '../../../websocket/wsClient'
import { FRONTEND_URL } from '../../../config' 

interface PlayerRow {
  id: string
  alias: string
  icon: string
  color: string
  font?: string
}

export default function PartyPage() {
  const router = useRouter()
  const { playerType, setJoinCode, playerData } = usePlayerType()
  const params = useParams()
  const code = params.code as string

  const [joinCode, setJoinCodeState] = useState<string>(code || '')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null)

  // on mount, use code from params, set in context
  useEffect(() => {
    setJoinCode(code)
    setJoinCodeState(code)
  }, [code, setJoinCode])

  // build QR whenever joinCode changes
  useEffect(() => {
    if (!joinCode) return
    const fullUrl = `${FRONTEND_URL}/player/join/${joinCode}`
    QRCode.toDataURL(fullUrl).then(setQrDataUrl).catch(console.error)
  }, [joinCode])

  // Keep backend phase aligned with host location when host is on party page.
  useEffect(() => {
    if (!joinCode || playerType !== 'host') return
    void wsClient.sendWithRetry('host-return-to-lobby', { code: joinCode }).catch((err) => {
      console.error('Failed to ensure lobby state from party page:', err)
    })
  }, [joinCode, playerType])

  // join the session and subscribe to socket events
  useEffect(() => {
    if (!joinCode) return
    let mounted = true
    let rejoinAttempt = 0
    let joinFallbackAttempted = false
    let rejoinRecovered = false
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    const player = playerData
    if (!player?.id) {
      // No multiplayer identity available; never auto-join as a fallback guest.
      router.push('/player/join')
      return
    }

    const retryDelays = [0, 1000, 2000, 4000, 8000]

    const payload = {
      joinCode,
      playerId: player.id,
      alias: player.alias || 'Player',
      color: player.color || '#888',
      font: player.font || 'Calibri',
      icon: player.icon || 'wizard'
    }

    const onJoinSuccess = (payload: any) => {
      if (!mounted) return
      rejoinRecovered = true
      setPlayers(payload.players || [])
      setGameStarted(Boolean(payload.gameState?.started))
      setHostPlayerId(payload?.session?.hostPlayerId || null)
      console.log('Join success! Player ID:', player?.id)
    }

    const onRejoinSuccess = (payload: any) => {
      if (!mounted) return
      rejoinRecovered = true
      setPlayers(payload?.session?.players || [])
      setGameStarted(Boolean(payload?.session?.started))
      setHostPlayerId(payload?.session?.hostPlayerId || null)
      console.log('Rejoin success! Player ID:', player?.id)
    }

    const attemptRejoin = () => {
      if (!mounted || rejoinRecovered || !payload.playerId) return
      if (rejoinAttempt >= retryDelays.length) return

      const delay = retryDelays[rejoinAttempt]
      rejoinAttempt += 1
      retryTimeout = setTimeout(() => {
        if (!mounted || rejoinRecovered) return
        void wsClient.sendWithRetry('rejoin-session', {
          joinCode: payload.joinCode,
          playerId: payload.playerId
        }, {
          maxRetries: 0,
          timeoutMs: 3500
        }).catch(() => {
          // Errors are handled via rejoin-failed events and outer retry sequence.
        })
      }, delay)
    }

    const onRejoinFailed = (rejoinPayload: any) => {
      if (!mounted || rejoinRecovered) return

      // If there is no previous server-side player state, fall back to normal join once.
      if (rejoinPayload?.reason === 'player-not-found' && !joinFallbackAttempted) {
        joinFallbackAttempted = true
        wsClient.send('join-session', payload)
        return
      }

      attemptRejoin()
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
    }

    const onSessionSnapshot = (snapshotPayload: any) => {
      if (!mounted) return
      const session = snapshotPayload?.session
      if (!session) return
      setPlayers(session.players || [])
      setGameStarted(Boolean(session.started))
      setHostPlayerId(session.hostPlayerId || null)
    }

    const onGameStarted = (payload: any) => {
      if (!mounted) return
      // Navigate to games page when game is started
      router.push('/games')
    }

    const onJoinError = (payload: any) => {
      if (!mounted) return
      alert(payload?.error || 'Failed to join session')
      router.push('/player/join')
    }

    const onSocketConnected = () => {
      if (!mounted || rejoinRecovered) return
      attemptRejoin()
    }

    wsClient.on('join-success', onJoinSuccess)
    wsClient.on('rejoin-success', onRejoinSuccess)
    wsClient.on('rejoin-failed', onRejoinFailed)
    wsClient.on('player-joined', onPlayerJoined)
    wsClient.on('player-left', onPlayerLeft)
    wsClient.on('partyState', onPartyState)
    wsClient.on('session-snapshot', onSessionSnapshot)
    wsClient.on('game-started', onGameStarted)
    wsClient.on('join-error', onJoinError)
    wsClient.on('connect', onSocketConnected)

    // attempt to fetch current session info (optional) - useful for viewing empty parties
    wsClient.request('getParty', { code: joinCode }).then((res) => {
      if (!mounted) return
      setPlayers(res?.players || [])
      setGameStarted(Boolean(res?.gameState?.started))
    }).catch(() => {})

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

      // First try to recover a prior player session, then fall back to normal join.
      attemptRejoin()

      // Always attempt one explicit join fallback for known player identity.
      if (!joinFallbackAttempted) {
        joinFallbackAttempted = true
        wsClient.send('join-session', payload)
      }
    })()

    return () => {
      mounted = false
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      wsClient.off('join-success', onJoinSuccess)
      wsClient.off('rejoin-success', onRejoinSuccess)
      wsClient.off('rejoin-failed', onRejoinFailed)
      wsClient.off('player-joined', onPlayerJoined)
      wsClient.off('player-left', onPlayerLeft)
      wsClient.off('partyState', onPartyState)
      wsClient.off('session-snapshot', onSessionSnapshot)
      wsClient.off('game-started', onGameStarted)
      wsClient.off('join-error', onJoinError)
      wsClient.off('connect', onSocketConnected)
    }
  }, [joinCode, router, playerData])

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
      const url = `${FRONTEND_URL}/player/join/${joinCode}`
      await navigator.clipboard.writeText(url)
      setUrlBurst(true)
      setTimeout(() => setUrlBurst(false), 800)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  const handleStart = async () => {
    if (!joinCode) return
    void wsClient.sendWithRetry('start-game', { code: joinCode, gameName: 'games' }).catch((err) => {
      console.error('Failed to start games screen:', err)
    })
  }

  const handleRemovePlayer = (targetPlayerId: string) => {
    if (playerType !== 'host' || !joinCode) return
    void wsClient.sendWithRetry('host-kick-player', {
      code: joinCode,
      targetPlayerId
    }).catch((err) => {
      console.error('Failed to remove player:', err)
    })
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
          <div className={styles.urlText}>{`${FRONTEND_URL}/player/join/${joinCode}`}</div>
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
              {playerType === 'host' && <th>Action</th>}
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
                {playerType === 'host' && (
                  <td>
                    {p.id !== hostPlayerId ? (
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemovePlayer(p.id)}
                      >
                        Remove
                      </button>
                    ) : (
                      <span className={styles.hostBadge}>Host</span>
                    )}
                  </td>
                )}
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
