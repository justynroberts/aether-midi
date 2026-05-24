# Aether MIDI

Control your DAW, synth, or any MIDI device with hand gestures — no hardware required.

Aether MIDI uses your webcam and AI hand tracking to turn everyday movements into real-time MIDI signals. Raise your wrist to increase volume. Pinch your fingers to sweep a filter. Open your palm to add reverb. All without touching a single knob.

---

## What you need

- A computer with a **webcam**
- **Google Chrome** or **Microsoft Edge** (other browsers don't support Web MIDI)
- A **DAW or synthesizer** that accepts MIDI CC input — Ableton Live, Logic Pro, GarageBand, FL Studio, Serum, VCV Rack, and most others work fine
- A **virtual MIDI cable** to connect Aether MIDI to your software (free, one-time setup — see below)

---

## Getting started

### Step 1 — Open the app

Open the app in Chrome or Edge. You'll be asked to allow two things:

- **Camera access** — so Aether MIDI can see your hand
- **MIDI access** — so it can send signals to your DAW

Click Allow for both. These permissions stay on your machine and are never sent anywhere.

### Step 2 — Set up your virtual MIDI cable

Aether MIDI sends MIDI signals through a virtual cable inside your computer. This is a one-time setup.

**On Mac:**

1. Open **Terminal** (search for it in Spotlight) and paste this command, then press Enter:
   ```
   open -a "Audio MIDI Setup"
   ```
2. In the menu bar at the top of the screen, click **Window → Show MIDI Studio**
3. Double-click the **IAC Driver** icon
4. Tick the box that says **"Device is online"**, then click **Apply**
5. Come back to Aether MIDI and refresh the page

**On Windows:**

1. Download **loopMIDI** (free) from [tobias-erichsen.de/software/loopmidi.html](https://tobias-erichsen.de/software/loopmidi.html)
2. Install it, open it, type a name like `AetherMIDI`, and click the **+** button
3. Come back to Aether MIDI and refresh the page

> **Tip:** The green dot at the bottom of the app turns blue once a port is selected, and flashes green whenever MIDI is being sent.

### Step 3 — Select your MIDI port

At the top of the app, you'll see a **port selector**. Choose the IAC Bus (Mac) or your loopMIDI port (Windows) from the list.

### Step 4 — Load a preset and play

Click **Presets** in the sidebar, then **Install 30 starter patches**. You'll get a library of ready-made gesture mappings covering filters, volume, reverb, modulation, and more.

Click **Load** next to any preset, then hold your hand in front of the camera. The 3D visualizer will show your hand skeleton. Move your hand — your DAW should respond.

---

## How it works

Aether MIDI tracks 21 points on your hand 60 times per second. Each **macro** takes one of those measurements — like how high your wrist is, or how far apart your fingers are — and maps it to a MIDI CC number. Your DAW receives those numbers and uses them to control whatever parameter you assign.

```
Your hand  →  Webcam  →  Aether MIDI  →  Virtual MIDI cable  →  Your DAW
```

---

## The 30 starter presets

The built-in library covers the most common expressive controls:

| Category | Examples |
|---|---|
| Filter & Tone | Pinch → Filter Cutoff, Wrist Sweep Filter, Spread → Resonance |
| Volume & Dynamics | Wrist Volume Fader, Open Hand Expression, Pan with Roll |
| Modulation | Pinch Vibrato, Wrist Vibrato, Spread LFO Depth |
| Effects | Reverb Throw, Chorus Wave, Delay Feedback, Tremolo Fist |
| Gesture-Gated | One Finger controls Cutoff, Peace Sign controls Filter + Res |
| Two-Hand | Right hand controls filter, Left hand controls reverb |

Load any of these as a starting point and edit from there.

---

## Creating your own macros

Click **+ Add** at the top of the sidebar to create a new macro. Then click the **pencil icon** to open the editor.

The key settings:

| Setting | What it does |
|---|---|
| **Value Source** | What the hand does — wrist height, pinch, finger spread, individual fingers, named gestures |
| **CC #** | Which MIDI CC number to send (74 = filter cutoff, 7 = volume, 1 = mod wheel, etc.) |
| **Hand** | Whether to track your right hand, left hand, or either |
| **Input Range** | The part of the gesture range you want to use — click Calibrate and perform the gesture |
| **MIDI Output** | The min/max MIDI values to send (0–127) |
| **Smoothing** | How much to smooth out jittery movement — higher = smoother but slower |
| **Response Curve** | Slide left for a slow-start (gentle ramp), right for fast-start (snappy) |
| **Gesture Filter** | Require specific fingers to be up or down before the macro activates |

---

## Saving and sharing presets

**To save your current setup:** Open the Presets panel, type a name, and click Save.

**To share a preset:** Click the **Share** button next to any saved preset. A code is copied to your clipboard. Send it to someone — they paste it into the **Import from code** section and click Save.

**To duplicate a preset:** Click **Dup** next to any preset to create an editable copy.

---

## Tips for getting good results

- **Good lighting** makes tracking much more reliable. Face a window or a lamp.
- **Plain backgrounds** help — avoid busy patterns behind your hand.
- If tracking feels jumpy, increase **Smoothing** to 70–80%.
- Use the **Calibrate** button to set the input range precisely for your movement style.
- Two-hand presets give you independent control — try filter on the right hand and reverb on the left.

---

## Browser support

| Browser | Works? |
|---|---|
| Chrome | Yes |
| Edge | Yes |
| Firefox | No — Web MIDI not supported |
| Safari | No — Web MIDI not supported |

---

## License

MIT License — free to use, modify, and share. See [LICENSE](LICENSE) for details.
