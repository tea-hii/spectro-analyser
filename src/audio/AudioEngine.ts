export class AudioEngine {
  name: string;
  audioCtx: AudioContext | null = null;
  audioBuffer: AudioBuffer | null = null;
  samples16k: Float32Array | null = null;
  sampleRate = 16000;
  durationMs = 0;
  trackName = 'Chưa nạp file';

  minPeaks: Float32Array | null = null;
  maxPeaks: Float32Array | null = null;
  peakBucketMs = 5.0;

  isPlaying = false;
  isLooping = false;
  playbackSpeed = 1.0;
  currentPositionMs = 0;
  activeSourceNode: AudioBufferSourceNode | null = null;
  startContextTime = 0;
  startOffsetMs = 0;

  loopStartMs = 0;
  loopEndMs = 0;

  onPositionUpdate: (ms: number) => void = () => {};
  onPlayStateChange: (playing: boolean) => void = () => {};

  constructor(name = 'Tab') {
    this.name = name;
  }

  getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  computeEnvelope(samples: Float32Array, sampleRate: number, bucketMs = 5.0): { minPeaks: Float32Array; maxPeaks: Float32Array } {
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

  resampleToMono16k(sourceMono: Float32Array, srcRate: number): Float32Array {
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

  async loadAudioBuffer(arrayBuffer: ArrayBuffer, name: string, onProgress: (p: number) => void = () => {}): Promise<{ samples16k: Float32Array; durationMs: number; trackName: string }> {
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

  loadSyntheticSpeechBuffer(durationSec = 6.02, name = 'Ví dụ 1'): { samples16k: Float32Array; durationMs: number; trackName: string } {
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

  playRangeEndMs: number | null = null;

  play(offsetMs: number | null = null, endMs: number | null = null): void {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();
    if (this.isPlaying) this.stop();

    const pos = (offsetMs !== null) ? offsetMs : this.currentPositionMs;
    const clampedPos = Math.max(0, Math.min(this.durationMs, pos));
    const offsetSec = clampedPos / 1000.0;

    let durationSec: number | undefined = undefined;
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

  stop(): void {
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

  togglePlay(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      if (this.currentPositionMs >= this.durationMs - 20) {
        this.currentPositionMs = 0;
      }
      this.play(this.currentPositionMs);
    }
  }

  seek(ms: number): void {
    const clamped = Math.max(0, Math.min(this.durationMs, Math.round(ms)));
    this.currentPositionMs = clamped;
    if (this.isPlaying) {
      this.play(clamped, this.playRangeEndMs);
    } else {
      this.onPositionUpdate(clamped);
    }
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (this.activeSourceNode) {
      this.activeSourceNode.playbackRate.value = speed;
      const ctx = this.getAudioContext();
      this.startOffsetMs = this.getCurrentPosition();
      this.startContextTime = ctx.currentTime;
    }
  }

  getCurrentPosition(): number {
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

