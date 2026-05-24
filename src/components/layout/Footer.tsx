// MIT License - Copyright (c) fintonlabs.com
import { useState } from 'react'
import { useEngineStore } from '../../state/useEngineStore'
import { useAppStore } from '../../state/useAppStore'
import { MidiHelpModal } from '../midi/MidiHelpModal'

const isWindows = navigator.userAgent.includes('Windows')

const MIDI_HELP_TEXT: Record<string, string> = {
  unavailable: 'Web MIDI not supported — use Chrome or Edge',
  denied: 'MIDI access denied — check browser permissions',
  'no-ports': isWindows ? 'No MIDI ports — install loopMIDI' : 'No MIDI ports — enable IAC Driver',
  ready: 'Select a port above',
  sending: '',
}

export function Footer() {
  const { fps, inferenceMs, lastMidiActivity, midiStatus } = useEngineStore()
  const { showDebug, selectedPortId } = useAppStore()
  const [showHelp, setShowHelp] = useState(false)

  const midiActive = Date.now() - lastMidiActivity < 200
  const dotColor =
    midiActive ? 'bg-[var(--accent)]' :
    selectedPortId ? 'bg-[var(--blue)]' :
    midiStatus === 'no-ports' || midiStatus === 'denied' || midiStatus === 'unavailable' ? 'bg-[var(--red)]' :
    'bg-[var(--muted)]'

  const helpText = !selectedPortId && midiStatus !== 'sending' ? MIDI_HELP_TEXT[midiStatus] ?? '' : ''

  return (
    <>
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
          <span className="text-[var(--red)] text-[10px] not-mono font-sans flex items-center gap-1.5">
            {helpText}
            {midiStatus === 'no-ports' && (
              <button
                onClick={() => setShowHelp(true)}
                className="underline cursor-pointer hover:text-white transition-colors not-mono font-sans"
              >
                Fix
              </button>
            )}
          </span>
        )}
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${dotColor}`} />
        <span>MIDI {midiActive ? 'TX' : midiStatus === 'sending' ? 'ready' : midiStatus}</span>
      </div>
    </footer>
    {showHelp && <MidiHelpModal onClose={() => setShowHelp(false)} />}
  </>
  )
}
