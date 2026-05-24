# Developer Guide

Technical reference for contributing to or deploying Aether MIDI.

---

## Stack

| Layer | Library |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS |
| State | Zustand (with persist + subscribeWithSelector middleware) |
| Hand tracking | @mediapipe/tasks-vision — HandLandmarker, CPU delegate |
| 3D visualizer | @react-three/fiber v8, Three.js |
| Animation | framer-motion |
| Local dev HTTPS | @vitejs/plugin-basic-ssl |

---

## Setup

```bash
git clone https://github.com/fintonlabs/aether-midi
cd aether-midi
npm install
npm run dev
```

The dev server starts on `https://localhost:5747`. Your browser will show a self-signed certificate warning — click through it. HTTPS is required for Web MIDI and camera access on non-localhost hostnames.

---

## Commands

```bash
npm run dev        # dev server on https://localhost:5747
npm run build      # type-check then build to dist/
npm run preview    # serve the dist/ build locally
```

---

## Architecture

```
App.tsx                     Main loop: camera init, MediaPipe, feature extraction, MIDI dispatch
│
├── state/
│   ├── useAppStore.ts      Persisted config — macros, presets, MIDI port, theme
│   └── useEngineStore.ts   Hot-path 60fps state — tracked hands, fps, MIDI activity
│
├── types/index.ts          All shared types: Landmark, HandFeatures, Macro, Preset, etc.
│
├── components/
│   ├── permissions/        First-run camera + MIDI permission gate
│   ├── layout/
│   │   ├── Header.tsx      Port selector, camera/visualizer toggle
│   │   ├── Sidebar.tsx     Macro cards, preset panel, editor
│   │   └── Footer.tsx      MIDI status, fps, IAC help modal
│   ├── camera/             Mirrored video + canvas skeleton overlay
│   ├── visualizer/         Three.js scene
│   └── midi/               MidiHelpModal (IAC / loopMIDI setup)
│
└── data/
    └── starterPatches.ts   30 built-in presets
```

### Data flow

```
Camera frame
  → MediaPipe HandLandmarker (CPU, runs off main thread via WASM)
  → extractFeatures() in App.tsx → HandFeatures object per hand
  → useEngineStore.setHands()
  → Macro loop: for each enabled macro
      ├── check gestureFilter (per-finger up/down requirement)
      ├── read feature value
      ├── apply input range clamp + response curve
      ├── apply exponential smoothing
      └── send MIDI CC via Web MIDI API output.send([0xB0 | ch, cc, value])
  → useEngineStore side-effects: update fps, inferenceMs, lastMidiActivity
```

### Coordinate system

MediaPipe landmark coordinates are normalised 0–1 (origin top-left). The visualizer maps them to world space:

```typescript
const lx = (x: number) => (1 - x) * 4 - 2   // flip X (mirrored video)
const ly = (y: number) => -(y * 4 - 2)        // flip Y (screen vs world)
const lz = (z: number) => z * 12              // depth exaggeration
```

Both `<video>` and `<canvas>` use `scale-x-[-1]` CSS to mirror — landmark coordinates are drawn in original space and the CSS flip aligns them with the reflected video.

### Handedness

MediaPipe reports handedness from the camera's perspective. Because the video is mirrored, "Left" in MediaPipe = user's right hand. App.tsx flips this on ingest:

```typescript
const handedness = r.handedness === 'Left' ? 'right' : 'left'
```

### MediaPipe loading

The HandLandmarker loads lazily on first permission grant. WASM is served from jsDelivr CDN; the landmark model from Google Storage. `delegate: 'CPU'` is intentional — the GPU delegate conflicts with the Three.js WebGL context.

---

## Adding a new hand feature

1. Add the key to `HandFeatures` in `src/types/index.ts`
2. Compute it in `extractFeatures()` in `App.tsx`
3. Add it to the correct `FEATURE_GROUPS` entry in `Sidebar.tsx` so it appears in the UI

