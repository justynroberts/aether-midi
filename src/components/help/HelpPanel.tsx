// MIT License - Copyright (c) fintonlabs.com
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onClose: () => void
}

const GESTURES: { name: string; key: string; desc: string }[] = [
  { key: 'wristY', name: 'Wrist Height', desc: 'Move hand up/down' },
  { key: 'wristX', name: 'Wrist Left/Right', desc: 'Move hand side to side' },
  { key: 'wristRoll', name: 'Wrist Roll', desc: 'Rotate forearm' },
  { key: 'pinchDistance', name: 'Pinch', desc: 'Bring thumb + index together' },
  { key: 'spreadAmount', name: 'Spread', desc: 'Fan fingers apart' },
  { key: 'fistClosure', name: 'Fist Closure', desc: 'Close/open fist' },
  { key: 'indexUp / middleUp / …', name: 'Individual Fingers', desc: '0 = curled, 1 = extended' },
  { key: 'onePointing', name: 'One Pointing', desc: 'Index finger extended only' },
  { key: 'peaceSign', name: 'Peace Sign', desc: 'Index + middle extended' },
  { key: 'threeFingers', name: 'Three Fingers', desc: 'Index, middle, ring extended' },
  { key: 'rockOn', name: 'Rock On', desc: 'Index + pinky extended' },
  { key: 'openHand', name: 'Open Hand', desc: 'All fingers extended' },
  { key: 'thumbsUp', name: 'Thumbs Up', desc: 'Thumb extended, others curled' },
]

const MIDI_CCS: { cc: number; name: string }[] = [
  { cc: 1, name: 'Mod Wheel' },
  { cc: 2, name: 'Breath' },
  { cc: 7, name: 'Volume' },
  { cc: 10, name: 'Pan' },
  { cc: 11, name: 'Expression' },
  { cc: 64, name: 'Sustain' },
  { cc: 71, name: 'Resonance / Filter Q' },
  { cc: 72, name: 'Release' },
  { cc: 73, name: 'Attack' },
  { cc: 74, name: 'Filter Cutoff' },
  { cc: 91, name: 'Reverb' },
  { cc: 93, name: 'Chorus' },
  { cc: 94, name: 'Detune' },
]

const SHORTCUTS: { key: string; desc: string }[] = [
  { key: 'D', desc: 'Toggle debug overlay (fps + latency)' },
  { key: 'Esc', desc: 'Close any modal' },
]

const TROUBLESHOOTING: { problem: string; fix: string }[] = [
  {
    problem: 'No MIDI ports shown',
    fix: 'Need IAC Driver (Mac) or loopMIDI (Windows). Click the ? in the footer for setup instructions.',
  },
  {
    problem: 'Hand not detected',
    fix: 'Ensure good lighting. Face a window. Avoid busy or patterned backgrounds.',
  },
  {
    problem: 'Web MIDI not available',
    fix: 'Use Chrome or Edge. Safari and Firefox do not support the Web MIDI API.',
  },
  {
    problem: 'Values jump around',
    fix: 'Increase Smoothing to 70-80% in the macro editor.',
  },
  {
    problem: 'Only reaches 0 or 127',
    fix: 'Use Calibrate in the macro editor to set the input range to match your movement.',
  },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <summary
      className="cursor-pointer select-none text-[11px] uppercase tracking-widest font-semibold py-2 flex items-center justify-between transition-colors"
      style={{ color: 'var(--text-dim)' }}
    >
      {children}
      <span className="text-[var(--muted)] font-normal text-xs normal-case tracking-normal">toggle</span>
    </summary>
  )
}

function Divider() {
  return <div className="border-t border-[var(--border)] my-1" />
}

export function HelpPanel({ onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        key="help-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      <motion.aside
        key="help-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col border-l overflow-hidden"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold">Help</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            aria-label="Close help panel"
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-sm">

          {/* Quick Start */}
          <details open>
            <SectionTitle>Quick Start</SectionTitle>
            <ol className="mt-2 flex flex-col gap-2 pl-1">
              {[
                'Allow camera + MIDI when prompted',
                'Pick a MIDI port at the top (IAC Driver on Mac, loopMIDI on Windows)',
                'Click Presets, install 30 starter patches, then load one',
                'Show your hand and move to control your DAW',
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </details>

          <Divider />

          {/* Gesture Reference */}
          <details open>
            <SectionTitle>Gesture Reference</SectionTitle>
            <div className="mt-2 flex flex-col gap-0.5">
              {GESTURES.map((g) => (
                <div
                  key={g.key}
                  className="flex items-start justify-between gap-2 py-1.5 border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] font-medium leading-snug">{g.name}</span>
                    <code
                      className="text-[10px] mono truncate"
                      style={{ color: 'var(--accent)' }}
                    >
                      {g.key}
                    </code>
                  </div>
                  <span
                    className="text-[11px] text-right shrink-0 leading-relaxed"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    {g.desc}
                  </span>
                </div>
              ))}
            </div>
          </details>

          <Divider />

          {/* Common MIDI CCs */}
          <details open>
            <SectionTitle>Common MIDI CCs</SectionTitle>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {MIDI_CCS.map(({ cc, name }) => (
                <div key={cc} className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] mono font-bold w-6 shrink-0"
                    style={{ color: 'var(--accent)' }}
                  >
                    {cc}
                  </span>
                  <span className="text-[11px] leading-snug" style={{ color: 'var(--text-dim)' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </details>

          <Divider />

          {/* Keyboard Shortcuts */}
          <details open>
            <SectionTitle>Keyboard Shortcuts</SectionTitle>
            <div className="mt-2 flex flex-col gap-2">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd
                    className="px-2 py-0.5 rounded text-[11px] font-mono border shrink-0"
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    {key}
                  </kbd>
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </details>

          <Divider />

          {/* Troubleshooting */}
          <details open>
            <SectionTitle>Troubleshooting</SectionTitle>
            <div className="mt-2 flex flex-col gap-3">
              {TROUBLESHOOTING.map(({ problem, fix }) => (
                <div
                  key={problem}
                  className="rounded-lg p-3 border"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <p className="text-[11px] font-medium mb-1">{problem}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    {fix}
                  </p>
                </div>
              ))}
            </div>
          </details>

          <Divider />

          {/* About */}
          <details open>
            <SectionTitle>About</SectionTitle>
            <div className="mt-2">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                Aether is built by Fintonlabs. We make tools for musicians, performers, and sound
                designers.
              </p>
              <p
                className="mt-2 text-[11px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                fintonlabs.com
              </p>
            </div>
          </details>

        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t shrink-0 flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Press Esc to close
          </p>
          <button onClick={onClose} className="btn-ghost text-xs py-1 px-3">
            Close
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
