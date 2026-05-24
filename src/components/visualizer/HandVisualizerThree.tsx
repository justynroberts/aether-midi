// MIT License - Copyright (c) fintonlabs.com
import { useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../state/useAppStore'
import { useEngineStore } from '../../state/useEngineStore'
import type { TrackedHand } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]
const TIPS      = [4, 8, 12, 16, 20]
const PALM_LMS  = [0, 5, 9, 13, 17]
const TRAIL_LEN = 40
const MAX_SPARKS = 300
const MAX_WAVES  = 6

const HAND_COLOR: Record<'left'|'right', THREE.Color> = {
  right: new THREE.Color('#00ff88'),
  left:  new THREE.Color('#aa55ff'),
}

const CC_NAMES: Record<number, string> = {
  1:'Mod', 2:'Breath', 7:'Vol', 10:'Pan', 11:'Expr',
  64:'Sus', 71:'Res', 72:'Rel', 73:'Atk', 74:'Cutoff',
  76:'VibRate', 77:'VibDep', 91:'Reverb', 92:'Trem',
  93:'Chorus', 94:'Detune', 95:'Phaser',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lx = (x: number) => (1 - x) * 4 - 2
const ly = (y: number) => -(y * 4 - 2)
const lz = (z: number) => z * 12

function makeGlowTexture(color: string): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0,    color)
  grad.addColorStop(0.25, color + 'cc')
  grad.addColorStop(0.6,  color + '44')
  grad.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

interface HandMeshProps {
  handsRef: React.MutableRefObject<TrackedHand[]>
  handedness: 'left' | 'right'
}

// ─── HandMesh — skeleton · joints · glow · trails · sparks ───────────────────

