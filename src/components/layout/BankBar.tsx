// MIT License - Copyright (c) fintonlabs.com
import { useAppStore } from '../../state/useAppStore'

export function BankBar() {
  const { presets, performanceBanks, activeBankSlot, activateBank, setBankPreset, activePresetId } = useAppStore()

  const hasAnyBank = performanceBanks.some(b => b !== null)

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
      <span className="text-[9px] uppercase tracking-widest text-[var(--muted)] mr-1 shrink-0">Banks</span>

      {performanceBanks.map((presetId, i) => {
        const preset = presetId ? presets.find(p => p.id === presetId) : null
        const isActive = activeBankSlot === i
        const isCurrentPreset = !isActive && presetId === activePresetId

        return (
          <div key={i} className="relative group flex-1 min-w-0">
            {/* Slot button */}
            <button
              onClick={() => preset && activateBank(i)}
              title={preset ? `${i + 1}: ${preset.name} (key ${i + 1})` : `Slot ${i + 1} — assign a preset`}
              className={`w-full flex flex-col items-center py-0.5 px-1 rounded text-center transition-all ${
                isActive
                  ? 'bg-[var(--accent)] text-black'
                  : preset
                  ? isCurrentPreset
                    ? 'bg-[var(--accent-dim)] border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/20 cursor-pointer'
                    : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 cursor-pointer'
                  : 'border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30 cursor-default'
              }`}
            >
              <span className={`text-[9px] font-medium mono leading-none ${isActive ? 'text-black' : ''}`}>{i + 1}</span>
              <span className={`text-[8px] truncate w-full leading-tight mt-0.5 ${
                isActive ? 'text-black/70' : 'text-[var(--muted)]'
              }`}>
                {preset ? preset.name : '—'}
              </span>
            </button>

            {/* Assign dropdown — appears on hover */}
            <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover:block">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg p-1 w-36">
                <p className="text-[9px] text-[var(--muted)] px-1.5 pb-1 border-b border-[var(--border)] mb-1">
                  Slot {i + 1}
                </p>
                <select
                  value={presetId ?? ''}
                  onChange={e => setBankPreset(i, e.target.value || null)}
                  className="w-full text-[10px] py-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  <option value="">— empty —</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
      })}

      {/* Gesture hint */}
      <span className="text-[8px] text-[var(--muted)] ml-1 shrink-0 leading-tight text-right">
        {hasAnyBank ? (
          <>keys 1–8<br />👍 next</>
        ) : (
          <>hover slot<br />to assign</>
        )}
      </span>
    </div>
  )
}
