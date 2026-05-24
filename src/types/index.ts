// MIT License - Copyright (c) fintonlabs.com

export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface HandFeatures {
  // Normalized 0-1 values derived from landmarks
  pinchDistance: number       // thumb-index tip distance
  spreadAmount: number        // palm spread (finger fan)
  wristY: number              // vertical wrist position
  wristX: number              // horizontal wrist position
  indexCurl: number           // index finger curl 0=open 1=closed
  middleCurl: number
  ringCurl: number
  pinkyCurl: number
  thumbCurl: number
  fistClosure: number         // average curl across all fingers
}

export type MidiCC = number   // 0-127
export type MidiChannel = number // 1-16

export type TriggerType = 'pinch' | 'fist' | 'spread' | 'point'

export type FeatureKey = keyof HandFeatures

export interface MacroMapping {
  feature: FeatureKey
  ccNumber: MidiCC
  channel: MidiChannel
  minVal: number  // input feature range min
  maxVal: number  // input feature range max
  midiMin: number // output midi range 0-127
  midiMax: number
  smoothing: number // 0-1 exponential smoothing factor
}

export interface Macro {
  id: string
  label: string
  trigger: TriggerType
  mapping: MacroMapping
  enabled: boolean
  color: string
}

export interface Preset {
  id: string
  name: string
  macros: Macro[]
  createdAt: number
}

export interface MidiPort {
  id: string
  name: string
  manufacturer?: string
}

export type TrackingStatus = 'idle' | 'running' | 'no-hand' | 'error'
