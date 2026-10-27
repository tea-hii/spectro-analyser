# SpectroSub & Musical Chord / MIDI Analyzer

A 100% client-side web application for audio frequency analysis, speech phonetic timing, musical chord detection, and MIDI transcription. Runs entirely in your browser with zero dependencies and complete privacy.

---

## 🎙️ Tab 1: Speech Spectrogram & Subtitle Timing

### What It Can Do
- Analyze speech phonetics, vowel formants ($F_0 - F_3$), consonant bursts, and liaison transitions.
- Inspect audio in high-resolution time-frequency spectrogram or acoustic waveform views.
- Create and fine-tune subtitles with sentence-level and karaoke word-level syllable timing.

### Built-in Tools
- **Spectrogram & Waveform Visualizer**: Switch between Dual View, Spectrogram Only, and Waveform Only with frequency/amplitude zooming.
- **Aegisub-Style Timing Handles**: Click and drag start/end markers directly on the spectrogram.
- **Playback Controls**: Play Selection, Play Line (`S`), Play Word (`W`), Play All (`Space`), A-B Repeat Loop (`L`).
- **Speed & Latency Adjustments**: Playback speeds (`0.25x`, `0.5x`, `0.75x`, `0.8x`, `1.0x`, `1.25x`, `1.5x`) and hardware latency compensation slider.
- **Color Palettes**: 5 color LUTs (Aegisub Classic, Inferno, Viridis, Neon Cyber, Paper).

### Supported Upload Files
- **Audio Files**: `.mp3`, `.wav`, `.flac`, `.ogg`, `.webm`, `.aac`, `.m4a`
- **Subtitle / Script Files**: `.ass`, `.srt`, `.json`, `.txt`

### Supported Export Files
- **Subtitles**:
  - `.ass` (Advanced SubStation Alpha with karaoke `\k` tags)
  - `.srt` (SubRip Subtitle)
  - `.json` (Structured cue and word timing data)
  - `.txt` (Plain text transcript)

---

## 🎹 Tab 2: Musical Chord Analyzer & MIDI Studio

### What It Can Do
- Visualize musical pitch energy and harmonics aligned to Western musical semitones.
- Automatically recognize musical chords in real time (Major, Minor, 7ths, Suspended, etc.).
- Transcribe audio automatically into an editable MIDI Piano Roll (Automatic Music Transcription - AMT).
- Audition transcribed notes using built-in virtual instruments.
- *Best suited for solo instrument recordings and isolated stems (Piano, Guitar, Cello, Violin, Vocal stems).*

### Built-in Tools
- **Dynamic CQT (Constant-Q Transform)**: Semitone-aligned spectrogram with pitch presets (Bass, Mid, Guitar, 88-key Piano).
- **12-Tone Chromagram**: Octave-invariant pitch class display with harmonic overtone suppression.
- **Real-Time Chord Hero Badge**: Displays the detected chord at the current playhead position.
- **Interactive MIDI Piano Roll Editor**:
  - ✏️ **Pencil Tool**: Draw new notes with ghost preview and beat grid snapping (`1`, `1/2`, `1/4`, `1/8` bar).
  - ✢ **Move & Resize Tool**: Move notes across pitch/time, or drag left/right edges (`↔`) to adjust start time and duration with ghost preview.
  - 🧹 **Eraser Tool**: Click any note to delete it.
  - ↩️ / ↪️ **Undo & Redo**: 5-step edit history (`Ctrl+Z`, `Ctrl+Y`).
  - 🗑️ **Clear Memory**: Reset MIDI note data.
- **Built-in Synthesizer**: Instant playback audition with Grand Piano, Electric Piano (Rhodes), Acoustic Guitar, or String Ensemble.

### Supported Upload Files
- **Audio Files**: `.mp3`, `.wav`, `.flac`, `.ogg`, `.webm`, `.aac`, `.m4a`

### Supported Export Files
- **MIDI Files**: `.mid` (Standard Type 0 MIDI file, compatible with any DAW such as Ableton Live, FL Studio, Logic Pro, Reaper, MuseScore, Sibelius).

---

## 🚀 Quick Start

### Option 1: Live Web App (GitHub Pages)
Open directly in any modern web browser without installation or setup:

👉 **[https://tea-hii.github.io/spectro-analyser/](https://tea-hii.github.io/spectro-analyser/)**

### Option 2: Run Locally
You can also run a local static server from the project directory:

```bash
# Using Node.js
npx serve . -p 8080

# Or using Python
python -m http.server 8080
```

Then navigate to `http://localhost:8080` in your browser.