function HandMesh({ handsRef, handedness }: HandMeshProps) {
  const color    = HAND_COLOR[handedness]
  const hexColor = handedness === 'right' ? '#00ff88' : '#aa55ff'
  const groupRef = useRef<THREE.Group>(null)

  const skelGeo = useRef(new THREE.BufferGeometry())
  const skelBuf = useRef(new Float32Array(CONNECTIONS.length * 2 * 3))

  const jointRef = useRef<THREE.InstancedMesh>(null)
  const dummy    = useRef(new THREE.Object3D())
  const jointGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), [])
  const jointMat = useMemo(() => new THREE.MeshBasicMaterial({
    color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
  }), [color])

  const glowBuf = useRef(new Float32Array(21 * 3))
  const glowGeo = useRef(new THREE.BufferGeometry())
  const glowTex = useMemo(() => makeGlowTexture(hexColor), [hexColor])
  const glowMat = useMemo(() => new THREE.PointsMaterial({
    map: glowTex, size: 0.45, sizeAttenuation: true,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }), [glowTex])

  const trailGroup = useRef<THREE.Group>(null)
  const trailGeos  = useRef<THREE.BufferGeometry[]>([])
  const trailBufs  = useRef<Float32Array[]>([])
  const trailRing  = useRef<Array<Array<[number,number,number]>>>(TIPS.map(() => []))

  const sparkGeo  = useRef(new THREE.BufferGeometry())
  const sparkBuf  = useRef(new Float32Array(MAX_SPARKS * 3))
  const sparkTex  = useMemo(() => makeGlowTexture(hexColor), [hexColor])
  const sparks    = useRef<{x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number}[]>([])
  const prevPinch = useRef(1)

  useEffect(() => {
    skelGeo.current.setAttribute('position', new THREE.BufferAttribute(skelBuf.current, 3))
    glowGeo.current.setAttribute('position', new THREE.BufferAttribute(glowBuf.current, 3))
    sparkGeo.current.setAttribute('position', new THREE.BufferAttribute(sparkBuf.current, 3))
    sparkGeo.current.setDrawRange(0, 0)

    const tg = trailGroup.current
    if (!tg) return
    TIPS.forEach(() => {
      const geo = new THREE.BufferGeometry()
      const buf = new Float32Array(TRAIL_LEN * 3)
      geo.setAttribute('position', new THREE.BufferAttribute(buf, 3))
      geo.setDrawRange(0, 0)
      trailGeos.current.push(geo)
      trailBufs.current.push(buf)
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })
      tg.add(new THREE.Line(geo, mat))
    })
  }, [color])

  useFrame(() => {
    const hand = handsRef.current.find(h => h.handedness === handedness)

    // Tick sparks regardless of hand visibility
    {
      const attr = sparkGeo.current.attributes.position as THREE.BufferAttribute
      let si = 0
      for (let j = sparks.current.length - 1; j >= 0; j--) {
        const p = sparks.current[j]
        p.x += p.vx; p.y += p.vy; p.z += p.vz
        p.vy -= 0.003; p.life -= 0.022
        if (p.life <= 0) { sparks.current.splice(j, 1); continue }
        if (si < MAX_SPARKS) {
          sparkBuf.current[si*3]   = p.x
          sparkBuf.current[si*3+1] = p.y
          sparkBuf.current[si*3+2] = p.z
          si++
        }
      }
      attr.needsUpdate = true
      sparkGeo.current.setDrawRange(0, si)
    }

    if (groupRef.current) groupRef.current.visible = !!hand
    if (!hand) {
      trailGeos.current.forEach(g => g.setDrawRange(0, 0))
      trailRing.current.forEach(b => (b.length = 0))
      return
    }

    const lms = hand.landmarks

    // Skeleton
    const sa = skelGeo.current.attributes.position as THREE.BufferAttribute
    CONNECTIONS.forEach(([a, b], i) => {
      sa.setXYZ(i*2,   lx(lms[a].x), ly(lms[a].y), lz(lms[a].z))
      sa.setXYZ(i*2+1, lx(lms[b].x), ly(lms[b].y), lz(lms[b].z))
    })
    sa.needsUpdate = true

    // Joints + glow
    const ga = glowGeo.current.attributes.position as THREE.BufferAttribute
    const im = jointRef.current
    lms.forEach((lm, i) => {
      const wx = lx(lm.x), wy = ly(lm.y), wz = lz(lm.z)
      ga.setXYZ(i, wx, wy, wz)
      if (im) {
        dummy.current.position.set(wx, wy, wz)
        dummy.current.scale.setScalar(TIPS.includes(i) ? 0.055 : 0.022)
        dummy.current.updateMatrix()
        im.setMatrixAt(i, dummy.current.matrix)
      }
    })
    ga.needsUpdate = true
    if (im) im.instanceMatrix.needsUpdate = true

    // Trails
    TIPS.forEach((tipIdx, i) => {
      const lm = lms[tipIdx]
      const ring = trailRing.current[i]
      ring.unshift([lx(lm.x), ly(lm.y), lz(lm.z)])
      if (ring.length > TRAIL_LEN) ring.length = TRAIL_LEN
      const buf = trailBufs.current[i]
      ring.forEach(([x,y,z], j) => { buf[j*3]=x; buf[j*3+1]=y; buf[j*3+2]=z })
      ;(trailGeos.current[i].attributes.position as THREE.BufferAttribute).needsUpdate = true
      trailGeos.current[i].setDrawRange(0, ring.length)
    })

    // Pinch sparks
    const pinch = hand.features.pinchDistance
    if (pinch < 0.08 && prevPinch.current >= 0.08 && sparks.current.length < 200) {
      const mx = (lx(lms[4].x) + lx(lms[8].x)) / 2
      const my = (ly(lms[4].y) + ly(lms[8].y)) / 2
      const mz = (lz(lms[4].z) + lz(lms[8].z)) / 2
      for (let j = 0; j < 28; j++) {
        const az = Math.random() * Math.PI * 2
        const el = (Math.random() - 0.5) * Math.PI
        const sp = Math.random() * 0.06 + 0.015
        sparks.current.push({
          x: mx, y: my, z: mz,
          vx: Math.cos(az)*Math.cos(el)*sp,
          vy: Math.sin(el)*sp + 0.014,
          vz: Math.sin(az)*Math.cos(el)*sp,
          life: 1,
        })
      }
    }
    prevPinch.current = pinch
  })

  return (
    <group ref={groupRef}>
      <lineSegments geometry={skelGeo.current}>
        <lineBasicMaterial
          color={color} transparent opacity={0.5}
          blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
        />
      </lineSegments>
      <instancedMesh ref={jointRef} args={[jointGeo, jointMat, 21]} />
      <points geometry={glowGeo.current} material={glowMat} />
      <group ref={trailGroup} />
      <points geometry={sparkGeo.current}>
        <pointsMaterial
          map={sparkTex} size={0.12} sizeAttenuation transparent
          blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
        />
      </points>
    </group>
  )
}

