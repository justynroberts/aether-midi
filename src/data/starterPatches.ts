// MIT License - Copyright (c) fintonlabs.com
import type { GestureFilter, Preset } from '../types'

const nf: GestureFilter     = { thumb:'any', index:'any', middle:'any', ring:'any', pinky:'any' }
const oneUp: GestureFilter  = { thumb:'any', index:'up',  middle:'down', ring:'down', pinky:'down' }
const peaceUp: GestureFilter= { thumb:'any', index:'up',  middle:'up',  ring:'down', pinky:'down' }
const threeUp: GestureFilter= { thumb:'any', index:'up',  middle:'up',  ring:'up',   pinky:'down' }
const fistDown: GestureFilter={ thumb:'any', index:'down',middle:'down',ring:'down', pinky:'down' }
const openUp: GestureFilter = { thumb:'up',  index:'up',  middle:'up',  ring:'up',   pinky:'up'   }

function mac(
  id: string, label: string, color: string,
  feature: string, cc: number, ch = 1,
  minV = 0, maxV = 1, midiMin = 0, midiMax = 127,
  smoothing = 0.6, curve = 0,
  hand: 'any'|'left'|'right' = 'any',
  gf = nf
) {
  return {
    id, label, trigger: 'point' as const, enabled: true, color,
    mapping: {
      feature: feature as never,
      ccNumber: cc, channel: ch,
      minVal: minV, maxVal: maxV,
      midiMin, midiMax,
      smoothing, curve, hand,
      gestureFilter: gf,
    },
  }
}

function preset(name: string, macros: ReturnType<typeof mac>[]): Preset {
  return { id: crypto.randomUUID(), name, macros, createdAt: Date.now() }
}

