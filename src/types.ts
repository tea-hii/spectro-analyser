export type TabType = 'tab1' | 'tab2';

export type ViewMode = 'DUAL' | 'SPECTROGRAM' | 'WAVEFORM';

export type PaletteKey = 'AEGISUB_BLUE' | 'INFERNO' | 'VIRIDIS' | 'CYBERPUNK' | 'PHONETIC_GRAY';

export type PitchRangeMode = 'AUTO' | 'GUITAR_KEYS' | 'BASS_MID' | 'VOCAL_LEAD' | 'FULL';

export const CueClockState = {
  OFF: 'OFF',
  SHOW_LOCKED: 'SHOW_LOCKED',
  EDITING_TIME: 'EDITING_TIME',
  EDITING_WORDS: 'EDITING_WORDS'
} as const;

export type CueClockStateType = typeof CueClockState[keyof typeof CueClockState];

export interface WordTiming {
  word: string;
  startMs: number;
}

export interface SubtitleCueData {
  id?: string;
  startMs: number;
  endMs: number;
  text: string;
  actor?: string;
  clockState?: CueClockStateType;
  wordTimings?: WordTiming[];
}

export class SubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  actor: string;
  clockState: CueClockStateType;
  wordTimings: WordTiming[];

  constructor(data: SubtitleCueData) {
    this.id = data.id || ('cue_' + Math.random().toString(36).substring(2, 11));
    this.startMs = Math.max(0, Math.round(data.startMs || 0));
    this.endMs = Math.max(this.startMs + 50, Math.round(data.endMs || this.startMs + 2000));
    this.text = (data.text || '').trim();
    this.actor = (data.actor || '').trim();
    this.clockState = data.clockState || CueClockState.SHOW_LOCKED;
    this.wordTimings = data.wordTimings || [];
  }

  resolvedWordTimings(): WordTiming[] {
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

export interface SpectrogramData {
  packedMagnitudes: Uint8Array;
  numFrames: number;
  timeResolutionMs: number;
  maxFrequencyHz: number;
  numBins: number;
  durationMs: number;
}

export interface ChordAnalyzerData {
  cqtMatrix: ArrayBuffer;
  chromagramMatrix: ArrayBuffer;
  detectedChords: string[];
  numFrames: number;
  numSemitones: number;
  minMidi: number;
  maxMidi: number;
  autoMinMidi: number;
  autoMaxMidi: number;
  timeResolutionMs: number;
  durationMs: number;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteLabel(m: number): string {
  const name = NOTE_NAMES[m % 12];
  const oct = Math.floor(m / 12) - 1;
  return `${name}${oct}`;
}

export const TimeFormatter = {
  formatMinuteSecond(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },
  formatFull(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const millis = Math.max(0, Math.floor(ms % 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
};
