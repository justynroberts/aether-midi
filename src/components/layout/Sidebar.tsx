// MIT License - Copyright (c) fintonlabs.com
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../state/useAppStore'
import { useEngineStore } from '../../state/useEngineStore'
import type { Macro, MacroMapping, Preset, FeatureKey, HandTarget, FingerState, GestureFilter } from '../../types'
import { STARTER_PATCHES } from '../../data/starterPatches'

// ─── Feature catalogue ──────────────────────────────────────────────────────

interface FeatureEntry { key: FeatureKey; label: string }
const FEATURE_GROUPS: { group: string; items: FeatureEntry[] }[] = [
  {
    group: 'Position',
    items: [
      { key: 'wristY',    label: 'Wrist Height' },
      { key: 'wristX',    label: 'Wrist L/R' },
      { key: 'wristRoll', label: 'Wrist Roll' },
    ],
  },
  {
    group: 'Distance',
    items: [
      { key: 'pinchDistance', label: 'Pinch (thumb–index)' },
      { key: 'spreadAmount',  label: 'Spread (finger fan)' },
    ],
  },
  {
    group: 'Curl  (0=open · 1=closed)',
    items: [
      { key: 'indexCurl',   label: 'Index Curl' },
      { key: 'middleCurl',  label: 'Middle Curl' },
      { key: 'ringCurl',    label: 'Ring Curl' },
      { key: 'pinkyCurl',   label: 'Pinky Curl' },
      { key: 'thumbCurl',   label: 'Thumb Curl' },
      { key: 'fistClosure', label: 'Fist Closure' },
    ],
  },
  {
    group: 'Extension  (0=closed · 1=open)',
    items: [
      { key: 'indexUp',      label: 'Index Up' },
      { key: 'middleUp',     label: 'Middle Up' },
      { key: 'ringUp',       label: 'Ring Up' },
      { key: 'pinkyUp',      label: 'Pinky Up' },
      { key: 'thumbUp',      label: 'Thumb Up' },
      { key: 'fingersCount', label: 'Fingers Count (÷5)' },
    ],
  },
  {
    group: 'Gestures',
    items: [
      { key: 'onePointing',  label: '☝ One Finger Pointing' },
      { key: 'peaceSign',    label: '✌ Peace Sign' },
      { key: 'threeFingers', label: '🤟 Three Fingers' },
      { key: 'rockOn',       label: '🤘 Rock On' },
      { key: 'openHand',     label: '🖐 Open Hand' },
      { key: 'thumbsUp',     label: '👍 Thumbs Up' },
    ],
  },
]

const FLAT_FEATURES: Record<FeatureKey, string> = Object.fromEntries(
  FEATURE_GROUPS.flatMap(g => g.items.map(i => [i.key, i.label]))
) as Record<FeatureKey, string>

const COLORS = ['#00ff88','#00aaff','#ff6644','#ffcc00','#cc44ff','#ff44aa','#44ffcc']

const CC_NAMES: Record<number, string> = {
  0:  'Bank Select', 1:  'Mod Wheel', 2:  'Breath', 4:  'Foot',
  5:  'Portamento', 7:  'Volume', 8:  'Balance', 10: 'Pan',
  11: 'Expression', 12: 'FX Ctrl 1', 13: 'FX Ctrl 2',
  64: 'Sustain', 65: 'Portamento', 66: 'Sostenuto', 67: 'Soft Pedal',
  71: 'Resonance', 72: 'Release', 73: 'Attack', 74: 'Cutoff',
  75: 'Decay', 76: 'Vibrato Rate', 77: 'Vibrato Depth', 78: 'Vibrato Delay',
  91: 'Reverb', 92: 'Tremolo', 93: 'Chorus', 94: 'Detune', 95: 'Phaser',
  120: 'All Sound Off', 121: 'Reset All', 123: 'All Notes Off',
}

const NO_FILTER: GestureFilter = { thumb:'any', index:'any', middle:'any', ring:'any', pinky:'any' }

// ─── Sidebar shell ──────────────────────────────────────────────────────────

export function Sidebar() {
  const { macros, toggleMacro, addMacro, deleteMacro } = useAppStore()
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
          {macros.map(macro => (
            <MacroRow
              key={macro.id}
              macro={macro}
              isEditing={editingId === macro.id}
              onToggle={toggleMacro}
              onEditToggle={id => setEditingId(prev => prev === id ? null : id)}
              onDelete={deleteMacro}
            />
          ))}
        </AnimatePresence>
      </div>

      <PresetPanel />
    </aside>
  )
}

