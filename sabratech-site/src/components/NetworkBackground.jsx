import { useEffect, useRef } from 'react'

// Ambient "network of talent" backdrop: drifting nodes joined by hairlines,
// gently repelled by the cursor. Sits behind all content, never interactive.
const NAVY = '40,49,94'
const CYAN = '0,165,224'

export default function NetworkBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches

    let w = 0, h = 0, dpr = 1
    let nodes = []
    let raf = 0
    const mouse = { x: -9999, y: -9999 }

    const LINK = 150            // px: max distance a hairline is drawn
    const REPEL = 130           // px: cursor influence radius

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // ~1 node per 18k px², clamped so phones stay light and 4K stays sane
      const count = Math.round(Math.min(Math.max((w * h) / 18000, 26), 90))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 1.1,
        accent: Math.random() < 0.28,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d > LINK) continue
          ctx.strokeStyle = `rgba(${NAVY},${(1 - d / LINK) * 0.08})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = n.accent ? `rgba(${CYAN},0.21)` : `rgba(${NAVY},0.15)`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const step = () => {
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy

        if (finePointer) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < REPEL && d > 0.01) {
            const push = (1 - d / REPEL) * 0.6
            n.x += (dx / d) * push
            n.y += (dy / d) * push
          }
        }

        if (n.x < -20) n.x = w + 20
        if (n.x > w + 20) n.x = -20
        if (n.y < -20) n.y = h + 20
        if (n.y > h + 20) n.y = -20
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(step) }
    const stop = () => { cancelAnimationFrame(raf); raf = 0 }

    const onResize = () => { build(); reduced ? draw() : null }
    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }
    const onVis = () => (document.hidden ? stop() : start())

    build()
    if (reduced) draw()
    else start()

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    if (finePointer && !reduced) {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerleave', onLeave)
    }

    return () => {
      stop()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
