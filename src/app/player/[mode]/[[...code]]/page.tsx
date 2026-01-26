'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './page.module.scss'
import { PlayerType, usePlayerType } from '../../../../context/PlayerTypeContext'
import * as db from '../../../../database/dynamodb'
import { PlayerSchema, IconName, FontName } from '../../../../database/types'

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
  const { playerType, setPlayerType, joinCode, setJoinCode } = usePlayerType()
  const mode = params.mode as string
  const code = params.code as string[] | undefined

  const [customization, setCustomization] = useState<PlayerCustomization>({
    alias: '',
    color: '',
    font: 'Federant',
    icon: 'black-chess-knight',
    joinCode: '',
  })

  // set a random initial color on first mount if not already set
  useEffect(() => {
    const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    setCustomization((c) => ({ ...c, color: c.color || randomColor() }))
  }, [])

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
    // TODO: Save customization and navigate to next page
    console.log('Starting with:', customization)
    if (mode === 'host') {
      // Generate 8-char join code
      const generatedCode = await db.generateJoinCode()
      setJoinCode(generatedCode)
      setCustomization((c) => ({ ...c, joinCode: generatedCode }))
      // Create party
      await db.createParty(generatedCode)
      // Add host player
      const player: PlayerSchema = {
        id: makeId(),
        alias: customization.alias,
        icon: customization.icon as IconName,
        font: customization.font as FontName,
        color: customization.color,
        joinedAt: Date.now(),
      }
      await db.addPlayerToParty(generatedCode, player)
      // Navigate to party
      router.push(`/party/${generatedCode}`)
    } else if (mode === 'join') {
      const enteredCode = customization.joinCode || ''
      // Validate code
      const party = await db.getParty(enteredCode)
      if (!party) {
        alert('Invalid join code')
        return
      }
      setJoinCode(enteredCode)
      // Add player
      const player: PlayerSchema = {
        id: makeId(),
        alias: customization.alias,
        icon: customization.icon as IconName,
        font: customization.font as FontName,
        color: customization.color,
        joinedAt: Date.now(),
      }
      await db.addPlayerToParty(enteredCode, player)
      // Navigate to party
      router.push(`/party/${enteredCode}`)
    } else if (mode === 'solo') {
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

  const mutedBg = hexToRGBA(buttonColor, 0.12)

  const aliasPreviewText = customization.alias || 'My Nickname'

  return (
    <div className={styles.container} style={{ background: mutedBg }}>
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
              <div className={styles.fontDropdown}>
                <div className={styles.fontDropdownSelected} onClick={() => document.getElementById('font-dropdown-list')?.classList.toggle('active')}>
                  <span style={{ fontFamily: customization.font }}>{customization.font}</span>
                  <span className={styles.dropdownArrow}>▼</span>
                </div>
                <div id="font-dropdown-list" className={styles.fontDropdownList}>
                  {AVAILABLE_FONTS.map((font) => (
                    <div
                      key={font}
                      className={styles.fontDropdownItem}
                      onClick={() => {
                        setCustomization({ ...customization, font })
                        document.getElementById('font-dropdown-list')?.classList.remove('active')
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
