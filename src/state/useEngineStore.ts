// MIT License - Copyright (c) fintonlabs.com
// Hot-path store — runs at 60fps, never persist
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { HandFeatures, TrackingStatus } from '../types'

export type MidiStatus = 'unavailable' | 'denied' | 'no-ports' | 'ready' | 'sending'

interface EngineState {
  status: TrackingStatus
  features: HandFeatures | null
  fps: number
  inferenceMs: number
  lastMidiActivity: number
  midiStatus: MidiStatus

  setStatus: (s: TrackingStatus) => void
  setFeatures: (f: HandFeatures | null) => void
  setPerf: (fps: number, inferenceMs: number) => void
  markMidiActivity: () => void
  setMidiStatus: (s: MidiStatus) => void
}

export const useEngineStore = create<EngineState>()(
  subscribeWithSelector((set) => ({
    status: 'idle',
    features: null,
    fps: 0,
    inferenceMs: 0,
    lastMidiActivity: 0,
    midiStatus: 'unavailable',

    setStatus: (status) => set({ status }),
    setFeatures: (features) => set({ features }),
    setPerf: (fps, inferenceMs) => set({ fps, inferenceMs }),
    markMidiActivity: () => set({ lastMidiActivity: Date.now(), midiStatus: 'sending' }),
    setMidiStatus: (midiStatus) => set({ midiStatus }),
  }))
)
