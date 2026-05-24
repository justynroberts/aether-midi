// MIT License - Copyright (c) fintonlabs.com
import { useAppStore } from '../../state/useAppStore'
import { useEngineStore } from '../../state/useEngineStore'

export function Header() {
  const status = useEngineStore((s) => s.status)
  const { selectedPortId, availablePorts, setSelectedPort, showDebug, toggleDebug } = useAppStore()

  const isLive = status === 'running'

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold tracking-tight">AETHER MIDI</span>

        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
            isLive
              ? 'bg-accent/10 border-accent/40 text-accent'
              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]'
          }`}
        >
          {isLive ? 'LIVE' : status === 'no-hand' ? 'NO HAND' : 'IDLE'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedPortId ?? ''}
          onChange={(e) => setSelectedPort(e.target.value || null)}
          className="text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">No MIDI output</option>
          {availablePorts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button
          onClick={toggleDebug}
          className={`btn-ghost text-xs ${showDebug ? 'text-accent!' : ''}`}
        >
          Debug
        </button>
      </div>
    </header>
  )
}
