# Aether MIDI

![Browser](https://img.shields.io/badge/browser-Chrome_%2F_Edge-4285F4?logo=googlechrome&logoColor=white)
![React](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-hand_tracking-FF6F00?logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

> **Control your DAW with hand gestures — no hardware required.** Raise your wrist to ride the fader. Pinch to sweep a filter. Open your palm to throw reverb. Real-time MIDI from your webcam, 60 fps, zero latency compromise.

---

## What it does

Aether MIDI tracks 21 landmarks on your hand via MediaPipe and converts movement into MIDI CC signals — sent through a virtual cable directly into Ableton, Logic, FL Studio, or any MIDI-capable software.

```
Webcam  →  MediaPipe (60fps)  →  Aether MIDI  →  Virtual MIDI cable  →  Your DAW
```

Every gesture is a **macro**: a named mapping from a hand measurement (wrist height, pinch distance, finger spread, named gestures) to a MIDI CC number. Stack multiple macros, switch between **performance banks** mid-set, calibrate ranges to your movement style, dial in smoothing and response curves per macro.

---

## Features

- **30 starter presets** — filters, volume, reverb, modulation, envelope, two-hand setups, gesture-gated macros
- **Performance banks** — 8 slots, keyboard shortcuts `1`–`8`, thumbs-up gesture advances banks hands-free
- **Live calibration** — set your personal input range for any gesture with one click
- **Preset sharing** — export any preset as a portable code, paste to import on any machine
- **3D hand visualiser** — see the 21-point skeleton overlay in real time
- **Debug overlay** — fps, inference latency, raw landmark values (`d` to toggle)
- **Docker + nginx** — self-hosted with self-signed SSL, runs on any machine

---

## Quick start

### Option A — Docker (recommended)

```bash
git clone https://github.com/justynroberts/aether-midi.git
cd aether-midi
docker compose up -d
```

Open **https://localhost** (accept the self-signed cert warning — required for webcam access over HTTPS).

> Set `SSL_COMMON_NAME` in your environment or `.env` to match your machine's hostname or IP if accessing from another device.

### Option B — Local dev

**Requirements:** Node 20+, Chrome or Edge

```bash
git clone https://github.com/justynroberts/aether-midi.git
cd aether-midi
npm install
npm run dev
```

Open the URL printed in the terminal (default **http://localhost:5747**).

> **Note:** Web MIDI requires Chrome or Edge. Firefox and Safari don't support it.

### Option C — Production build

```bash
npm run build
# Serve dist/ with any static host that supports HTTPS
# (HTTPS is required for camera access in production)
```

---

## One-time MIDI setup

Aether MIDI sends MIDI through a virtual cable inside your computer. Set this up once.

**Mac — IAC Driver (built in, free):**

```bash
open -a "Audio MIDI Setup"
```

Window → Show MIDI Studio → double-click **IAC Driver** → tick **Device is online** → Apply.

**Windows — loopMIDI (free):**

Download from [tobias-erichsen.de/software/loopmidi.html](https://tobias-erichsen.de/software/loopmidi.html), open it, type a name, click **+**.

Then in Aether MIDI: select the IAC Bus / loopMIDI port from the port selector at the top. The status dot turns blue when a port is selected and flashes green as MIDI fires.

---

## Gesture sources

| Source | What it measures |
|---|---|
| Wrist height | How high your wrist is in frame |
| Pinch | Distance between thumb tip and index tip |
| Finger spread | Overall spread of all fingers |
| Individual fingers | Curl amount for each finger independently |
| Named gestures | Open palm, fist, peace sign, thumbs up, one finger |
| Two-hand | Independent sources from left and right hand |

---

## Performance banks

The bank bar sits below the header — 8 numbered slots you can each load with a different preset.

| Action | Result |
|---|---|
| Keys `1` – `8` | Jump directly to that bank |
| Hold thumbs up 0.5s | Advance to next occupied bank |

Empty slots are skipped by the thumbs-up cycle. MIDI smoothing resets on every switch for a clean transition.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `1` – `8` | Activate performance bank |
| `d` | Toggle debug overlay |

---

## Browser support

| Browser | Status |
|---|---|
| Chrome | Supported |
| Edge | Supported |
| Firefox | Not supported (no Web MIDI) |
| Safari | Not supported (no Web MIDI) |

---

## Tips

- Good lighting and a plain background behind your hand dramatically improve tracking reliability
- If movement feels jumpy, raise **Smoothing** to 70–80%
- Use **Calibrate** to set your personal input range — don't rely on defaults
- Two-hand presets give independent expressive control: filter on the right, reverb on the left
- Set up and test your performance banks before going on stage

---

## License

MIT — Copyright (c) [FintonLabs](https://fintonlabs.com)
