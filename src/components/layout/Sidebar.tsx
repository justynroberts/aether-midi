// MIT License - Copyright (c) fintonlabs.com
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../state/useAppStore'
import { useEngineStore } from '../../state/useEngineStore'
import type { Macro, MacroMapping, FeatureKey } from '../../types'

const FEATURE_LABELS: Record<FeatureKey, string> = {
  pinchDistance: 'Pinch (thumb–index)',
  spreadAmount: 'Spread (finger fan)',
  wristY: 'Wrist Height',
  wristX: 'Wrist Position (L/R)',
  indexCurl: 'Index Finger Curl',
  middleCurl: 'Middle Finger Curl',
  ringCurl: 'Ring Finger Curl',
  pinkyCurl: 'Pinky Curl',
  thumbCurl: 'Thumb Curl',
  fistClosure: 'Fist Close',
}

const COLORS = ['#00ff88', '#00aaff', '#ff6644', '#ffcc00', '#cc44ff', '#ff44aa', '#44ffcc']

export function Sidebar() {
  const { macros, toggleMacro, addMacro } = useAppStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <aside className="flex flex-col w-72 border-r border-[var(--border)] bg-[var(--surface)] shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[10px] font-medium text-[var(--text-dim)] uppercase tracking-widest">Macros</span>
        <button
          onClick={addMacro}
          className="text-xs text-[var(--accent)] hover:text-[var(--accent)]/80 font-medium px-2 py-0.5 rounded hover:bg-[var(--accent-dim)] transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {macros.map((macro) => (
            <MacroRow
              key={macro.id}
              macro={macro}
              isEditing={editingId === macro.id}
              onToggle={toggleMacro}
              onEditToggle={(id) => setEditingId((prev) => (prev === id ? null : id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </aside>
  )
}

interface MacroRowProps {
  macro: Macro
  isEditing: boolean
  onToggle: (id: string) => void
  onEditToggle: (id: string) => void
}

function MacroRow({ macro, isEditing, onToggle, onEditToggle }: MacroRowProps) {
  const features = useEngineStore((s) => s.features)
  const { updateMacro, deleteMacro } = useAppStore()

  const raw = features ? features[macro.mapping.feature] : 0
  const pct = Math.min(1, Math.max(0,
    (raw - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
  ))
  const midiValue = Math.round(pct * (macro.mapping.midiMax - macro.mapping.midiMin) + macro.mapping.midiMin)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`card overflow-hidden transition-opacity ${macro.enabled ? '' : 'opacity-50'}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        {/* Color dot */}
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: macro.color }} />

        <span className="text-xs font-medium truncate flex-1">{macro.label}</span>

        {/* CC value */}
        <span className="text-[10px] mono text-[var(--text-dim)] shrink-0">
          CC{macro.mapping.ccNumber} <span className="text-[var(--text)]">{midiValue}</span>
        </span>

        {/* Edit toggle */}
        <button
          onClick={() => onEditToggle(macro.id)}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
            isEditing ? 'text-[var(--accent)] bg-[var(--accent-dim)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          {isEditing ? '✕' : '✎'}
        </button>

        {/* Enable toggle */}
        <button
          onClick={() => onToggle(macro.id)}
          className={`w-7 h-4 rounded-full relative transition-colors shrink-0 ${
            macro.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
          }`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-transform ${
              macro.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Live CC bar */}
      <div className="px-3 pb-2.5 flex items-center gap-2">
        <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: macro.color }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.04 }}
          />
        </div>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <MacroEditor
              macro={macro}
              onUpdate={(patch) => updateMacro(macro.id, patch)}
              onDelete={() => deleteMacro(macro.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface MacroEditorProps {
  macro: Macro
  onUpdate: (patch: Partial<Macro>) => void
  onDelete: () => void
}

function MacroEditor({ macro, onUpdate, onDelete }: MacroEditorProps) {
  const features = useEngineStore((s) => s.features)
  const [calibrating, setCalibrating] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const calibMin = useRef(Infinity)
  const calibMax = useRef(-Infinity)

  function updateMapping(patch: Partial<MacroMapping>) {
    onUpdate({ mapping: { ...macro.mapping, ...patch } })
  }

  function startCalibrate() {
    calibMin.current = Infinity
    calibMax.current = -Infinity
    setCalibrating(true)
    setCountdown(3)
  }

  useEffect(() => {
    if (!calibrating) return
    if (countdown <= 0) {
      setCalibrating(false)
      const min = calibMin.current === Infinity ? 0 : calibMin.current
      const max = calibMax.current === -Infinity ? 1 : calibMax.current
      updateMapping({ minVal: +min.toFixed(3), maxVal: +max.toFixed(3) })
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [calibrating, countdown])

  // Record min/max during calibration
  useEffect(() => {
    if (!calibrating || !features) return
    const v = features[macro.mapping.feature]
    if (v < calibMin.current) calibMin.current = v
    if (v > calibMax.current) calibMax.current = v
  }, [calibrating, features, macro.mapping.feature])

  return (
    <div className="border-t border-[var(--border)] px-3 py-3 flex flex-col gap-3">
      {/* Label */}
      <div>
        <p className="field-label">Label</p>
        <input
          type="text"
          value={macro.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full text-xs"
          style={{ width: '100%' }}
        />
      </div>

      {/* Feature */}
      <div>
        <p className="field-label">Gesture</p>
        <select
          value={macro.mapping.feature}
          onChange={(e) => updateMapping({ feature: e.target.value as FeatureKey })}
          className="w-full text-xs"
          style={{ width: '100%' }}
        >
          {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((k) => (
            <option key={k} value={k}>{FEATURE_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* CC + Channel */}
      <div className="flex gap-3">
        <div>
          <p className="field-label">CC #</p>
          <input
            type="number"
            min={0} max={127}
            value={macro.mapping.ccNumber}
            onChange={(e) => updateMapping({ ccNumber: +e.target.value })}
          />
        </div>
        <div>
          <p className="field-label">Channel</p>
          <input
            type="number"
            min={1} max={16}
            value={macro.mapping.channel}
            onChange={(e) => updateMapping({ channel: +e.target.value })}
          />
        </div>
      </div>

      {/* Input range + calibrate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="field-label mb-0">Input Range</p>
          <button
            onClick={startCalibrate}
            disabled={calibrating}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              calibrating
                ? 'text-[var(--yellow)] bg-yellow-900/20 cursor-default'
                : 'text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]'
            }`}
          >
            {calibrating ? `● ${countdown}s — move hand` : '◎ Calibrate'}
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-[var(--text-dim)] w-5">Min</span>
          <input
            type="number"
            step={0.01} min={0} max={1}
            value={macro.mapping.minVal}
            onChange={(e) => updateMapping({ minVal: +e.target.value })}
          />
          <span className="text-[10px] text-[var(--text-dim)] w-5">Max</span>
          <input
            type="number"
            step={0.01} min={0} max={1}
            value={macro.mapping.maxVal}
            onChange={(e) => updateMapping({ maxVal: +e.target.value })}
          />
        </div>
      </div>

      {/* MIDI out range */}
      <div>
        <p className="field-label">MIDI Output</p>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-[var(--text-dim)] w-5">Min</span>
          <input
            type="number"
            min={0} max={127}
            value={macro.mapping.midiMin}
            onChange={(e) => updateMapping({ midiMin: +e.target.value })}
          />
          <span className="text-[10px] text-[var(--text-dim)] w-5">Max</span>
          <input
            type="number"
            min={0} max={127}
            value={macro.mapping.midiMax}
            onChange={(e) => updateMapping({ midiMax: +e.target.value })}
          />
        </div>
      </div>

      {/* Smoothing */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="field-label mb-0">Smoothing</p>
          <span className="text-[10px] mono text-[var(--text-dim)]">
            {Math.round(macro.mapping.smoothing * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0} max={0.95} step={0.05}
          value={macro.mapping.smoothing}
          onChange={(e) => updateMapping({ smoothing: +e.target.value })}
        />
      </div>

      {/* Color */}
      <div>
        <p className="field-label">Color</p>
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              className={`w-5 h-5 rounded-full transition-transform ${
                macro.color === c ? 'scale-125 ring-1 ring-white/40' : 'hover:scale-110'
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Delete */}
      <button onClick={onDelete} className="btn-danger text-xs self-start mt-1">
        Delete macro
      </button>
    </div>
  )
}
