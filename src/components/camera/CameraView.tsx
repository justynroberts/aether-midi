// MIT License - Copyright (c) fintonlabs.com
import { useEffect, useRef } from 'react'
import { useEngineStore } from '../../state/useEngineStore'
import type { Landmark } from '../../types'

// MediaPipe hand landmark connections (pairs of indices)
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>
  landmarks: Landmark[] | null
}

export function CameraView({ videoRef, landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const status = useEngineStore((s) => s.status)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks) return

    const w = canvas.width
    const h = canvas.height

    // Draw connections
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)'
    ctx.lineWidth = 1.5
    for (const [a, b] of CONNECTIONS) {
      const lA = landmarks[a]
      const lB = landmarks[b]
      if (!lA || !lB) continue
      ctx.beginPath()
      ctx.moveTo(lA.x * w, lA.y * h)
      ctx.lineTo(lB.x * w, lB.y * h)
      ctx.stroke()
    }

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i]
      const isTip = [4, 8, 12, 16, 20].includes(i)
      ctx.beginPath()
      ctx.arc(lm.x * w, lm.y * h, isTip ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = isTip ? '#00ff88' : 'rgba(0,255,136,0.6)'
      ctx.fill()
    }
  }, [landmarks, videoRef])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
      />
      {status === 'no-hand' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[var(--text-dim)] bg-black/60 px-3 py-1 rounded-full">
          No hand detected
        </div>
      )}
    </div>
  )
}
