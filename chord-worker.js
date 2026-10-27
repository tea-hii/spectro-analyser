/**
 * Musical Chord Analyzer - Web Worker (Zero UI Freeze)
 * Two-Stage Coarse Analysis:
 * 1. Stage 1 (Fast Spectral Probe): Sparse STFT probe to obtain 1D Average Power Spectrum
 * 2. Active Range Detection (Dynamic Range Cropping): -45 dB noise floor threshold with 2-semitone safety padding
 * 3. Stage 2 (Fast Log-Filterbank / Coarse CQT Approximation): STFT with ~46ms hop size,
 *    Log-spaced Triangular Filterbank restricted to [min_note, max_note],
 *    Harmonic Overtone Suppression, 12-Tone Chromagram, and Real-time Chord Estimator
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord templates for 12 major & 12 minor triads
const CHORD_TEMPLATES = [];
for (let root = 0; root < 12; root++) {
  // Major triad: root, +4 semitones (major 3rd), +7 semitones (perfect 5th)
  const majVec = new Float32Array(12);
  majVec[root] = 1.0;
  majVec[(root + 4) % 12] = 0.8;
  majVec[(root + 7) % 12] = 0.8;
  CHORD_TEMPLATES.push({ name: `${NOTE_NAMES[root]}`, vector: majVec });

  // Minor triad: root, +3 semitones (minor 3rd), +7 semitones (perfect 5th)
  const minVec = new Float32Array(12);
  minVec[root] = 1.0;
  minVec[(root + 3) % 12] = 0.8;
  minVec[(root + 7) % 12] = 0.8;
  CHORD_TEMPLATES.push({ name: `${NOTE_NAMES[root]}m`, vector: minVec });
}

function midiToFreq(m) {
  return 440.0 * Math.pow(2.0, (m - 69.0) / 12.0);
}

function freqToMidi(f) {
  if (f <= 0) return 24;
  return Math.round(69.0 + 12.0 * Math.log2(f / 440.0));
}

// Cooley-Tukey Radix-2 FFT in worker
class WorkerFFT {
  constructor(size) {
    this.size = size;
    this.half = size / 2;
    this.window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      this.window[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (size - 1)));
    }

    this.bitRev = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      let j = i, rev = 0, temp = size;
      while (temp > 1) {
        rev = (rev << 1) | (j & 1);
        j >>= 1;
        temp >>= 1;
      }
      this.bitRev[i] = rev;
    }

    this.cosTable = new Float32Array(this.half);
    this.sinTable = new Float32Array(this.half);
    for (let i = 0; i < this.half; i++) {
      this.cosTable[i] = Math.cos((-2.0 * Math.PI * i) / size);
      this.sinTable[i] = Math.sin((-2.0 * Math.PI * i) / size);
    }
  }

  transform(real, imag) {
    const n = this.size;
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
}

self.onmessage = function (e) {
  const { action, samples, sampleRate } = e.data;
  if (action !== 'analyzeChords') return;

  try {
    const totalSamples = samples.length;
    const durationMs = Math.round((totalSamples / sampleRate) * 1000);

    // =========================================================================
    // Giai đoạn 1: Fast Spectral Probe
    // Chạy một lượt STFT/FFT thô với độ phân giải thời gian thưa (100–200ms/frame)
    // Tính tổng năng lượng trung bình theo trục thời gian -> Average Power Spectrum
    // =========================================================================
    self.postMessage({ type: 'progress', progress: 0.05 });

    const probeHop = Math.round(sampleRate * 0.15); // ~150 ms hop size
    const probeFftSize = 2048;
    const probeFft = new WorkerFFT(probeFftSize);
    const probeHalf = probeFftSize / 2;
    const probeFreqBinWidth = sampleRate / probeFftSize;
    const numProbeFrames = Math.max(1, Math.ceil(totalSamples / probeHop));

    const avgPowerSpectrum = new Float64Array(probeHalf);
    const probeReal = new Float32Array(probeFftSize);
    const probeImag = new Float32Array(probeFftSize);

    for (let pf = 0; pf < numProbeFrames; pf++) {
      const center = pf * probeHop;
      const start = center - (probeFftSize / 2);

      for (let i = 0; i < probeFftSize; i++) {
        const idx = start + i;
        probeReal[i] = (idx >= 0 && idx < totalSamples) ? samples[idx] * probeFft.window[i] : 0.0;
        probeImag[i] = 0.0;
      }

      probeFft.transform(probeReal, probeImag);

      for (let b = 0; b < probeHalf; b++) {
        const r = probeReal[b];
        const im = probeImag[b];
        avgPowerSpectrum[b] += (r * r + im * im);
      }
    }

    for (let b = 0; b < probeHalf; b++) {
      avgPowerSpectrum[b] /= numProbeFrames;
    }

    self.postMessage({ type: 'progress', progress: 0.15 });

    // =========================================================================
    // Xác định dải nốt mục tiêu (Dynamic Range Cropping)
    // Dò tìm tần số thấp nhất và cao nhất có năng lượng vượt ngưỡng sàn nhiễu
    // (-45 dB so với đỉnh cực đại).
    // Quy đổi sang nốt MIDI + biên an toàn 2 bán âm -> [min_note, max_note]
    // =========================================================================
    const minSearchBin = Math.max(1, Math.floor(30.0 / probeFreqBinWidth)); // ~30 Hz (A#0 ~ B0)
    const maxSearchBin = Math.min(probeHalf - 1, Math.ceil(3500.0 / probeFreqBinWidth)); // ~3500 Hz (A7)

    let peakPower = 1e-12;
    for (let b = minSearchBin; b <= maxSearchBin; b++) {
      if (avgPowerSpectrum[b] > peakPower) {
        peakPower = avgPowerSpectrum[b];
      }
    }

    let min_note = 38; // Default D2
    let max_note = 76; // Default E5

    if (peakPower > 1e-9) {
      // Noise floor threshold: -45 dB relative to maximum peak power (10^-4.5)
      const noiseFloorThresh = peakPower * Math.pow(10.0, -4.5);

      let minActiveBin = minSearchBin;
      let maxActiveBin = maxSearchBin;

      for (let b = minSearchBin; b <= maxSearchBin; b++) {
        if (avgPowerSpectrum[b] >= noiseFloorThresh) {
          minActiveBin = b;
          break;
        }
      }

      for (let b = maxSearchBin; b >= minSearchBin; b--) {
        if (avgPowerSpectrum[b] >= noiseFloorThresh) {
          maxActiveBin = b;
          break;
        }
      }

      const minActiveFreq = minActiveBin * probeFreqBinWidth;
      const maxActiveFreq = maxActiveBin * probeFreqBinWidth;

      // Quy đổi sang MIDI note và cộng biên an toàn 2 bán âm mỗi đầu
      min_note = freqToMidi(minActiveFreq) - 2;
      max_note = freqToMidi(maxActiveFreq) + 2;

      // Giới hạn biên an toàn trong dải âm nhạc chuẩn (C1=24 đến C7=96)
      min_note = Math.max(24, Math.min(84, min_note));
      max_note = Math.min(96, Math.max(min_note + 18, max_note));

      // Đảm bảo khung hiển thị tối thiểu 18 bán âm (1.5 quãng tám) để trực quan đẹp mắt
      if (max_note - min_note < 18) {
        const spanDiff = 18 - (max_note - min_note);
        const padLower = Math.floor(spanDiff / 2);
        const padUpper = spanDiff - padLower;
        min_note = Math.max(24, min_note - padLower);
        max_note = Math.min(96, max_note + padUpper);
      }
    }

    // =========================================================================
    // Giai đoạn 2: Fast Log-Filterbank / Coarse CQT Approximation
    // STFT cấu hình nhẹ: hop size ~46ms (~736 mẫu ở 16kHz hoặc 2048 mẫu ở 44.1kHz)
    // Phân giải 12 bins/octave (1 bin duy nhất cho mỗi bán âm)
    // Khởi tạo Log-spaced Triangular Filterbank CHỈ RIÊNG cho [min_note, max_note]
    // =========================================================================
    const stage2Hop = (sampleRate >= 32000) ? 2048 : Math.max(256, Math.round(sampleRate * 0.046)); // ~46 ms
    const stage2FftSize = 2048;
    const stage2Fft = new WorkerFFT(stage2FftSize);
    const stage2Half = stage2FftSize / 2;
    const freqBinWidth = sampleRate / stage2FftSize;

    const numSemitones = max_note - min_note + 1;
    const numFrames = Math.max(1, Math.ceil(totalSamples / stage2Hop));

    // Khởi tạo ma trận bộ lọc tam giác logarit CHỈ RIÊNG cho [min_note, max_note]
    const semitoneFilters = [];
    for (let m = min_note; m <= max_note; m++) {
      const centerFreq = midiToFreq(m);
      const lowerFreq = midiToFreq(m - 0.5);
      const upperFreq = midiToFreq(m + 0.5);

      const startBin = Math.max(1, Math.floor(lowerFreq / freqBinWidth));
      const centerBin = centerFreq / freqBinWidth;
      const endBin = Math.min(stage2Half - 1, Math.ceil(upperFreq / freqBinWidth));

      const bins = [];
      const weights = [];
      let totalWeight = 0;

      for (let b = startBin; b <= endBin; b++) {
        const f = b * freqBinWidth;
        let w = 0;
        if (f <= centerFreq) {
          w = (f - lowerFreq) / (centerFreq - lowerFreq);
        } else {
          w = (upperFreq - f) / (upperFreq - centerFreq);
        }
        w = Math.max(0, w);
        if (w > 0) {
          bins.push(b);
          weights.push(w);
          totalWeight += w;
        }
      }

      if (totalWeight > 0) {
        for (let i = 0; i < weights.length; i++) {
          weights[i] /= totalWeight;
        }
      } else {
        // Dự phòng cho nốt trầm khi bin width lớn: lấy bin gần nhất
        const nearestBin = Math.max(1, Math.min(stage2Half - 1, Math.round(centerBin)));
        bins.push(nearestBin);
        weights.push(1.0);
      }

      semitoneFilters.push({ midi: m, centerFreq, bins, weights });
    }

    // Allocate output matrices
    // CQT semitone matrix: flat Uint8Array (numFrames * numSemitones)
    const cqtMatrix = new Uint8Array(numFrames * numSemitones);
    // Chromagram 12-tone matrix: flat Uint8Array (numFrames * 12)
    const chromagramMatrix = new Uint8Array(numFrames * 12);
    // Estimated chord name per frame
    const detectedChords = new Array(numFrames);

    const real = new Float32Array(stage2FftSize);
    const imag = new Float32Array(stage2FftSize);
    const rawMagnitudes = new Float32Array(stage2Half);

    const progressInterval = Math.max(20, Math.floor(numFrames / 40));

    for (let f = 0; f < numFrames; f++) {
      if (f % progressInterval === 0) {
        self.postMessage({ type: 'progress', progress: 0.20 + 0.78 * (f / numFrames) });
      }

      const center = f * stage2Hop;
      const start = center - (stage2FftSize / 2);

      // Windowed signal
      for (let i = 0; i < stage2FftSize; i++) {
        const idx = start + i;
        real[i] = (idx >= 0 && idx < totalSamples) ? samples[idx] * stage2Fft.window[i] : 0.0;
        imag[i] = 0.0;
      }

      stage2Fft.transform(real, imag);

      // Magnitude spectrum
      for (let i = 0; i < stage2Half; i++) {
        const r = real[i], im = imag[i];
        rawMagnitudes[i] = Math.sqrt(r * r + im * im);
      }

      // 1. Chiếu ma trận biên độ phổ STFT qua bộ lọc tam giác logarit
      const rawSemitoneEnergy = new Float32Array(numSemitones);
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const filter = semitoneFilters[sIdx];
        let sum = 0;
        for (let k = 0; k < filter.bins.length; k++) {
          sum += rawMagnitudes[filter.bins[k]] * filter.weights[k];
        }
        rawSemitoneEnergy[sIdx] = sum;
      }

      // 2. Harmonic Overtone Suppression (Fundamental Extraction)
      // Giảm năng lượng bồi âm bậc 2 (octave +12) và bậc 3 (+19) để nổi bật cao độ gốc
      const cleanedSemitoneEnergy = new Float32Array(numSemitones);
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        cleanedSemitoneEnergy[sIdx] = rawSemitoneEnergy[sIdx];
      }

      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const fund = rawSemitoneEnergy[sIdx];
        if (fund > 0.001) {
          if (sIdx + 12 < numSemitones) {
            cleanedSemitoneEnergy[sIdx + 12] = Math.max(0, cleanedSemitoneEnergy[sIdx + 12] - fund * 0.45);
          }
          if (sIdx + 19 < numSemitones) {
            cleanedSemitoneEnergy[sIdx + 19] = Math.max(0, cleanedSemitoneEnergy[sIdx + 19] - fund * 0.35);
          }
          if (sIdx + 24 < numSemitones) {
            cleanedSemitoneEnergy[sIdx + 24] = Math.max(0, cleanedSemitoneEnergy[sIdx + 24] - fund * 0.25);
          }
        }
      }

      // 3. Log dB Compression [0 .. 255] vào cqtMatrix
      const cqtBase = f * numSemitones;
      let frameMaxCqt = 0.0001;
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const v = cleanedSemitoneEnergy[sIdx];
        if (v > frameMaxCqt) frameMaxCqt = v;
      }

      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const v = cleanedSemitoneEnergy[sIdx];
        const db = 20.0 * Math.log10(v / frameMaxCqt + 1e-4);
        const q = Math.max(0, Math.min(255, Math.floor(((db + 60.0) / 60.0) * 255.0)));
        cqtMatrix[cqtBase + sIdx] = q;
      }

      // 4. Ánh xạ trực tiếp ra Chromagram 12 bán âm (Pitch Class Profile with Octave Invariance)
      const chromaFrame = new Float32Array(12);
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const midi = min_note + sIdx;
        const pc = midi % 12;
        // Trọng số octave dạng chuông Gaussian tập trung vào octave 3 và 4 (C3 ~ C5)
        const octave = midi / 12.0;
        const octDist = octave - 4.2;
        const octWeight = Math.exp(-0.5 * octDist * octDist * 0.8);
        chromaFrame[pc] += cleanedSemitoneEnergy[sIdx] * octWeight;
      }

      // Chuẩn hóa chroma vector
      let maxChroma = 0.0001;
      for (let pc = 0; pc < 12; pc++) {
        if (chromaFrame[pc] > maxChroma) maxChroma = chromaFrame[pc];
      }

      const chromaBase = f * 12;
      for (let pc = 0; pc < 12; pc++) {
        const normVal = chromaFrame[pc] / maxChroma;
        const enhanced = Math.pow(normVal, 1.6);
        chromagramMatrix[chromaBase + pc] = Math.max(0, Math.min(255, Math.floor(enhanced * 255.0)));
      }

      // 5. Khớp mẫu nhận diện hợp âm theo thời gian thực (Chord Triad Matching)
      let bestChordName = '';
      let bestScore = 0.45; // Ngưỡng nhận diện tối thiểu

      for (let t = 0; t < CHORD_TEMPLATES.length; t++) {
        const tmpl = CHORD_TEMPLATES[t];
        let dot = 0;
        for (let pc = 0; pc < 12; pc++) {
          dot += (chromaFrame[pc] / maxChroma) * tmpl.vector[pc];
        }
        if (dot > bestScore) {
          bestScore = dot;
          bestChordName = tmpl.name;
        }
      }
      detectedChords[f] = bestChordName;
    }

    self.postMessage({
      type: 'done',
      cqtMatrix: cqtMatrix.buffer,
      chromagramMatrix: chromagramMatrix.buffer,
      detectedChords,
      numFrames,
      numSemitones,
      minMidi: min_note,
      maxMidi: max_note,
      autoMinMidi: min_note,
      autoMaxMidi: max_note,
      timeResolutionMs: (stage2Hop / sampleRate) * 1000.0,
      durationMs
    }, [cqtMatrix.buffer, chromagramMatrix.buffer]);

  } catch (err) {
    self.postMessage({ type: 'error', error: err.message });
  }
};
