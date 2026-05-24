# Developer Guide

Technical reference for contributing to or deploying Aether MIDI.

---

## Stack

| Layer | Library |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS |
| State | Zustand (persist + subscribeWithSelector middleware) |
| Hand tracking | @mediapipe/tasks-vision — HandLandmarker, CPU delegate |
| 3D visualizer | @react-three/fiber v8, Three.js |
| Animation | framer-motion |

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
│   ├── useAppStore.ts      Persisted config — macros, presets, performance banks, MIDI port, theme
│   └── useEngineStore.ts   Hot-path 60fps state — tracked hands, fps, MIDI activity
│
├── types/index.ts          All shared types: Landmark, HandFeatures, Macro, Preset, etc.
│
├── components/
│   ├── permissions/        First-run camera + MIDI permission gate
│   ├── layout/
│   │   ├── Header.tsx      Port selector, camera/visualizer toggle, theme, help
│   │   ├── BankBar.tsx     8-slot performance bank strip (below header)
│   │   ├── Sidebar.tsx     Macro cards, preset panel with categories + search
│   │   └── Footer.tsx      MIDI status, fps, IAC help modal
│   ├── camera/             Mirrored video + canvas skeleton overlay
│   ├── visualizer/         Three.js scene — skeleton, trails, aura, orbit rings, wave pulses
│   ├── tour/               ProductTour — first-run walkthrough
│   ├── help/               HelpPanel — slide-in reference
│   └── brand/              AetherLogo, AetherWordmark
│
└── data/
    └── starterPatches.ts   30 built-in presets with categories
```

### Data flow

```
Camera frame
  → MediaPipe HandLandmarker (CPU, WASM)
  → extractFeatures() in App.tsx → HandFeatures per hand
  → useEngineStore.setHands()
  → Thumbs-up held 500ms → useAppStore.nextBank() (resets smoothing state)
  → Macro loop: for each enabled macro
      ├── check gestureFilter (per-finger up/down requirement)
      ├── read feature value from correct hand (by handedness)
      ├── apply gesture confidence weighting
      ├── apply input range clamp + response curve
      ├── apply exponential smoothing (IIR, cleared on bank switch)
      └── send MIDI CC via Web MIDI output.send([0xB0 | ch, cc, value])
```

### Performance banks

`useAppStore` holds `performanceBanks: (string | null)[]` (8 slots of preset IDs) and `activeBankSlot: number` (-1 = not in bank mode).

Switching a bank calls `loadPreset()` internally and sets a `resetSmoothed` ref in `App.tsx` that clears the IIR filter state on the next frame — preventing stale values from bleeding into the new patch.

Three switch paths all trigger the same clean transition:
- **Keyboard 1–8** — `onKey` handler in App.tsx
- **Thumbs-up gesture** — tracked via `thumbsUpHeldMs` accumulator in the frame loop (fires at 500ms, has −800ms cooldown before next fire)
- **BankBar click** — Zustand `activeBankSlot` subscription in App.tsx sets `resetSmoothed`

### Coordinate system

MediaPipe landmarks are normalised 0–1 (origin top-left). The visualizer maps them to world space:

```typescript
const lx = (x: number) => (1 - x) * 4 - 2   // flip X (mirrored video)
const ly = (y: number) => -(y * 4 - 2)        // flip Y (screen vs world)
const lz = (z: number) => z * 12              // depth exaggeration
```

Both `<video>` and `<canvas>` use `scale-x-[-1]` CSS to mirror — landmark coordinates are drawn in original space and the CSS flip aligns them with the reflected video.

### Handedness

MediaPipe reports handedness from the camera's perspective. Because the video is mirrored, "Left" in MediaPipe = user's right hand. App.tsx flips this on ingest:

```typescript
const handedness = raw === 'Left' ? 'right' : 'left'
```

### MediaPipe loading

HandLandmarker loads lazily on first permission grant. WASM from jsDelivr CDN; model from Google Storage. `delegate: 'CPU'` is intentional — the GPU delegate conflicts with the Three.js WebGL context.

---

## Adding a new hand feature

1. Add the key to `HandFeatures` in `src/types/index.ts`
2. Compute it in `extractFeatures()` in `App.tsx`
3. Add it to the correct `FEATURE_GROUPS` entry in `Sidebar.tsx`

```typescript
// types/index.ts
export interface HandFeatures {
  myNewFeature: number  // 0–1 normalised
}

// App.tsx extractFeatures()
myNewFeature: computeMyFeature(landmarks),

// Sidebar.tsx FEATURE_GROUPS
{ key: 'myNewFeature', label: 'My New Feature' }
```

---

## Adding a starter preset

Open `src/data/starterPatches.ts` and use the `mac()` + `preset()` helpers:

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
], 'Category Name')   // category string — groups preset in sidebar
```

Available categories: `'Filter & Tone'`, `'Volume & Dynamics'`, `'Modulation'`, `'Effects'`, `'Envelope'`, `'Gesture-Gated'`, `'Two-Hand'`. Presets without a category appear under `'My Presets'`.

---

## Deploying

The build is a completely static site. Any HTTPS host works.

### Docker (self-hosted)

```bash
# Build image and start with auto-generated self-signed cert
docker compose up -d --build

# To use your own domain name in the cert CN:
SSL_COMMON_NAME=yourdomain.com docker compose up -d --build
```

Serves HTTP on port 80 (redirects to HTTPS) and HTTPS on port 443. The SSL cert is generated on first start and persisted in a Docker volume so it survives restarts.

**Note:** Self-signed certs trigger a one-time browser warning. Users click Advanced → Proceed. For a public audience, replace with a Let's Encrypt cert via Certbot or a Caddy reverse proxy.

### Netlify (easiest)

1. `npm run build`
2. Drag the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

Or connect your GitHub repo — set build command `npm run build`, publish directory `dist`.

### Vercel

```bash
npx vercel --prod
```

### GitHub Pages

Set `base` in `vite.config.ts` before building:

```typescript
export default defineConfig({
  base: '/aether-midi/',
  // ...
})
```

Then push `dist/` to `gh-pages` branch:

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

---

## Key design decisions

**CPU delegate for MediaPipe** — The GPU delegate conflicts with the Three.js WebGL context. CPU is stable and runs at 60fps for hand tracking.

**No postprocessing (bloom)** — `@react-three/postprocessing` v3 requires R3F v9, which has Expo peer dependency conflicts. Bloom is replicated with `THREE.AdditiveBlending` + `CanvasTexture` radial gradients — same visual result, no extra dependency.

**Zustand subscribeWithSelector** — MIDI port and bank-switch events subscribe to specific state slices. The middleware enables `useAppStore.subscribe(selector, callback)` outside React.

**Pre-allocated BufferGeometry** — All Three.js geometries are created once and updated via `needsUpdate = true` per frame. Zero per-frame allocations at 60fps.

**Preset sharing via base64** — Presets are `JSON.stringify`'d then encoded via `btoa(unescape(encodeURIComponent(...)))` to safely handle Unicode in gesture labels.

**IIR smoothing reset on bank switch** — The per-macro exponential smoother accumulates state. Clearing it on bank switch prevents the old preset's CC values from slowly decaying into the new patch.