export const STARTER_PATCHES: Preset[] = [

  // ── Filter & Tone ────────────────────────────────────────────────
  preset('Pinch → Filter Cutoff', [
    mac('p1a','Pinch → Cutoff','#00ff88','pinchDistance',74,1, 0.02,0.45, 0,127, 0.65,-0.3),
  ]),

  preset('Wrist Sweep Filter', [
    mac('p2a','Wrist → Cutoff','#00aaff','wristY',74,1, 0.15,0.85, 0,127, 0.55,-0.2),
  ]),

  preset('Spread → Resonance', [
    mac('p3a','Spread → Resonance','#ffcc00','spreadAmount',71,1, 0.1,0.8, 0,127, 0.6,0),
  ]),

  preset('Fist Darkness', [
    mac('p4a','Fist → Low-pass Filter','#ff6644','fistClosure',74,1, 0,1, 127,0, 0.7,0.2),
  ]),

  preset('Roll the Tone', [
    mac('p5a','Wrist Roll → Brightness','#cc44ff','wristRoll',74,1, 0.2,0.8, 0,127, 0.5,0),
    mac('p5b','Wrist Roll → Resonance','#aa33cc','wristRoll',71,1, 0.2,0.8, 0,60, 0.5,0),
  ]),

  // ── Volume & Dynamics ────────────────────────────────────────────
  preset('Wrist Volume Fader', [
    mac('p6a','Wrist Height → Volume','#00ff88','wristY',7,1, 0.2,0.8, 0,127, 0.5,0),
  ]),

  preset('Open Hand Expression', [
    mac('p7a','Open Hand → Expression','#44ffcc','openHand',11,1, 0.2,0.9, 0,127, 0.6,0, 'any', openUp),
  ]),

  preset('Swell (Left Wrist)', [
    mac('p8a','Left Wrist → Volume Swell','#00aaff','wristY',7,1, 0.15,0.85, 0,127, 0.7,0,'left'),
  ]),

  preset('Breath Control', [
    mac('p9a','Pinch → Breath CC','#ffcc00','pinchDistance',2,1, 0.05,0.5, 0,127, 0.8,-0.4),
  ]),

  preset('Pan with Roll', [
    mac('p10a','Wrist Roll → Pan','#ff44aa','wristRoll',10,1, 0.25,0.75, 0,127, 0.4,0),
  ]),

  // ── Modulation ───────────────────────────────────────────────────
  preset('Pinch Vibrato', [
    mac('p11a','Pinch → Mod Wheel','#00ff88','pinchDistance',1,1, 0.02,0.4, 0,127, 0.65,-0.2),
  ]),

  preset('Wrist Vibrato', [
    mac('p12a','Wrist Height → Vibrato Depth','#aa55ff','wristY',77,1, 0.3,0.7, 0,100, 0.5,0),
    mac('p12b','Wrist Height → Vibrato Rate','#8844cc','wristY',76,1, 0.3,0.7, 20,80, 0.5,0),
  ]),

  preset('Spread LFO Depth', [
    mac('p13a','Spread → LFO Depth','#ff6644','spreadAmount',77,1, 0.1,0.9, 0,127, 0.6,0),
  ]),

  preset('One Finger Vibrato', [
    mac('p14a','One Finger → Vibrato','#00ff88','wristY',1,1, 0.2,0.8, 0,90, 0.6,0, 'any', oneUp),
  ]),

  preset('Detune Spread', [
    mac('p15a','Spread → Detune','#ffcc00','spreadAmount',94,1, 0,0.7, 0,64, 0.5,0),
  ]),

  // ── Effects ──────────────────────────────────────────────────────
  preset('Reverb Throw', [
    mac('p16a','Wrist Height → Reverb','#00aaff','wristY',91,1, 0.2,0.9, 0,127, 0.55,0.1),
  ]),

  preset('Chorus Wave', [
    mac('p17a','Spread → Chorus','#aa55ff','spreadAmount',93,1, 0.1,0.8, 0,127, 0.6,0),
  ]),

  preset('Delay Feedback', [
    mac('p18a','Pinch → Delay Feedback','#ff6644','pinchDistance',95,1, 0.05,0.6, 0,110, 0.7,-0.3),
  ]),

  preset('Tremolo Fist', [
    mac('p19a','Fist → Tremolo Depth','#ffcc00','fistClosure',92,1, 0.1,1, 0,127, 0.65,0.2),
  ]),

  preset('Phaser Roll', [
    mac('p20a','Wrist Roll → Phaser','#ff44aa','wristRoll',95,1, 0.15,0.85, 0,127, 0.5,0),
  ]),

  // ── Envelope ─────────────────────────────────────────────────────
  preset('Pinch Attack', [
    mac('p21a','Pinch → Attack Time','#44ffcc','pinchDistance',73,1, 0.05,0.5, 0,100, 0.6,0.3),
  ]),

  preset('Wrist Release', [
    mac('p22a','Wrist Height → Release','#00ff88','wristY',72,1, 0.2,0.8, 10,127, 0.5,0.2),
  ]),

  // ── Gesture-Gated ────────────────────────────────────────────────
  preset('Point & Control Cutoff', [
    mac('p23a','☝ Cutoff (index only)','#00ff88','wristY',74,1, 0.15,0.85, 0,127, 0.55,0, 'any', oneUp),
  ]),

  preset('Peace Sign Filter + Res', [
    mac('p24a','✌ Cutoff','#00aaff','wristY',74,1, 0.15,0.85, 0,127, 0.55,0, 'any', peaceUp),
    mac('p24b','✌ Resonance','#0088cc','spreadAmount',71,1, 0.1,0.8, 0,80, 0.6,0, 'any', peaceUp),
  ]),

  preset('Three Fingers LFO', [
    mac('p25a','Three → LFO Depth','#ffcc00','wristY',77,1, 0.2,0.8, 0,127, 0.5,0, 'any', threeUp),
    mac('p25b','Three → LFO Rate','#ddaa00','wristRoll',76,1, 0.2,0.8, 10,100, 0.5,0, 'any', threeUp),
  ]),

  preset('Fist Freeze (Sustain)', [
    mac('p26a','Fist → Sustain Pedal','#ff6644','fistClosure',64,1, 0.6,1, 0,127, 0.3,0.5, 'any', fistDown),
  ]),

  // ── Two-Hand Performance ─────────────────────────────────────────
  preset('Two Hand Filter & Volume', [
    mac('p27a','Right Wrist → Cutoff','#00ff88','wristY',74,1, 0.15,0.85, 0,127, 0.55,0,'right'),
    mac('p27b','Left Wrist → Volume','#00aaff','wristY',7,1, 0.15,0.85, 0,127, 0.55,0,'left'),
  ]),

  preset('Theremin Style', [
    mac('p28a','Right Wrist X → Pan','#ff44aa','wristX',10,1, 0.2,0.8, 0,127, 0.4,0,'right'),
    mac('p28b','Right Wrist Y → Volume','#cc2288','wristY',7,1, 0.1,0.9, 0,127, 0.4,0,'right'),
  ]),

  preset('Left FX Right Lead', [
    mac('p29a','Right Pinch → Filter','#00ff88','pinchDistance',74,1, 0.02,0.45, 0,127, 0.65,-0.3,'right'),
    mac('p29b','Left Wrist → Reverb','#00aaff','wristY',91,1, 0.2,0.9, 0,127, 0.6,0,'left'),
    mac('p29c','Left Spread → Chorus','#0077dd','spreadAmount',93,1, 0.1,0.8, 0,127, 0.6,0,'left'),
  ]),

  preset('Full Expressive Rig', [
    mac('p30a','R Pinch → Cutoff','#00ff88','pinchDistance',74,1, 0.02,0.5, 0,127, 0.65,-0.2,'right'),
    mac('p30b','R Wrist Y → Volume','#00aaff','wristY',7,1, 0.15,0.85, 0,127, 0.5,0,'right'),
    mac('p30c','L Wrist Y → Reverb','#ff6644','wristY',91,1, 0.2,0.85, 0,127, 0.6,0,'left'),
    mac('p30d','L Spread → Mod Wheel','#ffcc00','spreadAmount',1,1, 0.05,0.8, 0,100, 0.65,0,'left'),
  ]),
]
