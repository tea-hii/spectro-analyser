import { SpectrogramData } from '../types';

export class FFTEngine {
  fftSize: number;
  hopSize: number;
  targetBins: number;
  halfFft: number;
  hannWindow: Float32Array;
  bitRev: Int32Array;
  cosTable: Float32Array;
  sinTable: Float32Array;
  binStart: Int32Array;
  binEnd: Int32Array;
  binInvCount: Float32Array;

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

  fft(real: Float32Array, imag: Float32Array): void {
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

  async computeSpectrogramAsync(
    samples: Float32Array,
    sampleRate: number,
    onProgress: (p: number) => void = () => {}
  ): Promise<SpectrogramData | null> {
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
