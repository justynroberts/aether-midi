// MIT License - Copyright (c) fintonlabs.com
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useAppStore } from '../../state/useAppStore'
import { useEngineStore } from '../../state/useEngineStore'
import type { Macro } from '../../types'

export function Sidebar() {
  const { macros, toggleMacro } = useAppStore()
  const features = useEngineStore((s) => s.features)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200 ${
        collapsed ? 'w-10' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        {!collapsed && <span className="text-xs font-medium text-[var(--text-dim)] uppercase tracking-widest">Macros</span>}
        <button onClick={() => setCollapsed((v) => !v)} className="btn-ghost text-xs ml-auto">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-2 flex flex-col gap-2"
          >
            {macros.map((macro) => (
              <MacroCard key={macro.id} macro={macro} features={features} onToggle={toggleMacro} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}

interface MacroCardProps {
  macro: Macro
  features: ReturnType<typeof useEngineStore.getState>['features']
  onToggle: (id: string) => void
}

function MacroCard({ macro, features, onToggle }: MacroCardProps) {
  const rawValue = features ? features[macro.mapping.feature] : null
  const pct =
    rawValue !== null
      ? Math.min(
          1,
          Math.max(
            0,
            (rawValue - macro.mapping.minVal) / (macro.mapping.maxVal - macro.mapping.minVal)
          )
        )
      : 0
  const midiValue = Math.round(pct * (macro.mapping.midiMax - macro.mapping.midiMin) + macro.mapping.midiMin)

  return (
    <div
      className={`card p-3 flex flex-col gap-2 transition-opacity ${macro.enabled ? '' : 'opacity-40'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate">{macro.label}</span>
        <button
          onClick={() => onToggle(macro.id)}
          className={`w-7 h-4 rounded-full relative transition-colors ${
            macro.enabled ? 'bg-accent' : 'bg-[var(--muted)]'
          }`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-transform ${
              macro.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* CC bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-dim)] mono w-12">CC {macro.mapping.ccNumber}</span>
        <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: macro.color }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
        <span className="text-xs mono text-[var(--text-dim)] w-8 text-right">{midiValue}</span>
      </div>
    </div>
  )
}
