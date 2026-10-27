# BLESS-O-MATIC — Acoustic Sneeze Detection System

> An acoustic companion designed in the **Swiss International Typographic Style (Die Neue Typographie)** that detects human sneezes in real-time and speaks *"Bless You"* with architectural typography and duo-tone aesthetics.  
> Developed for **NID M.Des in New Media Design (Semester 3)**.

---

## 📐 Design Philosophy: Swiss International Typographic Style

- **Strict Duo-Tone Systems**:
  - **`PAPER / INK`** (Default): Archival Swiss poster cream (`#F4F4F0`) paired with Deep Carbon Ink (`#0D0D0D`).
  - **`VERMILLION / INK`**: Classic Swiss International Signal Red (`#FF3500`) paired with Deep Black ink (`#0D0D0D`).
  - **`CARBON / CHALK`**: Inverted pure carbon (`#0C0C0D`) and crisp paper chalk (`#F4F4F0`).
- **Asymmetric Modular Grid**:
  - 1.5px hairline ink rules with razor-sharp geometric rigidity (`border-radius: 0`).
  - Strict typographic hierarchy using geometric grotesque typefaces (`Inter` and `Space Mono`).
  - Zero decorative clutter: no cartoons, no emojis, no glassmorphic blur, no drop shadows.
- **Graphic Inversion Reaction**:
  - When a sneeze transient is detected, the hero block executes an instantaneous typographic inversion (`BLESS YOU.`), echoing classic high-contrast print posters.

---

## ⚡ Core Technical Features

1. **Acoustic Transient Analysis (Web Audio API)**:
   - Analyzes rapid attack transients, RMS amplitude, and high-frequency friction turbulence (2 kHz–8.5 kHz band).
   - Duration-gated (100ms–700ms) to reject conversational speech and low-frequency impacts.
   - Real-time oscilloscope waveform & discrete spectral bar canvas visualizer.
   - Background noise calibration routine.
   - Automatic echo-ducking to prevent self-trigger feedback loops.

2. **Modular Voice Synthesis (Web Speech API)**:
   - 7 preset profiles: Butler, Grandma, CyberBot, Anime, Zen, Sarcastic, and Custom.
   - Minimalist acoustic ping cue (880 Hz sine wave blip).
   - Real-time pitch, rate, and voice synthesis selection.

3. **Chronology Ledger**:
   - Tabular log documenting event index, timestamps, and transient blast percentages.

---

## 🚀 Running the Project

The app is zero-dependency vanilla ES Modules and runs directly in any modern browser:

```bash
# Start with Python
python3 -m http.server 3000

# Or with Node.js
npx serve -l 3000 .
```

Open [http://localhost:3000](http://localhost:3000) in Google Chrome, Safari, or Microsoft Edge.

---

## 📄 License
MIT License. Built for creative exploration and pair programming.
