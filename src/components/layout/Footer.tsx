// MIT License - Copyright (c) fintonlabs.com
import { useEngineStore } from '../../state/useEngineStore'
import { useAppStore } from '../../state/useAppStore'

export function Footer() {
  const { fps, inferenceMs, lastMidiActivity } = useEngineStore()
  const showDebug = useAppStore((s) => s.showDebug)

  const midiActive = Date.now() - lastMidiActivity < 200

  return (
    <footer className="flex items-center justify-between px-4 h-9 border-t border-[var(--border)] bg-[var(--surface)] shrink-0 text-xs text-[var(--text-dim)] mono">
      <div className="flex items-center gap-4">
        {showDebug && (
          <>
            <span>{fps} fps</span>
            <span>{inferenceMs.toFixed(1)} ms</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            midiActive ? 'bg-accent' : 'bg-[var(--muted)]'
          }`}
        />
        <span>MIDI</span>
      </div>
    </footer>
  )
}
