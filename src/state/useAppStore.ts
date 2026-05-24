// MIT License - Copyright (c) fintonlabs.com
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { GestureFilter, Macro, Preset, MidiPort } from '../types'

const NO_FILTER: GestureFilter = { thumb: 'any', index: 'any', middle: 'any', ring: 'any', pinky: 'any' }

export type Theme = 'dark' | 'light'
export type ViewMode = 'visualizer' | 'camera'

interface AppState {
  // MIDI config
  selectedPortId: string | null
  midiChannel: number
  availablePorts: MidiPort[]

  // Presets
  presets: Preset[]
  activePresetId: string | null

  // Active macros
  macros: Macro[]

  // Performance banks (8 slots, each holds a preset ID or null)
  performanceBanks: (string | null)[]
  activeBankSlot: number  // -1 = not in bank mode

  // UI
  showDebug: boolean
  theme: Theme
  viewMode: ViewMode

  // Actions
  setSelectedPort: (id: string | null) => void
  setAvailablePorts: (ports: MidiPort[]) => void
  setMidiChannel: (ch: number) => void
  toggleDebug: () => void
  setTheme: (t: Theme) => void
  setViewMode: (m: ViewMode) => void
  setMacros: (macros: Macro[]) => void
  toggleMacro: (id: string) => void
  addMacro: () => void
  updateMacro: (id: string, patch: Partial<Macro>) => void
  deleteMacro: (id: string) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  setBankPreset: (slot: number, presetId: string | null) => void
  activateBank: (slot: number) => void
  nextBank: () => void
  clearBanks: () => void
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
      performanceBanks: [null, null, null, null, null, null, null, null],
      activeBankSlot: -1,
      showDebug: false,
      theme: 'dark',
      viewMode: 'visualizer',

      setSelectedPort: (id) => set({ selectedPortId: id }),
      setAvailablePorts: (ports) => set({ availablePorts: ports }),
      setMidiChannel: (ch) => set({ midiChannel: ch }),
      toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme)
      },
      setViewMode: (viewMode) => set({ viewMode }),
      setMacros: (macros) => set({ macros }),
      toggleMacro: (id) =>
        set((s) => ({
          macros: s.macros.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
        })),
      addMacro: () =>
        set((s) => ({ macros: [...s.macros, makeNewMacro(s.macros.length)] })),
      updateMacro: (id, patch) =>
        set((s) => ({
          macros: s.macros.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteMacro: (id) =>
        set((s) => ({ macros: s.macros.filter((m) => m.id !== id) })),

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
          // Clear any bank slots pointing to this preset
          performanceBanks: s.performanceBanks.map(b => b === id ? null : b),
        })),

      setBankPreset: (slot, presetId) =>
        set((s) => {
          const banks = [...s.performanceBanks]
          banks[slot] = presetId
          return { performanceBanks: banks }
        }),

      activateBank: (slot) => {
        const { performanceBanks, presets } = get()
        const presetId = performanceBanks[slot]
        if (!presetId) return
        const preset = presets.find(p => p.id === presetId)
        if (preset) set({ macros: preset.macros, activePresetId: presetId, activeBankSlot: slot })
      },

      nextBank: () => {
        const { performanceBanks, activeBankSlot, presets } = get()
        const occupied = performanceBanks
          .map((id, i) => ({ id, i }))
          .filter(s => s.id !== null && presets.some(p => p.id === s.id))
        if (occupied.length === 0) return
        const cur = occupied.findIndex(s => s.i === activeBankSlot)
        const next = occupied[(cur + 1) % occupied.length]
        const preset = presets.find(p => p.id === next.id)
        if (preset) set({ macros: preset.macros, activePresetId: next.id!, activeBankSlot: next.i })
      },

      clearBanks: () =>
        set({ performanceBanks: [null, null, null, null, null, null, null, null], activeBankSlot: -1 }),
    }),
    { name: 'aether-midi-config' }
  )
  )
)

const MACRO_COLORS = ['#00ff88', '#00aaff', '#ff6644', '#ffcc00', '#cc44ff', '#ff44aa', '#44ffcc']

function makeNewMacro(index: number): Macro {
  return {
    id: crypto.randomUUID(),
    label: 'New Macro',
    trigger: 'point',
    mapping: {
      feature: 'wristY',
      ccNumber: 2,
      channel: 1,
      minVal: 0,
      maxVal: 1,
      midiMin: 0,
      midiMax: 127,
      smoothing: 0.6,
      hand: 'any',
      gestureFilter: { ...NO_FILTER },
      curve: 0,
    },
    enabled: true,
    color: MACRO_COLORS[index % MACRO_COLORS.length],
  }
}

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
        hand: 'any',
        gestureFilter: { ...NO_FILTER },
        curve: 0,
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
        hand: 'any',
        gestureFilter: { ...NO_FILTER },
        curve: 0,
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
        hand: 'any',
        gestureFilter: { ...NO_FILTER },
        curve: 0,
      },
      enabled: false,
      color: '#ff6644',
    },
  ]
}
