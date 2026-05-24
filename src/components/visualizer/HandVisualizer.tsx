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
const TRAIL_LEN = 32
const STAR_COUNT = 100

interface Particle { x:number; y:number; vx:number; vy:number; life:number; color:string; size:number }
interface Star { x:number; y:number; r:number; phase:number; speed:number }

interface Props { landmarks: Landmark[] | null }

export function HandVisualizer({ landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)

  // Live refs — updated every render, read inside the loop without restarting it
  const landmarksRef = useRef<Landmark[] | null>(null)
  const macrosRef    = useRef(useAppStore.getState().macros)
  const featuresRef  = useRef(useEngineStore.getState().features)

  landmarksRef.current = landmarks
  useEffect(() => useAppStore.subscribe(s => { macrosRef.current = s.macros }), [])
  useEffect(() => useEngineStore.subscribe(s => { featuresRef.current = s.features }), [])

  const status = useEngineStore(s => s.status)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const sparks: Particle[] = []
    const stars: Star[] = []
    const trails = new Map<number, Array<{x:number;y:number}>>()
    let phase = 0
    let prevPinch = 1
    let W = 0, H = 0

    function resize() {
      W = canvas!.offsetWidth
      H = canvas!.offsetHeight
      canvas!.width  = W * devicePixelRatio
      canvas!.height = H * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      // Reinit stars to fill new size
      stars.length = 0
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({ x: Math.random()*W, y: Math.random()*H,
          r: Math.random()*1.3+0.3, phase: Math.random()*Math.PI*2,
          speed: Math.random()*0.018+0.005 })
      }
    }

    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)
    resize()

    function draw() {
      if (!canvas || W === 0) { animRef.current = requestAnimationFrame(draw); return }

      const lms   = landmarksRef.current
      const macros  = macrosRef.current
      const features = featuresRef.current
      phase += 0.016

      // Background
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--viz-bg').trim() || '#06080f'
      ctx.fillRect(0, 0, W, H)

      // Stars
      const wristX = lms ? (1 - lms[0].x) * W : W/2
      const wristY = lms ? lms[0].y * H : H/2
      for (const st of stars) {
        st.phase += st.speed
        if (lms) {
          const dx = wristX - st.x, dy = wristY - st.y
          if (dx*dx+dy*dy < 40000) { st.x += dx*0.0005; st.y += dy*0.0005 }
        }
        const a = 0.15 + Math.sin(st.phase) * 0.12
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill()
      }

      if (!lms || lms.length < 21) {
        drawGhost(ctx, W, H, phase)
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const lx = (l: Landmark) => (1-l.x)*W
      const ly = (l: Landmark) => l.y*H

      // Trails
      for (const tip of TIPS) {
        if (!trails.has(tip)) trails.set(tip, [])
        const trail = trails.get(tip)!
        trail.unshift({ x: lx(lms[tip]), y: ly(lms[tip]) })
        if (trail.length > TRAIL_LEN) trail.length = TRAIL_LEN
      }
      for (const [tipIdx, trail] of trails) {
        const rgb = tipIdx === 4 ? '255,102,68' : '0,255,136'
        for (let i = 1; i < trail.length; i++) {
          const a = (1 - i/trail.length) * 0.6
          ctx.beginPath()
          ctx.moveTo(trail[i-1].x, trail[i-1].y)
          ctx.lineTo(trail[i].x, trail[i].y)
          ctx.strokeStyle = `rgba(${rgb},${a})`
          ctx.lineWidth = (1 - i/trail.length) * 4
          ctx.stroke()
        }
      }

      // Sparks on pinch
      const pinch = features?.pinchDistance ?? 1
      if (pinch < 0.1 && prevPinch >= 0.1 && sparks.length < 200) {
        const mx = (lx(lms[4]) + lx(lms[8])) / 2
        const my = (ly(lms[4]) + ly(lms[8])) / 2
        for (let i = 0; i < 30; i++) {
          const angle = Math.random()*Math.PI*2
          const speed = Math.random()*5+1.5
          sparks.push({ x:mx, y:my, vx:Math.cos(angle)*speed,
            vy:Math.sin(angle)*speed-2, life:1,
            color: Math.random()>0.5 ? '#00ff88' : '#ffcc00',
            size: Math.random()*2.5+0.8 })
        }
      }
      prevPinch = pinch

      for (let i = sparks.length-1; i >= 0; i--) {
        const p = sparks[i]
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=0.03
        if (p.life <= 0) { sparks.splice(i,1); continue }
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.shadowColor = p.color; ctx.shadowBlur = 8
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill()
        ctx.restore()
      }

      // Skeleton
      ctx.save(); ctx.shadowColor='#00ff88'; ctx.shadowBlur=10
      ctx.strokeStyle='rgba(0,255,136,0.35)'; ctx.lineWidth=1.5
      for (const [a,b] of CONNECTIONS) {
        ctx.beginPath(); ctx.moveTo(lx(lms[a]),ly(lms[a])); ctx.lineTo(lx(lms[b]),ly(lms[b])); ctx.stroke()
      }
      ctx.restore()
      for (let i=0; i<lms.length; i++) {
        const tip = TIPS.includes(i)
        ctx.save(); if(tip){ctx.shadowColor='#00ff88';ctx.shadowBlur=18}
        ctx.beginPath(); ctx.arc(lx(lms[i]),ly(lms[i]),tip?5.5:2.5,0,Math.PI*2)
        ctx.fillStyle = tip ? '#00ff88' : 'rgba(0,255,136,0.5)'; ctx.fill(); ctx.restore()
      }

      // CC bars (right rail)
      const enabled = macros.filter(m => m.enabled)
      const bH = H*0.55, bY = (H-bH)/2, gap=14, bW=6
      enabled.forEach((m, i) => {
        const raw = features ? features[m.mapping.feature] : 0
        const pct = Math.min(1,Math.max(0,(raw-m.mapping.minVal)/(m.mapping.maxVal-m.mapping.minVal)))
        const bx = W-20-i*gap
        ctx.fillStyle='rgba(255,255,255,0.05)'
        ctx.beginPath(); ctx.roundRect(bx,bY,bW,bH,3); ctx.fill()
        if (pct>0) {
          ctx.save(); ctx.shadowColor=m.color; ctx.shadowBlur=7
          ctx.fillStyle=m.color
          ctx.beginPath(); ctx.roundRect(bx,bY+bH*(1-pct),bW,bH*pct,3); ctx.fill()
          ctx.restore()
        }
        ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='9px JetBrains Mono,monospace'
        ctx.textAlign='center'; ctx.fillText(`${m.mapping.ccNumber}`,bx+bW/2,bY+bH+14)
      })

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, []) // runs once — live data via refs

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl" style={{background:'var(--viz-bg)'}}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {status === 'no-hand' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/25 pointer-events-none">
          Show your hand
        </div>
      )}
    </div>
  )
}

