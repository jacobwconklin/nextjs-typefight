'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './page.module.scss'
import { PlayerType, usePlayerType } from '../../../../context/PlayerTypeContext'
import wsClient from '../../../../websocket/wsClient'

// Minimal local types (was previously imported from database/types)
type IconName = string
type FontName = string
interface PlayerSchema {
  id: string
  alias: string
  icon: IconName
  font: FontName
  color: string
  joinedAt: number
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

interface PlayerCustomization {
  alias: string
  color: string
  font: string
  icon: string
  joinCode?: string
}

const AVAILABLE_FONTS = [
  'Black Ops One',
  'Calibri',
  'Coda',
  'Comic Neue',
  'Federant',
  'Gabriela',
  'Grenze Gotisch',
  'Kalam',
  'Merriweather',
  'Nova Square',
  'Reggae One',
  'Roboto',
  'Times New Roman',
  'Tomorrow',
]

const AVAILABLE_ICONS = [
  'bee',
  'black-chess-knight',
  'brain',
  'cookie',
  'crab',
  'croissant',
  'dragon',
  'hamster',
  'hedgehog',
  'koala',
  'lion-face',
  'lizard',
  'man-zombie',
  'ninja',
  'octopus',
  'pirate',
  'samurai',
  'spouting-whale',
  'thimble',
  'turkey',
  'unicorn-face',
  'windmill',
  'wizard',
  'woman-zombie',
]

export default function PlayerCustomizationPage() {
  const params = useParams()
  const router = useRouter()
  const { playerType, setPlayerType, joinCode, setJoinCode, setPlayerData } = usePlayerType()
  const mode = params.mode as string
  const code = params.code as string[] | undefined

  const [customization, setCustomization] = useState<PlayerCustomization>({
    alias: '',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    font: 'Calibri',
    icon: AVAILABLE_ICONS[Math.floor(Math.random() * AVAILABLE_ICONS.length)],
    joinCode: '',
  })

  // local state + ref to control font dropdown visibility
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false)
  const fontDropdownRef = useRef<HTMLDivElement | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setFontDropdownOpen(false)
      }
    }
    if (fontDropdownOpen) window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [fontDropdownOpen])

  useEffect(() => {
    // Redirect invalid or missing mode back to homepage
    const validModes = ['host', 'join', 'solo']
    if (!mode || !validModes.includes(mode)) {
      router.push('/')
      return
    }

    // Set player type in context
    setPlayerType(mode as PlayerType)

    // If join mode and code provided in URL, prefill join code
    if (mode === 'join' && code && code[0]) {
      setCustomization((c) => ({ ...c, joinCode: code[0] }))
      setJoinCode(code[0])
    }
  }, [mode, code, router, setPlayerType, setJoinCode])

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = 20
    const val = e.target.value.slice(0, max)
    setCustomization({ ...customization, alias: val })
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomization({ ...customization, color: e.target.value })
  }

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCustomization({ ...customization, font: e.target.value })
  }

  const handleIconSelect = (icon: string) => {
    setCustomization({ ...customization, icon })
  }

  const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomization({ ...customization, joinCode: e.target.value })
  }

  const handleStart = async () => {
    console.log('Starting with:', customization)
    if (mode === 'host') {
      // Generate 8-char join code via backend API
      const generatedCode = await wsClient.request('generateJoinCode', {})
      setJoinCode(generatedCode)
      setCustomization((c) => ({ ...c, joinCode: generatedCode }))

      // Save player data to context
      const player: PlayerSchema = {
        id: makeId(),
        alias: customization.alias,
        icon: customization.icon as IconName,
        font: customization.font as FontName,
        color: customization.color,
        joinedAt: Date.now(),
      }
      setPlayerData(player)

      // Navigate to party (socket join will happen from party page)
      router.push(`/party/${generatedCode}`)
    } else if (mode === 'join') {
      const enteredCode = customization.joinCode || ''
      if (!enteredCode) {
        alert('Please enter a join code')
        return
      }

      setJoinCode(enteredCode)

      const player: PlayerSchema = {
        id: makeId(),
        alias: customization.alias,
        icon: customization.icon as IconName,
        font: customization.font as FontName,
        color: customization.color,
        joinedAt: Date.now(),
      }
      setPlayerData(player)

      // Navigate to party; actual join occurs on the party page via socket
      router.push(`/party/${enteredCode}`)
    } else if (mode === 'solo') {
      // Save solo player to context and navigate to games page
      const player: PlayerSchema = {
        id: makeId(),
        alias: customization.alias,
        icon: customization.icon as IconName,
        font: customization.font as FontName,
        color: customization.color,
        joinedAt: Date.now(),
      }
      setPlayerData(player)
      // Navigate to games page
      router.push('/games')
    }
  }

  const previewFontStyle = {
    fontFamily: customization.font,
  }

  // color mapping for modes (muted background + button)
  const MODE_BUTTON_COLORS: Record<string, string> = {
    host: '#c94a4a',
    join: '#4a6fc9',
    solo: '#7a4ac9',
  }

  const buttonColor = MODE_BUTTON_COLORS[mode] || '#6b6b6b'

  // helper to create muted background from hex
  const hexToRGBA = (hex: string, alpha = 0.12) => {
    const h = hex.replace('#', '')
    const bigint = parseInt(h, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const mutedBg = hexToRGBA(buttonColor, 0.06)

  const aliasPreviewText = customization.alias || 'My Nickname'

  // Prevent hydration errors by not rendering until mounted on client
  if (!isMounted) {
    return null
  }

  return (
    <div className={styles.container} style={{ backgroundColor: mutedBg, position: 'relative' }}>
      {/* Home icon top-left */}
      <button
        aria-label="Home"
        title="Home"
        onClick={() => router.push('/')}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'transparent',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          cursor: 'pointer',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={styles.previewSection}>
        <div className={styles.playerPreview}>
          <div
            className={styles.iconPreview}
            style={{ backgroundColor: customization.color }}
          >
            <img
              src={`/icons/${customization.icon}.svg`}
              alt={customization.icon}
              width={60}
              height={60}
            />
          </div>
          <span className={styles.aliasPreview} style={previewFontStyle}>
            {aliasPreviewText}
          </span>
        </div>
      </div>

      <div className={styles.customizationSection}>
        <div className={styles.customizationRow}>
          <div className={styles.customizationItem}>
            <h2 className={styles.sectionTitle}>Enter Your Alias</h2>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.inputField}
                value={customization.alias}
                placeholder="My Nickname"
                onChange={handleAliasChange}
                maxLength={20}
              />
            </div>
          </div>

          <div className={styles.customizationItem}>
            <h2 className={styles.sectionTitle}>Pick A Color</h2>
            <div className={styles.colorPickerContainer}>
              <input
                type="color"
                className={styles.colorPicker}
                value={customization.color}
                onChange={handleColorChange}
              />
              <span className={styles.colorHex}>{customization.color}</span>
            </div>
          </div>

          <div className={styles.customizationItem}>
            <h2 className={styles.sectionTitle}>Select Your Font</h2>
            <div className={styles.inputWrapper}>
              <div className={styles.fontDropdown} ref={fontDropdownRef}>
                <div
                  className={styles.fontDropdownSelected}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFontDropdownOpen((o) => !o)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setFontDropdownOpen((o) => !o)
                    }
                  }}
                >
                  <span style={{ fontFamily: customization.font }}>{customization.font}</span>
                  <span className={styles.dropdownArrow}>{fontDropdownOpen ? '▲' : '▼'}</span>
                </div>
                <div id="font-dropdown-list" className={`${styles.fontDropdownList} ${fontDropdownOpen ? styles.active : ''}`}>
                  {AVAILABLE_FONTS.map((font) => (
                    <div
                      key={font}
                      className={styles.fontDropdownItem}
                      onClick={() => {
                        setCustomization({ ...customization, font })
                        setFontDropdownOpen(false)
                      }}
                    >
                      <span style={{ fontFamily: font }}>{font}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.iconSection}>
          <h2 className={styles.sectionTitle}>Choose Your Icon</h2>
          <div className={styles.iconGrid}>
            {AVAILABLE_ICONS.map((icon) => (
              <button
                key={icon}
                className={`${styles.iconButton} ${
                  customization.icon === icon ? styles.iconButtonSelected : ''
                }`}
                onClick={() => handleIconSelect(icon)}
                type="button"
              >
                <img
                  src={`/icons/${icon}.svg`}
                  alt={icon}
                  width={50}
                  height={50}
                />
              </button>
            ))}
          </div>
        </div>

        {mode === 'join' && (
          <div className={styles.joinCodeSection}>
            <h2 className={styles.sectionTitle}>Enter Game Join Code</h2>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.inputField}
                value={customization.joinCode}
                placeholder="Enter code"
                onChange={handleJoinCodeChange}
              />
            </div>
          </div>
        )}

        <button
          className={styles.startButton}
          onClick={handleStart}
          disabled={!customization.alias}
          style={{ background: buttonColor, borderColor: '#222', color: '#fff' }}
        >
          Start
        </button>
      </div>
    </div>
  )
}
