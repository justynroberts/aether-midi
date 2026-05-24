// MIT License - Copyright (c) fintonlabs.com
import { useEngineStore } from '../../state/useEngineStore'
import { useAppStore } from '../../state/useAppStore'

const MIDI_HELP: Record<string, string> = {
  unavailable: 'Web MIDI not supported — use Chrome',
  denied: 'MIDI access denied — check browser permissions',
  'no-ports': 'No MIDI ports — on Mac: Audio MIDI Setup → IAC Driver → enable',
  ready: 'Select a port above',
  sending: '',
}

export function Footer() {
  const { fps, inferenceMs, lastMidiActivity, midiStatus } = useEngineStore()
  const { showDebug, selectedPortId } = useAppStore()

  const midiActive = Date.now() - lastMidiActivity < 200
  const dotColor =
    midiActive ? 'bg-[var(--accent)]' :
    selectedPortId ? 'bg-[var(--blue)]' :
    midiStatus === 'no-ports' || midiStatus === 'denied' || midiStatus === 'unavailable' ? 'bg-[var(--red)]' :
    'bg-[var(--muted)]'

  const helpText = !selectedPortId && midiStatus !== 'sending' ? MIDI_HELP[midiStatus] : ''

  return (
    <footer className="flex items-center justify-between px-4 h-9 border-t border-[var(--border)] bg-[var(--surface)] shrink-0 text-xs text-[var(--text-dim)] mono gap-3">
      <div className="flex items-center gap-4">
        {showDebug && (
          <>
            <span>{fps} fps</span>
            <span>{inferenceMs.toFixed(1)} ms</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {helpText && (
          <span className="text-[var(--red)] text-[10px] not-mono font-sans">{helpText}</span>
        )}
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${dotColor}`} />
        <span>MIDI {midiActive ? 'TX' : midiStatus === 'sending' ? 'ready' : midiStatus}</span>
      </div>
    </footer>
  )
}