function drawGhost(ctx: CanvasRenderingContext2D, W:number, H:number, phase:number) {
  const a = 0.04 + Math.sin(phase)*0.02
  ctx.strokeStyle=`rgba(255,255,255,${a})`; ctx.lineWidth=1
  const cx=W/2, cy=H/2+40, sc=Math.min(W,H)*0.25
  const p:[number,number][] = [
    [0,0],[-0.15,-0.3],[-0.25,-0.55],[-0.28,-0.72],[-0.3,-0.85],
    [-0.08,-0.6],[-0.08,-0.82],[-0.08,-0.96],[-0.08,-1.1],
    [0.05,-0.62],[0.05,-0.85],[0.05,-1.0],[0.05,-1.15],
    [0.18,-0.58],[0.18,-0.78],[0.18,-0.92],[0.18,-1.05],
    [0.3,-0.5],[0.3,-0.66],[0.3,-0.78],[0.3,-0.88],
  ]
  for (const [a,b] of CONNECTIONS) {
    if(!p[a]||!p[b]) continue
    ctx.beginPath(); ctx.moveTo(cx+p[a][0]*sc,cy+p[a][1]*sc)
    ctx.lineTo(cx+p[b][0]*sc,cy+p[b][1]*sc); ctx.stroke()
  }
}
