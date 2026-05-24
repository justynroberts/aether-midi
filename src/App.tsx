// MIT License - Copyright (c) fintonlabs.com
import { useEffect, useRef, useState } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'
import { CameraView } from './components/camera/CameraView'
import { HandVisualizer } from './components/visualizer/HandVisualizer'
import { PermissionsGate } from './components/permissions/PermissionsGate'
import { useAppStore } from './state/useAppStore'
import { useEngineStore } from './state/useEngineStore'
import type { Landmark } from './types'

export default function App() {
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { setAvailablePorts, theme, viewMode } = useAppStore()
  const { setStatus, setFeatures, setPerf, markMidiActivity, setMidiStatus } = useEngineStore()

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
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
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
          setFeatures(null)
          setLandmarks(null)
          loop()
          return
        }

        setStatus('running')
        const lms = result.landmarks[0] as Landmark[]
        setLandmarks(lms)

        // Extract hand features
        const features = extractFeatures(lms)
        setFeatures(features)

        // Send MIDI for enabled macros
        if (midiOutput) {
          const activeMacros = useAppStore.getState().macros.filter((m) => m.enabled)
          for (const macro of activeMacros) {
            const raw = features[macro.mapping.feature]
            const k = macro.id
            const prev = smoothed[k] ?? raw
            const alpha = 1 - macro.mapping.smoothing
            smoothed[k] = prev + alpha * (raw - prev)

            const pct = Math.min(
              1,
              Math.max(
                0,
                (smoothed[k] - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
              )
            )
            const midiVal = Math.round(
              pct * (macro.mapping.midiMax - macro.mapping.midiMin) + macro.mapping.midiMin
            )
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
    return <PermissionsGate onGranted={() => setPermissionsGranted(true)} />
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 p-4 overflow-hidden">
          {/* Video always in DOM — MediaPipe needs it; hidden in visualizer mode */}
          <div className={viewMode === 'camera' ? 'w-full h-full' : 'absolute opacity-0 pointer-events-none w-px h-px overflow-hidden'}>
            <CameraView videoRef={videoRef} landmarks={landmarks} />
          </div>
          {viewMode === 'visualizer' && (
            <HandVisualizer landmarks={landmarks} />
          )}
        </main>
      </div>
      <Footer />
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

function extractFeatures(lms: Landmark[]) {
  const wrist = lms[0]
  const thumbTip = lms[4]
  const indexTip = lms[8]
  const indexPip = lms[6]
  const indexMcp = lms[5]
  const middleTip = lms[12]
  const middlePip = lms[10]
  const middleMcp = lms[9]
  const ringTip = lms[16]
  const ringPip = lms[14]
  const ringMcp = lms[13]
  const pinkyTip = lms[20]
  const pinkyPip = lms[18]
  const pinkyMcp = lms[17]
  const thumbIp = lms[3]
  const thumbMcp = lms[2]

  const pinchDistance = Math.min(1, dist(thumbTip, indexTip) / 0.3)
  const spreadAmount = Math.min(1, (dist(indexTip, pinkyTip) / 0.5))
  const indexCurl = curl(indexTip, indexPip, indexMcp)
  const middleCurl_ = curl(middleTip, middlePip, middleMcp)
  const ringCurl = curl(ringTip, ringPip, ringMcp)
  const pinkyCurl = curl(pinkyTip, pinkyPip, pinkyMcp)
  const thumbCurl = curl(thumbTip, thumbIp, thumbMcp)
  const fistClosure = (indexCurl + middleCurl_ + ringCurl + pinkyCurl) / 4

  return {
    pinchDistance,
    spreadAmount,
    wristY: wrist.y,
    wristX: wrist.x,
    indexCurl,
    middleCurl: middleCurl_,
    ringCurl,
    pinkyCurl,
    thumbCurl,
    fistClosure,
  }
}