// ─── PinchBeam — particle line between thumb tip and index tip ────────────────

function PinchBeam({ handsRef, handedness }: HandMeshProps) {
  const hexColor = handedness === 'right' ? '#00ff88' : '#aa55ff'
  const BEAM_PTS = 30
  const geo     = useRef(new THREE.BufferGeometry())
  const buf     = useRef(new Float32Array(BEAM_PTS * 3))
  const ptsRef  = useRef<THREE.Points>(null)
  const tex     = useMemo(() => makeGlowTexture(hexColor), [hexColor])

  useEffect(() => {
    geo.current.setAttribute('position', new THREE.BufferAttribute(buf.current, 3))
    geo.current.setDrawRange(0, 0)
  }, [])

  useFrame(() => {
    const hand = handsRef.current.find(h => h.handedness === handedness)
    const pts  = ptsRef.current
    if (!pts) return
    if (!hand) { pts.visible = false; return }
    pts.visible = true

    const lms = hand.landmarks
    const ax = lx(lms[4].x), ay = ly(lms[4].y), az = lz(lms[4].z)
    const bx = lx(lms[8].x), by = ly(lms[8].y), bz = lz(lms[8].z)
    const pinch     = hand.features.pinchDistance
    const intensity = Math.max(0, 1 - pinch / 0.2)

    for (let i = 0; i < BEAM_PTS; i++) {
      const t       = i / (BEAM_PTS - 1)
      const scatter = (1 - intensity) * 0.05 + 0.008
      buf.current[i*3]   = ax + (bx - ax) * t + (Math.random() - 0.5) * scatter
      buf.current[i*3+1] = ay + (by - ay) * t + (Math.random() - 0.5) * scatter
      buf.current[i*3+2] = az + (bz - az) * t + (Math.random() - 0.5) * scatter
    }
    ;(geo.current.attributes.position as THREE.BufferAttribute).needsUpdate = true
    geo.current.setDrawRange(0, BEAM_PTS)

    const mat = pts.material as THREE.PointsMaterial
    mat.opacity = intensity * 0.9
    mat.size    = 0.035 + intensity * 0.09
  })

  return (
    <points ref={ptsRef} geometry={geo.current} visible={false}>
      <pointsMaterial
        map={tex} size={0.035} sizeAttenuation transparent opacity={0}
        blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
      />
    </points>
  )
}

// ─── PalmAura — soft glow that expands as the hand opens ─────────────────────

function PalmAura({ handsRef, handedness }: HandMeshProps) {
  const hexColor = handedness === 'right' ? '#00ff88' : '#aa55ff'
  const geo     = useRef(new THREE.BufferGeometry())
  const buf     = useRef(new Float32Array(3))
  const ptsRef  = useRef<THREE.Points>(null)
  const tex     = useMemo(() => makeGlowTexture(hexColor), [hexColor])

  useEffect(() => {
    geo.current.setAttribute('position', new THREE.BufferAttribute(buf.current, 3))
    geo.current.setDrawRange(0, 1)
  }, [])

  useFrame(() => {
    const hand = handsRef.current.find(h => h.handedness === handedness)
    const pts  = ptsRef.current
    if (!pts) return
    if (!hand) { pts.visible = false; return }
    pts.visible = true

    let px = 0, py = 0, pz = 0
    PALM_LMS.forEach(i => {
      px += lx(hand.landmarks[i].x)
      py += ly(hand.landmarks[i].y)
      pz += lz(hand.landmarks[i].z)
    })
    px /= PALM_LMS.length; py /= PALM_LMS.length; pz /= PALM_LMS.length
    buf.current[0] = px; buf.current[1] = py; buf.current[2] = pz
    ;(geo.current.attributes.position as THREE.BufferAttribute).needsUpdate = true

    const openness = hand.features.openHand ?? 0
    const mat = pts.material as THREE.PointsMaterial
    mat.size    = 0.5 + openness * 3.2
    mat.opacity = 0.07 + openness * 0.3
  })

  return (
    <points ref={ptsRef} geometry={geo.current} visible={false}>
      <pointsMaterial
        map={tex} size={0.5} sizeAttenuation transparent opacity={0.07}
        blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
      />
    </points>
  )
}

// ─── OrbitRings — two torus rings rotating around the wrist ──────────────────

