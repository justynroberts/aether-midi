// MIT License - Copyright (c) fintonlabs.com

export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface HandFeatures {
  // Position
  wristY: number
  wristX: number
  wristRoll: number           // palm roll: 0=left, 0.5=down, 1=right

  // Distance / spread
  pinchDistance: number       // thumb-index tip distance (0=pinched)
  spreadAmount: number        // finger fan spread

  // Curl  (0 = straight, 1 = fully curled)
  indexCurl: number
  middleCurl: number
  ringCurl: number
  pinkyCurl: number
  thumbCurl: number
  fistClosure: number         // mean curl of 4 fingers

  // Extension  (0 = curled, 1 = extended) — inverse of curls
  indexUp: number
  middleUp: number
  ringUp: number
  pinkyUp: number
  thumbUp: number
  fingersCount: number        // number of extended fingers / 5

  // Named gesture confidence (0-1)
  onePointing: number         // index only
  peaceSign: number           // index + middle
  threeFingers: number        // index + middle + ring
  rockOn: number              // index + pinky, others curled
  openHand: number            // all five extended
  thumbsUp: number            // thumb out, all fingers curled
}

export type MidiCC = number   // 0-127
export type MidiChannel = number // 1-16

export type TriggerType = 'pinch' | 'fist' | 'spread' | 'point'

export type FeatureKey = keyof HandFeatures

export type HandTarget = 'any' | 'left' | 'right'
export type FingerState = 'any' | 'up' | 'down'

export interface GestureFilter {
  thumb:  FingerState
  index:  FingerState
  middle: FingerState
  ring:   FingerState
  pinky:  FingerState
}

export interface MacroMapping {
  feature: FeatureKey
  ccNumber: MidiCC
  channel: MidiChannel
  minVal: number
  maxVal: number
  midiMin: number
  midiMax: number
  smoothing: number
  curve: number      // -1=log (slow start), 0=linear, +1=exp (fast start)
  hand: HandTarget
  gestureFilter: GestureFilter
}

export interface TrackedHand {
  landmarks: Landmark[]
  handedness: 'left' | 'right'
  features: HandFeatures
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
