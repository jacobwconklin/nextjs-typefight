"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import styles from './page.module.scss'
import { usePlayerType } from '../../../context/PlayerTypeContext'
import * as db from '../../../database/dynamodb'

interface PlayerRow {
  id: string
  alias: string
  icon: string
  color: string
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

  // polling players and gameStarted
  useEffect(() => {
    let mounted = true
    const poll = async () => {
      if (!joinCode) return
      try {
        const p = await db.getPlayers(joinCode)
        const started = await db.getGameStarted(joinCode)
        if (!mounted) return
        setPlayers(p || [])
        setGameStarted(Boolean(started))
        if (started) router.push('/games')
      } catch (e) {
        console.error(e)
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [joinCode, router])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode)
      // small feedback could be added
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  const handleStart = async () => {
    if (!joinCode) return
    await db.setGameStarted(joinCode)
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Party</h1>

      <div className={styles.codeSection}>
        <div className={styles.codeBox}>
          <div className={styles.codeText}>{joinCode || '—'}</div>
          <button className={styles.copyButton} onClick={handleCopy}>
            Copy
          </button>
        </div>
        {qrDataUrl && <img src={qrDataUrl} alt="join-qr" className={styles.qr} />}
      </div>

      <div className={styles.urlSection}>
        <div className={styles.urlBox}>
          <div className={styles.urlText}>http://localhost:3000/player/join/{joinCode}</div>
          <button className={styles.copyButton} onClick={() => navigator.clipboard.writeText(`http://localhost:3000/player/join/${joinCode}`)}>
            Copy
          </button>
        </div>
      </div>

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
                <td>{p.alias}</td>
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