function OrbitRings({ handsRef, handedness }: HandMeshProps) {
  const color    = HAND_COLOR[handedness]
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<THREE.Mesh[]>([])
  const geo      = useMemo(() => new THREE.TorusGeometry(0.22, 0.005, 6, 64), [])

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: i === 0 ? 0.55 : 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })
      const m = new THREE.Mesh(geo, mat)
      m.visible = false
      g.add(m)
      meshRefs.current.push(m)
    }
  }, [color, geo])

  useFrame(({ clock }) => {
    const hand = handsRef.current.find(h => h.handedness === handedness)
    const t    = clock.getElapsedTime()

    meshRefs.current.forEach((mesh, i) => {
      if (!hand) { mesh.visible = false; return }
      mesh.visible = true
      const w    = hand.landmarks[0]
      const roll = hand.features.wristRoll ?? 0
      mesh.position.set(lx(w.x), ly(w.y), lz(w.z))
      mesh.rotation.x = t * (0.55 + i * 0.35) + roll * 0.5
      mesh.rotation.y = t * (0.38 + i * 0.22)
      mesh.rotation.z = roll * 1.3 + i * 1.1
    })
  })

  return <group ref={groupRef} />
}

// ─── WavePulses — expanding ring burst on fist open/close ────────────────────

interface Wave { x: number; y: number; z: number; r: number; life: number }

function WavePulses({ handsRef, handedness }: HandMeshProps) {
  const color    = HAND_COLOR[handedness]
  const groupRef = useRef<THREE.Group>(null)
  const poolRef  = useRef<THREE.Mesh[]>([])
  const waves    = useRef<Wave[]>([])
  const prevFist = useRef(0)

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    const geo = new THREE.RingGeometry(1, 1.07, 56)
    for (let i = 0; i < MAX_WAVES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, toneMapped: false,
      })
      const m = new THREE.Mesh(geo, mat)
      m.visible = false
      g.add(m)
      poolRef.current.push(m)
    }
  }, [color])

  useFrame(() => {
    const hand = handsRef.current.find(h => h.handedness === handedness)

    if (hand) {
      const fist = hand.features.fistClosure ?? 0
      const trigger = (fist > 0.72 && prevFist.current <= 0.72) ||
                      (fist < 0.28 && prevFist.current >= 0.28)
      if (trigger && waves.current.length < MAX_WAVES) {
        const w = hand.landmarks[0]
        waves.current.push({ x: lx(w.x), y: ly(w.y), z: lz(w.z), r: 0.12, life: 1 })
      }
      prevFist.current = fist
    }

    waves.current = waves.current.filter(w => w.life > 0)
    waves.current.forEach((w, i) => {
      w.r    += 0.055
      w.life -= 0.025
      const m = poolRef.current[i]
      if (!m) return
      m.visible = true
      m.position.set(w.x, w.y, w.z)
      m.scale.setScalar(w.r)
      ;(m.material as THREE.MeshBasicMaterial).opacity = w.life * 0.5
    })
    for (let i = waves.current.length; i < MAX_WAVES; i++) {
      if (poolRef.current[i]) poolRef.current[i].visible = false
    }
  })

  return <group ref={groupRef} />
}

// ─── ReactiveGrid — background grid that warps near hands ────────────────────

