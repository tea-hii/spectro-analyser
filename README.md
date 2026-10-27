# SpectroSub & Musical Chord / MIDI Analyzer

An advanced, 100% client-side digital signal processing (DSP) web application combining a **Speech Spectrogram & Subtitle Timing Studio** with a **Musical Chord Analyzer & MIDI Transcription Workstation**.

Built entirely with standard Web APIs (Web Audio API, Web Workers, HTML5 Canvas 60fps), it runs locally in your browser with **zero dependencies**, **zero server uploads**, and **complete data privacy**.

---

## 🌟 Key Highlights

- **100% Client-Side DSP Processing**: Audio decoding, resampling, STFT spectrogram, Constant-Q Transform (CQT), Chromagram, and MIDI transcription execute directly on your device via multi-threaded Web Workers and Canvas 2D hardware-accelerated rendering.
- **Isolated Two-Tab Architecture**: Tab 1 (Speech Analysis & Subtitling) and Tab 2 (Musical Analysis & MIDI Studio) operate with separate audio contexts, state stores, and file loaders to prevent data leakage and memory collisions.
- **Full Bilingual Localization**: Instant one-click language switching between **English (EN)** and **Vietnamese (VI)** across all toolbars, menus, modals, and tooltips.
- **Smooth Desktop Usability**: Natural vertical mouse wheel scrolling automatically scrolls horizontal toolbars. Full keyboard shortcut support.
- **Hardware Latency Compensation**: Millisecond-accurate audio/visual alignment persistent per device in `localStorage`.

---

## 🎙️ Tab 1: Speech Spectrogram & Subtitle Timing Studio

Designed for phonetics research, foreign language pronunciation training (e.g., French phonetics, nasal vowels, liaisons), and precision subtitle/karaoke timing.

### 1. High-Precision Speech Spectrogram
- **STFT Engine**: 512-point Cooley-Tukey Fast Fourier Transform (FFT) centered with Hann windowing, 16 ms/frame (hop size 256), 16,000 Hz internal mono downsampling.
- **Acoustic Focus**: 128 frequency bins (62.5 Hz/bin) up to 8,000 Hz Nyquist cutoff, covering the complete vocal speech spectrum ($F_0$ to $F_3$ formants).
- **Dynamic Range Optimization**: Pre-emphasis high-frequency boost filter ($y[n] = x[n] - 0.92 \cdot x[n-1]$) with 65 dB dynamic range normalization for sharp consonant bursts and vowel formant tracks.
- **5 Professional Color LUTs**:
  - *Aegisub Classic Blue* (industry standard for subtitle timing)
  - *Inferno* (high-contrast thermal)
  - *Viridis* (colorblind-safe perceptual uniformity)
  - *Neon Cyberpunk* (vibrant contrast)
  - *Phonetic Paper* (clean light theme for research and print)

### 2. Flexible Visualization Modes
- **Dual View**: Stacked time-aligned STFT Spectrogram and Waveform displays.
- **Spectrogram Only**: Maximizes vertical frequency resolution for detailed formant inspection.
- **Waveform Only**: Clean acoustic amplitude envelope for rapid silence and transient detection.
- **Frequency Ruler & Zoom**: Clamping controls for Min/Max frequency range, vertical amplitude boost, and smooth horizontal time zoom (up to sample-level inspection).

### 3. Aegisub-Style Subtitle & Karaoke Timing
- **Interactive Boundary Handles**: Drag start and end markers directly on the spectrogram with millisecond precision.
- **Word-Level / Syllable Slicing**: Divide subtitle sentences into karaoke syllables and timing segments.
- **Versatile Playback Modes**:
  - `Play Selection`: Audition only the highlighted time interval.
  - `Play Line` (`S`): Audition the current active subtitle cue.
  - `Play Word` (`W`): Audition the exact syllable under the playhead cursor.
  - `Play All` (`Space`): Full track playback with synchronized playhead.
- **Variable Playback Speeds**: `0.25x`, `0.5x`, `0.75x`, `0.8x`, `1.0x`, `1.25x`, and `1.5x` with pitch preservation.
- **A-B Repeat Loop (`L`)**: Loop critical audio segments seamlessly for pronunciation drill.
- **Time Clock Displays**: Switch between Elapsed Time (`MM:SS.mmm`), Remaining Time, and Audio Sample/Frame counters.
- **Universal Subtitle Import & Export**:
  - **Advanced SubStation Alpha (`.ass`)**: Full style and karaoke timing tags (`\k`).
  - **SubRip (`.srt`)**: Standard timestamped subtitles.
  - **JSON (`.json`)**: Raw timing data with word arrays.
  - **Plain Text (`.txt`)**: Clean text transcript.

---

## 🎹 Tab 2: Musical Chord Analyzer & MIDI Transcription Workstation

Designed for musicians, transcribers, music theorists, and audio engineers to visualize musical pitch content, identify harmonic structures, and transcribe audio into editable MIDI.

> [!IMPORTANT]
> **Audio Recommendation for Best Results**:
> Tab 2's algorithmic transcription is specifically optimized for **solo instrument recordings** and **isolated stems** (e.g., Solo Grand Piano, Acoustic/Electric Guitar, Cello, Violin, Saxophone, Synth lead, or AI-separated stems from Demucs/Spleeter). Full polyphonic mixed tracks with loud drums, heavy bass, or complex reverbs cause harmonic masking that reduces transcription accuracy.

### 1. Multi-Tier Synchronized Harmonic Visualizer
- **Tier 1: Dynamic Constant-Q Transform (CQT)**:
  - Logarithmic frequency distribution aligned to Western musical semitones (12 bins per octave).
  - Background calculation offloaded to dedicated Web Worker (`chord-worker.js`) to guarantee 60fps UI responsiveness without freezing.
  - **Pitch Range Presets**: Auto-crop active frequency range, Bass (E1–G3), Mid-range (C3–C6), Guitar/Vocal (E2–E6), Full 88-key Piano (A0–C8), or custom selection.
  - Integrated Piano Roll keyboard guide on the vertical axis.
