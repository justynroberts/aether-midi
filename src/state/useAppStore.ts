// MIT License - Copyright (c) fintonlabs.com
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { Macro, Preset, MidiPort } from '../types'

interface AppState {
  // MIDI config
  selectedPortId: string | null
  midiChannel: number
  availablePorts: MidiPort[]

  // Presets
  presets: Preset[]
  activePresetId: string | null

  // Active macros (from active preset)
  macros: Macro[]

  // Debug
  showDebug: boolean

  // Actions
  setSelectedPort: (id: string | null) => void
  setAvailablePorts: (ports: MidiPort[]) => void
  setMidiChannel: (ch: number) => void
  toggleDebug: () => void
  setMacros: (macros: Macro[]) => void
  toggleMacro: (id: string) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
  persist(
    (set, get) => ({
      selectedPortId: null,
      midiChannel: 1,
      availablePorts: [],
      presets: [],
      activePresetId: null,
      macros: getDefaultMacros(),
      showDebug: false,

      setSelectedPort: (id) => set({ selectedPortId: id }),
      setAvailablePorts: (ports) => set({ availablePorts: ports }),
      setMidiChannel: (ch) => set({ midiChannel: ch }),
      toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
      setMacros: (macros) => set({ macros }),
      toggleMacro: (id) =>
        set((s) => ({
          macros: s.macros.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
        })),

      savePreset: (name) => {
        const { macros, presets } = get()
        const preset: Preset = {
          id: crypto.randomUUID(),
          name,
          macros,
          createdAt: Date.now(),
        }
        set({ presets: [...presets, preset], activePresetId: preset.id })
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id)
        if (preset) set({ macros: preset.macros, activePresetId: id })
      },

      deletePreset: (id) =>
        set((s) => ({
          presets: s.presets.filter((p) => p.id !== id),
          activePresetId: s.activePresetId === id ? null : s.activePresetId,
        })),
    }),
    { name: 'aether-midi-config' }
  )
  )
)

function getDefaultMacros(): Macro[] {
  return [
    {
      id: 'pinch-cc1',
      label: 'Pinch → Mod Wheel',
      trigger: 'pinch',
      mapping: {
        feature: 'pinchDistance',
        ccNumber: 1,
        channel: 1,
        minVal: 0,
        maxVal: 0.3,
        midiMin: 0,
        midiMax: 127,
        smoothing: 0.7,
      },
      enabled: true,
      color: '#00ff88',
    },
    {
      id: 'wrist-cc7',
      label: 'Wrist Y → Volume',
      trigger: 'point',
      mapping: {
        feature: 'wristY',
        ccNumber: 7,
        channel: 1,
        minVal: 0.2,
        maxVal: 0.8,
        midiMin: 0,
        midiMax: 127,
        smoothing: 0.6,
      },
      enabled: true,
      color: '#00aaff',
    },
    {
      id: 'fist-cc64',
      label: 'Fist → Sustain',
      trigger: 'fist',
      mapping: {
        feature: 'fistClosure',
        ccNumber: 64,
        channel: 1,
        minVal: 0,
        maxVal: 1,
        midiMin: 0,
        midiMax: 127,
        smoothing: 0.5,
      },
      enabled: false,
      color: '#ff6644',
    },
  ]
}