```typescript
// types/index.ts
export interface HandFeatures {
  // ...existing...
  myNewFeature: number  // 0–1 normalised
}

// App.tsx extractFeatures()
myNewFeature: computeMyFeature(landmarks),

// Sidebar.tsx FEATURE_GROUPS
{ key: 'myNewFeature', label: 'My New Feature' }
```

---

## Adding a starter preset

Open `src/data/starterPatches.ts` and call the `mac()` helper:

```typescript
preset('My Preset Name', [
  mac(
    'unique-id',      // any unique string
    'Label',          // shown in sidebar
    '#00ff88',        // colour hex
    'wristY',         // HandFeatures key
    74,               // MIDI CC number
    1,                // MIDI channel
    0.2, 0.8,         // input range (min, max)
    0, 127,           // MIDI output range
    0.6,              // smoothing (0–0.95)
    0,                // response curve (-1 log … 0 linear … 1 exp)
    'any',            // hand: 'any' | 'left' | 'right'
    nf,               // gesture filter (nf = no filter)
  ),
])
```

---

## Deploying

The build output is a completely static site — no server required. Any host that serves over HTTPS works.

### Netlify (recommended — easiest)

1. `npm run build` → produces `dist/`
2. Drag the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Done. Netlify gives you an HTTPS URL instantly.

Or connect your GitHub repo and Netlify will auto-deploy on every push (set build command to `npm run build`, publish directory to `dist`).

### Vercel

```bash
npm install -g vercel
vercel --prod
```

### GitHub Pages

GitHub Pages serves from a subdirectory (`/repo-name/`), so set the `base` in `vite.config.ts` before building:

```typescript
export default defineConfig({
  base: '/aether-midi/',   // add this line
  plugins: [react(), basicSsl()],
  // ...
})
```

Then build and push the `dist/` folder to the `gh-pages` branch, or use the [gh-pages](https://www.npmjs.com/package/gh-pages) package:

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

### Self-hosted

Serve the `dist/` folder from any web server. **HTTPS is mandatory** — Web MIDI and camera access are blocked on plain HTTP. Use Let's Encrypt for a free certificate.

---

## Key design decisions

**CPU delegate for MediaPipe** — The GPU delegate (WebGL) conflicts with the Three.js renderer, causing WebGL context loss. CPU is slightly slower but stable and still runs at 60fps for hand tracking.

**No postprocessing (bloom)** — `@react-three/postprocessing` v3 requires R3F v9. R3F v9 has Expo peer dependency conflicts at time of writing. Bloom is replicated via `THREE.AdditiveBlending` + `CanvasTexture` radial gradients.

**Zustand subscribeWithSelector** — MIDI port updates need to subscribe to a specific slice of state. The `subscribeWithSelector` middleware enables `useAppStore.subscribe(selector, callback)`.

**Pre-allocated BufferGeometry** — All Three.js geometries in the visualizer are created once and updated via `needsUpdate = true` each frame. This avoids per-frame garbage collection pressure at 60fps.

**Preset sharing via base64** — Presets are JSON-encoded then base64'd using the `btoa(unescape(encodeURIComponent(...)))` pattern to safely handle Unicode characters (emoji in gesture labels etc.).

---

## Project structure

```
src/
  App.tsx                    Main component, camera loop, MIDI loop
  main.tsx                   React root, theme init
  types/
    index.ts                 All TypeScript interfaces
  state/
    useAppStore.ts           Persisted Zustand store
    useEngineStore.ts        Non-persisted hot-path store
  components/
    permissions/
      PermissionsGate.tsx    Camera + MIDI request UI
    layout/
      Header.tsx
      Sidebar.tsx            Macro cards + preset panel
      Footer.tsx             Status bar
    camera/
      CameraView.tsx         <video> + skeleton <canvas>
    visualizer/
      HandVisualizerThree.tsx Three.js scene
    midi/
      MidiHelpModal.tsx      IAC / loopMIDI setup guide
  data/
    starterPatches.ts        30 built-in presets
  styles/
    globals.css              CSS custom properties + Tailwind base
```
