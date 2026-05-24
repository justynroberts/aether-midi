// MIT License - Copyright (c) fintonlabs.com
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AetherWordmark } from '../brand/AetherLogo'

const STORAGE_KEY = 'aether-tour-v1'

interface Props {
  onDone: () => void
}

interface TooltipStep {
  kind: 'tooltip'
  index: number
  title: string
  body: string
  position: React.CSSProperties
  arrowSide: 'left' | 'right' | 'top' | 'bottom'
}

interface FullStep {
  kind: 'full'
  index: number
  title: string
  body: string
  cta: string
}

type Step = FullStep | TooltipStep

const STEPS: Step[] = [
  {
    kind: 'full',
    index: 0,
    title: 'Turn your hands into a MIDI controller',
    body: 'Point a camera at your hand — Aether tracks 21 landmarks at 60fps and maps your gestures to any MIDI CC. No hardware. No latency. Just gesture.',
    cta: 'Start Tour',
  },
  {
    kind: 'tooltip',
    index: 1,
    title: 'Your Macros',
    body: 'Each macro maps one gesture to one MIDI CC number. The live bar shows the current value in real time.',
    position: { left: 296, top: '50%' },
    arrowSide: 'left',
  },
  {
    kind: 'tooltip',
    index: 2,
    title: 'Presets',
    body: 'Load any of the 30 built-in patches instantly. Save, duplicate, and share your own with a single click.',
    position: { left: 296, top: '75%' },
    arrowSide: 'left',
  },
  {
    kind: 'tooltip',
    index: 3,
    title: '3D Visualizer',
    body: 'Your hand skeleton rendered live. Green = right hand, purple = left. The pinch beam, palm aura and orbit rings all react to your movement.',
    position: { right: 24, top: '50%' },
    arrowSide: 'right',
  },
  {
    kind: 'tooltip',
    index: 4,
    title: 'MIDI Output',
    body: 'Select your virtual MIDI port here. On Mac use IAC Driver, on Windows use loopMIDI. Click the ? in the footer if you need help.',
    position: { right: 24, top: 60 },
    arrowSide: 'top',
  },
  {
    kind: 'full',
    index: 5,
    title: "You're ready",
    body: 'Load a starter preset, hold your hand up, and move. Your DAW will follow.',
    cta: 'Open Presets',
  },
]

const TOTAL_TOOLTIP_STEPS = 4 // steps 1–4

function arrowStyle(side: TooltipStep['arrowSide']): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  }
  switch (side) {
    case 'left':
      return {
        ...base,
        left: -8,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        borderRight: '8px solid var(--surface)',
      }
    case 'right':
      return {
        ...base,
        right: -8,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        borderLeft: '8px solid var(--surface)',
      }
    case 'top':
      return {
        ...base,
        top: -8,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: '8px solid var(--surface)',
      }
    case 'bottom':
      return {
        ...base,
        bottom: -8,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid var(--surface)',
      }
  }
}

function tooltipTransform(step: TooltipStep): React.CSSProperties {
  // Anchor card to the correct side
  const base: React.CSSProperties = { position: 'fixed', zIndex: 60 }
  if ('right' in step.position && step.position.right !== undefined) {
    return {
      ...base,
      right: (step.position.right as number) + 8 + 288, // card width 288 + gap
      top: step.position.top,
      transform: typeof step.position.top === 'string' ? 'translateY(-50%)' : undefined,
    }
  }
  return {
    ...base,
    left: step.position.left as number,
    top: step.position.top,
    transform: typeof step.position.top === 'string' ? 'translateY(-50%)' : undefined,
  }
}

export function ProductTour({ onDone }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'done'
    } catch {
      return false
    }
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) return null

  const step = STEPS[stepIndex]

  function handleNext() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
    }
  }

  function handleSkip() {
    try { localStorage.setItem(STORAGE_KEY, 'done') } catch { /* ignore */ }
    setDone(true)
    onDone()
  }

  function handleDone() {
    try { localStorage.setItem(STORAGE_KEY, 'done') } catch { /* ignore */ }
    setDone(true)
    onDone()
  }

  return (
    <AnimatePresence mode="wait">
      {step.kind === 'full' ? (
        <motion.div
          key={`full-${step.index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="card w-full max-w-md mx-4 p-8 flex flex-col items-center text-center gap-6 shadow-2xl"
          >
            {step.index === 0 && (
              <div className="mb-2">
                <AetherWordmark />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <h1 className="text-xl font-semibold leading-snug">{step.title}</h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                {step.body}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={step.index === 0 ? handleNext : handleDone}
                className="btn-primary w-full text-sm py-2.5"
              >
                {step.cta} &rarr;
              </button>
              {step.index === 0 && (
                <button
                  onClick={handleSkip}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key={`tooltip-${step.index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50"
        >
          {/* Dim overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={handleSkip}
          />

          {/* Tooltip card */}
          <motion.div
            initial={{ opacity: 0, x: step.arrowSide === 'left' ? -12 : step.arrowSide === 'right' ? 12 : 0, y: step.arrowSide === 'top' ? -12 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            style={tooltipTransform(step)}
          >
            <div
              className="relative w-72 rounded-xl border p-5 shadow-2xl"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {/* Arrow */}
              <div style={arrowStyle(step.arrowSide)} />

              {/* Step counter */}
              <p
                className="text-[10px] font-mono mb-3 tracking-widest uppercase"
                style={{ color: 'var(--accent)' }}
              >
                {step.index} / {TOTAL_TOOLTIP_STEPS}
              </p>

              <h2 className="text-sm font-semibold mb-2">{step.title}</h2>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-dim)' }}>
                {step.body}
              </p>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleNext}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  Next &rarr;
                </button>
                <button
                  onClick={handleSkip}
                  className="text-[11px] transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
