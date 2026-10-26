/**
 * 100% Client-Side Web Worker for Tab 2: Musical Chord Analyzer
 * Focuses strictly under 3,000 Hz:
 * - Constant-Q Transform (CQT) Semitones
 * - Harmonic Overtone Suppression (Fundamental Extraction)
 * - 12-Tone Chromagram (Pitch Class Profile with Octave Invariance)
 * - Auto-crop Pitch Range (default focused around D2 - E5 or song energy range)
 * - Real-time Chord Estimator
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord templates for 12 major & 12 minor triads
const CHORD_TEMPLATES = [];
for (let root = 0; root < 12; root++) {
  // Major: root, +4 semitones (maj 3rd), +7 semitones (perf 5th)
  const maj = new Float32Array(12);
  maj[root] = 1.0;
  maj[(root + 4) % 12] = 0.8;
  maj[(root + 7) % 12] = 0.8;
  CHORD_TEMPLATES.push({ name: `${NOTE_NAMES[root]}`, vector: maj });

  // Minor: root, +3 semitones (min 3rd), +7 semitones (perf 5th)
  const min = new Float32Array(12);
  min[root] = 1.0;
  min[(root + 3) % 12] = 0.8;
  min[(root + 7) % 12] = 0.8;
  CHORD_TEMPLATES.push({ name: `${NOTE_NAMES[root]}m`, vector: min });
}

function midiToFreq(m) {
  return 440.0 * Math.pow(2.0, (m - 69.0) / 12.0);
}

// In-worker Radix-2 Cooley-Tukey FFT
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
    const minMidi = 24; // C1 (~32.7 Hz)
    const maxMidi = 96; // C7 (~2093 Hz, strictly under 3000 Hz)
    const numSemitones = maxMidi - minMidi + 1; // 73 semitones

    const fftSize = 4096; // High frequency resolution ~3.9 Hz/bin at 16kHz
    const hopSize = 512;  // ~32 ms per frame
    const fft = new WorkerFFT(fftSize);
    const halfFft = fftSize / 2;
    const freqBinWidth = sampleRate / fftSize;

    const totalSamples = samples.length;
    const durationMs = Math.round((totalSamples / sampleRate) * 1000);
    const numFrames = Math.max(1, Math.ceil(totalSamples / hopSize));

    // Precompute triangle filters for each semitone
    const semitoneFilters = [];
    for (let m = minMidi; m <= maxMidi; m++) {
      const centerFreq = midiToFreq(m);
      const lowerFreq = midiToFreq(m - 0.5);
      const upperFreq = midiToFreq(m + 0.5);

      const startBin = Math.max(1, Math.floor(lowerFreq / freqBinWidth));
      const endBin = Math.min(halfFft - 1, Math.ceil(upperFreq / freqBinWidth));

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
      }
      semitoneFilters.push({ midi: m, centerFreq, bins, weights });
    }

    const cqtMatrix = new Uint8Array(numFrames * numSemitones);
    const chromagramMatrix = new Uint8Array(numFrames * 12);
    const detectedChords = new Array(numFrames);

    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    const rawMagnitudes = new Float32Array(halfFft);
    const pitchEnergyAccum = new Float64Array(numSemitones);

    const progressInterval = Math.max(20, Math.floor(numFrames / 40));

    for (let f = 0; f < numFrames; f++) {
      if (f % progressInterval === 0) {
        self.postMessage({ type: 'progress', progress: f / numFrames });
      }

      const center = f * hopSize;
      const start = center - (fftSize / 2);

      for (let i = 0; i < fftSize; i++) {
        const idx = start + i;
        real[i] = (idx >= 0 && idx < totalSamples) ? samples[idx] * fft.window[i] : 0.0;
        imag[i] = 0.0;
      }

      fft.transform(real, imag);

      for (let i = 0; i < halfFft; i++) {
        const r = real[i], im = imag[i];
        rawMagnitudes[i] = Math.sqrt(r * r + im * im);
      }

      // 1. Raw Semitone Energy
      const rawSemitoneEnergy = new Float32Array(numSemitones);
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const filter = semitoneFilters[sIdx];
        let sum = 0;
        for (let k = 0; k < filter.bins.length; k++) {
          sum += rawMagnitudes[filter.bins[k]] * filter.weights[k];
        }
        rawSemitoneEnergy[sIdx] = sum;
      }

      // 2. Harmonic Overtone Suppression (Reveals pure fundamentals without confusing 5th/3rd harmonics)
      const cleanedSemitoneEnergy = new Float32Array(numSemitones);
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        cleanedSemitoneEnergy[sIdx] = rawSemitoneEnergy[sIdx];
      }

      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const fund = rawSemitoneEnergy[sIdx];
        if (fund > 0.001) {
          // 2nd harmonic (octave: +12 semitones)
          if (sIdx + 12 < numSemitones) {
            cleanedSemitoneEnergy[sIdx + 12] = Math.max(0, cleanedSemitoneEnergy[sIdx + 12] - fund * 0.45);
          }
          // 3rd harmonic (perfect 5th: +19 semitones)
          if (sIdx + 19 < numSemitones) {
            cleanedSemitoneEnergy[sIdx + 19] = Math.max(0, cleanedSemitoneEnergy[sIdx + 19] - fund * 0.35);
          }
          // 4th harmonic (+24 semitones)
          if (sIdx + 24 < numSemitones) {
            cleanedSemitoneEnergy[sIdx + 24] = Math.max(0, cleanedSemitoneEnergy[sIdx + 24] - fund * 0.25);
          }
        }
      }

      // 3. Store CQT in dB scale [0 .. 255]
      const cqtBase = f * numSemitones;
      let frameMaxCqt = 0.0001;
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const v = cleanedSemitoneEnergy[sIdx];
        if (v > frameMaxCqt) frameMaxCqt = v;
        pitchEnergyAccum[sIdx] += v;
      }

      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const v = cleanedSemitoneEnergy[sIdx];
        const db = 20.0 * Math.log10(v / frameMaxCqt + 1e-4);
        const q = Math.max(0, Math.min(255, Math.floor(((db + 60.0) / 60.0) * 255.0)));
        cqtMatrix[cqtBase + sIdx] = q;
      }

      // 4. 12-Tone Chromagram with Octave Invariance
      const chromaFrame = new Float32Array(12);
      for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
        const midi = minMidi + sIdx;
        const pc = midi % 12;
        const octave = midi / 12.0;
        const octDist = octave - 4.2;
        const octWeight = Math.exp(-0.5 * octDist * octDist * 0.8);
        chromaFrame[pc] += cleanedSemitoneEnergy[sIdx] * octWeight;
      }

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

      // 5. Detect Chord Triad
      let bestChordName = '';
      let bestScore = 0.45;
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

    // 6. Intelligent Auto-Crop Pitch Range Detection
    let maxPitchEnergy = 0;
    for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
      if (pitchEnergyAccum[sIdx] > maxPitchEnergy) maxPitchEnergy = pitchEnergyAccum[sIdx];
    }

    const energyThresh = maxPitchEnergy * 0.08;
    let autoMinMidi = minMidi;
    let autoMaxMidi = maxMidi;

    for (let sIdx = 0; sIdx < numSemitones; sIdx++) {
      if (pitchEnergyAccum[sIdx] >= energyThresh) {
        autoMinMidi = minMidi + sIdx;
        break;
      }
    }

    for (let sIdx = numSemitones - 1; sIdx >= 0; sIdx--) {
      if (pitchEnergyAccum[sIdx] >= energyThresh) {
        autoMaxMidi = minMidi + sIdx;
        break;
      }
    }

    // Default crop range D2 (MIDI 38) to E5 (MIDI 64) if energy range is small
    if (autoMaxMidi - autoMinMidi < 24) {
      autoMinMidi = Math.max(minMidi, Math.min(38, autoMinMidi));
      autoMaxMidi = Math.min(maxMidi, Math.max(64, autoMaxMidi));
    }

    self.postMessage({
      type: 'done',
      cqtMatrix: cqtMatrix.buffer,
      chromagramMatrix: chromagramMatrix.buffer,
      detectedChords,
      numFrames,
      numSemitones,
      minMidi,
      maxMidi,
      autoMinMidi,
      autoMaxMidi,
      timeResolutionMs: (hopSize / sampleRate) * 1000.0,
      durationMs
    }, [cqtMatrix.buffer, chromagramMatrix.buffer]);

  } catch (err) {
    self.postMessage({ type: 'error', error: err.message });
  }
};
