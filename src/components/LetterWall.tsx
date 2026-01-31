"use client"

import React, { useEffect, useRef } from "react"
import styles from "./LetterWall.module.scss"

const LETTERS = "abcdefghijklmnopqrstuvwxyz"

export default function LetterWall() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext("2d")!
    let raf = 0
    let mouse = { x: -9999, y: -9999 }

    function resize() {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Generate grid positions with a random letter per cell
    let positions: { x: number; y: number; char: string }[] = []
    function generatePositions() {
      const rect = container.getBoundingClientRect()
      const spacing = Math.max(18, Math.floor(rect.width / 36))
      positions = []
      for (let y = spacing / 2; y < rect.height; y += spacing) {
        for (let x = spacing / 2; x < rect.width; x += spacing) {
          positions.push({ x, y, char: LETTERS[Math.floor(Math.random() * LETTERS.length)] })
        }
      }
    }

    function onMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    function onLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }

    let lastTime = performance.now()
    function draw(now: number) {
      const rect = container.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)

      // background subtle
      ctx.fillStyle = "rgba(0,0,0,0)"
      ctx.fillRect(0, 0, w, h)

      const maxRadius = Math.min(w, h) * 0.35
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i]
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.max(0, (maxRadius - dist) / maxRadius)

        const baseSize = 12
        const size = baseSize + influence * 28
        const grey = Math.round(150 + influence * 105) // 150..255
        const alpha = 0.25 + influence * 0.9

        ctx.font = `${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI"`
        ctx.fillStyle = `rgba(${grey},${grey},${grey},${alpha})`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(p.char, p.x, p.y)
      }

      // subtle vignette/border effect handled by CSS

      raf = requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      generatePositions()
    })

    resizeObserver.observe(container)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseout", onLeave)
    window.addEventListener("blur", onLeave)
    window.addEventListener("resize", resize)

    resize()
    generatePositions()
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseout", onLeave)
      window.removeEventListener("blur", onLeave)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className={styles.panel} ref={containerRef} aria-hidden>
      <canvas className={styles.canvas} ref={canvasRef} />
    </div>
  )
}
