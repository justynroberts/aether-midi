// MIT License - Copyright (c) fintonlabs.com
import { useEffect } from 'react'

const isWindows = navigator.userAgent.includes('Windows')

interface Step {
  n: number
  title: string
  body: string
  code?: string
  img?: string  // ascii art hint
}

const MAC_STEPS: Step[] = [
  {
    n: 1,
    title: 'Open Audio MIDI Setup',
    body: 'Open Terminal and run this command:',
    code: 'open -a "Audio MIDI Setup"',
  },
  {
    n: 2,
    title: 'Show MIDI Studio',
    body: 'In the menu bar at the top of your screen click:',
    code: 'Window → Show MIDI Studio',
    img: [
      '┌─ Audio MIDI Setup ──────────────┐',
      '│ File  Edit  Window  Help        │',
      '│              ↓                  │',
      '│       Show MIDI Studio  ⌘1     │',
      '└─────────────────────────────────┘',
    ].join('\n'),
  },
  {
    n: 3,
    title: 'Enable IAC Driver',
    body: 'In MIDI Studio, double-click the IAC Driver icon (may be red = offline):',
    img: [
      '  ╔═══════════╗',
      '  ║  IAC      ║  ← double-click this',
      '  ║  Driver   ║',
      '  ╚═══════════╝',
      '',
      '  ☑ Device is online   ← tick this',
      '  [   Apply   ]        ← then click',
    ].join('\n'),
  },
  {
    n: 4,
    title: 'Reload & select port',
    body: 'Reload this page. "IAC Bus 1" will appear in the port selector above.',
  },
]

const WIN_STEPS: Step[] = [
  {
    n: 1,
    title: 'Download loopMIDI',
    body: 'loopMIDI is a free virtual MIDI cable for Windows by Tobias Erichsen.',
    code: 'tobias-erichsen.de/software/loopmidi.html',
  },
  {
    n: 2,
    title: 'Install & open loopMIDI',
    body: 'Run the installer. Open loopMIDI from the Start menu.',
  },
  {
    n: 3,
    title: 'Create a port',
    body: 'Type a name (e.g. "AetherMIDI") and click the + button:',
    img: [
      '  ┌─ loopMIDI ──────────────────┐',
      '  │  Port name: AetherMIDI      │',
      '  │  [+]  ← click to create     │',
      '  │                             │',
      '  │  ● AetherMIDI  (running)    │',
      '  └─────────────────────────────┘',
    ].join('\n'),
  },
  {
    n: 4,
    title: 'Reload & select port',
    body: 'Reload this page. Your loopMIDI port will appear in the selector above.',
  },
]

interface Props {
  onClose: () => void
}

export function MidiHelpModal({ onClose }: Props) {
  const steps = isWindows ? WIN_STEPS : MAC_STEPS
  const os = isWindows ? 'Windows' : 'macOS'
  const downloadUrl = 'https://www.tobias-erichsen.de/software/loopmidi.html'

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-semibold">MIDI Setup — {os}</h2>
            <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
              {isWindows ? 'Install a virtual MIDI port' : 'Enable the built-in IAC Driver'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-lg"
          >×</button>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {steps.map(step => (
            <div key={step.n} className="flex gap-3">
              {/* Number */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {step.n}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1">{step.title}</p>
                <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{step.body}</p>

                {step.code && (
                  <div className="mt-2 flex items-center gap-2">
                    <code
                      className="flex-1 text-[11px] px-3 py-1.5 rounded-lg mono"
                      style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
                    >
                      {step.code}
                    </code>
                    {step.n === 1 && !isWindows && (
                      <button
                        onClick={() => navigator.clipboard.writeText(step.code!)}
                        className="text-[10px] px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors shrink-0"
                      >
                        Copy
                      </button>
                    )}
                    {isWindows && step.n === 1 && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-1.5 rounded-lg shrink-0 transition-colors"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                      >
                        Download
                      </a>
                    )}
                  </div>
                )}

                {step.img && (
                  <pre
                    className="mt-2 text-[10px] p-3 rounded-lg leading-relaxed overflow-x-auto"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', fontFamily: 'monospace' }}
                  >
                    {step.img}
                  </pre>
                )}
              </div>
            </div>
          ))}

          {/* IAC missing fallback */}
          {!isWindows && (
            <details className="mt-1">
              <summary className="text-[11px] text-[var(--text-dim)] cursor-pointer hover:text-[var(--text)] transition-colors">
                IAC Driver icon is missing from MIDI Studio?
              </summary>
              <div className="mt-2 pl-3 border-l-2 border-[var(--border)]">
                <p className="text-[11px] text-[var(--text-dim)] mb-2">
                  Reset the CoreMIDI daemon — run this in Terminal:
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 text-[11px] px-3 py-1.5 rounded-lg mono"
                    style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
                  >
                    pkill coremidid
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText('pkill coremidid')}
                    className="text-[10px] px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  Wait 5 seconds, then re-open Audio MIDI Setup → Window → Show MIDI Studio.
                </p>
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted)]">Press Esc to close</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  )
}
