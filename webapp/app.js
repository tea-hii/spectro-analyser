/**
 * 100% Client-Side Static Web App (PWA)
 * Tab 1: Speech & Audio Spectrogram (16kHz Mono, STFT 512-pt FFT, 60fps Canvas)
 * Tab 2: Musical Chord Analyzer (Web Worker CQT & 12-Tone Chromagram)
 * Strictly zero backend, separate AudioContext per tab (Zero-leakage).
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteLabel(m) {
  const name = NOTE_NAMES[m % 12];
  const oct = Math.floor(m / 12) - 1;
  return `${name}${oct}`;
}

// -------------------------------------------------------------
// 1. Exact Colormaps from Android AudioModel.kt
// -------------------------------------------------------------
const ColorPalettes = {
  AEGISUB_BLUE: 'Aegisub Classic',
  INFERNO: 'Inferno Heatmap',
  VIRIDIS: 'Viridis Bio',
  CYBERPUNK: 'Neon Cyber',
  PHONETIC_GRAY: 'Phonetic Paper'
};

const ColorLUT = {};

function initColorLUTs() {
  for (const key of Object.keys(ColorPalettes)) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      let r = 0, g = 0, b = 0;

      if (key === 'AEGISUB_BLUE') {
        if (t < 0.25) {
          const k = t / 0.25;
          r = 0.02 * (1 - k) + 0.05 * k;
          g = 0.04 * (1 - k) + 0.15 * k;
          b = 0.15 * (1 - k) + 0.45 * k;
        } else if (t < 0.6) {
          const k = (t - 0.25) / 0.35;
          r = 0.05 * (1 - k);
          g = 0.15 * (1 - k) + 0.75 * k;
          b = 0.45 * (1 - k) + 0.95 * k;
        } else if (t < 0.85) {
          const k = (t - 0.6) / 0.25;
          r = 0.6 * k;
          g = 0.75 * (1 - k) + 0.95 * k;
          b = 0.95 * (1 - k) + 1.0 * k;
        } else {
          const k = (t - 0.85) / 0.15;
          r = 0.6 * (1 - k) + 1.0 * k;
          g = 0.95 * (1 - k) + 1.0 * k;
          b = 1.0;
        }
      } else if (key === 'INFERNO') {
        if (t < 0.3) {
          const k = t / 0.3;
          r = 0.05 + 0.4 * k; g = 0.02; b = 0.1 + 0.4 * k;
        } else if (t < 0.65) {
          const k = (t - 0.3) / 0.35;
          r = 0.45 + 0.5 * k; g = 0.02 + 0.45 * k; b = 0.5 * (1 - k) + 0.05 * k;
        } else if (t < 0.88) {
          const k = (t - 0.65) / 0.23;
          r = 0.95 + 0.05 * k; g = 0.47 * (1 - k) + 0.48 * k; b = 0.05 + 0.2 * k;
        } else {
          const k = (t - 0.88) / 0.12;
          r = 1.0; g = 0.95 + 0.05 * k; b = 0.25 + 0.75 * k;
        }
      } else if (key === 'VIRIDIS') {
        if (t < 0.33) {
          const k = t / 0.33;
          r = 0.26 * (1 - k) + 0.18 * k; g = 0.45 * k; b = 0.33 * (1 - k) + 0.55 * k;
        } else if (t < 0.66) {
          const k = (t - 0.33) / 0.33;
          r = 0.18 * (1 - k) + 0.12 * k; g = 0.45 * (1 - k) + 0.74 * k; b = 0.55 * (1 - k) + 0.45 * k;
        } else {
          const k = (t - 0.66) / 0.34;
          r = 0.12 * (1 - k) + 0.98 * k; g = 0.74 * (1 - k) + 0.90 * k; b = 0.45 * (1 - k) + 0.15 * k;
        }
      } else if (key === 'CYBERPUNK') {
        if (t < 0.5) {
          const k = t / 0.5;
          r = 0.08 + 0.8 * k; g = 0.05; b = 0.25 + 0.6 * k;
        } else {
          const k = (t - 0.5) / 0.5;
          r = 0.88 * (1 - k); g = 0.05 * (1 - k) + 0.95 * k; b = 0.85 * (1 - k) + 1.0 * k;
        }
      } else { // PHONETIC_GRAY
        const v = Math.max(0.05, Math.min(0.98, 1.0 - t));
        r = v; g = v; b = v;
      }

      const R = Math.floor(r * 255);
      const G = Math.floor(g * 255);
      const B = Math.floor(b * 255);
      table[i] = (255 << 24) | (B << 16) | (G << 8) | R;
    }
    ColorLUT[key] = table;
  }
}
initColorLUTs();

// -------------------------------------------------------------
// 2. Audio Engine (Isolated per Tab for Zero-Leakage)
// -------------------------------------------------------------
class AudioEngine {
  constructor(name = 'Tab') {
    this.name = name;
    this.audioCtx = null;
    this.audioBuffer = null;
    this.samples16k = null;
    this.sampleRate = 16000;
    this.durationMs = 0;
    this.trackName = 'Chưa nạp file';

    this.minPeaks = null;
    this.maxPeaks = null;
    this.peakBucketMs = 5.0;

    this.isPlaying = false;
    this.isLooping = false;
    this.playbackSpeed = 1.0;
    this.currentPositionMs = 0;
    this.activeSourceNode = null;
    this.startContextTime = 0;
    this.startOffsetMs = 0;

    this.loopStartMs = 0;
    this.loopEndMs = 0;

    this.onPositionUpdate = () => {};
    this.onPlayStateChange = () => {};
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  computeEnvelope(samples, sampleRate, bucketMs = 5.0) {
    if (!samples || samples.length === 0) {
      return { minPeaks: new Float32Array(0), maxPeaks: new Float32Array(0) };
    }
    const samplesPerBucket = Math.max(1, Math.floor((bucketMs * sampleRate) / 1000.0));
    const numBuckets = Math.max(1, Math.ceil(samples.length / samplesPerBucket));
    const minPeaks = new Float32Array(numBuckets);
    const maxPeaks = new Float32Array(numBuckets);

    for (let b = 0; b < numBuckets; b++) {
      const start = b * samplesPerBucket;
      const end = Math.min(samples.length, start + samplesPerBucket);
      let minVal = 0, maxVal = 0;
      for (let i = start; i < end; i++) {
        const s = samples[i];
        if (s < minVal) minVal = s;
        if (s > maxVal) maxVal = s;
      }
      minPeaks[b] = minVal;
      maxPeaks[b] = maxVal;
    }
    return { minPeaks, maxPeaks };
  }

  resampleToMono16k(sourceMono, srcRate) {
    const targetRate = 16000;
    if (srcRate === targetRate) return sourceMono;
    const ratio = srcRate / targetRate;
    const outputLength = Math.max(1, Math.floor(sourceMono.length / ratio));
    const output = new Float32Array(outputLength);

    if (ratio > 1.0) {
      for (let i = 0; i < outputLength; i++) {
        const srcCenter = i * ratio;
        const start = Math.floor(srcCenter);
        const end = Math.min(sourceMono.length, Math.floor(srcCenter + ratio));
        let sum = 0, count = 0;
        for (let k = start; k < end; k++) {
          sum += sourceMono[k];
          count++;
        }
        output[i] = count > 0 ? (sum / count) : sourceMono[start];
      }
    } else {
      for (let i = 0; i < outputLength; i++) {
        const srcPos = i * ratio;
        const idx0 = Math.floor(srcPos);
        const idx1 = Math.min(sourceMono.length - 1, idx0 + 1);
        const frac = srcPos - idx0;
        output[i] = sourceMono[idx0] * (1 - frac) + sourceMono[idx1] * frac;
      }
    }
    return output;
  }

  async loadAudioBuffer(arrayBuffer, name, onProgress = () => {}) {
    onProgress(0.1);
    const ctx = this.getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    onProgress(0.35);

    const numChannels = audioBuffer.numberOfChannels;
    const srcLength = audioBuffer.length;
    const srcRate = audioBuffer.sampleRate;

    const monoRaw = new Float32Array(srcLength);
    for (let c = 0; c < numChannels; c++) {
      const chData = audioBuffer.getChannelData(c);
      for (let i = 0; i < srcLength; i++) {
        monoRaw[i] += chData[i] / numChannels;
      }
    }

    onProgress(0.45);
    const samples16k = this.resampleToMono16k(monoRaw, srcRate);
    const durationMs = Math.round((samples16k.length / 16000) * 1000);
    const { minPeaks, maxPeaks } = this.computeEnvelope(samples16k, 16000, 5.0);

    this.audioBuffer = audioBuffer;
    this.samples16k = samples16k;
    this.sampleRate = 16000;
    this.durationMs = durationMs;
    this.trackName = name;
    this.minPeaks = minPeaks;
    this.maxPeaks = maxPeaks;
    this.loopStartMs = 0;
    this.loopEndMs = Math.min(durationMs, 3000);
    this.currentPositionMs = 0;

    return { samples16k, durationMs, trackName: name };
  }

  play(offsetMs = null) {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();
    if (this.isPlaying) this.stop();

    const pos = (offsetMs !== null) ? offsetMs : this.currentPositionMs;
    const clampedPos = Math.max(0, Math.min(this.durationMs, pos));
    const offsetSec = clampedPos / 1000.0;

    const source = ctx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.playbackRate.value = this.playbackSpeed;
    source.connect(ctx.destination);
    source.start(0, offsetSec);

    this.activeSourceNode = source;
    this.startContextTime = ctx.currentTime;
    this.startOffsetMs = clampedPos;
    this.currentPositionMs = clampedPos;
    this.isPlaying = true;
    this.onPlayStateChange(true);

    source.onended = () => {
      if (this.activeSourceNode === source) {
        if (this.isLooping && this.durationMs > 0) {
          const nextStart = (this.loopEndMs > this.loopStartMs) ? this.loopStartMs : 0;
          this.play(nextStart);
        } else {
          this.isPlaying = false;
          this.activeSourceNode = null;
          this.onPlayStateChange(false);
        }
      }
    };
  }

  stop() {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (_) {}
      this.activeSourceNode = null;
    }
    this.isPlaying = false;
    this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      if (this.currentPositionMs >= this.durationMs - 20) {
        this.currentPositionMs = 0;
      }
      this.play(this.currentPositionMs);
    }
  }

  seek(ms) {
    const clamped = Math.max(0, Math.min(this.durationMs, Math.round(ms)));
    this.currentPositionMs = clamped;
    if (this.isPlaying) {
      this.play(clamped);
    } else {
      this.onPositionUpdate(clamped);
    }
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
    if (this.activeSourceNode) {
      this.activeSourceNode.playbackRate.value = speed;
      const ctx = this.getAudioContext();
      this.startOffsetMs = this.getCurrentPosition();
      this.startContextTime = ctx.currentTime;
    }
  }

  getCurrentPosition() {
    if (!this.isPlaying || !this.audioCtx) {
      return this.currentPositionMs;
    }
    const elapsedSec = this.audioCtx.currentTime - this.startContextTime;
    const currentMs = this.startOffsetMs + elapsedSec * 1000.0 * this.playbackSpeed;

    if (this.isLooping && this.loopEndMs > this.loopStartMs && currentMs >= this.loopEndMs) {
      this.play(this.loopStartMs);
      return this.loopStartMs;
    }

    if (currentMs >= this.durationMs) {
      this.stop();
      this.currentPositionMs = this.durationMs;
      return this.durationMs;
    }

    this.currentPositionMs = Math.round(currentMs);
    return this.currentPositionMs;
  }
}

// -------------------------------------------------------------
// 3. Tab 1: Exact Android FFT Engine & Subtitle Models
// -------------------------------------------------------------
class FFTEngine {
  constructor(fftSize = 512, hopSize = 256, targetBins = 128) {
    this.fftSize = fftSize;
    this.hopSize = hopSize;
    this.targetBins = targetBins;
    this.halfFft = fftSize / 2;

    this.hannWindow = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      this.hannWindow[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (fftSize - 1)));
    }

    this.bitRev = new Int32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      let j = i, rev = 0, temp = fftSize;
      while (temp > 1) {
        rev = (rev << 1) | (j & 1);
        j >>= 1;
        temp >>= 1;
      }
      this.bitRev[i] = rev;
    }

    this.cosTable = new Float32Array(this.halfFft);
    this.sinTable = new Float32Array(this.halfFft);
    for (let i = 0; i < this.halfFft; i++) {
      this.cosTable[i] = Math.cos((-2.0 * Math.PI * i) / fftSize);
      this.sinTable[i] = Math.sin((-2.0 * Math.PI * i) / fftSize);
    }

    this.binStart = new Int32Array(targetBins);
    this.binEnd = new Int32Array(targetBins);
    this.binInvCount = new Float32Array(targetBins);
    for (let b = 0; b < targetBins; b++) {
      const s = Math.floor((b * this.halfFft) / targetBins);
      const e = Math.max(s + 1, Math.floor(((b + 1) * this.halfFft) / targetBins));
      this.binStart[b] = Math.min(s, this.halfFft - 1);
      this.binEnd[b] = Math.min(e, this.halfFft);
      this.binInvCount[b] = 1.0 / Math.max(1, this.binEnd[b] - this.binStart[b]);
    }
  }

  fft(real, imag) {
    const n = this.fftSize;
    for (let i = 0; i < n; i++) {
      const j = this.bitRev[i];
      if (i < j) {
        const tr = real[i]; real[i] = real[j]; real[j] = tr;
        const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = n / len;
      for (let j = 0; j < halfLen; j++) {
        const twiddleIdx = j * step;
        const wr = this.cosTable[twiddleIdx];
        const wi = this.sinTable[twiddleIdx];
        for (let i = j; i < n; i += len) {
          const k = i + halfLen;
          const tr = wr * real[k] - wi * imag[k];
          const ti = wr * imag[k] + wi * real[k];
          real[k] = real[i] - tr;
          imag[k] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;
        }
      }
    }
  }

  async computeSpectrogramAsync(samples, sampleRate, onProgress = () => {}) {
    if (!samples || samples.length === 0) return null;
    const totalSamples = samples.length;
    const durationMs = Math.round((totalSamples / sampleRate) * 1000);
    const numFrames = Math.max(1, Math.ceil(totalSamples / this.hopSize));
    const packedMagnitudes = new Uint8Array(numFrames * this.targetBins);

    const real = new Float32Array(this.fftSize);
    const imag = new Float32Array(this.fftSize);
    const rawMagnitudes = new Float32Array(this.halfFft);
    let maxQ = 0, minQ = 255;
    const chunkSize = 250;

    for (let fStart = 0; fStart < numFrames; fStart += chunkSize) {
      const fEnd = Math.min(numFrames, fStart + chunkSize);
      for (let f = fStart; f < fEnd; f++) {
        const center = f * this.hopSize;
        const start = center - this.halfFft;
        for (let i = 0; i < this.fftSize; i++) {
          const idx = start + i;
          const cur = (idx >= 0 && idx < totalSamples) ? samples[idx] : 0.0;
          const prev = (i > 0 && idx - 1 >= 0 && idx - 1 < totalSamples) ? samples[idx - 1] : cur;
          // Pre-emphasis filter: x[n] - 0.92 * x[n-1]
          real[i] = (cur - 0.92 * prev) * this.hannWindow[i];
          imag[i] = 0.0;
        }

        this.fft(real, imag);

        for (let i = 0; i < this.halfFft; i++) {
          rawMagnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }

        const baseIdx = f * this.targetBins;
        for (let b = 0; b < this.targetBins; b++) {
          let sum = 0;
          for (let k = this.binStart[b]; k < this.binEnd[b]; k++) {
            sum += rawMagnitudes[k];
          }
          const avg = sum * this.binInvCount[b];
          // 20 * log10(avg + 1e-6), [-90dB .. +37.5dB] -> 0.5dB steps [0 .. 255]
          const db = 20.0 * Math.log10(avg + 1e-6);
          const q = Math.max(0, Math.min(255, Math.floor((db + 90.0) * 2.0)));
          packedMagnitudes[baseIdx + b] = q;
          if (q > maxQ) maxQ = q;
          if (q < minQ) minQ = q;
        }
      }
      onProgress(0.5 + 0.45 * (fEnd / numFrames));
      await new Promise(r => setTimeout(r, 0));
    }

    // Dynamic range normalization: 65 dB (130 steps) into [0 .. 255]
    const dynamicRangeQ = 130;
    const floorQ = Math.max(minQ, maxQ - dynamicRangeQ);
    const rangeQ = Math.max(1, maxQ - floorQ);
    for (let idx = 0; idx < packedMagnitudes.length; idx++) {
      const q = packedMagnitudes[idx];
      packedMagnitudes[idx] = Math.max(0, Math.min(255, Math.floor(((q - floorQ) * 255) / rangeQ)));
    }
    onProgress(1.0);

    return {
      packedMagnitudes,
      numFrames,
      timeResolutionMs: (this.hopSize / 16000) * 1000,
      maxFrequencyHz: 8000,
      numBins: this.targetBins,
      durationMs
    };
  }
}

const CueClockState = {
  OFF: 'OFF',
  SHOW_LOCKED: 'SHOW_LOCKED',
  EDITING_TIME: 'EDITING_TIME',
  EDITING_WORDS: 'EDITING_WORDS'
};

class SubtitleCue {
  constructor(data) {
    this.id = data.id || ('cue_' + Math.random().toString(36).substr(2, 9));
    this.startMs = Math.max(0, Math.round(data.startMs || 0));
    this.endMs = Math.max(this.startMs + 50, Math.round(data.endMs || this.startMs + 2000));
    this.text = (data.text || '').trim();
    this.actor = (data.actor || '').trim();
    this.clockState = data.clockState || CueClockState.SHOW_LOCKED;
    this.wordTimings = data.wordTimings || [];
  }

  resolvedWordTimings() {
    const rawWords = this.text.split(/\s+/).filter(w => w.length > 0);
    if (rawWords.length === 0) return [];
    const dur = Math.max(rawWords.length * 30, this.endMs - this.startMs);
    const safeEnd = this.startMs + dur;
    let prevMinStart = this.startMs;

    return rawWords.map((w, idx) => {
      const defaultStart = Math.round(this.startMs + (dur * idx) / rawWords.length);
      const candStart = (this.wordTimings[idx] && typeof this.wordTimings[idx].startMs === 'number')
        ? this.wordTimings[idx].startMs : defaultStart;
      const remainingWords = Math.max(0, rawWords.length - 1 - idx);
      const maxAllowed = Math.max(prevMinStart, safeEnd - remainingWords * 25 - 20);
      const clamped = Math.max(prevMinStart, Math.min(maxAllowed, candStart));
      prevMinStart = Math.min(safeEnd, clamped + 20);
      return { word: w, startMs: clamped };
    });
  }
}

const TimeFormatter = {
  formatMinuteSecond(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },
  formatFull(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const millis = Math.max(0, ms % 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
};

// -------------------------------------------------------------
// 4. Tab 1: Spectrogram Canvas Renderer (60fps Virtualized)
// -------------------------------------------------------------
class SpectrogramCanvasRenderer {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.audio = audioEngine;
    this.spectrogram = null;
    this.cues = [];
    this.activeCue = null;

    this.viewMode = 'DUAL';
    this.paletteKey = 'AEGISUB_BLUE';
    this.zoomFactor = 40.0;
    this.scrollOffsetMs = 0;
    this.selectionStartMs = 0;
    this.selectionEndMs = 2100;
    this.isTimeEditUnlocked = false;

    this.rulerHeight = 28;
    this.minimapHeight = 28;
    this.subOverlayHeight = 28;

    this.tileCanvas = document.createElement('canvas');
    this.tileCtx = this.tileCanvas.getContext('2d', { alpha: false });

    this.initEvents();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  get msPerPixel() {
    return Math.max(0.5, 100.0 / Math.max(5.0, this.zoomFactor));
  }

  timeToX(ms) {
    return (ms - this.scrollOffsetMs) / this.msPerPixel;
  }

  xToTime(x) {
    return this.scrollOffsetMs + x * this.msPerPixel;
  }

  clampScroll() {
    if (!this.audio || this.audio.durationMs <= 0) return;
    const visibleWindowMs = this.width * this.msPerPixel;
    const minScroll = -200;
    const maxScroll = Math.max(minScroll, this.audio.durationMs + 200 - visibleWindowMs);
    this.scrollOffsetMs = Math.max(minScroll, Math.min(maxScroll, this.scrollOffsetMs));
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx, w = this.width, h = this.height;

    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, w, h);

    if (!this.audio || this.audio.durationMs <= 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa tải file âm thanh Tab 1. Bấm "Tải File" hoặc chọn Bài Mẫu để bắt đầu.', w / 2, h / 2);
      return;
    }

    this.clampScroll();

    const rulerH = this.rulerHeight;
    const miniH = this.minimapHeight;
    const mainH = h - rulerH - miniH;

    let specH = 0, waveH = 0, specY = rulerH, waveY = rulerH;
    if (this.viewMode === 'DUAL') {
      specH = Math.floor(mainH * 0.62);
      waveH = mainH - specH;
      waveY = specY + specH;
    } else if (this.viewMode === 'SPECTROGRAM') {
      specH = mainH;
    } else {
      waveH = mainH;
    }

    if (specH > 0 && this.spectrogram && this.spectrogram.numFrames > 0) {
      this.drawSpectrogram(ctx, 0, specY, w, specH);
    }
    if (waveH > 0) {
      this.drawWaveform(ctx, 0, waveY, w, waveH);
    }

    this.drawSubtitlesOverlay(ctx, 0, rulerH, w);
    this.drawSelectionWindow(ctx, 0, rulerH, w, mainH);
    this.drawTimeRuler(ctx, 0, 0, w, rulerH);

    // Playhead line
    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
    if (playheadX >= -10 && playheadX <= w + 10) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, rulerH + mainH);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, rulerH);
      ctx.lineTo(playheadX + 6, rulerH);
      ctx.lineTo(playheadX, rulerH + 9);
      ctx.closePath();
      ctx.fill();
    }

    this.drawMinimap(ctx, 0, h - miniH, w, miniH);
  }

  drawSpectrogram(ctx, x, y, width, height) {
    const spec = this.spectrogram;
    const numFrames = spec.numFrames;
    const numBins = spec.numBins;
    const packed = spec.packedMagnitudes;
    const lut = ColorLUT[this.paletteKey] || ColorLUT.AEGISUB_BLUE;

    const vStartMs = this.xToTime(0);
    const vEndMs = this.xToTime(width);
    const fStart = Math.max(0, Math.floor(vStartMs / spec.timeResolutionMs));
    const fEnd = Math.min(numFrames - 1, Math.ceil(vEndMs / spec.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;
    if (renderFrames <= 0) return;

    if (this.tileCanvas.width !== renderFrames || this.tileCanvas.height !== numBins) {
      this.tileCanvas.width = renderFrames;
      this.tileCanvas.height = numBins;
    }

    const imgData = this.tileCtx.createImageData(renderFrames, numBins);
    const buf32 = new Uint32Array(imgData.data.buffer);

    for (let fIdx = 0; fIdx < renderFrames; fIdx++) {
      const frame = fStart + fIdx;
      const base = frame * numBins;
      for (let b = 0; b < numBins; b++) {
        const q = packed[base + b];
        const color = lut[q];
        const row = numBins - 1 - b;
        buf32[row * renderFrames + fIdx] = color;
      }
    }

    this.tileCtx.putImageData(imgData, 0, 0);

    const startX = this.timeToX(fStart * spec.timeResolutionMs);
    const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.tileCanvas, 0, 0, renderFrames, numBins, startX, y, endX - startX, height);

    // Subtle Frequency grid lines (Hz)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let khz = 1; khz <= 7; khz++) {
      const freqY = y + height - (khz / 8.0) * height;
      ctx.beginPath();
      ctx.moveTo(0, freqY);
      ctx.lineTo(width, freqY);
      ctx.stroke();
    }
  }

  drawWaveform(ctx, x, y, width, height) {
    const minP = this.audio.minPeaks, maxP = this.audio.maxPeaks;
    if (!minP || minP.length === 0) return;
    const centerY = y + height / 2;
    const halfH = height / 2 - 2;

    ctx.fillStyle = '#0a101d';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath(); ctx.moveTo(x, centerY); ctx.lineTo(x + width, centerY); ctx.stroke();

    const bucketMs = this.audio.peakBucketMs;
    const bStart = Math.max(0, Math.floor(this.xToTime(0) / bucketMs));
    const bEnd = Math.min(minP.length - 1, Math.ceil(this.xToTime(width) / bucketMs));

    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.beginPath();
    for (let b = bStart; b <= bEnd; b++) {
      const px = this.timeToX(b * bucketMs);
      const topY = centerY - maxP[b] * halfH;
      const botY = centerY - minP[b] * halfH;
      ctx.rect(px, topY, Math.max(1, 100 / this.zoomFactor * 0.05), Math.max(1, botY - topY));
    }
    ctx.fill();
  }

  drawSubtitlesOverlay(ctx, x, y, width) {
    if (!this.cues) return;
    this.cues.forEach(cue => {
      if (cue.clockState === CueClockState.OFF) return;
      const startX = this.timeToX(cue.startMs);
      const endX = this.timeToX(cue.endMs);
      const cueW = endX - startX;
      if (endX < 0 || startX > width) return;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, y + 2, cueW, this.subOverlayHeight - 4);
      ctx.clip();

      const isActive = this.activeCue && this.activeCue.id === cue.id;
      ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(startX, y + 2, cueW, this.subOverlayHeight - 4);
      ctx.strokeStyle = isActive ? '#38bdf8' : '#475569';
      ctx.strokeRect(startX, y + 2, cueW, this.subOverlayHeight - 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cue.text, startX + 6, y + this.subOverlayHeight / 2);
      ctx.restore();

      if (cue.clockState === CueClockState.EDITING_WORDS) {
        const words = cue.resolvedWordTimings();
        words.forEach(wt => {
          const wx = this.timeToX(wt.startMs);
          if (wx >= 0 && wx <= width) {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx, this.height - this.minimapHeight); ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }
    });
  }

  drawSelectionWindow(ctx, x, y, width, height) {
    const startX = this.timeToX(this.selectionStartMs);
    const endX = this.timeToX(this.selectionEndMs);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(Math.max(0, startX), y, Math.min(width, endX - startX), height);

    if (startX >= -10 && startX <= width + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX, y + height); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(startX, y, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('[', startX + 4, y + 13);
    }

    if (endX >= -10 && endX <= width + 10) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(endX, y); ctx.lineTo(endX, y + height); ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(endX - 16, y, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(']', endX - 12, y + 13);
    }
  }

  drawTimeRuler(ctx, x, y, width, height) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + width, y + height); ctx.stroke();

    const msPerPx = this.msPerPixel;
    let stepMs = 1000;
    if (msPerPx < 1.0) stepMs = 200;
    else if (msPerPx < 2.5) stepMs = 500;
    else if (msPerPx < 6.0) stepMs = 1000;
    else stepMs = 2000;

    const vStartMs = this.xToTime(0);
    const vEndMs = this.xToTime(width);
    const firstTick = Math.floor(vStartMs / stepMs) * stepMs;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let t = firstTick; t <= vEndMs; t += stepMs) {
      const tx = this.timeToX(t);
      if (tx >= 0 && tx <= width) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath(); ctx.moveTo(tx, y + height - 8); ctx.lineTo(tx, y + height); ctx.stroke();
        ctx.fillText(TimeFormatter.formatFull(t), tx + 4, y + 16);
      }
    }
  }

  drawMinimap(ctx, x, y, width, height) {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(x, y, width, height);
    const durMs = this.audio.durationMs;
    if (durMs <= 0) return;

    const thumbStartMs = Math.max(0, this.scrollOffsetMs);
    const thumbEndMs = Math.min(durMs, this.scrollOffsetMs + width * this.msPerPixel);
    const thumbX = (thumbStartMs / durMs) * width;
    const thumbW = Math.max(14, ((thumbEndMs - thumbStartMs) / durMs) * width);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(thumbX, y, thumbW, height);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(thumbX, y, thumbW, height);
  }

  initEvents() {
    const c = this.canvas;
    let isDragging = false, dragTarget = 'PAN', dragStartX = 0, dragStartScrollMs = 0;

    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX) - c.getBoundingClientRect().left;

    const onStart = (e) => {
      isDragging = true;
      dragStartX = getX(e);
      dragStartScrollMs = this.scrollOffsetMs;

      if (Math.abs(dragStartX - this.timeToX(this.selectionStartMs)) <= 14) {
        dragTarget = 'START';
      } else if (Math.abs(dragStartX - this.timeToX(this.selectionEndMs)) <= 14) {
        dragTarget = 'END';
      } else {
        dragTarget = 'PAN';
      }
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const curX = getX(e);
      const curTime = this.xToTime(curX);

      if (dragTarget === 'START') {
        this.selectionStartMs = Math.max(0, Math.min(this.selectionEndMs - 50, Math.round(curTime)));
        if (this.activeCue) this.activeCue.startMs = this.selectionStartMs;
      } else if (dragTarget === 'END') {
        this.selectionEndMs = Math.max(this.selectionStartMs + 50, Math.min(this.audio.durationMs, Math.round(curTime)));
        if (this.activeCue) this.activeCue.endMs = this.selectionEndMs;
      } else {
        this.scrollOffsetMs = dragStartScrollMs - (curX - dragStartX) * this.msPerPixel;
      }
      this.render();
    };

    const onEnd = (e) => {
      if (isDragging && dragTarget === 'PAN') {
        const curX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - c.getBoundingClientRect().left;
        if (Math.abs(curX - dragStartX) < 5) {
          this.audio.seek(this.xToTime(curX));
        }
      }
      isDragging = false;
      this.render();
    };

    c.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    c.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const mouseX = e.clientX - c.getBoundingClientRect().left;
      const timeAtMouse = this.xToTime(mouseX);
      const delta = e.deltaY < 0 ? 8 : -8;
      const newZoom = Math.max(5, Math.min(200, this.zoomFactor + delta));
      if (newZoom !== this.zoomFactor) {
        this.zoomFactor = newZoom;
        this.scrollOffsetMs = timeAtMouse - mouseX * this.msPerPixel;
        this.render();
      }
    }, { passive: false });
  }
}

// -------------------------------------------------------------
// 5. Tab 2: Musical Chord Analyzer (Stacked CQT & Chromagram)
// -------------------------------------------------------------
class MusicalChordAnalyzer {
  constructor(cqtCanvas, chromaCanvas, audioEngine) {
    this.cqtCanvas = cqtCanvas;
    this.chromaCanvas = chromaCanvas;
    this.cqtCtx = cqtCanvas.getContext('2d', { alpha: false });
    this.chromaCtx = chromaCanvas.getContext('2d', { alpha: false });
    this.audio = audioEngine;

    this.data = null;
    this.paletteKey = 'INFERNO';
    this.zoomFactor = 35.0;
    this.scrollOffsetMs = 0;

    // Pitch Range Preset ('AUTO', 'GUITAR_KEYS', 'BASS_MID', 'VOCAL_LEAD', 'FULL')
    this.pitchRangeMode = 'AUTO';
    this.activeMinMidi = 38; // D2 (~73.4 Hz)
    this.activeMaxMidi = 64; // E5 (~659.2 Hz)

    this.rulerHeight = 24;
    this.minimapHeight = 24;
    this.leftGutterWidth = 54;

    this.cqtTileCanvas = document.createElement('canvas');
    this.cqtTileCtx = this.cqtTileCanvas.getContext('2d', { alpha: false });

    this.chromaTileCanvas = document.createElement('canvas');
    this.chromaTileCtx = this.chromaTileCanvas.getContext('2d', { alpha: false });

    this.initEvents();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    const rect1 = this.cqtCanvas.getBoundingClientRect();
    if (rect1.width > 0 && rect1.height > 0) {
      this.cqtCanvas.width = Math.round(rect1.width * dpr);
      this.cqtCanvas.height = Math.round(rect1.height * dpr);
      this.cqtCtx.scale(dpr, dpr);
      this.cqtWidth = rect1.width;
      this.cqtHeight = rect1.height;
    }

    const rect2 = this.chromaCanvas.getBoundingClientRect();
    if (rect2.width > 0 && rect2.height > 0) {
      this.chromaCanvas.width = Math.round(rect2.width * dpr);
      this.chromaCanvas.height = Math.round(rect2.height * dpr);
      this.chromaCtx.scale(dpr, dpr);
      this.chromaWidth = rect2.width;
      this.chromaHeight = rect2.height;
    }

    this.render();
  }

  get msPerPixel() {
    return Math.max(0.5, 100.0 / Math.max(5.0, this.zoomFactor));
  }

  timeToX(ms) {
    return this.leftGutterWidth + (ms - this.scrollOffsetMs) / this.msPerPixel;
  }

  xToTime(x) {
    return this.scrollOffsetMs + (x - this.leftGutterWidth) * this.msPerPixel;
  }

  updatePitchRangeBounds() {
    if (!this.data) return;
    if (this.pitchRangeMode === 'AUTO') {
      this.activeMinMidi = this.data.autoMinMidi;
      this.activeMaxMidi = this.data.autoMaxMidi;
    } else if (this.pitchRangeMode === 'GUITAR_KEYS') {
      this.activeMinMidi = 40; // E2
      this.activeMaxMidi = 88; // E6
    } else if (this.pitchRangeMode === 'BASS_MID') {
      this.activeMinMidi = 24; // C1
      this.activeMaxMidi = 72; // C5
    } else if (this.pitchRangeMode === 'VOCAL_LEAD') {
      this.activeMinMidi = 45; // A2
      this.activeMaxMidi = 81; // A5
    } else { // FULL
      this.activeMinMidi = this.data.minMidi;
      this.activeMaxMidi = this.data.maxMidi;
    }
  }

  clampScroll() {
    if (!this.audio || this.audio.durationMs <= 0) return;
    const viewW = (this.cqtWidth || 800) - this.leftGutterWidth;
    const visibleWindowMs = viewW * this.msPerPixel;
    const minScroll = -200;
    const maxScroll = Math.max(minScroll, this.audio.durationMs + 200 - visibleWindowMs);
    this.scrollOffsetMs = Math.max(minScroll, Math.min(maxScroll, this.scrollOffsetMs));
  }

  render() {
    this.clampScroll();
    this.renderCqtTier();
    this.renderChromaTier();
    this.updateCurrentChordIndicator();
  }

  renderCqtTier() {
    if (!this.cqtCtx || !this.cqtWidth || !this.cqtHeight) return;
    const ctx = this.cqtCtx, w = this.cqtWidth, h = this.cqtHeight;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);
    if (!this.data) return;

    this.updatePitchRangeBounds();

    const rulerH = this.rulerHeight;
    const graphH = h - rulerH;
    const gutterW = this.leftGutterWidth;

    const minM = this.activeMinMidi;
    const maxM = this.activeMaxMidi;
    const renderedSemitones = maxM - minM + 1;
    const semitoneH = graphH / renderedSemitones;

    // Piano Roll Notes labels on left
    for (let m = minM; m <= maxM; m++) {
      const row = maxM - m;
      const y = rulerH + row * semitoneH;
      const pc = m % 12;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      ctx.fillStyle = isBlack ? '#111827' : '#1e293b';
      ctx.fillRect(0, y, gutterW, semitoneH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(0, y, gutterW, semitoneH);

      ctx.fillStyle = (pc === 0) ? '#38bdf8' : (isBlack ? '#94a3b8' : '#f8fafc');
      ctx.font = (pc === 0 ? 'bold ' : '') + '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(midiToNoteLabel(m), gutterW - 6, y + semitoneH / 2);

      ctx.strokeStyle = (pc === 0) ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(gutterW, y + semitoneH);
      ctx.lineTo(w, y + semitoneH);
      ctx.stroke();
    }

    // Render CQT Tiles
    const spec = this.data;
    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(w);
    const fStart = Math.max(0, Math.floor(vStartMs / spec.timeResolutionMs));
    const fEnd = Math.min(spec.numFrames - 1, Math.ceil(vEndMs / spec.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;

    if (renderFrames > 0 && renderedSemitones > 0) {
      if (this.cqtTileCanvas.width !== renderFrames || this.cqtTileCanvas.height !== renderedSemitones) {
        this.cqtTileCanvas.width = renderFrames;
        this.cqtTileCanvas.height = renderedSemitones;
      }

      const imgData = this.cqtTileCtx.createImageData(renderFrames, renderedSemitones);
      const buf32 = new Uint32Array(imgData.data.buffer);
      const lut = ColorLUT[this.paletteKey] || ColorLUT.INFERNO;
      const cqtMatrix = new Uint8Array(spec.cqtMatrix);
      const totalBins = spec.numSemitones;
      const globalMinM = spec.minMidi;

      for (let fIdx = 0; fIdx < renderFrames; fIdx++) {
        const frame = fStart + fIdx;
        const frameBase = frame * totalBins;
        for (let row = 0; row < renderedSemitones; row++) {
          const m = maxM - row;
          const sIdx = m - globalMinM;
          const q = (sIdx >= 0 && sIdx < totalBins) ? cqtMatrix[frameBase + sIdx] : 0;
          buf32[row * renderFrames + fIdx] = lut[q];
        }
      }

      this.cqtTileCtx.putImageData(imgData, 0, 0);

      const startX = this.timeToX(fStart * spec.timeResolutionMs);
      const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.cqtTileCanvas, 0, 0, renderFrames, renderedSemitones, startX, rulerH, endX - startX, graphH);
    }

    this.drawTimeRuler(ctx, 0, 0, w, rulerH);

    // Playhead line
    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
    if (playheadX >= gutterW && playheadX <= w) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, rulerH);
      ctx.lineTo(playheadX + 5, rulerH);
      ctx.lineTo(playheadX, rulerH + 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  renderChromaTier() {
    if (!this.chromaCtx || !this.chromaWidth || !this.chromaHeight) return;
    const ctx = this.chromaCtx, w = this.chromaWidth, h = this.chromaHeight;

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);
    if (!this.data) return;

    const miniH = this.minimapHeight;
    const graphH = h - miniH;
    const gutterW = this.leftGutterWidth;
    const laneH = graphH / 12.0;

    // 12 Semitone Lanes: B down to C
    for (let pcRow = 0; pcRow < 12; pcRow++) {
      const pc = 11 - pcRow;
      const y = pcRow * laneH;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      ctx.fillStyle = isBlack ? '#111827' : '#1e293b';
      ctx.fillRect(0, y, gutterW, laneH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(0, y, gutterW, laneH);

      ctx.fillStyle = (pc === 0) ? '#fde047' : '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(NOTE_NAMES[pc], gutterW - 8, y + laneH / 2);

      ctx.strokeStyle = (pc === 0) ? 'rgba(253, 224, 71, 0.3)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(gutterW, y + laneH);
      ctx.lineTo(w, y + laneH);
      ctx.stroke();
    }

    // Chromagram Heatmap Tile
    const spec = this.data;
    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(w);
    const fStart = Math.max(0, Math.floor(vStartMs / spec.timeResolutionMs));
    const fEnd = Math.min(spec.numFrames - 1, Math.ceil(vEndMs / spec.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;

    if (renderFrames > 0) {
      if (this.chromaTileCanvas.width !== renderFrames || this.chromaTileCanvas.height !== 12) {
        this.chromaTileCanvas.width = renderFrames;
        this.chromaTileCanvas.height = 12;
      }

      const imgData = this.chromaTileCtx.createImageData(renderFrames, 12);
      const buf32 = new Uint32Array(imgData.data.buffer);
      const chromaMatrix = new Uint8Array(spec.chromagramMatrix);

      for (let fIdx = 0; fIdx < renderFrames; fIdx++) {
        const frame = fStart + fIdx;
        const frameBase = frame * 12;
        for (let row = 0; row < 12; row++) {
          const pc = 11 - row;
          const q = chromaMatrix[frameBase + pc];
          const t = q / 255.0;

          let r = 0, g = 0, b = 0;
          if (t < 0.2) {
            r = 0.04; g = 0.05; b = 0.15 * (t / 0.2);
          } else if (t < 0.5) {
            const k = (t - 0.2) / 0.3;
            r = 0.04 + 0.5 * k; g = 0.05 + 0.1 * k; b = 0.15 + 0.65 * k;
          } else if (t < 0.8) {
            const k = (t - 0.5) / 0.3;
            r = 0.54 + 0.4 * k; g = 0.15 + 0.7 * k; b = 0.8 * (1 - k);
          } else {
            const k = (t - 0.8) / 0.2;
            r = 0.94 + 0.06 * k; g = 0.85 + 0.15 * k; b = 0.4 * k;
          }
          buf32[row * renderFrames + fIdx] = (255 << 24) | (Math.floor(b * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(r * 255);
        }
      }

      this.chromaTileCtx.putImageData(imgData, 0, 0);

      const startX = this.timeToX(fStart * spec.timeResolutionMs);
      const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.chromaTileCanvas, 0, 0, renderFrames, 12, startX, 0, endX - startX, graphH);
    }

    // Playhead on Chromagram
    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
    if (playheadX >= gutterW && playheadX <= w) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, graphH);
      ctx.stroke();
    }

    this.drawMinimap(ctx, 0, h - miniH, w, miniH);
  }

  drawTimeRuler(ctx, x, y, width, height) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + width, y + height); ctx.stroke();

    const gutterW = this.leftGutterWidth;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, y, gutterW, height);

    const msPerPx = this.msPerPixel;
    let stepMs = 1000;
    if (msPerPx < 1.0) stepMs = 200;
    else if (msPerPx < 2.5) stepMs = 500;
    else if (msPerPx < 6.0) stepMs = 1000;
    else stepMs = 2000;

    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(width);
    const firstTick = Math.floor(vStartMs / stepMs) * stepMs;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    for (let t = firstTick; t <= vEndMs; t += stepMs) {
      const tx = this.timeToX(t);
      if (tx >= gutterW && tx <= width) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath(); ctx.moveTo(tx, y + height - 6); ctx.lineTo(tx, y + height); ctx.stroke();
        ctx.fillText(TimeFormatter.formatFull(t), tx + 4, y + 14);
      }
    }
  }

  drawMinimap(ctx, x, y, width, height) {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(x, y, width, height);

    const durMs = this.audio.durationMs;
    if (durMs <= 0) return;

    const gutterW = this.leftGutterWidth;
    const plotW = width - gutterW;

    const minP = this.audio.minPeaks, maxP = this.audio.maxPeaks;
    if (minP && minP.length > 0) {
      const centerY = y + height / 2;
      const halfH = height / 2 - 2;
      ctx.fillStyle = '#334155';
      for (let px = 0; px < plotW; px++) {
        const b = Math.floor((px / plotW) * minP.length);
        const maxV = maxP[b], minV = minP[b];
        ctx.fillRect(gutterW + px, centerY - maxV * halfH, 1, Math.max(1, (maxV - minV) * halfH));
      }
    }

    const thumbStartMs = Math.max(0, this.scrollOffsetMs);
    const thumbEndMs = Math.min(durMs, this.scrollOffsetMs + plotW * this.msPerPixel);
    const thumbX = gutterW + (thumbStartMs / durMs) * plotW;
    const thumbW = Math.max(14, ((thumbEndMs - thumbStartMs) / durMs) * plotW);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.fillRect(thumbX, y, thumbW, height);
    ctx.strokeStyle = '#a855f7';
    ctx.strokeRect(thumbX, y, thumbW, height);
  }

  updateCurrentChordIndicator() {
    if (!this.data || !this.data.detectedChords) return;
    const curMs = this.audio.getCurrentPosition();
    const f = Math.max(0, Math.min(this.data.numFrames - 1, Math.floor(curMs / this.data.timeResolutionMs)));
    const chord = this.data.detectedChords[f] || '--';
    const el = document.getElementById('tab2-detected-chord');
    if (el) el.textContent = chord;
  }

  initEvents() {
    const bindCanvasGestures = (canvas) => {
      let isDragging = false, dragStartX = 0, dragStartScrollMs = 0;
      const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;

      const onStart = (e) => {
        isDragging = true;
        dragStartX = getX(e);
        dragStartScrollMs = this.scrollOffsetMs;
      };

      const onMove = (e) => {
        if (!isDragging) return;
        const curX = getX(e);
        this.scrollOffsetMs = dragStartScrollMs - (curX - dragStartX) * this.msPerPixel;
        this.render();
      };

      const onEnd = (e) => {
        if (isDragging) {
          const curX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
          if (Math.abs(curX - dragStartX) < 5) {
            this.audio.seek(this.xToTime(curX));
          }
        }
        isDragging = false;
        this.render();
      };

      canvas.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      canvas.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const mouseX = getX(e);
        const timeAtMouse = this.xToTime(mouseX);
        const delta = e.deltaY < 0 ? 8 : -8;
        const newZoom = Math.max(5, Math.min(200, this.zoomFactor + delta));
        if (newZoom !== this.zoomFactor) {
          this.zoomFactor = newZoom;
          this.scrollOffsetMs = timeAtMouse - (mouseX - this.leftGutterWidth) * this.msPerPixel;
          this.render();
        }
      }, { passive: false });
    };

    bindCanvasGestures(this.cqtCanvas);
    bindCanvasGestures(this.chromaCanvas);
  }
}

// -------------------------------------------------------------
// 6. Master Application Controller
// -------------------------------------------------------------
class SpectroSubApp {
  constructor() {
    this.currentTab = 'tab1';

    // Tab 1 Audio & Spectrogram
    this.audioTab1 = new AudioEngine('Tab1');
    this.fftTab1 = new FFTEngine(512, 256, 128);
    this.rendererTab1 = null;
    this.cuesTab1 = [];
    this.activeCueTab1 = null;
    this.globalClockStateTab1 = CueClockState.SHOW_LOCKED;

    // Tab 2 Audio & Musical Chord Analyzer (Zero-leakage)
    this.audioTab2 = new AudioEngine('Tab2');
    this.chordAnalyzerTab2 = null;
    this.chordWorker = null;

    this.initDOM();
    this.initTabNavigation();
    this.initAudioPlaybackLoop();
    this.bindKeyboardShortcuts();

    // Load initial French phonetic preset in Tab 1
    this.loadTab1Preset(1);
  }

  initDOM() {
    const canvasTab1 = document.getElementById('spectrogram-canvas');
    this.rendererTab1 = new SpectrogramCanvasRenderer(canvasTab1, this.audioTab1);

    const splitter = document.getElementById('pane-splitter');
    const canvasPanel = document.getElementById('canvas-panel');
    let isResizing = false;
    splitter.addEventListener('mousedown', () => { isResizing = true; splitter.classList.add('dragging'); });
    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const headerH = 48 + 44;
      const newH = Math.max(120, Math.min(window.innerHeight - 150, e.clientY - headerH));
      canvasPanel.style.height = `${newH}px`;
      this.rendererTab1.resize();
    });
    window.addEventListener('mouseup', () => { isResizing = false; splitter.classList.remove('dragging'); });

    const cqtCanvas = document.getElementById('cqt-canvas');
    const chromaCanvas = document.getElementById('chroma-canvas');
    this.chordAnalyzerTab2 = new MusicalChordAnalyzer(cqtCanvas, chromaCanvas, this.audioTab2);

    window.addEventListener('resize', () => {
      if (this.currentTab === 'tab1') this.rendererTab1.resize();
      else this.chordAnalyzerTab2.resize();
    });

    // Tab 1 Toolbar Controls
    const btnPlay1 = document.getElementById('btn-play');
    btnPlay1.addEventListener('click', () => this.audioTab1.togglePlay());

    document.getElementById('btn-play-line').addEventListener('click', () => {
      if (this.rendererTab1.selectionEndMs > this.rendererTab1.selectionStartMs) {
        this.audioTab1.loopStartMs = this.rendererTab1.selectionStartMs;
        this.audioTab1.loopEndMs = this.rendererTab1.selectionEndMs;
        this.audioTab1.play(this.rendererTab1.selectionStartMs);
      }
    });

    document.getElementById('btn-play-word').addEventListener('click', () => {
      if (this.activeCueTab1) {
        const words = this.activeCueTab1.resolvedWordTimings();
        const curPos = this.audioTab1.getCurrentPosition();
        let targetWord = words.find(w => Math.abs(w.startMs - curPos) < 200) || words[0];
        if (targetWord) {
          const wIdx = words.indexOf(targetWord);
          const nextStart = (wIdx < words.length - 1) ? words[wIdx + 1].startMs : this.activeCueTab1.endMs;
          this.audioTab1.loopStartMs = targetWord.startMs;
          this.audioTab1.loopEndMs = nextStart;
          this.audioTab1.play(targetWord.startMs);
        }
      }
    });

    const btnLoop1 = document.getElementById('btn-loop');
    btnLoop1.addEventListener('click', () => {
      this.audioTab1.isLooping = !this.audioTab1.isLooping;
      btnLoop1.classList.toggle('loop-active', this.audioTab1.isLooping);
    });

    document.getElementById('btn-set-start').addEventListener('click', () => {
      const cur = this.audioTab1.getCurrentPosition();
      this.rendererTab1.selectionStartMs = cur;
      if (this.activeCueTab1) this.activeCueTab1.startMs = cur;
      this.rendererTab1.render();
      this.renderTab1CuesList();
    });

    document.getElementById('btn-set-end').addEventListener('click', () => {
      const cur = this.audioTab1.getCurrentPosition();
      this.rendererTab1.selectionEndMs = cur;
      if (this.activeCueTab1) this.activeCueTab1.endMs = cur;
      this.rendererTab1.render();
      this.renderTab1CuesList();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      this.rendererTab1.zoomFactor = Math.max(5, this.rendererTab1.zoomFactor - 10);
      this.rendererTab1.render();
    });
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      this.rendererTab1.zoomFactor = Math.min(200, this.rendererTab1.zoomFactor + 10);
      this.rendererTab1.render();
    });

    document.getElementById('select-speed').addEventListener('change', (e) => {
      this.audioTab1.setSpeed(parseFloat(e.target.value));
    });

    document.getElementById('select-view-mode').addEventListener('change', (e) => {
      this.rendererTab1.viewMode = e.target.value;
      this.rendererTab1.render();
    });

    document.getElementById('select-palette').addEventListener('change', (e) => {
      this.rendererTab1.paletteKey = e.target.value;
      this.rendererTab1.render();
    });

    document.getElementById('btn-preset-1').addEventListener('click', () => this.loadTab1Preset(1));
    document.getElementById('btn-preset-2').addEventListener('click', () => this.loadTab1Preset(2));
    document.getElementById('btn-preset-3').addEventListener('click', () => this.loadTab1Preset(3));

    document.getElementById('btn-master-clock').addEventListener('click', () => {
      const states = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
      const curIdx = states.indexOf(this.globalClockStateTab1);
      const nextState = states[(curIdx + 1) % states.length];
      this.globalClockStateTab1 = nextState;
      this.cuesTab1.forEach(c => c.clockState = nextState);
      document.getElementById('btn-master-clock').setAttribute('data-state', nextState);
      this.rendererTab1.isTimeEditUnlocked = (nextState === CueClockState.EDITING_TIME);
      this.rendererTab1.render();
      this.renderTab1CuesList();
    });

    document.getElementById('btn-freq-legend').addEventListener('click', () => {
      document.getElementById('modal-freq-legend').style.display = 'flex';
    });

    document.getElementById('btn-open-add-cues').addEventListener('click', () => {
      document.getElementById('modal-add-cues').style.display = 'flex';
    });

    document.getElementById('btn-confirm-add-cues').addEventListener('click', () => {
      const ta = document.getElementById('textarea-add-cues');
      const text = ta.value.trim();
      const pos = document.getElementById('select-insert-pos').value;
      if (text) {
        this.addTab1CuesFromText(text, pos);
        ta.value = '';
        document.getElementById('modal-add-cues').style.display = 'none';
      }
    });

    // Tab 2 Controls
    const btnPlay2 = document.getElementById('btn-tab2-play');
    btnPlay2.addEventListener('click', () => this.audioTab2.togglePlay());

    const btnLoop2 = document.getElementById('btn-tab2-loop');
    btnLoop2.addEventListener('click', () => {
      this.audioTab2.isLooping = !this.audioTab2.isLooping;
      btnLoop2.classList.toggle('loop-active', this.audioTab2.isLooping);
    });

    document.getElementById('btn-tab2-zoom-out').addEventListener('click', () => {
      this.chordAnalyzerTab2.zoomFactor = Math.max(5, this.chordAnalyzerTab2.zoomFactor - 8);
      this.chordAnalyzerTab2.render();
    });
    document.getElementById('btn-tab2-zoom-in').addEventListener('click', () => {
      this.chordAnalyzerTab2.zoomFactor = Math.min(200, this.chordAnalyzerTab2.zoomFactor + 8);
      this.chordAnalyzerTab2.render();
    });

    document.getElementById('select-tab2-pitch-range').addEventListener('change', (e) => {
      this.chordAnalyzerTab2.pitchRangeMode = e.target.value;
      this.chordAnalyzerTab2.render();
    });

    document.getElementById('select-tab2-palette').addEventListener('change', (e) => {
      this.chordAnalyzerTab2.paletteKey = e.target.value;
      this.chordAnalyzerTab2.render();
    });

    this.initFileLoading();
  }

  initTabNavigation() {
    const drawerOverlay = document.getElementById('tab-drawer-overlay');
    const btnHamburger = document.getElementById('btn-hamburger');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const navTab1 = document.getElementById('nav-tab-1');
    const navTab2 = document.getElementById('nav-tab-2');
    const paneTab1 = document.getElementById('tab-pane-1');
    const paneTab2 = document.getElementById('tab-pane-2');
    const headerBadge = document.getElementById('header-active-tab-badge');

    const openDrawer = () => drawerOverlay.classList.add('open');
    const closeDrawer = () => drawerOverlay.classList.remove('open');

    btnHamburger.addEventListener('click', openDrawer);
    btnCloseDrawer.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) closeDrawer();
    });

    this.switchToTab = (tabId) => {
      this.currentTab = tabId;
      if (tabId === 'tab1') {
        paneTab1.classList.add('active');
        paneTab2.classList.remove('active');
        navTab1.classList.add('active');
        navTab2.classList.remove('active');
        headerBadge.textContent = 'Tab 1: Speech Spectrogram';
        this.updateHeaderMeta(this.audioTab1.trackName, this.audioTab1.durationMs);
        setTimeout(() => this.rendererTab1.resize(), 30);
      } else {
        paneTab1.classList.remove('active');
        paneTab2.classList.add('active');
        navTab1.classList.remove('active');
        navTab2.classList.add('active');
        headerBadge.textContent = 'Tab 2: Chord Analyzer';
        this.updateHeaderMeta(this.audioTab2.trackName, this.audioTab2.durationMs);
        setTimeout(() => this.chordAnalyzerTab2.resize(), 30);
      }
      closeDrawer();
    };

    navTab1.addEventListener('click', () => this.switchToTab('tab1'));
    navTab2.addEventListener('click', () => this.switchToTab('tab2'));
  }

  updateHeaderMeta(name, durationMs) {
    document.getElementById('track-title').textContent = name || 'Chưa nạp file';
    document.getElementById('track-duration').textContent = TimeFormatter.formatMinuteSecond(durationMs || 0);
  }

  initFileLoading() {
    const inputTab1 = document.getElementById('input-audio-tab1');
    const inputTab2 = document.getElementById('input-audio-tab2');

    document.getElementById('btn-upload-file-header').addEventListener('click', () => {
      if (this.currentTab === 'tab1') inputTab1.click();
      else inputTab2.click();
    });

    inputTab1.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await this.loadTab1AudioFile(file);
    });

    inputTab2.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await this.loadTab2AudioFile(file);
    });

    document.getElementById('btn-tab2-choose-file').addEventListener('click', () => inputTab2.click());
    document.getElementById('btn-tab2-select-file').addEventListener('click', () => inputTab2.click());

    const dropzone = document.getElementById('tab2-dropzone');
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) await this.loadTab2AudioFile(file);
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.style.display = 'none';
      });
    });
  }

  showLoading(msg, progress = 0) {
    document.getElementById('loading-msg').textContent = msg;
    document.getElementById('loading-bar').style.width = `${Math.round(progress * 100)}%`;
    document.getElementById('loading-overlay').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  // Tab 1 Operations
  async loadTab1AudioFile(file) {
    try {
      this.showLoading(`Đang đọc file "${file.name}" vào RAM Tab 1...`, 0.05);
      const arrayBuf = await file.arrayBuffer();

      this.showLoading('Đang giải mã & Downsample 16kHz Mono (Tab 1)...', 0.25);
      await this.audioTab1.loadAudioBuffer(arrayBuf, file.name, (p) => {
        this.showLoading('Đang phân tích âm thanh Tab 1...', p);
      });

      this.showLoading('Đang tính ma trận 2D STFT (512-pt Cooley-Tukey FFT)...', 0.5);
      const spec = await this.fftTab1.computeSpectrogramAsync(
        this.audioTab1.samples16k,
        16000,
        (p) => this.showLoading('Đang vẽ biểu đồ phổ Tab 1...', p)
      );

      this.rendererTab1.spectrogram = spec;
      this.rendererTab1.selectionStartMs = 0;
      this.rendererTab1.selectionEndMs = Math.min(3000, this.audioTab1.durationMs);

      if (this.cuesTab1.length === 0) {
        this.cuesTab1 = [new SubtitleCue({
          startMs: 0,
          endMs: Math.min(3000, this.audioTab1.durationMs),
          text: 'Câu phụ đề mới',
          clockState: CueClockState.SHOW_LOCKED
        })];
      }
      this.selectTab1Cue(this.cuesTab1[0]);

      this.updateHeaderMeta(file.name, this.audioTab1.durationMs);
      this.hideLoading();
      this.rendererTab1.resize();
      this.renderTab1CuesList();
    } catch (err) {
      console.error(err);
      this.hideLoading();
      alert('Không thể đọc file audio Tab 1: ' + err.message);
    }
  }

  async loadTab1Preset(presetId) {
    try {
      let fileName = './assets/french_liaisons.mp3';
      let trackLabel = 'Tiếng Pháp 1: Liaison & Enchaînement';
      let presetCues = [];

      if (presetId === 1) {
        fileName = './assets/french_liaisons.mp3';
        trackLabel = 'Tiếng Pháp 1: Liaison & Enchaînement';
        presetCues = [
          new SubtitleCue({ startMs: 0, endMs: 2100, text: "C'est une très belle histoire", actor: "Français (Liaison [t])" }),
          new SubtitleCue({ startMs: 2100, endMs: 4100, text: "les enfants adorent les oiseaux", actor: "Français (Liaisons [z])" }),
          new SubtitleCue({ startMs: 4100, endMs: 6020, text: "et nous allons ensemble à Paris", actor: "Français (Liaison [z])" })
        ];
      } else if (presetId === 2) {
        fileName = './assets/french_conversation.mp3';
        trackLabel = 'Tiếng Pháp 2: Hội thoại hằng ngày';
        presetCues = [
          new SubtitleCue({ startMs: 0, endMs: 2600, text: "Je ne sais pas ce que tu penses", actor: "Français (Élision)" }),
          new SubtitleCue({ startMs: 2650, endMs: 5560, text: "mais il faut faire attention aux liaisons et aux élisions", actor: "Français (Liaisons & Élisions)" })
        ];
      } else {
        fileName = './assets/french_liaisons.wav';
        trackLabel = 'Bài học dài (3.5 phút): French Phonetic Masterclass';
        presetCues = [];
        for (let i = 0; i < 28; i++) {
          const s = i * 7500;
          presetCues.push(new SubtitleCue({
            startMs: s,
            endMs: s + 3200,
            text: `[#${i + 1}] C'est une belle prononciation française`,
            actor: 'Français'
          }));
        }
      }

      this.showLoading(`Đang tải bài mẫu "${trackLabel}" vào Tab 1...`, 0.1);
      const res = await fetch(fileName);
      const arrayBuf = await res.arrayBuffer();

      this.showLoading('Đang giải mã & Downsample 16kHz Mono...', 0.35);
      await this.audioTab1.loadAudioBuffer(arrayBuf, trackLabel, (p) => {
        this.showLoading('Đang phân tích âm thanh...', p);
      });

      this.showLoading('Đang tính ma trận 2D STFT (512-pt Cooley-Tukey FFT)...', 0.5);
      const spec = await this.fftTab1.computeSpectrogramAsync(
        this.audioTab1.samples16k,
        16000,
        (p) => this.showLoading('Đang tạo biểu đồ phổ...', p)
      );

      this.rendererTab1.spectrogram = spec;
      this.cuesTab1 = presetCues;
      this.selectTab1Cue(presetCues[0]);

      if (this.currentTab === 'tab1') {
        this.updateHeaderMeta(trackLabel, this.audioTab1.durationMs);
      }
      this.hideLoading();
      this.rendererTab1.resize();
      this.renderTab1CuesList();
    } catch (e) {
      console.warn('Preset load failed:', e);
      this.hideLoading();
    }
  }

  selectTab1Cue(cue) {
    this.activeCueTab1 = cue;
    this.rendererTab1.activeCue = cue;
    this.rendererTab1.cues = this.cuesTab1;
    if (cue) {
      this.rendererTab1.selectionStartMs = cue.startMs;
      this.rendererTab1.selectionEndMs = cue.endMs;
      this.rendererTab1.isTimeEditUnlocked = (cue.clockState === CueClockState.EDITING_TIME);
      this.audioTab1.loopStartMs = cue.startMs;
      this.audioTab1.loopEndMs = cue.endMs;
    }
    this.rendererTab1.render();
  }

  addTab1CuesFromText(rawText, position = 'AFTER_SELECTED') {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    let baseStart = this.rendererTab1.selectionEndMs || 0;
    const newCues = lines.map((l, i) => new SubtitleCue({
      startMs: baseStart + i * 2500,
      endMs: baseStart + (i + 1) * 2500,
      text: l,
      clockState: CueClockState.SHOW_LOCKED
    }));

    if (position === 'START_OF_LIST') {
      this.cuesTab1.unshift(...newCues);
    } else if (position === 'END_OF_LIST' || !this.activeCueTab1) {
      this.cuesTab1.push(...newCues);
    } else {
      const idx = this.cuesTab1.indexOf(this.activeCueTab1);
      this.cuesTab1.splice(position === 'BEFORE_SELECTED' ? idx : idx + 1, 0, ...newCues);
    }
    this.selectTab1Cue(newCues[0]);
    this.renderTab1CuesList();
    this.rendererTab1.render();
  }

  renderTab1CuesList() {
    const container = document.getElementById('cues-list-container');
    container.innerHTML = '';
    document.getElementById('cues-count-label').textContent = `Danh sách câu (${this.cuesTab1.length})`;

    this.cuesTab1.forEach((cue) => {
      const card = document.createElement('div');
      card.className = `cue-card ${this.activeCueTab1 && this.activeCueTab1.id === cue.id ? 'active' : ''}`;

      const row1 = document.createElement('div');
      row1.className = 'cue-card-row1';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '6px';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'cue-time-badge mono-font';
      timeBadge.textContent = TimeFormatter.formatMinuteSecond(cue.startMs);
      timeBadge.addEventListener('click', () => {
        this.selectTab1Cue(cue);
        this.rendererTab1.scrollOffsetMs = cue.startMs - (this.rendererTab1.width * this.rendererTab1.msPerPixel) * 0.15;
        this.audioTab1.seek(cue.startMs);
        this.rendererTab1.render();
      });

      const clockBtn = document.createElement('button');
      clockBtn.className = 'cue-clock-btn';
      clockBtn.setAttribute('data-state', cue.clockState);
      clockBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      clockBtn.addEventListener('click', () => {
        const states = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
        const curIdx = states.indexOf(cue.clockState);
        cue.clockState = states[(curIdx + 1) % states.length];
        this.selectTab1Cue(cue);
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      left.appendChild(timeBadge);
      left.appendChild(clockBtn);

      const rightControls = document.createElement('div');
      rightControls.style.display = 'flex';
      rightControls.style.gap = '4px';

      const btnDel = document.createElement('button');
      btnDel.className = 'nudge-btn';
      btnDel.textContent = 'Xóa';
      btnDel.style.color = '#ef4444';
      btnDel.addEventListener('click', () => {
        const idx = this.cuesTab1.indexOf(cue);
        this.cuesTab1.splice(idx, 1);
        if (this.cuesTab1.length > 0) this.selectTab1Cue(this.cuesTab1[Math.max(0, idx - 1)]);
        else this.activeCueTab1 = null;
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      rightControls.appendChild(btnDel);
      row1.appendChild(left);
      row1.appendChild(rightControls);
      card.appendChild(row1);

      const textInput = document.createElement('input');
      textInput.className = 'cue-text-input';
      textInput.value = cue.text;
      textInput.addEventListener('input', (e) => {
        cue.text = e.target.value;
        this.rendererTab1.render();
      });
      textInput.addEventListener('focus', () => this.selectTab1Cue(cue));
      card.appendChild(textInput);

      container.appendChild(card);
    });
  }

  // Tab 2 Operations (Web Worker CQT & Chromagram)
  async loadTab2AudioFile(file) {
    try {
      this.showLoading(`Đang đọc bài nhạc "${file.name}" vào RAM Tab 2...`, 0.05);
      const arrayBuf = await file.arrayBuffer();

      this.showLoading('Đang giải mã Web Audio & Downsample 16kHz (Tab 2)...', 0.2);
      await this.audioTab2.loadAudioBuffer(arrayBuf, file.name, (p) => {
        this.showLoading('Đang trích xuất dạng sóng Tab 2...', p);
      });

      this.showLoading('Khởi tạo Web Worker phân tích Constant-Q Transform & Chromagram...', 0.35);

      if (this.chordWorker) {
        this.chordWorker.terminate();
      }

      this.chordWorker = new Worker('./worker.js');

      this.chordWorker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          this.showLoading('Đang phân tích CQT Semitones & Triệt tiêu bồi âm trong Web Worker...', 0.35 + msg.progress * 0.6);
        } else if (msg.type === 'done') {
          this.chordAnalyzerTab2.data = msg;
          this.hideLoading();

          document.getElementById('tab2-empty-overlay').style.display = 'none';

          if (this.currentTab === 'tab2') {
            this.updateHeaderMeta(file.name, this.audioTab2.durationMs);
          }

          this.chordAnalyzerTab2.resize();
        } else if (msg.type === 'error') {
          this.hideLoading();
          alert('Lỗi phân tích hợp âm trong Web Worker: ' + msg.error);
        }
      };

      this.chordWorker.postMessage({
        action: 'analyzeChords',
        samples: this.audioTab2.samples16k,
        sampleRate: 16000
      });

    } catch (err) {
      console.error(err);
      this.hideLoading();
      alert('Không thể mở file nhạc Tab 2: ' + err.message);
    }
  }

  initAudioPlaybackLoop() {
    const playBtn1 = document.getElementById('btn-play');
    this.audioTab1.onPlayStateChange = (playing) => {
      playBtn1.classList.toggle('playing', playing);
      playBtn1.innerHTML = playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    };

    const playBtn2 = document.getElementById('btn-tab2-play');
    this.audioTab2.onPlayStateChange = (playing) => {
      playBtn2.classList.toggle('playing', playing);
      playBtn2.innerHTML = playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    };

    const tick = () => {
      if (this.currentTab === 'tab1') {
        if (this.audioTab1.isPlaying) {
          this.rendererTab1.render();
        }
        const cur1 = this.audioTab1.getCurrentPosition();
        document.getElementById('cursor-time-badge').textContent = TimeFormatter.formatFull(cur1);
      } else {
        if (this.audioTab2.isPlaying) {
          this.chordAnalyzerTab2.render();
        }
        const cur2 = this.audioTab2.getCurrentPosition();
        document.getElementById('tab2-time-badge').textContent = TimeFormatter.formatFull(cur2);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.currentTab === 'tab1') this.audioTab1.togglePlay();
        else this.audioTab2.togglePlay();
      } else if (e.code === 'KeyS' && this.currentTab === 'tab1') {
        e.preventDefault();
        document.getElementById('btn-play-line').click();
      } else if (e.code === 'KeyW' && this.currentTab === 'tab1') {
        e.preventDefault();
        document.getElementById('btn-play-word').click();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        if (this.currentTab === 'tab1') document.getElementById('btn-loop').click();
        else document.getElementById('btn-tab2-loop').click();
      } else if (e.key === '[' && this.currentTab === 'tab1') {
        e.preventDefault();
        document.getElementById('btn-set-start').click();
      } else if (e.key === ']' && this.currentTab === 'tab1') {
        e.preventDefault();
        document.getElementById('btn-set-end').click();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -100 : -500;
        const curAudio = (this.currentTab === 'tab1') ? this.audioTab1 : this.audioTab2;
        curAudio.seek(curAudio.getCurrentPosition() + delta);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 100 : 500;
        const curAudio = (this.currentTab === 'tab1') ? this.audioTab1 : this.audioTab2;
        curAudio.seek(curAudio.getCurrentPosition() + delta);
      } else if (e.key === '+' || e.key === '=') {
        if (this.currentTab === 'tab1') {
          this.rendererTab1.zoomFactor = Math.min(200, this.rendererTab1.zoomFactor + 10);
          this.rendererTab1.render();
        } else {
          this.chordAnalyzerTab2.zoomFactor = Math.min(200, this.chordAnalyzerTab2.zoomFactor + 8);
          this.chordAnalyzerTab2.render();
        }
      } else if (e.key === '-' || e.key === '_') {
        if (this.currentTab === 'tab1') {
          this.rendererTab1.zoomFactor = Math.max(5, this.rendererTab1.zoomFactor - 10);
          this.rendererTab1.render();
        } else {
          this.chordAnalyzerTab2.zoomFactor = Math.max(5, this.chordAnalyzerTab2.zoomFactor - 8);
          this.chordAnalyzerTab2.render();
        }
      }
    });
  }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  window.app = new SpectroSubApp();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
  }
});
