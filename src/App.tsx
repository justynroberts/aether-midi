// MIT License - Copyright (c) fintonlabs.com
import { useEffect, useRef, useState } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'
import { CameraView } from './components/camera/CameraView'
import { HandVisualizerThree } from './components/visualizer/HandVisualizerThree'
import { PermissionsGate } from './components/permissions/PermissionsGate'
import { ProductTour } from './components/tour/ProductTour'
import { HelpPanel } from './components/help/HelpPanel'
import { useAppStore } from './state/useAppStore'
import { useEngineStore } from './state/useEngineStore'
import type { Landmark, TrackedHand } from './types'

export default function App() {
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const [trackedHands, setTrackedHands] = useState<TrackedHand[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { setAvailablePorts, theme, viewMode } = useAppStore()
  const { setStatus, setHands, setPerf, markMidiActivity, setMidiStatus } = useEngineStore()

  // Apply persisted theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Start camera and tracking once permissions are granted
  useEffect(() => {
    if (!permissionsGranted) return

    let animId: number
    let detector: import('@mediapipe/tasks-vision').HandLandmarker | null = null
    let midiOutput: MIDIOutput | null = null
    let frameCount = 0
    let fpsTimer = 0
    const smoothed: Record<string, number> = {}

    async function init() {
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Init MIDI
      if (!navigator.requestMIDIAccess) {
        setMidiStatus('unavailable')
      } else {
        try {
          const midi = await navigator.requestMIDIAccess({ sysex: false })

          function refreshPorts() {
            const ports = [...midi.outputs.values()].map((o) => ({
              id: o.id,
              name: o.name ?? o.id,
              manufacturer: o.manufacturer ?? undefined,
            }))
            setAvailablePorts(ports)
            setMidiStatus(ports.length === 0 ? 'no-ports' : 'ready')

            // Re-resolve current output after port list changes
            const currentId = useAppStore.getState().selectedPortId
            midiOutput = currentId ? (midi.outputs.get(currentId) ?? null) : null
          }

          refreshPorts()
          midi.onstatechange = refreshPorts

          // Keep midiOutput in sync when user picks a port
          useAppStore.subscribe(
            (s) => s.selectedPortId,
            (id) => { midiOutput = id ? (midi.outputs.get(id) ?? null) : null }
          )

          // Resolve immediately for current selection
          const initialId = useAppStore.getState().selectedPortId
          midiOutput = initialId ? (midi.outputs.get(initialId) ?? null) : null
        } catch {
          setMidiStatus('denied')
        }
      }

      // Load MediaPipe HandLandmarker
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      detector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      })

      setStatus('running')
      loop()
    }

    function loop() {
      animId = requestAnimationFrame((now) => {
        if (!detector || !videoRef.current || videoRef.current.readyState < 2) {
          loop()
          return
        }

        const t0 = performance.now()
        const result = detector.detectForVideo(videoRef.current, now)
        const inferenceMs = performance.now() - t0

        // FPS counter
        frameCount++
        if (now - fpsTimer >= 1000) {
          setPerf(frameCount, inferenceMs)
          frameCount = 0
          fpsTimer = now
        }

        if (!result.landmarks || result.landmarks.length === 0) {
          setStatus('no-hand')
          setHands([])
          setLandmarks(null)
          setTrackedHands([])
          loop()
          return
        }

        setStatus('running')

        // Build TrackedHand array — MediaPipe handedness is camera-mirrored, so flip labels
        const hands: TrackedHand[] = result.landmarks.map((lms, i) => {
          const raw = result.handednesses?.[i]?.[0]?.categoryName ?? 'Right'
          // Mirror flip: camera "Left" = user's right hand (video is mirrored)
          const handedness = (raw === 'Left' ? 'right' : 'left') as 'left' | 'right'
          return { landmarks: lms as Landmark[], handedness, features: extractFeatures(lms as Landmark[]) }
        })

        setHands(hands)
        setTrackedHands(hands)
        setLandmarks(hands[0].landmarks)

        // Send MIDI for enabled macros
        if (midiOutput) {
          const activeMacros = useAppStore.getState().macros.filter((m) => m.enabled)
          for (const macro of activeMacros) {
            const target = macro.mapping.hand ?? 'any'
            const hand = target === 'any' ? hands[0] : hands.find((h) => h.handedness === target)
            if (!hand) continue

            // Gesture filter — each active finger constraint contributes to confidence
            const gf = macro.mapping.gestureFilter
            let gestureConf = 1
            if (gf) {
              const f = hand.features
              const checks: number[] = []
              if (gf.thumb  !== 'any') checks.push(gf.thumb  === 'up' ? f.thumbUp  : f.thumbCurl)
              if (gf.index  !== 'any') checks.push(gf.index  === 'up' ? f.indexUp  : f.indexCurl)
              if (gf.middle !== 'any') checks.push(gf.middle === 'up' ? f.middleUp : f.middleCurl)
              if (gf.ring   !== 'any') checks.push(gf.ring   === 'up' ? f.ringUp   : f.ringCurl)
              if (gf.pinky  !== 'any') checks.push(gf.pinky  === 'up' ? f.pinkyUp  : f.pinkyCurl)
              if (checks.length) gestureConf = Math.min(...checks)
            }
            if (gestureConf < 0.3) continue   // gesture not active

            const raw = hand.features[macro.mapping.feature] * gestureConf
            const k = macro.id
            const prev = smoothed[k] ?? raw
            const alpha = 1 - macro.mapping.smoothing
            smoothed[k] = prev + alpha * (raw - prev)

            let pct = Math.min(
              1,
              Math.max(
                0,
                (smoothed[k] - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
              )
            )
            // Apply response curve: negative = logarithmic (slow start), positive = exponential (fast start)
            const c = macro.mapping.curve ?? 0
            if (c !== 0) {
              const exp = c > 0 ? 1 + c * 3 : 1 / (1 - c * 3)
              pct = Math.pow(pct, exp)
            }
            const midiVal = Math.min(127, Math.max(0, Math.round(
              pct * (macro.mapping.midiMax - macro.mapping.midiMin) + macro.mapping.midiMin
            )))
            const ch = (macro.mapping.channel - 1) & 0x0f
            midiOutput.send([0xb0 | ch, macro.mapping.ccNumber, midiVal])
            markMidiActivity()
          }
        }

        loop()
      })
    }

    init().catch((err) => {
      console.error('Init error', err)
      setStatus('error')
    })

    // Keyboard shortcut: D = toggle debug
    function onKey(e: KeyboardEvent) {
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey) {
        useAppStore.getState().toggleDebug()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKey)
      const stream = videoRef.current?.srcObject as MediaStream | null
      stream?.getTracks().forEach((t) => t.stop())
      detector?.close()
    }
  }, [permissionsGranted])

  if (!permissionsGranted) {
    return <PermissionsGate onGranted={() => { setPermissionsGranted(true); setShowTour(true) }} />
  }

  return (
    <div className="flex flex-col h-full">
      <Header onHelpOpen={() => setShowHelp(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 p-4 overflow-hidden h-full flex flex-col">
          <div className={viewMode === 'camera' ? 'w-full h-full' : 'absolute opacity-0 pointer-events-none w-px h-px overflow-hidden'}>
            <CameraView videoRef={videoRef} landmarks={landmarks} />
          </div>
          {viewMode === 'visualizer' && (
            <HandVisualizerThree hands={trackedHands} />
          )}
        </main>
      </div>
      <Footer />
      {showTour && <ProductTour onDone={() => setShowTour(false)} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function dist(a: Landmark, b: Landmark) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function curl(tip: Landmark, pip: Landmark, mcp: Landmark) {
  // Angle at PIP as proxy for curl (0=straight, 1=fully curled)
  const d1 = dist(tip, pip)
  const d2 = dist(pip, mcp)
  const d3 = dist(tip, mcp)
  const cosAngle = (d1 ** 2 + d2 ** 2 - d3 ** 2) / (2 * d1 * d2 + 1e-6)
  return Math.max(0, Math.min(1, 1 - (cosAngle + 1) / 2))
}

function clamp(v: number) { return Math.max(0, Math.min(1, v)) }

function extractFeatures(lms: Landmark[]) {
  const wrist    = lms[0]
  const thumbTip = lms[4], thumbIp = lms[3], thumbMcp = lms[2]
  const indexTip = lms[8], indexPip = lms[6], indexMcp = lms[5]
  const midTip   = lms[12], midPip = lms[10], midMcp = lms[9]
  const ringTip  = lms[16], ringPip = lms[14], ringMcp = lms[13]
  const pinkyTip = lms[20], pinkyPip = lms[18], pinkyMcp = lms[17]

  // Core
  const pinchDistance = clamp(dist(thumbTip, indexTip) / 0.3)
  const spreadAmount  = clamp(dist(indexTip, pinkyTip) / 0.5)
  const indexCurl  = curl(indexTip, indexPip, indexMcp)
  const middleCurl = curl(midTip,   midPip,   midMcp)
  const ringCurl   = curl(ringTip,  ringPip,  ringMcp)
  const pinkyCurl  = curl(pinkyTip, pinkyPip, pinkyMcp)
  const thumbCurl  = curl(thumbTip, thumbIp,  thumbMcp)
  const fistClosure = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4

  // Extension (inverse of curl, with sharper threshold)
  const indexUp  = clamp((1 - indexCurl)  * 1.4 - 0.2)
  const middleUp = clamp((1 - middleCurl) * 1.4 - 0.2)
  const ringUp   = clamp((1 - ringCurl)   * 1.4 - 0.2)
  const pinkyUp  = clamp((1 - pinkyCurl)  * 1.4 - 0.2)
  const thumbUp  = clamp((1 - thumbCurl)  * 1.4 - 0.2)

  const ext = (v: number) => v > 0.55 ? 1 : 0   // binary extended
  const cur = (v: number) => v < 0.45 ? 0 : 1   // binary curled (inverted)
  const fingersCount = (ext(indexUp) + ext(middleUp) + ext(ringUp) + ext(pinkyUp) + ext(thumbUp)) / 5

  // Wrist roll — angle of index→pinky MCP vector
  const dx = pinkyMcp.x - indexMcp.x
  const dy = pinkyMcp.y - indexMcp.y
  const wristRoll = clamp((Math.atan2(dy, dx) / Math.PI + 1) / 2)

  // Named gesture confidence
  const onePointing  = clamp(indexUp * cur(middleUp) * cur(ringUp) * cur(pinkyUp) * 1.5 - 0.2)
  const peaceSign    = clamp(Math.min(indexUp, middleUp) * cur(ringUp) * cur(pinkyUp) * 1.5 - 0.2)
  const threeFingers = clamp(Math.min(indexUp, middleUp, ringUp) * cur(pinkyUp) * 1.5 - 0.2)
  const rockOn       = clamp(Math.min(indexUp, pinkyUp) * cur(middleUp) * cur(ringUp) * 1.5 - 0.2)
  const openHand     = clamp((indexUp + middleUp + ringUp + pinkyUp + thumbUp) / 5 * 1.4 - 0.2)
  const thumbsUp     = clamp(thumbUp * cur(indexUp) * cur(middleUp) * cur(ringUp) * cur(pinkyUp) * 1.5 - 0.2)

  return {
    wristY: wrist.y, wristX: wrist.x, wristRoll,
    pinchDistance, spreadAmount,
    indexCurl, middleCurl, ringCurl, pinkyCurl, thumbCurl, fistClosure,
    indexUp, middleUp, ringUp, pinkyUp, thumbUp, fingersCount,
    onePointing, peaceSign, threeFingers, rockOn, openHand, thumbsUp,
  }
}
