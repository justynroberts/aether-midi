# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Aether MIDI — a browser-based gesture-driven MIDI controller. Uses the webcam + MediaPipe hand tracking to send MIDI CC messages to DAWs and instruments in real time.

## Stack

Vite + React + TypeScript + Zustand + `@mediapipe/tasks-vision` + Web MIDI API

## Dev

```bash
npm run dev        # starts on port 5747 (auto-increments if busy), accessible at oracle.local
npm run build      # tsc --noEmit + vite build
```

## Architecture

```
App.tsx            — main loop: camera init, MediaPipe HandLandmarker, MIDI CC dispatch, smoothing
state/
  useAppStore.ts   — persisted config: macros, presets, MIDI port/channel, debug flag
  useEngineStore.ts — hot-path 60fps state: tracking status, HandFeatures, fps/latency, MIDI activity
types/index.ts     — Landmark, HandFeatures, Macro, MacroMapping, Preset, MidiPort
components/
  permissions/     — PermissionsGate (camera + MIDI request screen)
  layout/          — Header (port selector + status), Sidebar (macro cards with live bars), Footer (fps/MIDI indicator)
  camera/          — CameraView (mirrored <video> + <canvas> skeleton overlay)
styles/globals.css — CSS custom properties (--bg, --accent, --surface, etc.) + Tailwind base
```

## Key Patterns

**MediaPipe** loads lazily on first permission grant, WASM from jsDelivr CDN, model from Google Storage.

**Macro mapping**: each `Macro` maps one `HandFeatures` field (e.g. `pinchDistance`) through a range to a MIDI CC value. Exponential smoothing (`macro.mapping.smoothing`) is applied per-macro each frame before sending.

**MIDI sending**: `output.send([0xB0 | (channel-1), ccNumber, value])` — standard CC message. Port updates are tracked via `useAppStore.subscribe` (needs `subscribeWithSelector` middleware, already applied).

**Hand features extracted in App.tsx** (`extractFeatures`): pinchDistance, wristY/X, per-finger curl (angle at PIP joint), fistClosure (average curl). Landmarks follow MediaPipe indexing (0=wrist, 4=thumb tip, 8=index tip).

**Canvas overlay**: both `<video>` and `<canvas>` use `scale-x-[-1]` CSS to mirror — landmark coordinates are drawn in original space and the CSS flip aligns them with the mirrored video.

## Debug

Press `d` to toggle debug overlay (fps + inference ms in footer).