// ─── Preset panel ───────────────────────────────────────────────────────────

function encodePreset(preset: Preset): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(preset))))
}

function decodePreset(str: string): Preset | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str.trim()))))
  } catch {
    return null
  }
}

const CATEGORY_ORDER = [
  'My Presets',
  'Filter & Tone',
  'Volume & Dynamics',
  'Modulation',
  'Effects',
  'Envelope',
  'Gesture-Gated',
  'Two-Hand',
]

function PresetPanel() {
  const { presets, activePresetId, savePreset, loadPreset, deletePreset, setMacros } = useAppStore()
  const [open, setOpen]             = useState(true)
  const [name, setName]             = useState('')
  const [search, setSearch]         = useState('')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [importing, setImporting]   = useState(false)
  const [importText, setImportText] = useState('')
  const [importName, setImportName] = useState('')
  const [toast, setToast]           = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function handleSave() {
    if (!name.trim()) return
    savePreset(name.trim())
    setName('')
    showToast('Saved')
  }

  function handleShare(p: Preset) {
    const code = encodePreset(p)
    navigator.clipboard.writeText(code)
      .then(() => showToast('Copied to clipboard'))
      .catch(() => showToast('Copy failed — see console'))
  }

  function handleImport() {
    const p = decodePreset(importText)
    if (!p || !Array.isArray(p.macros)) {
      showToast('Invalid preset code')
      return
    }
    const finalName = importName.trim() || p.name || 'Imported Preset'
    setMacros(p.macros)
    savePreset(finalName)
    showToast(`Saved "${finalName}"`)
    setImporting(false)
    setImportText('')
    setImportName('')
  }

  function toggleCategory(cat: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  // Check URL hash for shared preset on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#preset=')) {
      const code = hash.slice(8)
      const p = decodePreset(code)
      if (p?.macros) {
        if (confirm(`Import shared preset "${p.name || 'Untitled'}"?`)) {
          setMacros(p.macros)
          showToast('Imported from URL')
        }
        history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  // Filter + group presets
  const q = search.toLowerCase()
  const filtered = q
    ? presets.filter(p => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
    : presets

  // Build ordered category map
  const grouped = new Map<string, { preset: Preset; globalIndex: number }[]>()
  filtered.forEach(p => {
    const cat = p.category || 'My Presets'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push({ preset: p, globalIndex: presets.indexOf(p) })
  })

  // Sort categories by CATEGORY_ORDER, then alphabetically for unknowns
  const sortedCats = [...grouped.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })

  return (
    <div className="border-t border-[var(--border)] shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-medium text-[var(--text-dim)] uppercase tracking-widest hover:text-[var(--text)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>Presets</span>
          {activePresetId && (() => {
            const idx = presets.findIndex(p => p.id === activePresetId)
            const active = presets[idx]
            return active ? (
              <span className="text-[var(--accent)] normal-case tracking-normal font-normal">
                #{idx + 1} {active.name}
              </span>
            ) : null
          })()}
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-2">
              {/* Update active preset */}
              {activePresetId && (() => {
                const ap = presets.find(p => p.id === activePresetId)
                if (!ap) return null
                return (
                  <button
                    onClick={() => {
                      useAppStore.setState(s => ({
                        presets: s.presets.map(p => p.id === activePresetId ? { ...p, macros: s.macros } : p)
                      }))
                      showToast(`Updated "${ap.name}"`)
                    }}
                    className="text-[10px] px-2 py-1.5 rounded-lg border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors w-full text-left"
                  >
                    ↑ Update "{ap.name}"
                  </button>
                )
              })()}

              {/* Save as new */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Save as new preset…"
                  className="flex-1 text-xs"
                />
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="text-[10px] px-2 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-40"
                >
                  Save
                </button>
              </div>

              {/* Search */}
              {presets.length > 5 && (
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search presets…"
                  className="w-full text-xs"
                />
              )}

              {/* Grouped preset list — capped height so it doesn't crush the macro editor */}
              <div className="max-h-44 overflow-y-auto flex flex-col gap-2 -mx-1 px-1">
                {presets.length === 0 && (
                  <p className="text-[10px] text-[var(--muted)] text-center py-1">No presets yet</p>
                )}
                {filtered.length === 0 && presets.length > 0 && (
                  <p className="text-[10px] text-[var(--muted)] text-center py-1">No matches</p>
                )}

              {sortedCats.map(cat => {
                const items = grouped.get(cat)!
                const collapsed = collapsedCats.has(cat)
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between py-0.5 text-[9px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--text-dim)] transition-colors"
                    >
                      <span>{cat}</span>
                      <span className="text-[8px]">{collapsed ? '▶' : '▼'} {items.length}</span>
                    </button>
                    {!collapsed && (
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {items.map(({ preset: p, globalIndex: i }) => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1 rounded px-1 -mx-1 ${
                              p.id === activePresetId ? 'bg-[var(--accent-dim)]' : ''
                            }`}
                          >
                            <span className="text-[9px] mono text-[var(--muted)] w-5 shrink-0 text-right">{i + 1}</span>
                            <span className={`flex-1 text-xs truncate ${p.id === activePresetId ? 'text-[var(--accent)]' : ''}`}>
                              {p.name}
                            </span>
                            <button
                              onClick={() => { loadPreset(p.id); showToast('Loaded') }}
                              className="text-[9px] px-1.5 py-0.5 rounded text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                              title="Load preset"
                            >Load</button>
                            <button
                              onClick={() => handleShare(p)}
                              className="text-[9px] px-1 py-0.5 rounded text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                              title="Copy share code"
                            >⎘</button>
                            <button
                              onClick={() => deletePreset(p.id)}
                              className="text-[9px] px-1 py-0.5 rounded text-[var(--muted)] hover:text-[var(--red)] transition-colors"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>{/* end scrollable preset list */}

              {/* Starter library */}
              {presets.length < 30 && (
                <button
                  onClick={() => {
                    const existing = new Set(presets.map(p => p.name))
                    const toAdd = STARTER_PATCHES.filter(p => !existing.has(p.name))
                      .map(p => ({ ...p, id: crypto.randomUUID(), createdAt: Date.now() }))
                    useAppStore.setState(s => ({ presets: [...s.presets, ...toAdd] }))
                    showToast(`${toAdd.length} patches installed`)
                  }}
                  className="text-[10px] px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors w-full"
                >
                  Install 30 starter patches
                </button>
              )}

              {/* Import */}
              {!importing ? (
                <button
                  onClick={() => setImporting(true)}
                  className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors text-left"
                >
                  + Import from code
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Paste shared preset code…"
                    className="w-full text-[10px] h-16 resize-none mono"
                  />
                  <input
                    type="text"
                    value={importName}
                    onChange={e => setImportName(e.target.value)}
                    placeholder="Name (optional — uses original if blank)"
                    className="w-full text-xs"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleImport}
                      disabled={!importText.trim()}
                      className="flex-1 text-[10px] px-2 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-40"
                    >Save preset</button>
                    <button
                      onClick={() => { setImporting(false); setImportText(''); setImportName('') }}
                      className="text-[10px] px-2 py-1 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              )}

              {/* Toast */}
              {toast && (
                <p className="text-[10px] text-[var(--accent)] text-center">{toast}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── MacroRow ───────────────────────────────────────────────────────────────

interface MacroRowProps {
  macro: Macro
  isEditing: boolean
  onToggle: (id: string) => void
  onEditToggle: (id: string) => void
  onDelete: (id: string) => void
}

function MacroRow({ macro, isEditing, onToggle, onEditToggle, onDelete }: MacroRowProps) {
  const hands = useEngineStore(s => s.hands)
  const { updateMacro } = useAppStore()

  const target = macro.mapping.hand ?? 'any'
  const hand = target === 'any' ? hands[0] : hands.find(h => h.handedness === target)
  const raw = hand?.features?.[macro.mapping.feature] ?? 0
  const pct = Math.min(1, Math.max(0,
    (raw - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
  ))
  const midiValue = Math.round(pct * (macro.mapping.midiMax - macro.mapping.midiMin) + macro.mapping.midiMin)

  // Gesture filter summary for display
  const gf = macro.mapping.gestureFilter ?? NO_FILTER
  const activeFilters = (['thumb','index','middle','ring','pinky'] as const)
    .filter(k => gf[k] !== 'any')
  const gestureLabel = activeFilters.length
    ? activeFilters.map(k => `${k[0].toUpperCase()}${gf[k] === 'up' ? '↑' : '↓'}`).join(' ')
    : null

  return (
    <motion.div
      layout
      initial={{ opacity:0, y:-6 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-6 }}
      className={`card overflow-hidden transition-opacity ${macro.enabled ? '' : 'opacity-50'}`}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: macro.color }} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium truncate block">{macro.label}</span>
          {gestureLabel && (
            <span className="text-[9px] text-[var(--text-dim)] mono">{gestureLabel}</span>
          )}
        </div>
        <span className="text-[10px] mono text-[var(--text-dim)] shrink-0 flex flex-col items-end leading-tight">
          <span>CC{macro.mapping.ccNumber}{CC_NAMES[macro.mapping.ccNumber] ? ` · ${CC_NAMES[macro.mapping.ccNumber]}` : ''}</span>
          <span className="text-[var(--text)]">{midiValue}</span>
        </span>
        <button
          onClick={() => onEditToggle(macro.id)}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
            isEditing ? 'text-[var(--accent)] bg-[var(--accent-dim)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >✎</button>
        <button
          onClick={() => onDelete(macro.id)}
          className="text-[10px] px-1 py-0.5 rounded text-[var(--muted)] hover:text-[var(--red)] transition-colors"
        >✕</button>
        <button
          onClick={() => onToggle(macro.id)}
          className={`w-8 h-4 rounded-full relative transition-colors shrink-0 ${
            macro.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)]'
          }`}
          style={{ border: macro.enabled ? 'none' : '1px solid var(--border)' }}
        >
          <span className={`absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform ${
            macro.enabled ? 'translate-x-[17px]' : 'translate-x-[2px]'
          }`} />
        </button>
      </div>

      {/* Live CC bar */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <div className="flex-1 h-0.5 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: macro.color }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.04 }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            className="overflow-hidden"
          >
            <MacroEditor macro={macro} onUpdate={patch => updateMacro(macro.id, patch)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Visual Finger Picker ───────────────────────────────────────────────────

const FINGER_KEYS: (keyof GestureFilter)[] = ['thumb','index','middle','ring','pinky']
const FINGER_LABELS = ['T','I','M','R','P']

function FingerPicker({
  filter,
  onChange,
}: {
  filter: GestureFilter
  onChange: (f: GestureFilter) => void
}) {
  function cycle(key: keyof GestureFilter) {
    const next: Record<FingerState, FingerState> = { any:'up', up:'down', down:'any' }
    onChange({ ...filter, [key]: next[filter[key]] })
  }

  const stateStyle: Record<FingerState, string> = {
    any:  'bg-[var(--border)] text-[var(--muted)]',
    up:   'bg-[#00ff8833] text-[#00ff88] border border-[#00ff8866]',
    down: 'bg-[#ff664433] text-[#ff6644] border border-[#ff664466]',
  }
  const stateSymbol: Record<FingerState, string> = { any: '–', up: '↑', down: '↓' }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="field-label mb-0">Gesture Filter</p>
        <button
          onClick={() => onChange({ ...NO_FILTER })}
          className="text-[9px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          clear
        </button>
      </div>
      <div className="flex gap-1.5">
        {FINGER_KEYS.map((key, i) => (
          <button
            key={key}
            onClick={() => cycle(key)}
            className={`flex-1 flex flex-col items-center py-1.5 rounded text-[10px] font-medium transition-all ${stateStyle[filter[key]]}`}
          >
            <span className="text-[8px] mb-0.5 opacity-60">{FINGER_LABELS[i]}</span>
            <span>{stateSymbol[filter[key]]}</span>
          </button>
        ))}
      </div>
      <p className="text-[9px] text-[var(--text-dim)] mt-1">T=thumb  ↑=extended  ↓=curled  –=any</p>
    </div>
  )
}

// ─── MacroEditor ────────────────────────────────────────────────────────────

interface MacroEditorProps {
  macro: Macro
  onUpdate: (patch: Partial<Macro>) => void
}

function MacroEditor({ macro, onUpdate }: MacroEditorProps) {
  const hands  = useEngineStore(s => s.hands)
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
      const min = calibMin.current === Infinity  ? 0 : calibMin.current
      const max = calibMax.current === -Infinity ? 1 : calibMax.current
      updateMapping({ minVal: +min.toFixed(3), maxVal: +max.toFixed(3) })
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [calibrating, countdown])

  useEffect(() => {
    if (!calibrating) return
    const target = macro.mapping.hand ?? 'any'
    const hand = target === 'any' ? hands[0] : hands.find(h => h.handedness === target)
    if (!hand) return
    const v = hand.features[macro.mapping.feature]
    if (v < calibMin.current) calibMin.current = v
    if (v > calibMax.current) calibMax.current = v
  }, [calibrating, hands, macro.mapping.feature, macro.mapping.hand])

  // Live preview of current feature value
  const target = macro.mapping.hand ?? 'any'
  const hand = target === 'any' ? hands[0] : hands.find(h => h.handedness === target)
  const liveVal = hand?.features?.[macro.mapping.feature] ?? 0
  const livePct = Math.min(1, Math.max(0,
    (liveVal - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
  ))

  const gf = macro.mapping.gestureFilter ?? { ...NO_FILTER }

  return (
    <div className="border-t border-[var(--border)] px-3 py-3 flex flex-col gap-3">
      {/* Label */}
      <div>
        <p className="field-label">Label</p>
        <input
          type="text"
          value={macro.label}
          onChange={e => onUpdate({ label: e.target.value })}
          className="w-full text-xs"
        />
      </div>

      {/* Hand + CC + Channel */}
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="field-label">Hand</p>
          <select
            value={macro.mapping.hand ?? 'any'}
            onChange={e => updateMapping({ hand: e.target.value as HandTarget })}
            className="w-full text-xs"
          >
            <option value="any">Any</option>
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
        </div>
        <div>
          <p className="field-label">CC #</p>
          <input type="number" min={0} max={127}
            value={macro.mapping.ccNumber}
            onChange={e => updateMapping({ ccNumber: +e.target.value })}
          />
          {CC_NAMES[macro.mapping.ccNumber] && (
            <p className="text-[9px] text-[var(--accent)] mt-0.5 mono">{CC_NAMES[macro.mapping.ccNumber]}</p>
          )}
        </div>
        <div>
          <p className="field-label">Ch</p>
          <input type="number" min={1} max={16}
            value={macro.mapping.channel}
            onChange={e => updateMapping({ channel: +e.target.value })}
          />
        </div>
      </div>

      {/* Finger gesture picker */}
      <FingerPicker
        filter={gf}
        onChange={f => updateMapping({ gestureFilter: f })}
      />

      {/* Feature selector */}
      <div>
        <p className="field-label">Value Source</p>
        <select
          value={macro.mapping.feature}
          onChange={e => updateMapping({ feature: e.target.value as FeatureKey })}
          className="w-full text-xs"
        >
          {FEATURE_GROUPS.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map(item => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Live preview bar */}
        <div className="mt-1.5 h-1 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${livePct * 100}%`, background: macro.color }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[var(--text-dim)] mono">{liveVal.toFixed(3)}</span>
          <span className="text-[9px] text-[var(--text-dim)] mono">{FLAT_FEATURES[macro.mapping.feature]}</span>
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
            {calibrating ? `● ${countdown}s — perform gesture` : '◎ Calibrate'}
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-[var(--text-dim)] w-5">Min</span>
          <input type="number" step={0.01} min={0} max={1}
            value={macro.mapping.minVal}
            onChange={e => updateMapping({ minVal: +e.target.value })}
          />
          <span className="text-[10px] text-[var(--text-dim)] w-5">Max</span>
          <input type="number" step={0.01} min={0} max={1}
            value={macro.mapping.maxVal}
            onChange={e => updateMapping({ maxVal: +e.target.value })}
          />
        </div>
      </div>

      {/* MIDI output range */}
      <div>
        <p className="field-label">MIDI Output</p>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-[var(--text-dim)] w-5">Min</span>
          <input type="number" min={0} max={127}
            value={macro.mapping.midiMin}
            onChange={e => updateMapping({ midiMin: +e.target.value })}
          />
          <span className="text-[10px] text-[var(--text-dim)] w-5">Max</span>
          <input type="number" min={0} max={127}
            value={macro.mapping.midiMax}
            onChange={e => updateMapping({ midiMax: +e.target.value })}
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
          type="range" min={0} max={0.95} step={0.05}
          value={macro.mapping.smoothing}
          onChange={e => updateMapping({ smoothing: +e.target.value })}
        />
      </div>

      {/* Response curve */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="field-label mb-0">Response Curve</p>
          <span className="text-[10px] mono text-[var(--text-dim)]">
            {(macro.mapping.curve ?? 0) < -0.05
              ? 'logarithmic'
              : (macro.mapping.curve ?? 0) > 0.05
              ? 'exponential'
              : 'linear'}
          </span>
        </div>
        <input
          type="range" min={-1} max={1} step={0.05}
          value={macro.mapping.curve ?? 0}
          onChange={e => updateMapping({ curve: +e.target.value })}
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-[var(--text-dim)]">slow start</span>
          <span className="text-[9px] text-[var(--text-dim)]">fast start</span>
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="field-label">Color</p>
        <div className="flex gap-1.5">
          {COLORS.map(c => (
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
    </div>
  )
}
