// MIT License - Copyright (c) fintonlabs.com
import { useEffect, useRef } from 'react'
import { useEngineStore } from '../../state/useEngineStore'
import { useAppStore } from '../../state/useAppStore'
import type { Landmark } from '../../types'

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]
const TIPS = [4, 8, 12, 16, 20]
const TRAIL_LEN = 28
const MAX_SPARKS = 180
const STAR_COUNT = 90

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
interface Star { x: number; y: number; r: number; phase: number; speed: number }
type Trail = Array<{ x: number; y: number }>

interface Props { landmarks: Landmark[] | null }

export function HandVisualizer({ landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const stateRef = useRef({
    sparks: [] as Particle[],
    stars: null as Star[] | null,
    trails: new Map<number, Trail>(),
    prevPinch: 1,
    phase: 0,
  })

  const status = useEngineStore((s) => s.status)
  const macros = useAppStore((s) => s.macros)
  const features = useEngineStore((s) => s.features)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      if (!canvas) return
      const dpr = window.devicePixelRatio
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stateRef.current.stars = null // reinit stars on resize
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      if (!canvas) return
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      const s = stateRef.current

      // Background
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--viz-bg').trim() || '#06080f'
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, W, H)

      // Init stars once
      if (!s.stars) {
        s.stars = Array.from({ length: STAR_COUNT }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.4 + 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.005,
        }))
      }

      s.phase += 0.016

      // Draw stars
      const wristX = landmarks ? (1 - landmarks[0].x) * W : W / 2
      const wristY = landmarks ? landmarks[0].y * H : H / 2
      for (const star of s.stars) {
        star.phase += star.speed
        const twinkle = 0.3 + Math.sin(star.phase) * 0.3
        // Drift toward wrist when hand is present
        if (landmarks) {
          const dx = wristX - star.x
          const dy = wristY - star.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200) {
            star.x += dx * 0.0004
            star.y += dy * 0.0004
          }
        }
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.4})`
        ctx.fill()
      }

      if (!landmarks || landmarks.length < 21) {
        drawGhost(ctx, W, H, s.phase)
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const lx = (lm: Landmark) => (1 - lm.x) * W
      const ly = (lm: Landmark) => lm.y * H

      // --- Trails ---
      for (const tip of TIPS) {
        if (!s.trails.has(tip)) s.trails.set(tip, [])
        const trail = s.trails.get(tip)!
        trail.unshift({ x: lx(landmarks[tip]), y: ly(landmarks[tip]) })
        if (trail.length > TRAIL_LEN) trail.length = TRAIL_LEN
      }
      for (const [tipIdx, trail] of s.trails) {
        const color = tipIdx === 4 ? '#ff6644' : '#00ff88'
        for (let i = 1; i < trail.length; i++) {
          const alpha = (1 - i / trail.length) * 0.55
          const width = (1 - i / trail.length) * 3.5
          ctx.beginPath()
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
          ctx.lineTo(trail[i].x, trail[i].y)
          ctx.strokeStyle = color.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#', 'rgba(').replace('rgba(00ff88', 'rgba(0,255,136,').replace('rgba(ff6644', 'rgba(255,102,68,')
          ctx.lineWidth = width
          ctx.stroke()
        }
      }

      // --- Sparks on pinch ---
      const pinch = features?.pinchDistance ?? 1
      if (pinch < 0.12 && s.prevPinch >= 0.12 && s.sparks.length < MAX_SPARKS) {
        const tx = lx(landmarks[4])
        const ty = ly(landmarks[4])
        const ix = lx(landmarks[8])
        const iy = ly(landmarks[8])
        const mx = (tx + ix) / 2
        const my = (ty + iy) / 2
        for (let i = 0; i < 28; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 4 + 1.5
          s.sparks.push({
            x: mx, y: my,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            life: 1,
            color: Math.random() > 0.5 ? '#00ff88' : '#ffcc00',
            size: Math.random() * 2.5 + 1,
          })
        }
      }
      s.prevPinch = pinch

      // Update + draw sparks
      for (let i = s.sparks.length - 1; i >= 0; i--) {
        const p = s.sparks[i]
        p.x += p.vx; p.y += p.vy
        p.vy += 0.12
        p.life -= 0.028
        if (p.life <= 0) { s.sparks.splice(i, 1); continue }
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.shadowColor = p.color; ctx.shadowBlur = 6
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // --- Skeleton ---
      ctx.save()
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8
      ctx.strokeStyle = 'rgba(0,255,136,0.3)'; ctx.lineWidth = 1.5
      for (const [a, b] of CONNECTIONS) {
        ctx.beginPath()
        ctx.moveTo(lx(landmarks[a]), ly(landmarks[a]))
        ctx.lineTo(lx(landmarks[b]), ly(landmarks[b]))
        ctx.stroke()
      }
      ctx.restore()

      // Joints
      for (let i = 0; i < landmarks.length; i++) {
        const isTip = TIPS.includes(i)
        const x = lx(landmarks[i]); const y = ly(landmarks[i])
        ctx.save()
        if (isTip) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 16 }
        ctx.beginPath()
        ctx.arc(x, y, isTip ? 5 : 2.5, 0, Math.PI * 2)
        ctx.fillStyle = isTip ? '#00ff88' : 'rgba(0,255,136,0.55)'
        ctx.fill()
        ctx.restore()
      }

      // --- CC bars ---
      if (features) {
        const enabledMacros = macros.filter((m) => m.enabled)
        const barW = 6; const barMaxH = H * 0.55
        const startY = (H - barMaxH) / 2
        const gap = 14
        enabledMacros.forEach((macro, i) => {
          const raw = features[macro.mapping.feature]
          const pct = Math.min(1, Math.max(0, (raw - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)))
          const bx = W - 20 - i * gap
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          ctx.beginPath(); ctx.roundRect(bx, startY, barW, barMaxH, 3); ctx.fill()
          if (pct > 0) {
            ctx.save(); ctx.shadowColor = macro.color; ctx.shadowBlur = 6
            ctx.fillStyle = macro.color
            ctx.beginPath(); ctx.roundRect(bx, startY + barMaxH * (1 - pct), barW, barMaxH * pct, 3); ctx.fill()
            ctx.restore()
          }
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center'
          ctx.fillText(`${macro.mapping.ccNumber}`, bx + barW / 2, startY + barMaxH + 14)
        })
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  }, [landmarks, macros, features])

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl" style={{ background: 'var(--viz-bg)' }}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {status === 'no-hand' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/25 pointer-events-none">
          Show your hand
        </div>
      )}
    </div>
  )
}

function drawGhost(ctx: CanvasRenderingContext2D, W: number, H: number, phase: number) {
  const alpha = 0.05 + Math.sin(phase) * 0.02
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`
  ctx.lineWidth = 1
  const cx = W / 2; const cy = H / 2 + 40; const scale = Math.min(W, H) * 0.25
  const pts: [number, number][] = [
    [0,0],[-0.15,-0.3],[-0.25,-0.55],[-0.28,-0.72],[-0.3,-0.85],
    [-0.08,-0.6],[-0.08,-0.82],[-0.08,-0.96],[-0.08,-1.1],
    [0.05,-0.62],[0.05,-0.85],[0.05,-1.0],[0.05,-1.15],
    [0.18,-0.58],[0.18,-0.78],[0.18,-0.92],[0.18,-1.05],
    [0.3,-0.5],[0.3,-0.66],[0.3,-0.78],[0.3,-0.88],
  ]
  for (const [a, b] of CONNECTIONS) {
    const la = pts[a]; const lb = pts[b]; if (!la || !lb) continue
    ctx.beginPath()
    ctx.moveTo(cx + la[0] * scale, cy + la[1] * scale)
    ctx.lineTo(cx + lb[0] * scale, cy + lb[1] * scale)
    ctx.stroke()
  }
}
