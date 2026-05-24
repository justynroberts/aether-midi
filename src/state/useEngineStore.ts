// MIT License - Copyright (c) fintonlabs.com
// Hot-path store — runs at 60fps, never persist
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { HandFeatures, TrackedHand, TrackingStatus } from '../types'

export type MidiStatus = 'unavailable' | 'denied' | 'no-ports' | 'ready' | 'sending'

interface EngineState {
  status: TrackingStatus
  hands: TrackedHand[]
  features: HandFeatures | null  // first hand, kept for sidebar live bars
  fps: number
  inferenceMs: number
  lastMidiActivity: number
  midiStatus: MidiStatus

  setStatus: (s: TrackingStatus) => void
  setHands: (hands: TrackedHand[]) => void
  setPerf: (fps: number, inferenceMs: number) => void
  markMidiActivity: () => void
  setMidiStatus: (s: MidiStatus) => void
}

export const useEngineStore = create<EngineState>()(
  subscribeWithSelector((set) => ({
    status: 'idle',
    hands: [],
    features: null,
    fps: 0,
    inferenceMs: 0,
    lastMidiActivity: 0,
    midiStatus: 'unavailable',

    setStatus: (status) => set({ status }),
    setHands: (hands) => set({ hands, features: hands[0]?.features ?? null }),
    setPerf: (fps, inferenceMs) => set({ fps, inferenceMs }),
    markMidiActivity: () => set({ lastMidiActivity: Date.now(), midiStatus: 'sending' }),
    setMidiStatus: (midiStatus) => set({ midiStatus }),
  }))
)