- **Tier 2: 12-Tone Chromagram (Pitch Class Profile)**:
  - Octave-invariant folding condensing all spectral energy into 12 distinct semitones ($C, C\sharp, D, D\sharp, E, F, F\sharp, G, G\sharp, A, A\sharp, B$).
  - Built-in harmonic overtone suppression filters out integer multiples ($2f, 3f, 4f$) to spotlight the true fundamental pitch.
  - Real-time animated **Chord Hero Badge** identifying triads, 7th chords, and modal voicings as the playhead moves.
- **Tier 3: Automatic Music Transcription (AMT) Piano Roll**:
  - Automatically detects sustained pitch peaks and onsets from CQT frames to synthesize editable MIDI note blocks.

### 2. Interactive MIDI Piano Roll Editor
- **Pencil Tool (`✏️`)**:
  - Click and drag on the Piano Roll to draw new notes.
  - Displays a translucent **ghost note preview** during drag.
  - Automatic snapping to beat grid divisions (`1 bar`, `1/2 bar`, `1/4 beat`, `1/8 beat`, or off).
- **Move & Resize Tool (`✢` 4-Direction Crosshair)**:
  - Select and drag notes across time or pitch with live ghost previews.
  - Intelligent edge hovering: cursor transforms into horizontal double arrows (`↔` / `ew-resize`) when hovering over left or right note boundaries to adjust note start time or duration.
  - Non-destructive interaction keeps all surrounding notes rendered cleanly.
- **Eraser Tool (`🧹`)**:
  - Click any note to remove it instantly.
- **5-Step History Undo & Redo (Forward)**:
  - Full state stack supporting up to 5 steps of `Undo` (`Ctrl+Z`) and `Forward/Redo` (`Ctrl+Y` or `Ctrl+Shift+Z`).
- **Clear & Reset (`🗑️`)**:
  - Clear the MIDI canvas tier to start fresh without reloading the audio file.

### 3. Built-in Multi-Instrument Synthesizer
- Audition transcribed notes instantly without requiring an external DAW:
  - 🎹 **Acoustic Grand Piano** (rich harmonic decay)
  - ⚡ **Electric Piano** (warm Rhodes bell tone)
  - 🎸 **Acoustic Guitar** (plucked string transient)
  - 🎻 **String Ensemble** (sustained orchestral pad)
- Real-time MIDI playback synchronized with the playhead cursor.

### 4. Standard MIDI File Export (`.mid`)
- Export your transcribed and edited notes into a **Standard Type 0 MIDI file (`.mid`)**.
- Fully compatible with any Digital Audio Workstation (DAW) or notation software: Ableton Live, FL Studio, Logic Pro, Cubase, Reaper, MuseScore, and Sibelius.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Space` | Play / Pause audio | Global |
| `S` | Play current selected subtitle cue | Tab 1 |
| `W` | Play word / syllable under playhead | Tab 1 |
| `L` | Toggle A-B Repeat Loop | Global |
| `[` | Set subtitle start time at playhead | Tab 1 |
| `]` | Set subtitle end time at playhead | Tab 1 |
| `Left Arrow` / `Right Arrow` | Scrub backward / forward by 100 ms | Global |
| `Shift` + `Left` / `Right` | Scrub backward / forward by 500 ms | Global |
| `+` / `-` | Zoom in / Zoom out time axis | Global |
| `Ctrl` + `Z` | Undo last MIDI edit action | Tab 2 |
| `Ctrl` + `Y` / `Ctrl` + `Shift` + `Z` | Redo / Forward MIDI edit action | Tab 2 |
| `Mouse Wheel` (Vertical) | Horizontal scroll across top toolbars | Global |

---

## 🛠️ Technology Stack & Architecture

```text
c:\Setup\Spectrogram_Analyzer/
├── index.html          # Main application HTML entry point
├── app.js              # Core application logic, DSP pipelines, Canvas renderers, UI controllers
├── style.css           # Modern dark UI theme, responsive layouts, toolbar styling
├── chord-worker.js     # Background Web Worker for multi-threaded CQT and Chromagram calculations
├── assets/             # Bundled demo audio files and sound samples
└── manifest.json       # Progressive Web App configuration
```

- **Frontend Core**: Vanilla ES6+ JavaScript, Zero heavy frameworks, Zero external runtime dependencies.
- **DSP Engine**: Custom Web Audio API pipeline with 512-point Cooley-Tukey FFT, Hann windowing, and Constant-Q Transform.
- **Concurrency**: Web Workers for multi-threaded CQT calculations, keeping the main UI thread at a silky 60 fps.
- **Rendering**: HTML5 Canvas with dual-buffered requestAnimationFrame rendering for waveforms, spectrograms, and piano rolls.
- **Audio Decoding**: Native browser `AudioContext.decodeAudioData` supporting MP3, WAV, FLAC, OGG, WebM, AAC, and M4A.

---

## 🚀 Getting Started

### Option 1: Direct File Launch
Simply double-click `index.html` or open it directly in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari).
*Note: A local web server is recommended to enable the background Web Worker (`chord-worker.js`) without browser CORS restrictions on `file:///` URLs.*

### Option 2: Local Static Web Server
Run any local static server inside the project root:

```bash
# Using Node.js npx serve
npx serve . -p 8080

# Or using Python 3
python -m http.server 8080
```

Then navigate to `http://localhost:8080` in your browser.

---

## 📄 License

Open-source under the MIT License. Contributions and feedback are welcome!
