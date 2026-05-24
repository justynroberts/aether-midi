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
const GRID_SPACING = 40

interface Props {
  landmarks: Landmark[] | null
}

export function HandVisualizer({ landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const status = useEngineStore((s) => s.status)
  const macros = useAppStore((s) => s.macros)
  const features = useEngineStore((s) => s.features)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let phase = 0

    function draw() {
      if (!canvas || !ctx) return
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      // Background
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--viz-bg').trim() || '#06080f'
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, W, H)

      // Subtle dot grid
      const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--viz-grid').trim() || 'rgba(255,255,255,0.025)'
      ctx.fillStyle = gridColor
      for (let x = GRID_SPACING; x < W; x += GRID_SPACING) {
        for (let y = GRID_SPACING; y < H; y += GRID_SPACING) {
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      phase += 0.02

      if (!landmarks || landmarks.length < 21) {
        // Ghost placeholder
        drawGhost(ctx, W, H, phase)
      } else {
        drawHand(ctx, W, H, landmarks, macros, features, phase)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [landmarks, macros, features])

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl" style={{ background: 'var(--viz-bg)' }}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {status === 'no-hand' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/30 bg-black/30 px-3 py-1 rounded-full pointer-events-none">
          Show your hand
        </div>
      )}
    </div>
  )
}

function drawGhost(ctx: CanvasRenderingContext2D, W: number, H: number, phase: number) {
  const alpha = 0.06 + Math.sin(phase) * 0.02
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`
  ctx.lineWidth = 1

  // Rough ghost hand silhouette at center
  const cx = W / 2
  const cy = H / 2 + 40
  const scale = Math.min(W, H) * 0.25

  const ghost: [number, number][] = [
    [0, 0],           // wrist
    [-0.15, -0.3],    // thumb base
    [-0.25, -0.55],
    [-0.28, -0.72],
    [-0.3, -0.85],    // thumb tip
    [-0.08, -0.6],    // index base
    [-0.08, -0.82],
    [-0.08, -0.96],
    [-0.08, -1.1],    // index tip
    [0.05, -0.62],
    [0.05, -0.85],
    [0.05, -1.0],
    [0.05, -1.15],    // middle tip
    [0.18, -0.58],
    [0.18, -0.78],
    [0.18, -0.92],
    [0.18, -1.05],    // ring tip
    [0.3, -0.5],
    [0.3, -0.66],
    [0.3, -0.78],
    [0.3, -0.88],     // pinky tip
  ]

  for (const [a, b] of CONNECTIONS) {
    const la = ghost[a]
    const lb = ghost[b]
    if (!la || !lb) continue
    ctx.beginPath()
    ctx.moveTo(cx + la[0] * scale, cy + la[1] * scale)
    ctx.lineTo(cx + lb[0] * scale, cy + lb[1] * scale)
    ctx.stroke()
  }
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  landmarks: Landmark[],
  macros: ReturnType<typeof useAppStore.getState>['macros'],
  features: ReturnType<typeof useEngineStore.getState>['features'],
  phase: number
) {
  // Mirror x (selfie-style)
  const lx = (lm: Landmark) => (1 - lm.x) * W
  const ly = (lm: Landmark) => lm.y * H

  const accent = '#00ff88'

  // Glow connections
  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 8
  ctx.strokeStyle = 'rgba(0,255,136,0.35)'
  ctx.lineWidth = 1.5
  for (const [a, b] of CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    ctx.beginPath()
    ctx.moveTo(lx(la), ly(la))
    ctx.lineTo(lx(lb), ly(lb))
    ctx.stroke()
  }
  ctx.restore()

  // Joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    const isTip = TIPS.includes(i)
    const x = lx(lm)
    const y = ly(lm)

    ctx.save()
    if (isTip) {
      ctx.shadowColor = accent
      ctx.shadowBlur = 14
    }
    ctx.beginPath()
    ctx.arc(x, y, isTip ? 5 : 2.5, 0, Math.PI * 2)
    ctx.fillStyle = isTip ? accent : 'rgba(0,255,136,0.55)'
    ctx.fill()
    ctx.restore()
  }

  // Per-macro feature indicators on the side
  if (!features) return
  const enabledMacros = macros.filter((m) => m.enabled)
  const barW = 6
  const barMaxH = H * 0.6
  const startY = (H - barMaxH) / 2
  const gap = 14

  enabledMacros.forEach((macro, i) => {
    const raw = features[macro.mapping.feature]
    const pct = Math.min(1, Math.max(0,
      (raw - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
    ))
    const bx = W - 20 - i * gap
    const filledH = pct * barMaxH

    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(bx, startY, barW, barMaxH, 3)
    ctx.fill()

    // Fill
    ctx.save()
    ctx.shadowColor = macro.color
    ctx.shadowBlur = 6
    ctx.fillStyle = macro.color
    ctx.beginPath()
    ctx.roundRect(bx, startY + barMaxH - filledH, barW, filledH, 3)
    ctx.fill()
    ctx.restore()

    // CC label
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${macro.mapping.ccNumber}`, bx + barW / 2, startY + barMaxH + 14)
  })

  // Wrist pulse ring (heartbeat)
  const wrist = landmarks[0]
  const pulseR = 8 + Math.sin(phase * 2) * 3
  ctx.save()
  ctx.strokeStyle = 'rgba(0,255,136,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(lx(wrist), ly(wrist), pulseR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
