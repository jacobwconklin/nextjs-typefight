'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.scss'

export default function Home() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Matrix-style falling letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = []

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100
    }

    const draw = () => {
      // Fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw letters
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)' // Faded green
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        ctx.fillText(text, x, y)

        // Reset drop to top randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  const handleNavigation = (mode: string) => {
    router.push(`/player/${mode}`)
  }

  const getTitleClassName = () => {
    if (hoveredButton === 'host') return styles.titleRed
    if (hoveredButton === 'join') return styles.titleBlue
    if (hoveredButton === 'solo') return styles.titlePurple
    return styles.title
  }

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.content}>
        <h1 className={getTitleClassName()}>TypeFight</h1>
        <div className={styles.navigation}>
          <button
            className={`${styles.navButton} ${styles.hostButton}`}
            onClick={() => handleNavigation('host')}
            onMouseEnter={() => setHoveredButton('host')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Host a game
          </button>
          <button
            className={`${styles.navButton} ${styles.joinButton}`}
            onClick={() => handleNavigation('join')}
            onMouseEnter={() => setHoveredButton('join')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Join a game
          </button>
          <button
            className={`${styles.navButton} ${styles.soloButton}`}
            onClick={() => handleNavigation('solo')}
            onMouseEnter={() => setHoveredButton('solo')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Play solo
          </button>
        </div>
      </div>
    </div>
  )
}
