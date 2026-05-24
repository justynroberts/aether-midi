// MIT License - Copyright (c) fintonlabs.com
import { useAppStore } from '../../state/useAppStore'
import { useEngineStore } from '../../state/useEngineStore'

export function Header() {
  const status = useEngineStore((s) => s.status)
  const {
    selectedPortId, availablePorts, setSelectedPort,
    showDebug, toggleDebug,
    theme, setTheme,
    viewMode, setViewMode,
  } = useAppStore()

  const isLive = status === 'running'

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] bg-[var(--surface)] shrink-0 gap-3">
      <div className="flex items-center gap-3">
        <span className="font-semibold tracking-tight text-sm">AETHER MIDI</span>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isLive
              ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]'
              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]'
          }`}
        >
          {isLive ? 'LIVE' : status === 'no-hand' ? 'NO HAND' : status === 'idle' ? 'IDLE' : 'ERR'}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* View toggle */}
        <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setViewMode('visualizer')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'visualizer'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setViewMode('camera')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'camera'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            Camera
          </button>
        </div>

        {/* MIDI port */}
        <select
          value={selectedPortId ?? ''}
          onChange={(e) => setSelectedPort(e.target.value || null)}
          className="text-xs"
        >
          <option value="">No MIDI output</option>
          {availablePorts.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost text-xs px-2"
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '◑'}
        </button>

        <button onClick={toggleDebug} className={`btn-ghost text-xs ${showDebug ? 'text-[var(--accent)]!' : ''}`}>
          Debug
        </button>
      </div>
    </header>
  )
}
