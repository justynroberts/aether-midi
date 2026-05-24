// MIT License - Copyright (c) fintonlabs.com
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onGranted: () => void
}

export function PermissionsGate({ onGranted }: Props) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function requestPermissions() {
    setStatus('requesting')
    setErrorMsg('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API unavailable — page must be served over HTTPS (Chrome or Edge required).')
      }
      await navigator.mediaDevices.getUserMedia({ video: true })

      // Web MIDI — optional, continue without it
      if (navigator.requestMIDIAccess) {
        try {
          await navigator.requestMIDIAccess({ sysex: false })
        } catch {
          // MIDI denied — non-fatal, app works without output
        }
      }

      onGranted()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied'
      setErrorMsg(msg)
      setStatus('error')
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 flex flex-col items-center gap-6 max-w-sm w-full text-center"
      >
        <div className="text-4xl">✋</div>
        <div>
          <h1 className="text-xl font-semibold mb-1">Aether MIDI</h1>
          <p className="text-sm text-[var(--text-dim)]">
            Webcam hand tracking to MIDI controller. Camera access required to begin.
          </p>
        </div>

        {errorMsg && (
          <p className="text-xs text-[var(--red)] bg-red-950/30 border border-red-900/40 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          onClick={requestPermissions}
          disabled={status === 'requesting'}
          className="btn-primary w-full"
        >
          {status === 'requesting' ? 'Requesting...' : 'Enable Camera + MIDI'}
        </button>

        <p className="text-xs text-[var(--muted)]">
          Video is processed locally — never uploaded.
        </p>
      </motion.div>
    </div>
  )
}
