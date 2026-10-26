/**
 * Web SpectroSub - Dual-Tab Client-Side SPA & PWA
 * Tab 1: Speech & Audio Spectrogram (16kHz Mono STFT 60fps)
 * Tab 2: Musical Chord Analyzer (Web Worker CQT & 12-Tone Chromagram)
 * 100% Client-Side, Zero-leakage between tabs, AudioContext per tab.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteLabel(m) {
  const name = NOTE_NAMES[m % 12];
  const oct = Math.floor(m / 12) - 1;
  return `${name}${oct}`;
}

// -------------------------------------------------------------
// 1. Color Palettes (Look-Up Tables)
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
    this.playRangeEndMs = null;

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
      try {
        this.audioCtx.resume().catch(() => {});
      } catch (_) {}
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
    const copyBuffer = arrayBuffer.slice(0);
    const audioBuffer = await new Promise((resolve, reject) => {
      let settled = false;
      const onSuccess = (buf) => { if (!settled) { settled = true; resolve(buf); } };
      const onError = (err) => { if (!settled) { settled = true; reject(err || new Error('decodeAudioData failed')); } };
      try {
        const res = ctx.decodeAudioData(copyBuffer, onSuccess, onError);
        if (res && typeof res.then === 'function') {
          res.then(onSuccess).catch(onError);
        }
      } catch (e) {
        onError(e);
      }
    });
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

  loadSyntheticSpeechBuffer(durationSec = 6.02, name = 'Ví dụ 1') {
    const ctx = this.getAudioContext();
    const sr = 16000;
    const totalSamples = Math.floor(durationSec * sr);
    const audioBuf = ctx.createBuffer(1, totalSamples, sr);
    const channelData = audioBuf.getChannelData(0);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sr;
      const syllableEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.2 * t);
      const fundamental = Math.sin(2 * Math.PI * 140 * t);
      const formant1 = 0.6 * Math.sin(2 * Math.PI * 700 * t);
      const formant2 = 0.4 * Math.sin(2 * Math.PI * 1800 * t);
      const formant3 = 0.2 * Math.sin(2 * Math.PI * 2600 * t);
      const noise = (Math.random() - 0.5) * 0.1 * (Math.sin(2 * Math.PI * 6.5 * t) > 0.6 ? 1 : 0);
      const sig = (fundamental + formant1 + formant2 + formant3) * syllableEnv * 0.35 + noise;
      channelData[i] = Math.max(-0.95, Math.min(0.95, sig));
    }

    const { minPeaks, maxPeaks } = this.computeEnvelope(channelData, sr, 5.0);
    this.audioBuffer = audioBuf;
    this.samples16k = channelData;
    this.sampleRate = sr;
    this.durationMs = Math.round(durationSec * 1000);
    this.trackName = name;
    this.minPeaks = minPeaks;
    this.maxPeaks = maxPeaks;
    this.loopStartMs = 0;
    this.loopEndMs = Math.min(this.durationMs, 2100);
    this.currentPositionMs = 0;
    return { samples16k: channelData, durationMs: this.durationMs, trackName: name };
  }

  play(offsetMs = null, endMs = null) {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();
    if (this.isPlaying) this.stop();

    const pos = (offsetMs !== null) ? offsetMs : this.currentPositionMs;
    const clampedPos = Math.max(0, Math.min(this.durationMs, pos));
    const offsetSec = clampedPos / 1000.0;

    let durationSec = undefined;
    if (endMs !== null && endMs > clampedPos) {
      this.playRangeEndMs = endMs;
      durationSec = (endMs - clampedPos) / 1000.0;
    } else {
      this.playRangeEndMs = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.playbackRate.value = this.playbackSpeed;
    source.connect(ctx.destination);

    if (durationSec !== undefined) {
      source.start(0, offsetSec, Math.max(0.01, durationSec));
    } else {
      source.start(0, offsetSec);
    }

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
          const nextEnd = (this.loopEndMs > this.loopStartMs) ? this.loopEndMs : null;
          this.play(nextStart, nextEnd);
        } else {
          this.isPlaying = false;
          this.activeSourceNode = null;
          if (this.playRangeEndMs !== null) {
            this.currentPositionMs = this.playRangeEndMs;
            this.onPositionUpdate(this.playRangeEndMs);
          }
          this.playRangeEndMs = null;
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
    this.playRangeEndMs = null;
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
      this.play(clamped, this.playRangeEndMs);
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
      this.play(this.loopStartMs, this.loopEndMs);
      return this.loopStartMs;
    }

    if (this.playRangeEndMs !== null && currentMs >= this.playRangeEndMs) {
      if (this.isLooping && this.loopEndMs > this.loopStartMs) {
        this.play(this.loopStartMs, this.loopEndMs);
        return this.loopStartMs;
      } else {
        this.stop();
        this.currentPositionMs = this.playRangeEndMs;
        this.onPositionUpdate(this.playRangeEndMs);
        return this.currentPositionMs;
      }
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
// 3. Tab 1: FFT Engine & Subtitle Models (Speech Spectrogram)
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
    const minGap = 5;
    const dur = Math.max(rawWords.length * minGap * 2, this.endMs - this.startMs);
    const safeEnd = this.startMs + dur;
    let prevMinStart = this.startMs;

    return rawWords.map((w, idx) => {
      const defaultStart = Math.round(this.startMs + (dur * idx) / rawWords.length);
      const candStart = (this.wordTimings[idx] && typeof this.wordTimings[idx].startMs === 'number')
        ? this.wordTimings[idx].startMs : defaultStart;
      const remainingWords = Math.max(0, rawWords.length - 1 - idx);
      const maxAllowed = Math.max(prevMinStart, safeEnd - remainingWords * minGap - minGap);
      const clamped = Math.max(prevMinStart, Math.min(maxAllowed, candStart));
      prevMinStart = Math.min(safeEnd, clamped + minGap);
      return { word: w, startMs: clamped };
    });
  }

  setWordStartMs(wordIdx, targetMs) {
    const resolved = this.resolvedWordTimings();
    if (wordIdx < 0 || wordIdx >= resolved.length) return;
    const minGap = 5;
    const minAllowed = wordIdx === 0 ? this.startMs : resolved[wordIdx - 1].startMs + minGap;
    const maxAllowed = wordIdx < resolved.length - 1 ? resolved[wordIdx + 1].startMs - minGap : this.endMs - minGap;
    const clamped = Math.max(minAllowed, Math.min(maxAllowed, Math.round(targetMs)));
    resolved[wordIdx] = { ...resolved[wordIdx], startMs: clamped };
    this.wordTimings = resolved;
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
// 4. Tab 1: Spectrogram Canvas Renderer
// -------------------------------------------------------------
class SpectrogramCanvasRenderer {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
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

    this.rulerHeight = 28;
    this.minimapHeight = 28;
    this.subOverlayHeight = 28;

    this.tileCanvas = document.createElement('canvas');
    this.tileCtx = this.tileCanvas.getContext('2d', { alpha: false });

    if (this.canvas) {
      this.initEvents();
    }
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
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
    const visibleWindowMs = (this.width || 800) * this.msPerPixel;
    const minScroll = -200;
    const maxScroll = Math.max(minScroll, this.audio.durationMs + 200 - visibleWindowMs);
    this.scrollOffsetMs = Math.max(minScroll, Math.min(maxScroll, this.scrollOffsetMs));
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;
    if (this.canvas.offsetParent === null) return; // Tab is hidden

    const ctx = this.ctx, w = this.width, h = this.height;

    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, w, h);

    const hasAudio = (this.audio && this.audio.durationMs > 0);
    const hasCues = (this.cues && this.cues.length > 0);

    if (!hasAudio && !hasCues) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa tải file âm thanh Tab 1. Bấm "Tải File" để nạp file từ máy hoặc Ví dụ 1.', w / 2, h / 2);
      return;
    }

    if (!hasAudio && hasCues) {
      const maxEnd = Math.max(...this.cues.map(c => c.endMs || 0));
      this.audio.durationMs = Math.max(7000, maxEnd + 1000);
    }

    this.clampScroll();

    const hasVisibleTranscript = this.cues.some(c => c.clockState !== CueClockState.OFF);
    const rulerH = this.rulerHeight;
    // When no transcript is visible (all OFF), do NOT show empty space below ruler
    const subH = hasVisibleTranscript ? this.subOverlayHeight : 0;
    const miniH = this.minimapHeight;
    const contentY = rulerH + subH;
    const contentH = Math.max(20, h - contentY - miniH);
    const contentBottom = h - miniH;

    let specH = 0, waveH = 0, specY = contentY, waveY = contentY;
    if (this.viewMode === 'DUAL') {
      waveH = Math.floor(contentH * 0.38);
      waveY = contentY;
      specH = contentH - waveH;
      specY = waveY + waveH;
    } else if (this.viewMode === 'SPECTROGRAM') {
      specH = contentH;
      specY = contentY;
    } else {
      waveH = contentH;
      waveY = contentY;
    }

    if (waveH > 0) {
      this.drawWaveform(ctx, 0, waveY, w, waveH);
    }
    if (specH > 0 && this.spectrogram && this.spectrogram.numFrames > 0) {
      this.drawSpectrogram(ctx, 0, specY, w, specH);
    }

    // Divider between Waveform and Spectrogram in Dual mode
    if (this.viewMode === 'DUAL' && waveH > 0 && specH > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, specY);
      ctx.lineTo(w, specY);
      ctx.stroke();
    }

    // Yellow & Purple clock tints over spectrogram / waveform
    if (this.cues) {
      this.cues.forEach(cue => {
        if (cue.clockState !== CueClockState.EDITING_TIME && cue.clockState !== CueClockState.EDITING_WORDS) return;
        const cStartX = this.timeToX(cue.startMs);
        const cEndX = this.timeToX(cue.endMs);
        if (cEndX < 0 || cStartX > w) return;

        const drawX = Math.max(0, cStartX);
        const drawW = Math.min(w, cEndX) - drawX;
        if (drawW <= 0) return;

        if (cue.clockState === CueClockState.EDITING_TIME) {
          // Yellow clock: light yellow tint
          ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
          ctx.fillRect(drawX, contentY, drawW, contentH);

          ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cStartX, contentY); ctx.lineTo(cStartX, contentBottom);
          ctx.moveTo(cEndX, contentY); ctx.lineTo(cEndX, contentBottom);
          ctx.stroke();
        } else if (cue.clockState === CueClockState.EDITING_WORDS) {
          // Purple clock: light purple tint
          ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
          ctx.fillRect(drawX, contentY, drawW, contentH);

          ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cStartX, contentY); ctx.lineTo(cStartX, contentBottom);
          ctx.moveTo(cEndX, contentY); ctx.lineTo(cEndX, contentBottom);
          ctx.stroke();
        }
      });
    }

    // Subtitle transcript strip (only when subH > 0)
    if (subH > 0) {
      this.drawSubtitlesOverlay(ctx, 0, rulerH, w, subH, contentBottom);
    }

    // Selection window across full interactive area
    const selectionH = h - rulerH - miniH;
    this.drawSelectionWindow(ctx, 0, rulerH, w, selectionH);

    // Time ruler on top
    this.drawTimeRuler(ctx, 0, 0, w, rulerH);

    // Positions for Start, Stop, and Playhead lines
    const startX = this.timeToX(this.selectionStartMs);
    const endX = this.timeToX(this.selectionEndMs);
    const playheadMs = this.audio ? this.audio.getCurrentPosition() : 0;
    const playheadX = this.timeToX(playheadMs);

    // 1) Green Start line on time ruler
    if (startX >= -10 && startX <= w + 10) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, 0); ctx.lineTo(startX, rulerH); ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(startX - 2, 0, 4, 3);
    }

    // 2) Red Stop line on time ruler
    if (endX >= -10 && endX <= w + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(endX, 0); ctx.lineTo(endX, rulerH); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(endX - 2, 0, 4, 3);
    }

    // 3) Yellow Playhead line: Top indicator on ruler + clean straight vertical line (NO lower triangle)
    if (playheadX >= -10 && playheadX <= w + 10) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0); ctx.lineTo(playheadX, rulerH); ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 7);
      ctx.closePath();
      ctx.fill();

      // Clean straight yellow line across canvas (NO lower triangle indicator)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, contentBottom);
      ctx.stroke();
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
  }

  drawWaveform(ctx, x, y, width, height) {
    const minP = this.audio.minPeaks, maxP = this.audio.maxPeaks;
    if (!minP || !maxP || minP.length === 0) return;
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

  drawSubtitlesOverlay(ctx, x, y, width, height, contentBottom) {
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();

    if (!this.cues) return;
    this.cues.forEach(cue => {
      if (cue.clockState === CueClockState.OFF) return;
      const startX = this.timeToX(cue.startMs);
      const endX = this.timeToX(cue.endMs);
      const cueW = endX - startX;
      if (endX < 0 || startX > width) return;

      const isActive = this.activeCue && this.activeCue.id === cue.id;
      const padY = 2;
      const barH = height - padY * 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, y + padY, Math.max(8, cueW), barH);
      ctx.clip();

      if (cue.clockState === CueClockState.EDITING_TIME) {
        ctx.fillStyle = isActive ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.22)';
        ctx.fillRect(startX, y + padY, cueW, barH);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeRect(startX + 1, y + padY + 1, Math.max(6, cueW - 2), barH - 2);
      } else if (cue.clockState === CueClockState.EDITING_WORDS) {
        ctx.fillStyle = isActive ? 'rgba(168, 85, 247, 0.32)' : 'rgba(168, 85, 247, 0.20)';
        ctx.fillRect(startX, y + padY, cueW, barH);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeRect(startX + 1, y + padY + 1, Math.max(6, cueW - 2), barH - 2);
      } else {
        // SHOW_LOCKED (Blue)
        if (isActive) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(startX, y + padY, cueW, barH);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(startX + 1, y + padY + 1, Math.max(6, cueW - 2), barH - 2);
        } else {
          ctx.fillStyle = 'rgba(14, 116, 144, 0.35)';
          ctx.fillRect(startX, y + padY, cueW, barH);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(startX, y + padY, Math.max(8, cueW), barH);
        }
      }

      // Word rendering with overlap crop & soft fade-out
      if (cue.clockState === CueClockState.EDITING_WORDS || (cue.wordTimings && cue.wordTimings.length > 0)) {
        const words = cue.resolvedWordTimings();
        ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        words.forEach((wt, wIdx) => {
          const wx = this.timeToX(wt.startMs);
          const nextWx = (wIdx < words.length - 1) ? this.timeToX(words[wIdx + 1].startMs) : endX;
          const availW = nextWx - wx;
          if (availW <= 2 || nextWx < 0 || wx > width) return;

          const padLeft = 5;
          const textW = ctx.measureText(wt.word).width;
          const neededW = padLeft + textW + 2;
          const isOverlapping = neededW > availW;

          ctx.save();
          ctx.beginPath();
          ctx.rect(wx, y + padY, Math.max(0, availW - 1), barH);
          ctx.clip();

          if (isOverlapping) {
            const cropX = wx + availW - 1;
            const fadeW = Math.min(24, Math.max(8, availW * 0.55));
            const grad = ctx.createLinearGradient(cropX - fadeW, 0, cropX, 0);
            grad.addColorStop(0, isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(243, 232, 255, 1)');
            grad.addColorStop(1, 'rgba(243, 232, 255, 0)');
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = isActive ? '#ffffff' : '#f3e8ff';
          }

          ctx.fillText(wt.word, wx + padLeft, y + height / 2);
          ctx.restore();
        });
      } else {
        ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
        ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(cue.text, startX + 6, y + height / 2);
      }

      ctx.restore();

      // Bold purple vertical lines at word boundaries in EDITING_WORDS mode
      if (cue.clockState === CueClockState.EDITING_WORDS) {
        const words = cue.resolvedWordTimings();
        words.forEach(wt => {
          const wx = this.timeToX(wt.startMs);
          if (wx >= -2 && wx <= width + 2) {
            ctx.strokeStyle = '#9333ea';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx, contentBottom); ctx.stroke();

            ctx.strokeStyle = '#d8b4fe';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx, contentBottom); ctx.stroke();

            ctx.fillStyle = '#a855f7';
            ctx.fillRect(wx - 2, y + 2, 4, 7);
          }
        });
      }
    });
  }

  drawSelectionWindow(ctx, x, y, width, height) {
    const startX = this.timeToX(this.selectionStartMs);
    const endX = this.timeToX(this.selectionEndMs);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.fillRect(Math.max(0, startX), y, Math.min(width, endX - startX), height);

    if (startX >= -10 && startX <= width + 10) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX, y + height); ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(startX, y, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('[', startX + 4, y + 13);
    }

    if (endX >= -10 && endX <= width + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(endX, y); ctx.lineTo(endX, y + height); ctx.stroke();
      ctx.fillStyle = '#ef4444';
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

    const minP = this.audio.minPeaks, maxP = this.audio.maxPeaks;
    if (minP && maxP && minP.length > 0) {
      const centerY = y + height / 2;
      const halfH = height / 2 - 2;
      ctx.fillStyle = '#334155';
      for (let px = 0; px < width; px++) {
        const b = Math.floor((px / width) * minP.length);
        const maxV = maxP[b], minV = minP[b];
        ctx.fillRect(px, centerY - maxV * halfH, 1, Math.max(1, (maxV - minV) * halfH));
      }
    }

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
    if (!c) return;
    let isDragging = false, dragTarget = 'PAN', dragStartX = 0, dragStartScrollMs = 0;
    let dragWordInfo = null;
    let dragCueEdgeInfo = null;

    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX) - c.getBoundingClientRect().left;
    const getY = (e) => (e.touches ? e.touches[0].clientY : e.clientY) - c.getBoundingClientRect().top;

    const findWordHandleAt = (mouseX, mouseY) => {
      const rectH = c.getBoundingClientRect().height;
      if (mouseY < this.rulerHeight || mouseY > rectH - this.minimapHeight) return null;
      let best = null;
      for (const cue of this.cues) {
        if (cue.clockState !== CueClockState.EDITING_WORDS) continue;
        const words = cue.resolvedWordTimings();
        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const wx = this.timeToX(words[wIdx].startMs);
          const dist = Math.abs(mouseX - wx);
          if (dist <= 10 && (!best || dist < best.dist)) {
            best = { cue, wordIdx: wIdx, dist };
          }
        }
      }
      return best;
    };

    const findYellowCueEdgeAt = (mouseX, mouseY) => {
      const rectH = c.getBoundingClientRect().height;
      if (mouseY < this.rulerHeight || mouseY > rectH - this.minimapHeight) return null;
      for (const cue of this.cues) {
        if (cue.clockState !== CueClockState.EDITING_TIME) continue;
        const sx = this.timeToX(cue.startMs);
        const ex = this.timeToX(cue.endMs);
        if (Math.abs(mouseX - sx) <= 8) return { cue, edge: 'START' };
        if (Math.abs(mouseX - ex) <= 8) return { cue, edge: 'END' };
      }
      return null;
    };

    const updateCursor = (mouseX, mouseY) => {
      if (isDragging) {
        if (['WORD', 'START', 'END', 'PLAYHEAD', 'CUE_START', 'CUE_END'].includes(dragTarget)) {
          c.style.cursor = 'ew-resize';
        }
        return;
      }

      if (findWordHandleAt(mouseX, mouseY) || findYellowCueEdgeAt(mouseX, mouseY)) {
        c.style.cursor = 'ew-resize';
        return;
      }

      const startX = this.timeToX(this.selectionStartMs);
      const endX = this.timeToX(this.selectionEndMs);
      const playheadX = this.timeToX(this.audio.getCurrentPosition());
      const HIT = 8;

      const isNearStart = Math.abs(mouseX - startX) <= HIT ||
        (mouseX >= startX && mouseX <= startX + 18 && mouseY >= this.rulerHeight && mouseY <= this.rulerHeight + 22);
      const isNearEnd = Math.abs(mouseX - endX) <= HIT ||
        (mouseX >= endX - 18 && mouseX <= endX && mouseY >= this.rulerHeight && mouseY <= this.rulerHeight + 22);
      const isNearYellow = Math.abs(mouseX - playheadX) <= HIT;

      const hasVisibleTranscript = this.cues.some(cue => cue.clockState !== CueClockState.OFF);
      const subH = hasVisibleTranscript ? this.subOverlayHeight : 0;

      if (isNearStart || isNearEnd || isNearYellow) {
        c.style.cursor = 'ew-resize';
      } else if (mouseY <= this.rulerHeight || (subH > 0 && mouseY <= this.rulerHeight + subH)) {
        c.style.cursor = 'pointer';
      } else {
        c.style.cursor = 'crosshair';
      }
    };

    c.addEventListener('mousemove', (e) => {
      const mouseX = getX(e);
      const mouseY = getY(e);
      updateCursor(mouseX, mouseY);
    });

    c.addEventListener('mouseleave', () => {
      if (!isDragging) c.style.cursor = 'crosshair';
    });

    const onStart = (e) => {
      isDragging = true;
      dragStartX = getX(e);
      const dragStartY = getY(e);
      dragStartScrollMs = this.scrollOffsetMs;
      const curTime = this.xToTime(dragStartX);
      const startX = this.timeToX(this.selectionStartMs);
      const endX = this.timeToX(this.selectionEndMs);
      const playheadX = this.timeToX(this.audio.getCurrentPosition());

      const wordHit = findWordHandleAt(dragStartX, dragStartY);
      if (wordHit) {
        dragTarget = 'WORD';
        dragWordInfo = wordHit;
        if (this.onCueSelect) this.onCueSelect(wordHit.cue);
        c.style.cursor = 'ew-resize';
        return;
      }

      const yellowHit = findYellowCueEdgeAt(dragStartX, dragStartY);
      if (yellowHit) {
        dragTarget = yellowHit.edge === 'START' ? 'CUE_START' : 'CUE_END';
        dragCueEdgeInfo = { cue: yellowHit.cue };
        if (this.onCueSelect) this.onCueSelect(yellowHit.cue);
        c.style.cursor = 'ew-resize';
        return;
      }

      if (Math.abs(dragStartX - startX) <= 12 || (dragStartX >= startX && dragStartX <= startX + 18 && dragStartY >= this.rulerHeight && dragStartY <= this.rulerHeight + 22)) {
        dragTarget = 'START';
        c.style.cursor = 'ew-resize';
      } else if (Math.abs(dragStartX - endX) <= 12 || (dragStartX >= endX - 18 && dragStartX <= endX && dragStartY >= this.rulerHeight && dragStartY <= this.rulerHeight + 22)) {
        dragTarget = 'END';
        c.style.cursor = 'ew-resize';
      } else if (Math.abs(dragStartX - playheadX) <= 12) {
        dragTarget = 'PLAYHEAD';
        c.style.cursor = 'ew-resize';
      } else if (dragStartY <= this.rulerHeight) {
        this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        dragTarget = 'PLAYHEAD';
        c.style.cursor = 'ew-resize';
        this.render();
      } else {
        dragTarget = 'PAN';
      }
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const curX = getX(e);
      const curTime = this.xToTime(curX);

      if (dragTarget === 'WORD' && dragWordInfo) {
        dragWordInfo.cue.setWordStartMs(dragWordInfo.wordIdx, curTime);
        c.style.cursor = 'ew-resize';
        if (this.onCuesUpdate) this.onCuesUpdate();
      } else if (dragTarget === 'CUE_START' && dragCueEdgeInfo) {
        dragCueEdgeInfo.cue.startMs = Math.max(0, Math.min(dragCueEdgeInfo.cue.endMs - 50, Math.round(curTime)));
        this.selectionStartMs = dragCueEdgeInfo.cue.startMs;
        c.style.cursor = 'ew-resize';
        if (this.onCuesUpdate) this.onCuesUpdate();
      } else if (dragTarget === 'CUE_END' && dragCueEdgeInfo) {
        dragCueEdgeInfo.cue.endMs = Math.max(dragCueEdgeInfo.cue.startMs + 50, Math.min(this.audio.durationMs, Math.round(curTime)));
        this.selectionEndMs = dragCueEdgeInfo.cue.endMs;
        c.style.cursor = 'ew-resize';
        if (this.onCuesUpdate) this.onCuesUpdate();
      } else if (dragTarget === 'START') {
        this.selectionStartMs = Math.max(0, Math.min(this.selectionEndMs - 50, Math.round(curTime)));
        if (this.activeCue && this.activeCue.clockState !== CueClockState.SHOW_LOCKED) {
          this.activeCue.startMs = this.selectionStartMs;
          if (this.onCuesUpdate) this.onCuesUpdate();
        }
        c.style.cursor = 'ew-resize';
      } else if (dragTarget === 'END') {
        this.selectionEndMs = Math.max(this.selectionStartMs + 50, Math.min(this.audio.durationMs, Math.round(curTime)));
        if (this.activeCue && this.activeCue.clockState !== CueClockState.SHOW_LOCKED) {
          this.activeCue.endMs = this.selectionEndMs;
          if (this.onCuesUpdate) this.onCuesUpdate();
        }
        c.style.cursor = 'ew-resize';
      } else if (dragTarget === 'PLAYHEAD') {
        this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        c.style.cursor = 'ew-resize';
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
      dragTarget = null;
      dragWordInfo = null;
      dragCueEdgeInfo = null;
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
    this.cqtCtx = cqtCanvas ? cqtCanvas.getContext('2d', { alpha: false }) : null;
    this.chromaCtx = chromaCanvas ? chromaCanvas.getContext('2d', { alpha: false }) : null;
    this.audio = audioEngine;

    this.data = null;
    this.paletteKey = 'INFERNO';
    this.zoomFactor = 35.0;
    this.scrollOffsetMs = 0;

    this.pitchRangeMode = 'AUTO';
    this.activeMinMidi = 36;
    this.activeMaxMidi = 76;

    this.rulerHeight = 24;
    this.minimapHeight = 24;
    this.leftGutterWidth = 54;

    this.cqtTileCanvas = document.createElement('canvas');
    this.cqtTileCtx = this.cqtTileCanvas.getContext('2d', { alpha: false });

    this.chromaTileCanvas = document.createElement('canvas');
    this.chromaTileCtx = this.chromaTileCanvas.getContext('2d', { alpha: false });

    if (this.cqtCanvas && this.chromaCanvas) {
      this.initEvents();
    }
  }

  resize() {
    if (!this.cqtCanvas || !this.chromaCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const r1 = this.cqtCanvas.getBoundingClientRect();
    const r2 = this.chromaCanvas.getBoundingClientRect();

    if (r1.width > 0 && r1.height > 0) {
      this.cqtCanvas.width = Math.round(r1.width * dpr);
      this.cqtCanvas.height = Math.round(r1.height * dpr);
      this.cqtCtx.scale(dpr, dpr);
      this.cqtWidth = r1.width;
      this.cqtHeight = r1.height;
    }

    if (r2.width > 0 && r2.height > 0) {
      this.chromaCanvas.width = Math.round(r2.width * dpr);
      this.chromaCanvas.height = Math.round(r2.height * dpr);
      this.chromaCtx.scale(dpr, dpr);
      this.chromaWidth = r2.width;
      this.chromaHeight = r2.height;
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
      this.activeMinMidi = 40;
      this.activeMaxMidi = 88;
    } else if (this.pitchRangeMode === 'BASS_MID') {
      this.activeMinMidi = 24;
      this.activeMaxMidi = 72;
    } else if (this.pitchRangeMode === 'VOCAL_LEAD') {
      this.activeMinMidi = 45;
      this.activeMaxMidi = 81;
    } else {
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
    if (!this.cqtCanvas || this.cqtCanvas.offsetParent === null) return;
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

    // Piano Roll Labels
    for (let m = minM; m <= maxM; m++) {
      const row = maxM - m;
      const y = rulerH + row * semitoneH;
      const pc = m % 12;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      ctx.fillStyle = isBlack ? '#111827' : '#1e293b';
      ctx.fillRect(0, y, gutterW, semitoneH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
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

    // CQT Matrix Heatmap
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

    // Time Ruler
    this.drawTimeRuler(ctx, 0, 0, w, rulerH);

    // Yellow Playhead (clean straight line, no lower triangle)
    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
    if (playheadX >= gutterW && playheadX <= w) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, rulerH);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 6);
      ctx.closePath();
      ctx.fill();

      // Clean straight yellow line across CQT (NO lower triangle)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
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

          const R = Math.floor(r * 255);
          const G = Math.floor(g * 255);
          const B = Math.floor(b * 255);
          buf32[row * renderFrames + fIdx] = (255 << 24) | (B << 16) | (G << 8) | R;
        }
      }

      this.chromaTileCtx.putImageData(imgData, 0, 0);

      const startX = this.timeToX(fStart * spec.timeResolutionMs);
      const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.chromaTileCanvas, 0, 0, renderFrames, 12, startX, 0, endX - startX, graphH);
    }

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
    if (minP && maxP && minP.length > 0) {
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
      if (!canvas) return;
      let isDragging = false, dragStartX = 0, dragStartScrollMs = 0;

      const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;

      canvas.addEventListener('mousemove', (e) => {
        if (isDragging) return;
        const curX = getX(e);
        const playheadX = this.timeToX(this.audio.getCurrentPosition());
        if (Math.abs(curX - playheadX) <= 8) {
          canvas.style.cursor = 'ew-resize';
        } else {
          canvas.style.cursor = 'default';
        }
      });

      canvas.addEventListener('mouseleave', () => {
        if (!isDragging) canvas.style.cursor = 'default';
      });

      const onStart = (e) => {
        isDragging = true;
        dragStartX = getX(e);
        dragStartScrollMs = this.scrollOffsetMs;
        const curTime = this.xToTime(dragStartX);
        const playheadX = this.timeToX(this.audio.getCurrentPosition());

        if (Math.abs(dragStartX - playheadX) <= 10) {
          this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        } else if (dragStartX > this.leftGutterWidth) {
          this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        }
      };

      const onMove = (e) => {
        if (!isDragging) return;
        const curX = getX(e);
        this.scrollOffsetMs = dragStartScrollMs - (curX - dragStartX) * this.msPerPixel;
        this.render();
      };

      const onEnd = () => {
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
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
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
// 6. Main Application Controller (SpectroSubApp)
// -------------------------------------------------------------
class SpectroSubApp {
  constructor() {
    this.currentTab = 'tab1';

    // Isolated Audio Engines
    this.audioTab1 = new AudioEngine('Tab1');
    this.audioTab2 = new AudioEngine('Tab2');

    // Tab 1 Subtitle cues & Selection
    this.cuesTab1 = [];
    this.activeCueTab1 = null;
    this.selectedCueIds = new Set();

    // Tab 1 DSP & Canvas
    this.fftTab1 = new FFTEngine(512, 256, 128);
    const canvas1 = document.getElementById('spectrogram-canvas');
    this.rendererTab1 = new SpectrogramCanvasRenderer(canvas1, this.audioTab1);

    // Tab 2 DSP & Canvases
    const cqtCanvas = document.getElementById('cqt-canvas');
    const chromaCanvas = document.getElementById('chroma-canvas');
    this.chordAnalyzerTab2 = new MusicalChordAnalyzer(cqtCanvas, chromaCanvas, this.audioTab2);
    this.chordWorker = null;

    this.initUI();
    this.initAudioPlaybackLoop();
    this.bindKeyboardShortcuts();

    // Resize observer
    window.addEventListener('resize', () => {
      if (this.currentTab === 'tab1') {
        this.rendererTab1.resize();
      } else {
        this.chordAnalyzerTab2.resize();
      }
    });

    // Call initial resize and layout immediately
    this.rendererTab1.resize();
    this.chordAnalyzerTab2.resize();

    // Auto load Sample 1 for Tab 1
    this.loadTab1Preset(1);
  }

  updateHeaderMeta(title, durationMs) {
    const titleEl = document.getElementById('track-title');
    const durEl = document.getElementById('track-duration');
    if (titleEl) titleEl.textContent = title || 'Chưa nạp file';
    if (durEl) durEl.textContent = TimeFormatter.formatMinuteSecond(durationMs || 0);
  }

  showLoading(msg, progress = 0) {
    const msgEl = document.getElementById('loading-msg');
    const barEl = document.getElementById('loading-bar');
    const overlayEl = document.getElementById('loading-overlay');
    if (msgEl) msgEl.textContent = msg;
    if (barEl) barEl.style.width = `${Math.round(progress * 100)}%`;
    if (overlayEl) overlayEl.style.display = 'flex';
  }

  hideLoading() {
    const overlayEl = document.getElementById('loading-overlay');
    if (overlayEl) overlayEl.style.display = 'none';
  }

  switchTab(targetTab) {
    if (this.currentTab === targetTab) return;

    if (this.currentTab === 'tab1' && this.audioTab1.isPlaying) {
      this.audioTab1.stop();
    } else if (this.currentTab === 'tab2' && this.audioTab2.isPlaying) {
      this.audioTab2.stop();
    }

    this.currentTab = targetTab;

    const pane1 = document.getElementById('tab-pane-1');
    const pane2 = document.getElementById('tab-pane-2');
    const nav1 = document.getElementById('nav-tab-1');
    const nav2 = document.getElementById('nav-tab-2');
    const badge = document.getElementById('header-active-tab-badge');

    if (pane1) pane1.classList.toggle('active', targetTab === 'tab1');
    if (pane2) pane2.classList.toggle('active', targetTab === 'tab2');
    if (nav1) nav1.classList.toggle('active', targetTab === 'tab1');
    if (nav2) nav2.classList.toggle('active', targetTab === 'tab2');

    if (badge) {
      badge.textContent = targetTab === 'tab1' ? 'Tab 1: Speech Spectrogram' : 'Tab 2: Musical Chord Analyzer';
    }

    const drawer = document.getElementById('tab-drawer-overlay');
    if (drawer) drawer.style.display = 'none';

    if (targetTab === 'tab1') {
      this.updateHeaderMeta(this.audioTab1.trackName, this.audioTab1.durationMs);
      this.rendererTab1.resize();
    } else {
      this.updateHeaderMeta(this.audioTab2.trackName, this.audioTab2.durationMs);
      this.chordAnalyzerTab2.resize();
    }
  }

  initUI() {
    // Drawer buttons
    const btnHam = document.getElementById('btn-hamburger');
    const drawer = document.getElementById('tab-drawer-overlay');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');

    if (btnHam && drawer) {
      btnHam.addEventListener('click', () => { drawer.style.display = 'flex'; });
    }
    if (btnCloseDrawer && drawer) {
      btnCloseDrawer.addEventListener('click', () => { drawer.style.display = 'none'; });
    }
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) drawer.style.display = 'none';
      });
    }

    // Navigation items
    const nav1 = document.getElementById('nav-tab-1');
    const nav2 = document.getElementById('nav-tab-2');
    if (nav1) nav1.addEventListener('click', () => this.switchTab('tab1'));
    if (nav2) nav2.addEventListener('click', () => this.switchTab('tab2'));

    // Header Upload dropdown
    const btnUpload = document.getElementById('btn-upload-file-header');
    const menuUpload = document.getElementById('upload-dropdown-menu');
    if (btnUpload && menuUpload) {
      btnUpload.addEventListener('click', (e) => {
        e.stopPropagation();
        menuUpload.style.display = (menuUpload.style.display === 'block') ? 'none' : 'block';
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#upload-dropdown-wrapper')) {
          menuUpload.style.display = 'none';
        }
      });
    }

    const btnDropUpload = document.getElementById('btn-dropdown-upload-file');
    if (btnDropUpload) {
      btnDropUpload.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        const input = (this.currentTab === 'tab1')
          ? document.getElementById('input-audio-tab1')
          : document.getElementById('input-audio-tab2');
        if (input) input.click();
      });
    }

    const btnSample1 = document.getElementById('btn-dropdown-load-sample1');
    if (btnSample1) {
      btnSample1.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        this.loadTab1Preset(1);
      });
    }

    const btnSample2 = document.getElementById('btn-dropdown-load-sample2');
    if (btnSample2) {
      btnSample2.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        this.loadTab1Preset(2);
      });
    }

    const btnSample3 = document.getElementById('btn-dropdown-load-sample3');
    if (btnSample3) {
      btnSample3.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        this.loadTab1Preset(3);
      });
    }

    // Tab 1 Playback buttons
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) btnPlay.addEventListener('click', () => this.audioTab1.togglePlay());

    const btnPlayLine = document.getElementById('btn-play-line');
    if (btnPlayLine) {
      btnPlayLine.addEventListener('click', () => {
        const cueToPlay = this.activeCueTab1 || (this.cuesTab1.length > 0 ? this.cuesTab1[0] : null);
        if (cueToPlay) {
          this.audioTab1.loopStartMs = cueToPlay.startMs;
          this.audioTab1.loopEndMs = cueToPlay.endMs;
          this.audioTab1.play(cueToPlay.startMs, cueToPlay.endMs);
        } else {
          this.audioTab1.loopStartMs = this.rendererTab1.selectionStartMs;
          this.audioTab1.loopEndMs = this.rendererTab1.selectionEndMs;
          this.audioTab1.play(this.rendererTab1.selectionStartMs, this.rendererTab1.selectionEndMs);
        }
      });
    }

    // btn-play-word: Only play the word where the yellow playhead bar currently is!
    const btnPlayWord = document.getElementById('btn-play-word');
    if (btnPlayWord) {
      btnPlayWord.addEventListener('click', () => {
        const curPos = this.audioTab1.getCurrentPosition();

        let targetCue = this.cuesTab1.find(c => curPos >= c.startMs && curPos <= c.endMs);
        if (!targetCue) {
          if (this.activeCueTab1) {
            targetCue = this.activeCueTab1;
          } else if (this.cuesTab1.length > 0) {
            targetCue = this.cuesTab1.reduce((prev, curr) => {
              const prevDist = Math.min(Math.abs(curPos - prev.startMs), Math.abs(curPos - prev.endMs));
              const currDist = Math.min(Math.abs(curPos - curr.startMs), Math.abs(curPos - curr.endMs));
              return currDist < prevDist ? curr : prev;
            }, this.cuesTab1[0]);
          }
        }

        if (!targetCue) return;

        if (!this.activeCueTab1 || this.activeCueTab1.id !== targetCue.id) {
          this.selectTab1Cue(targetCue);
        }

        const words = targetCue.resolvedWordTimings();
        if (words.length === 0) {
          this.audioTab1.loopStartMs = targetCue.startMs;
          this.audioTab1.loopEndMs = targetCue.endMs;
          this.audioTab1.play(targetCue.startMs, targetCue.endMs);
          return;
        }

        let targetWordIdx = 0;
        if (curPos < words[0].startMs) {
          targetWordIdx = 0;
        } else {
          for (let i = 0; i < words.length; i++) {
            const wStart = words[i].startMs;
            const wEnd = (i < words.length - 1) ? words[i + 1].startMs : targetCue.endMs;
            if (curPos >= wStart && curPos < wEnd) {
              targetWordIdx = i;
              break;
            } else if (curPos >= wStart) {
              targetWordIdx = i;
            }
          }
        }

        const wStart = words[targetWordIdx].startMs;
        const wEnd = (targetWordIdx < words.length - 1) ? words[targetWordIdx + 1].startMs : targetCue.endMs;

        this.audioTab1.loopStartMs = wStart;
        this.audioTab1.loopEndMs = wEnd;
        this.audioTab1.play(wStart, wEnd);
      });
    }

    const btnLoop = document.getElementById('btn-loop');
    if (btnLoop) {
      btnLoop.addEventListener('click', () => {
        this.audioTab1.isLooping = !this.audioTab1.isLooping;
        btnLoop.classList.toggle('loop-active', this.audioTab1.isLooping);
      });
    }

    const btnSetStart = document.getElementById('btn-set-start');
    if (btnSetStart) {
      btnSetStart.addEventListener('click', () => {
        const cur = this.audioTab1.getCurrentPosition();
        this.rendererTab1.selectionStartMs = cur;
        if (this.activeCueTab1) {
          this.activeCueTab1.startMs = cur;
          this.renderTab1CuesList();
        }
        this.rendererTab1.render();
      });
    }

    const btnSetEnd = document.getElementById('btn-set-end');
    if (btnSetEnd) {
      btnSetEnd.addEventListener('click', () => {
        const cur = this.audioTab1.getCurrentPosition();
        this.rendererTab1.selectionEndMs = cur;
        if (this.activeCueTab1) {
          this.activeCueTab1.endMs = cur;
          this.renderTab1CuesList();
        }
        this.rendererTab1.render();
      });
    }

    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.rendererTab1.zoomFactor = Math.max(5, this.rendererTab1.zoomFactor - 10);
        this.rendererTab1.render();
      });
    }

    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.rendererTab1.zoomFactor = Math.min(200, this.rendererTab1.zoomFactor + 10);
        this.rendererTab1.render();
      });
    }

    const selSpeed = document.getElementById('select-speed');
    if (selSpeed) {
      selSpeed.addEventListener('change', (e) => {
        this.audioTab1.setSpeed(parseFloat(e.target.value));
      });
    }

    // Direct 3-level Eye View Mode Switch (Spectro -> Waveform -> Dual)
    const btnViewMode = document.getElementById('btn-view-mode');
    const viewModeLabel = document.getElementById('view-mode-label');
    if (btnViewMode) {
      btnViewMode.addEventListener('click', () => {
        const modes = ['SPECTROGRAM', 'WAVEFORM', 'DUAL'];
        const nextIdx = (modes.indexOf(this.rendererTab1.viewMode) + 1) % modes.length;
        const nextMode = modes[nextIdx];
        this.rendererTab1.viewMode = nextMode;

        if (viewModeLabel) {
          viewModeLabel.textContent = nextMode === 'SPECTROGRAM' ? 'Spectro' : nextMode === 'WAVEFORM' ? 'Waveform' : 'Dual';
        }
        btnViewMode.title = `Chế độ hiển thị: ${nextMode} (Bấm để đổi: Spectro → Waveform → Dual)`;
        btnViewMode.style.borderColor = nextMode === 'DUAL' ? '#38bdf8' : nextMode === 'SPECTROGRAM' ? '#a855f7' : '#10b981';
        btnViewMode.style.color = nextMode === 'DUAL' ? '#38bdf8' : nextMode === 'SPECTROGRAM' ? '#d8b4fe' : '#6ee7b7';
        btnViewMode.style.background = nextMode === 'DUAL'
          ? 'rgba(56, 189, 248, 0.14)'
          : nextMode === 'SPECTROGRAM'
            ? 'rgba(168, 85, 247, 0.14)'
            : 'rgba(16, 185, 129, 0.14)';

        this.rendererTab1.render();
      });
    }

    // Move Selected Cues Up / Down
    const btnMoveUp = document.getElementById('btn-move-up');
    if (btnMoveUp) {
      btnMoveUp.addEventListener('click', () => {
        const targetIds = this.selectedCueIds.size > 0 ? this.selectedCueIds : (this.activeCueTab1 ? new Set([this.activeCueTab1.id]) : new Set());
        if (targetIds.size === 0 || this.cuesTab1.length < 2) return;

        let moved = false;
        for (let i = 1; i < this.cuesTab1.length; i++) {
          if (targetIds.has(this.cuesTab1[i].id) && !targetIds.has(this.cuesTab1[i - 1].id)) {
            const tmp = this.cuesTab1[i - 1];
            this.cuesTab1[i - 1] = this.cuesTab1[i];
            this.cuesTab1[i] = tmp;
            moved = true;
          }
        }
        if (moved) {
          this.renderTab1CuesList();
          this.rendererTab1.render();
        }
      });
    }

    const btnMoveDown = document.getElementById('btn-move-down');
    if (btnMoveDown) {
      btnMoveDown.addEventListener('click', () => {
        const targetIds = this.selectedCueIds.size > 0 ? this.selectedCueIds : (this.activeCueTab1 ? new Set([this.activeCueTab1.id]) : new Set());
        if (targetIds.size === 0 || this.cuesTab1.length < 2) return;

        let moved = false;
        for (let i = this.cuesTab1.length - 2; i >= 0; i--) {
          if (targetIds.has(this.cuesTab1[i].id) && !targetIds.has(this.cuesTab1[i + 1].id)) {
            const tmp = this.cuesTab1[i + 1];
            this.cuesTab1[i + 1] = this.cuesTab1[i];
            this.cuesTab1[i] = tmp;
            moved = true;
          }
        }
        if (moved) {
          this.renderTab1CuesList();
          this.rendererTab1.render();
        }
      });
    }

    // Master clock toggle
    const btnMasterClock = document.getElementById('btn-master-clock');
    if (btnMasterClock) {
      btnMasterClock.addEventListener('click', () => {
        const states = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
        const curFirst = this.cuesTab1[0]?.clockState || CueClockState.SHOW_LOCKED;
        const nextIdx = (states.indexOf(curFirst) + 1) % states.length;
        const nextState = states[nextIdx];

        this.cuesTab1.forEach(c => {
          c.clockState = nextState;
          if (nextState === CueClockState.EDITING_WORDS && (!c.wordTimings || c.wordTimings.length === 0)) {
            c.wordTimings = c.resolvedWordTimings();
          }
        });
        btnMasterClock.setAttribute('data-state', nextState);
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });
    }

    // Frequency Legend modal
    const btnFreqLegend = document.getElementById('btn-freq-legend');
    const modalFreq = document.getElementById('modal-freq-legend');
    if (btnFreqLegend && modalFreq) {
      btnFreqLegend.addEventListener('click', () => { modalFreq.style.display = 'flex'; });
    }

    // Add Cues modal
    const btnOpenAddCues = document.getElementById('btn-open-add-cues');
    const modalAddCues = document.getElementById('modal-add-cues');
    const btnConfirmAdd = document.getElementById('btn-confirm-add-cues');
    const textareaAdd = document.getElementById('textarea-add-cues');
    const selectPos = document.getElementById('select-insert-pos');

    if (btnOpenAddCues && modalAddCues) {
      btnOpenAddCues.addEventListener('click', () => { modalAddCues.style.display = 'flex'; });
    }
    if (btnConfirmAdd && textareaAdd && modalAddCues) {
      btnConfirmAdd.addEventListener('click', () => {
        const text = textareaAdd.value;
        const pos = selectPos ? selectPos.value : 'AFTER_SELECTED';
        this.addTab1CuesFromText(text, pos);
        textareaAdd.value = '';
        modalAddCues.style.display = 'none';
      });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const m = e.target.closest('.modal-overlay');
        if (m) m.style.display = 'none';
      });
    });

    // Pane Splitter resizing
    const splitter = document.getElementById('pane-splitter');
    const canvasPanel = document.getElementById('canvas-panel');
    if (splitter && canvasPanel) {
      let isDraggingSplitter = false, startY = 0, startHeight = 0;
      splitter.addEventListener('mousedown', (e) => {
        isDraggingSplitter = true;
        startY = e.clientY;
        startHeight = canvasPanel.getBoundingClientRect().height;
        splitter.classList.add('dragging');
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDraggingSplitter) return;
        const delta = e.clientY - startY;
        const totalH = window.innerHeight;
        const newPct = Math.max(25, Math.min(75, ((startHeight + delta) / totalH) * 100));
        canvasPanel.style.height = `${newPct}%`;
        const subPanel = document.querySelector('.subtitle-panel');
        if (subPanel) subPanel.style.height = `${100 - newPct}%`;
        this.rendererTab1.resize();
      });
      window.addEventListener('mouseup', () => {
        if (isDraggingSplitter) {
          isDraggingSplitter = false;
          splitter.classList.remove('dragging');
          this.rendererTab1.resize();
        }
      });
    }

    // Tab 1 file input
    const inputTab1 = document.getElementById('input-audio-tab1');
    if (inputTab1) {
      inputTab1.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadTab1AudioFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Tab 2 Controls
    const btnTab2Play = document.getElementById('btn-tab2-play');
    if (btnTab2Play) btnTab2Play.addEventListener('click', () => this.audioTab2.togglePlay());

    const btnTab2Loop = document.getElementById('btn-tab2-loop');
    if (btnTab2Loop) {
      btnTab2Loop.addEventListener('click', () => {
        this.audioTab2.isLooping = !this.audioTab2.isLooping;
        btnTab2Loop.classList.toggle('loop-active', this.audioTab2.isLooping);
      });
    }

    const btnTab2ZoomOut = document.getElementById('btn-tab2-zoom-out');
    if (btnTab2ZoomOut) {
      btnTab2ZoomOut.addEventListener('click', () => {
        this.chordAnalyzerTab2.zoomFactor = Math.max(5, this.chordAnalyzerTab2.zoomFactor - 8);
        this.chordAnalyzerTab2.render();
      });
    }

    const btnTab2ZoomIn = document.getElementById('btn-tab2-zoom-in');
    if (btnTab2ZoomIn) {
      btnTab2ZoomIn.addEventListener('click', () => {
        this.chordAnalyzerTab2.zoomFactor = Math.min(200, this.chordAnalyzerTab2.zoomFactor + 8);
        this.chordAnalyzerTab2.render();
      });
    }

    const selPitchRange = document.getElementById('select-tab2-pitch-range');
    if (selPitchRange) {
      selPitchRange.addEventListener('change', (e) => {
        this.chordAnalyzerTab2.pitchRangeMode = e.target.value;
        this.chordAnalyzerTab2.render();
      });
    }

    const selPalette = document.getElementById('select-tab2-palette');
    if (selPalette) {
      selPalette.addEventListener('change', (e) => {
        this.chordAnalyzerTab2.paletteKey = e.target.value;
        this.chordAnalyzerTab2.render();
      });
    }

    const btnTab2Choose = document.getElementById('btn-tab2-choose-file');
    const btnTab2Select = document.getElementById('btn-tab2-select-file');
    const inputTab2 = document.getElementById('input-audio-tab2');

    if (btnTab2Choose && inputTab2) {
      btnTab2Choose.addEventListener('click', () => inputTab2.click());
    }
    if (btnTab2Select && inputTab2) {
      btnTab2Select.addEventListener('click', () => inputTab2.click());
    }
    if (inputTab2) {
      inputTab2.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadTab2AudioFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Tab 2 Drag and Drop
    const dropzone = document.getElementById('tab2-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadTab2AudioFile(e.dataTransfer.files[0]);
        }
      });
    }
  }

  // -------------------------------------------------------------
  // Tab 1 Operations
  // -------------------------------------------------------------
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

  getClockStateTooltip(state) {
    switch (state) {
      case CueClockState.OFF:
        return 'Chế độ [TẮT - Xám]: Không hiện dòng transcript dưới thanh thời gian';
      case CueClockState.SHOW_LOCKED:
        return 'Chế độ [HIỆN & KHÓA - Xanh Dương]: Hiện dòng text dưới thanh thời gian';
      case CueClockState.EDITING_TIME:
        return 'Chế độ [SỬA THỜI GIAN - Vàng]: Ám vàng nhạt vùng phổ/sóng & cho phép kéo chỉnh mốc';
      case CueClockState.EDITING_WORDS:
        return 'Chế độ [SỬA TỪNG TỪ - Tím]: Ám tím nhạt & kéo các vạch tím đậm để chỉnh vị trí từng từ';
      default:
        return 'Chế độ đồng hồ';
    }
  }

  async loadTab1Preset(presetId) {
    let trackLabel = 'Ví dụ 1';
    let presetCues = [];
    let candidatePaths = [];

    if (presetId === 1) {
      candidatePaths = [
        '/assets/french_liaisons.mp3',
        './assets/french_liaisons.mp3',
        '/public/assets/french_liaisons.mp3',
        '/assets/french_liaisons.wav'
      ];
      trackLabel = 'Ví dụ 1';
      presetCues = [
        new SubtitleCue({
          startMs: 0,
          endMs: 2100,
          text: "C'est une rất belle histoire",
          actor: "Ví dụ 1",
          clockState: CueClockState.EDITING_WORDS
        }),
        new SubtitleCue({
          startMs: 2100,
          endMs: 4100,
          text: "les enfants adorent les oiseaux",
          actor: "Ví dụ 1",
          clockState: CueClockState.EDITING_TIME
        }),
        new SubtitleCue({
          startMs: 4100,
          endMs: 6020,
          text: "et nous allons ensemble à Paris",
          actor: "Ví dụ 1",
          clockState: CueClockState.SHOW_LOCKED
        })
      ];
    } else if (presetId === 2) {
      candidatePaths = [
        '/assets/french_conversation.mp3',
        './assets/french_conversation.mp3',
        '/public/assets/french_conversation.mp3',
        '/assets/french_conversation.wav'
      ];
      trackLabel = 'Ví dụ 2';
      presetCues = [
        new SubtitleCue({ startMs: 0, endMs: 2600, text: "Je ne sais pas ce que tu penses", actor: "Ví dụ 2", clockState: CueClockState.EDITING_WORDS }),
        new SubtitleCue({ startMs: 2650, endMs: 5560, text: "mais il faut faire attention aux liaisons et aux élisions", actor: "Ví dụ 2", clockState: CueClockState.SHOW_LOCKED })
      ];
    } else {
      candidatePaths = [
        '/assets/french_liaisons.wav',
        './assets/french_liaisons.wav',
        '/public/assets/french_liaisons.wav',
        '/assets/french_liaisons.mp3'
      ];
      trackLabel = 'Ví dụ 3';
      presetCues = [];
      for (let i = 0; i < 28; i++) {
        const s = i * 7500;
        const state = (i % 3 === 0) ? CueClockState.EDITING_WORDS : (i % 3 === 1 ? CueClockState.EDITING_TIME : CueClockState.SHOW_LOCKED);
        presetCues.push(new SubtitleCue({
          startMs: s,
          endMs: s + 3200,
          text: `[#${i + 1}] C'est une belle prononciation française`,
          actor: 'Français',
          clockState: state
        }));
      }
    }

    this.cuesTab1 = presetCues;
    this.selectTab1Cue(presetCues[0]);
    this.renderTab1CuesList();

    // 1) Instant 0ms render with synthetic speech so canvas is never blank or stuck
    const durSec = presetCues.length > 0 ? (presetCues[presetCues.length - 1].endMs / 1000.0) : 6.02;
    this.audioTab1.loadSyntheticSpeechBuffer(durSec, trackLabel);
    this.updateHeaderMeta(trackLabel, this.audioTab1.durationMs);
    this.rendererTab1.resize();

    try {
      const initialSpec = await this.fftTab1.computeSpectrogramAsync(this.audioTab1.samples16k, 16000, () => {});
      this.rendererTab1.spectrogram = initialSpec;
      this.rendererTab1.resize();
      this.renderTab1CuesList();
    } catch (_) {}

    // 2) Asynchronously load real audio file in background without blocking UI
    (async () => {
      let arrayBuf = null;
      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            arrayBuf = await res.arrayBuffer();
            break;
          }
        } catch (_) {}
      }

      if (arrayBuf) {
        try {
          await this.audioTab1.loadAudioBuffer(arrayBuf, trackLabel, () => {});
          const realSpec = await this.fftTab1.computeSpectrogramAsync(this.audioTab1.samples16k, 16000, () => {});
          this.rendererTab1.spectrogram = realSpec;
          if (this.currentTab === 'tab1') {
            this.updateHeaderMeta(trackLabel, this.audioTab1.durationMs);
          }
          this.rendererTab1.resize();
        } catch (loadErr) {
          console.warn('Real audio decode fallback:', loadErr);
        }
      }
    })();
  }

  selectTab1Cue(cue) {
    this.activeCueTab1 = cue;
    this.rendererTab1.activeCue = cue;
    this.rendererTab1.cues = this.cuesTab1;
    if (cue) {
      this.rendererTab1.selectionStartMs = cue.startMs;
      this.rendererTab1.selectionEndMs = cue.endMs;
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

    if (!this.cuesTab1 || this.cuesTab1.length === 0) {
      this.cuesTab1 = newCues;
    } else if (position === 'START_OF_LIST') {
      this.cuesTab1.unshift(...newCues);
    } else if (position === 'END_OF_LIST' || !this.activeCueTab1) {
      this.cuesTab1.push(...newCues);
    } else {
      const idx = this.cuesTab1.indexOf(this.activeCueTab1);
      this.cuesTab1.splice(position === 'BEFORE_SELECTED' ? idx : idx + 1, 0, ...newCues);
    }

    const maxEnd = Math.max(...this.cuesTab1.map(c => c.endMs || 0));
    if (!this.audioTab1.durationMs || this.audioTab1.durationMs < maxEnd) {
      this.audioTab1.durationMs = Math.max(7000, maxEnd + 1000);
    }

    this.selectTab1Cue(newCues[0]);
    this.renderTab1CuesList();
    this.rendererTab1.render();
  }

  renderTab1CuesList() {
    const container = document.getElementById('cues-list-container');
    if (!container) return;
    container.innerHTML = '';

    const countLabel = document.getElementById('cues-count-label');
    if (countLabel) {
      countLabel.textContent = `Danh sách câu (${this.cuesTab1.length})${this.selectedCueIds.size > 0 ? ` • Đã chọn ${this.selectedCueIds.size}` : ''}`;
    }

    this.cuesTab1.forEach((cue) => {
      const isActive = this.activeCueTab1 && this.activeCueTab1.id === cue.id;
      const isSelected = this.selectedCueIds.has(cue.id);

      const card = document.createElement('div');
      card.className = `cue-card ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.nudge-btn') || e.target.closest('.cue-clock-btn') || e.target.tagName === 'INPUT') return;
        this.selectTab1Cue(cue);
        this.rendererTab1.scrollOffsetMs = cue.startMs - (this.rendererTab1.width * this.rendererTab1.msPerPixel) * 0.15;
        this.audioTab1.seek(cue.startMs);
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      // Left selection checkbox
      const leftSelect = document.createElement('div');
      leftSelect.className = 'cue-card-left-select';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cue-select-checkbox';
      checkbox.checked = isSelected;
      checkbox.title = 'Chọn câu này để di chuyển Lên/Xuống';
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedCueIds.has(cue.id)) {
          this.selectedCueIds.delete(cue.id);
        } else {
          this.selectedCueIds.add(cue.id);
        }
        this.renderTab1CuesList();
      });
      leftSelect.appendChild(checkbox);
      card.appendChild(leftSelect);

      // Main content
      const cardMain = document.createElement('div');
      cardMain.className = 'cue-card-main';

      const row1 = document.createElement('div');
      row1.className = 'cue-card-row1';

      const metaLeft = document.createElement('div');
      metaLeft.className = 'cue-meta-left';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'cue-time-badge mono-font';
      timeBadge.textContent = TimeFormatter.formatMinuteSecond(cue.startMs);
      timeBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectTab1Cue(cue);
        this.rendererTab1.scrollOffsetMs = cue.startMs - (this.rendererTab1.width * this.rendererTab1.msPerPixel) * 0.15;
        this.audioTab1.seek(cue.startMs);
        this.rendererTab1.render();
      });

      const clockBtn = document.createElement('button');
      clockBtn.className = 'cue-clock-btn';
      clockBtn.setAttribute('data-state', cue.clockState);
      clockBtn.title = this.getClockStateTooltip(cue.clockState);
      clockBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      clockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const states = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
        const curIdx = states.indexOf(cue.clockState);
        cue.clockState = states[(curIdx + 1) % states.length];
        if (cue.clockState === CueClockState.EDITING_WORDS && (!cue.wordTimings || cue.wordTimings.length === 0)) {
          cue.wordTimings = cue.resolvedWordTimings();
        }
        clockBtn.setAttribute('data-state', cue.clockState);
        clockBtn.title = this.getClockStateTooltip(cue.clockState);
        this.selectTab1Cue(cue);
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      metaLeft.appendChild(timeBadge);
      metaLeft.appendChild(clockBtn);

      const rightControls = document.createElement('div');
      rightControls.style.display = 'flex';
      rightControls.style.gap = '4px';

      const btnDel = document.createElement('button');
      btnDel.className = 'nudge-btn';
      btnDel.textContent = 'Xóa';
      btnDel.style.color = '#ef4444';
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = this.cuesTab1.indexOf(cue);
        this.cuesTab1.splice(idx, 1);
        this.selectedCueIds.delete(cue.id);
        if (this.cuesTab1.length > 0) this.selectTab1Cue(this.cuesTab1[Math.max(0, idx - 1)]);
        else this.activeCueTab1 = null;
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      rightControls.appendChild(btnDel);
      row1.appendChild(metaLeft);
      row1.appendChild(rightControls);
      cardMain.appendChild(row1);

      const textInput = document.createElement('input');
      textInput.className = 'cue-text-input';
      textInput.value = cue.text;
      textInput.addEventListener('input', (e) => {
        cue.text = e.target.value;
        this.rendererTab1.render();
      });
      textInput.addEventListener('focus', () => this.selectTab1Cue(cue));
      cardMain.appendChild(textInput);

      card.appendChild(cardMain);
      container.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // Tab 2 Operations
  // -------------------------------------------------------------
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

      this.chordWorker = new Worker('/chord-worker.js');

      this.chordWorker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          this.showLoading('Đang phân tích CQT Semitones & Triệt tiêu bồi âm trong Web Worker...', 0.35 + msg.progress * 0.6);
        } else if (msg.type === 'done') {
          this.chordAnalyzerTab2.data = msg;
          this.hideLoading();

          const emptyOverlay = document.getElementById('tab2-empty-overlay');
          if (emptyOverlay) emptyOverlay.style.display = 'none';

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

  // -------------------------------------------------------------
  // Playback Loop & Keyboard Shortcuts
  // -------------------------------------------------------------
  initAudioPlaybackLoop() {
    const playBtn1 = document.getElementById('btn-play');
    this.audioTab1.onPlayStateChange = (playing) => {
      if (!playBtn1) return;
      playBtn1.classList.toggle('playing', playing);
      playBtn1.innerHTML = playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    };

    const playBtn2 = document.getElementById('btn-tab2-play');
    this.audioTab2.onPlayStateChange = (playing) => {
      if (!playBtn2) return;
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
        const badge1 = document.getElementById('cursor-time-badge');
        if (badge1) badge1.textContent = TimeFormatter.formatFull(cur1);
      } else {
        if (this.audioTab2.isPlaying) {
          this.chordAnalyzerTab2.render();
        }
        const cur2 = this.audioTab2.getCurrentPosition();
        const badge2 = document.getElementById('tab2-time-badge');
        if (badge2) badge2.textContent = TimeFormatter.formatFull(cur2);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.currentTab === 'tab1') this.audioTab1.togglePlay();
        else this.audioTab2.togglePlay();
      } else if (e.code === 'KeyS' && this.currentTab === 'tab1') {
        e.preventDefault();
        const btn = document.getElementById('btn-play-line');
        if (btn) btn.click();
      } else if (e.code === 'KeyW' && this.currentTab === 'tab1') {
        e.preventDefault();
        const btn = document.getElementById('btn-play-word');
        if (btn) btn.click();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        if (this.currentTab === 'tab1') {
          const btn = document.getElementById('btn-loop');
          if (btn) btn.click();
        } else {
          const btn = document.getElementById('btn-tab2-loop');
          if (btn) btn.click();
        }
      } else if (e.key === '[' && this.currentTab === 'tab1') {
        e.preventDefault();
        const btn = document.getElementById('btn-set-start');
        if (btn) btn.click();
      } else if (e.key === ']' && this.currentTab === 'tab1') {
        e.preventDefault();
        const btn = document.getElementById('btn-set-end');
        if (btn) btn.click();
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

// -------------------------------------------------------------
// 7. Initialization: 100% Wrapped in DOMContentLoaded
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SpectroSubApp();
});