function ReactiveGrid({ handsRef }: { handsRef: React.MutableRefObject<TrackedHand[]> }) {
  const COLS  = 24
  const ROWS  = 14
  const count = COLS * ROWS
  const geo   = useRef(new THREE.BufferGeometry())
  const buf   = useRef(new Float32Array(count * 3))
  const base  = useRef(new Float32Array(count * 3))

  useEffect(() => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        base.current[i*3]   = (c / (COLS - 1)) * 7.5 - 3.75
        base.current[i*3+1] = (r / (ROWS - 1)) * 4.8 - 2.4
        base.current[i*3+2] = -2.8
      }
    }
    buf.current.set(base.current)
    geo.current.setAttribute('position', new THREE.BufferAttribute(buf.current, 3))
  }, [])

  useFrame(({ clock }) => {
    const t     = clock.getElapsedTime()
    const hands = handsRef.current

    for (let i = 0; i < count; i++) {
      const bx = base.current[i*3]
      const by = base.current[i*3+1]
      let dx = 0, dy = 0

      for (const hand of hands) {
        const wx = lx(hand.landmarks[0].x)
        const wy = ly(hand.landmarks[0].y)
        const d2 = (bx - wx) ** 2 + (by - wy) ** 2
        if (d2 < 5) {
          const dist = Math.sqrt(d2)
          const wave = Math.sin(t * 2.2 - dist * 2.8) * 0.5
          const str  = Math.max(0, 1 - dist / 2.2) * 0.18 * wave
          dx += (bx - wx) / (dist + 0.01) * str
          dy += (by - wy) / (dist + 0.01) * str
        }
      }

      buf.current[i*3]   = bx + dx
      buf.current[i*3+1] = by + dy
    }
    ;(geo.current.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points geometry={geo.current}>
      <pointsMaterial
        size={0.018} color="#3355aa" transparent opacity={0.2}
        sizeAttenuation toneMapped={false} depthWrite={false}
      />
    </points>
  )
}

// ─── CCBarsOverlay — live MIDI values with CC names ──────────────────────────

function CCBarsOverlay() {
  const macros  = useAppStore(s => s.macros)
  const enabled = macros.filter(m => m.enabled)
  const fillRefs = useRef<(HTMLDivElement | null)[]>([])
  const valRefs  = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    let id: number
    function tick() {
      const hands = useEngineStore.getState().hands
      enabled.forEach((m, i) => {
        const fillEl = fillRefs.current[i]
        const valEl  = valRefs.current[i]
        if (!fillEl) return
        const target = m.mapping.hand ?? 'any'
        const hand   = target === 'any' ? hands[0] : hands.find(h => h.handedness === target)
        const raw    = hand?.features?.[m.mapping.feature] ?? 0
        const pct    = Math.min(1, Math.max(0, (raw - m.mapping.minVal) / (m.mapping.maxVal - m.mapping.minVal)))
        const midi   = Math.round(pct * (m.mapping.midiMax - m.mapping.midiMin) + m.mapping.midiMin)
        fillEl.style.height = `${pct * 100}%`
        if (valEl) valEl.textContent = String(midi)
      })
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled.map(m => m.id).join(',')])

  if (enabled.length === 0) return null

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-row-reverse gap-3 pointer-events-none">
      {enabled.map((m, i) => (
        <div key={m.id} className="flex flex-col items-center gap-1">
          <span
            ref={el => { valRefs.current[i] = el }}
            className="text-[10px] mono font-medium tabular-nums"
            style={{ color: m.color }}
          >0</span>
          <div
            className="relative w-2 rounded-full overflow-hidden"
            style={{ height: 180, background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              ref={el => { fillRefs.current[i] = el }}
              className="absolute bottom-0 w-full rounded-full transition-none"
              style={{
                height: 0,
                background: m.color,
                boxShadow: `0 0 10px ${m.color}, 0 0 3px ${m.color}`,
              }}
            />
          </div>
          <span className="text-[9px] mono text-white/35">{m.mapping.ccNumber}</span>
          {CC_NAMES[m.mapping.ccNumber] && (
            <span className="text-[8px] text-white/22" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              {CC_NAMES[m.mapping.ccNumber]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface Props { hands: TrackedHand[] }

export function HandVisualizerThree({ hands }: Props) {
  const handsRef = useRef<TrackedHand[]>([])
  handsRef.current = hands

  const status = useEngineStore(s => s.status)

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl" style={{ background: '#03050a' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#03050a']} />

        <Stars radius={90} depth={60} count={4000} factor={5} fade speed={0.4} />

        <ReactiveGrid handsRef={handsRef} />

        <HandMesh   handsRef={handsRef} handedness="right" />
        <HandMesh   handsRef={handsRef} handedness="left"  />
        <PinchBeam  handsRef={handsRef} handedness="right" />
        <PinchBeam  handsRef={handsRef} handedness="left"  />
        <PalmAura   handsRef={handsRef} handedness="right" />
        <PalmAura   handsRef={handsRef} handedness="left"  />
        <OrbitRings handsRef={handsRef} handedness="right" />
        <OrbitRings handsRef={handsRef} handedness="left"  />
        <WavePulses handsRef={handsRef} handedness="right" />
        <WavePulses handsRef={handsRef} handedness="left"  />
      </Canvas>

      <CCBarsOverlay />

      {status === 'no-hand' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/20 pointer-events-none tracking-widest uppercase">
          Show your hand
        </div>
      )}
    </div>
  )
}
