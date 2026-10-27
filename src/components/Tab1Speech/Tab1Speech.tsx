import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SubtitleCue, SpectrogramData, ViewMode, CueClockState, CueClockStateType, TimeFormatter } from '../../types';
import { AudioEngine } from '../../audio/AudioEngine';
import { ColorLUT } from '../../audio/ColorLUT';

interface Tab1SpeechProps {
  audio: AudioEngine;
  spectrogram: SpectrogramData | null;
  cues: SubtitleCue[];
  activeCue: SubtitleCue | null;
  onSelectCue: (cue: SubtitleCue) => void;
  onUpdateCues: (cues: SubtitleCue[]) => void;
  onOpenAddCues: () => void;
  onOpenFreqLegend: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export const Tab1Speech: React.FC<Tab1SpeechProps> = ({
  audio,
  spectrogram,
  cues,
  activeCue,
  onSelectCue,
  onUpdateCues,
  onOpenAddCues,
  onOpenFreqLegend,
  viewMode,
  onChangeViewMode
}) => {
  const [isPlaying, setIsPlaying] = useState(audio.isPlaying);
  const [isLooping, setIsLooping] = useState(audio.isLooping);
  const [speed, setSpeed] = useState('1.0');
  const [zoomFactor, setZoomFactor] = useState(40.0);
  const [cursorTimeMs, setCursorTimeMs] = useState(0);
  const [selectionStartMs, setSelectionStartMs] = useState(0);
  const [selectionEndMs, setSelectionEndMs] = useState(2100);
  const [splitterHeight, setSplitterHeight] = useState(52); // 52% default
  const [selectedCueIds, setSelectedCueIds] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollOffsetMsRef = useRef(0);
  const zoomFactorRef = useRef(zoomFactor);
  zoomFactorRef.current = zoomFactor;

  const rulerHeight = 28;
  const subOverlayHeight = 28;
  const minimapHeight = 10;

  // Initialize tile canvas once
  if (!tileCanvasRef.current) {
    tileCanvasRef.current = document.createElement('canvas');
  }

  // Sync activeCue with selection
  useEffect(() => {
    if (activeCue) {
      setSelectionStartMs(activeCue.startMs);
      setSelectionEndMs(activeCue.endMs);
      audio.loopStartMs = activeCue.startMs;
      audio.loopEndMs = activeCue.endMs;
    }
  }, [activeCue, audio]);

  // Clean up selectedCueIds if cues are deleted
  useEffect(() => {
    setSelectedCueIds(prev => {
      if (prev.size === 0) return prev;
      const validIds = new Set(cues.map(c => c.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach(id => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [cues]);

  // Audio play state sync
  useEffect(() => {
    audio.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
    };
    audio.onPositionUpdate = (ms) => {
      setCursorTimeMs(ms);
    };
  }, [audio]);

  const getMsPerPixel = useCallback(() => {
    return Math.max(0.5, 100.0 / Math.max(5.0, zoomFactorRef.current));
  }, []);

  const timeToX = useCallback((ms: number) => {
    return (ms - scrollOffsetMsRef.current) / getMsPerPixel();
  }, [getMsPerPixel]);

  const xToTime = useCallback((x: number) => {
    return scrollOffsetMsRef.current + x * getMsPerPixel();
  }, [getMsPerPixel]);

  const clampScroll = useCallback((width: number) => {
    if (!audio || audio.durationMs <= 0) return;
    const visibleWindowMs = width * getMsPerPixel();
    const minScroll = -200;
    const maxScroll = Math.max(minScroll, audio.durationMs + 200 - visibleWindowMs);
    scrollOffsetMsRef.current = Math.max(minScroll, Math.min(maxScroll, scrollOffsetMsRef.current));
  }, [audio, getMsPerPixel]);

  // Check if any cue has visible transcript below the time ruler
  const hasVisibleTranscript = cues.some(c => c.clockState !== CueClockState.OFF);

  // Render Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, w, h);

    const hasAudio = audio && audio.durationMs > 0;
    const hasCues = cues && cues.length > 0;

    if (!hasAudio && !hasCues) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa tải file âm thanh Tab 1. Bấm "Tải File" để nạp file từ máy hoặc Ví dụ 1.', w / 2, h / 2);
      ctx.restore();
      return;
    }

    if (!hasAudio && hasCues) {
      const maxEnd = Math.max(...cues.map(c => c.endMs || 0));
      audio.durationMs = Math.max(7000, maxEnd + 1000);
    }

    clampScroll(w);

    const rulerH = rulerHeight;
    // Only allocate subtitle strip height when at least one cue is not OFF
    const subH = hasVisibleTranscript ? subOverlayHeight : 0;
    const miniH = minimapHeight;
    const contentY = rulerH + subH;
    const contentH = Math.max(20, h - contentY - miniH);
    const contentBottom = h - miniH;

    let specH = 0, waveH = 0, specY = contentY, waveY = contentY;
    if (viewMode === 'DUAL') {
      waveH = Math.floor(contentH * 0.38);
      waveY = contentY;
      specH = contentH - waveH;
      specY = waveY + waveH;
    } else if (viewMode === 'SPECTROGRAM') {
      specH = contentH;
      specY = contentY;
    } else {
      waveH = contentH;
      waveY = contentY;
    }

    // 1. Draw Waveform
    if (waveH > 0 && audio.minPeaks && audio.minPeaks.length > 0) {
      const centerY = waveY + waveH / 2;
      const halfH = waveH / 2 - 2;

      ctx.fillStyle = '#0a101d';
      ctx.fillRect(0, waveY, w, waveH);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      const bucketMs = audio.peakBucketMs;
      const bStart = Math.max(0, Math.floor(xToTime(0) / bucketMs));
      const bEnd = Math.min(audio.minPeaks.length - 1, Math.ceil(xToTime(w) / bucketMs));

      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.beginPath();
      for (let b = bStart; b <= bEnd; b++) {
        const px = timeToX(b * bucketMs);
        const topY = centerY - audio.maxPeaks![b] * halfH;
        const botY = centerY - audio.minPeaks![b] * halfH;
        ctx.rect(px, topY, Math.max(1, 100 / zoomFactorRef.current * 0.05), Math.max(1, botY - topY));
      }
      ctx.fill();
    }

    // 2. Draw Spectrogram
    if (specH > 0 && spectrogram && spectrogram.numFrames > 0 && tileCanvasRef.current) {
      const numFrames = spectrogram.numFrames;
      const numBins = spectrogram.numBins;
      const packed = spectrogram.packedMagnitudes;
      const lut = ColorLUT.AEGISUB_BLUE;

      const vStartMs = xToTime(0);
      const vEndMs = xToTime(w);
      const fStart = Math.max(0, Math.floor(vStartMs / spectrogram.timeResolutionMs));
      const fEnd = Math.min(numFrames - 1, Math.ceil(vEndMs / spectrogram.timeResolutionMs));
      const renderFrames = fEnd - fStart + 1;

      if (renderFrames > 0) {
        const tileCanvas = tileCanvasRef.current;
        if (tileCanvas.width !== renderFrames || tileCanvas.height !== numBins) {
          tileCanvas.width = renderFrames;
          tileCanvas.height = numBins;
        }
        const tileCtx = tileCanvas.getContext('2d', { alpha: false });
        if (tileCtx) {
          const imgData = tileCtx.createImageData(renderFrames, numBins);
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

          tileCtx.putImageData(imgData, 0, 0);

          const startX = timeToX(fStart * spectrogram.timeResolutionMs);
          const endX = timeToX((fEnd + 1) * spectrogram.timeResolutionMs);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tileCanvas, 0, 0, renderFrames, numBins, startX, specY, endX - startX, specH);
        }
      }
    }

    // Dual mode divider
    if (viewMode === 'DUAL' && waveH > 0 && specH > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, specY);
      ctx.lineTo(w, specY);
      ctx.stroke();
    }

    // 2.5. Draw Yellow & Purple Clock Tints on Spectrogram/Waveform
    if (cues) {
      cues.forEach(cue => {
        if (cue.clockState !== CueClockState.EDITING_TIME && cue.clockState !== CueClockState.EDITING_WORDS) return;
        const cStartX = timeToX(cue.startMs);
        const cEndX = timeToX(cue.endMs);
        if (cEndX < 0 || cStartX > w) return;

        const drawX = Math.max(0, cStartX);
        const drawW = Math.min(w, cEndX) - drawX;
        if (drawW <= 0) return;

        if (cue.clockState === CueClockState.EDITING_TIME) {
          // Light yellow tint over waveform/spectrogram
          ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
          ctx.fillRect(drawX, contentY, drawW, contentH);

          // Subtle yellow borders at cue start/end
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cStartX, contentY);
          ctx.lineTo(cStartX, contentBottom);
          ctx.moveTo(cEndX, contentY);
          ctx.lineTo(cEndX, contentBottom);
          ctx.stroke();
        } else if (cue.clockState === CueClockState.EDITING_WORDS) {
          // Light purple tint over waveform/spectrogram
          ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
          ctx.fillRect(drawX, contentY, drawW, contentH);

          // Subtle purple borders at cue start/end
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cStartX, contentY);
          ctx.lineTo(cStartX, contentBottom);
          ctx.moveTo(cEndX, contentY);
          ctx.lineTo(cEndX, contentBottom);
          ctx.stroke();
        }
      });
    }

    // 3. Subtitle strip below time ruler (only when subH > 0)
    if (subH > 0) {
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(0, rulerH, w, subH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rulerH + subH);
      ctx.lineTo(w, rulerH + subH);
      ctx.stroke();

      if (cues) {
        cues.forEach(cue => {
          if (cue.clockState === CueClockState.OFF) return;
          const startX = timeToX(cue.startMs);
          const endX = timeToX(cue.endMs);
          const cueW = endX - startX;
          if (endX < 0 || startX > w) return;

          const isActive = activeCue && activeCue.id === cue.id;
          const padY = 2;
          const barH = subH - padY * 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(startX, rulerH + padY, Math.max(8, cueW), barH);
          ctx.clip();

          // Background & border based on clock state
          if (cue.clockState === CueClockState.EDITING_TIME) {
            ctx.fillStyle = isActive ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.22)';
            ctx.fillRect(startX, rulerH + padY, cueW, barH);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = isActive ? 2.5 : 1.5;
            ctx.strokeRect(startX + 1, rulerH + padY + 1, Math.max(6, cueW - 2), barH - 2);
          } else if (cue.clockState === CueClockState.EDITING_WORDS) {
            ctx.fillStyle = isActive ? 'rgba(168, 85, 247, 0.32)' : 'rgba(168, 85, 247, 0.20)';
            ctx.fillRect(startX, rulerH + padY, cueW, barH);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = isActive ? 2.5 : 1.5;
            ctx.strokeRect(startX + 1, rulerH + padY + 1, Math.max(6, cueW - 2), barH - 2);
          } else {
            // SHOW_LOCKED (Blue)
            if (isActive) {
              ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
              ctx.fillRect(startX, rulerH + padY, cueW, barH);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(startX + 1, rulerH + padY + 1, Math.max(6, cueW - 2), barH - 2);
            } else {
              ctx.fillStyle = 'rgba(14, 116, 144, 0.35)';
              ctx.fillRect(startX, rulerH + padY, cueW, barH);
              ctx.strokeStyle = '#0284c7';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(startX, rulerH + padY, Math.max(8, cueW), barH);
            }
          }

          // Render text: if EDITING_WORDS (or has customized word timings), render per-word with overlap fade & crop
          if (cue.clockState === CueClockState.EDITING_WORDS || (cue.wordTimings && cue.wordTimings.length > 0)) {
            const words = cue.resolvedWordTimings();
            ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            words.forEach((wt, wIdx) => {
              const wx = timeToX(wt.startMs);
              const nextWx = wIdx < words.length - 1 ? timeToX(words[wIdx + 1].startMs) : endX;
              const availW = nextWx - wx;
              if (availW <= 2 || nextWx < 0 || wx > w) return;

              const padLeft = 5;
              const textW = ctx.measureText(wt.word).width;
              const neededW = padLeft + textW + 2;
              const isOverlapping = neededW > availW;

              ctx.save();
              ctx.beginPath();
              ctx.rect(wx, rulerH + padY, Math.max(0, availW - 1), barH);
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

              ctx.fillText(wt.word, wx + padLeft, rulerH + subH / 2);
              ctx.restore();
            });
          } else {
            ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
            ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(cue.text, startX + 6, rulerH + subH / 2);
          }

          ctx.restore();

          // Draw dark/vivid purple vertical word lines when in EDITING_WORDS mode
          if (cue.clockState === CueClockState.EDITING_WORDS) {
            const words = cue.resolvedWordTimings();
            words.forEach(wt => {
              const wx = timeToX(wt.startMs);
              if (wx >= -2 && wx <= w + 2) {
                // Solid vivid purple line starting from top of subtitle strip through spectrogram
                ctx.strokeStyle = '#9333ea';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(wx, rulerH);
                ctx.lineTo(wx, contentBottom);
                ctx.stroke();

                ctx.strokeStyle = '#d8b4fe';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(wx, rulerH);
                ctx.lineTo(wx, contentBottom);
                ctx.stroke();

                // Top handle marker in the subtitle strip
                ctx.fillStyle = '#a855f7';
                ctx.fillRect(wx - 2, rulerH + 2, 4, 7);
              }
            });
          }
        });
      }
    }

    // 4. Selection window ([ Start / Stop ])
    const selStartX = timeToX(selectionStartMs);
    const selEndX = timeToX(selectionEndMs);
    const selectionH = h - rulerH - miniH;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.fillRect(Math.max(0, selStartX), rulerH, Math.min(w, selEndX - selStartX), selectionH);

    // Green [ Start Line
    if (selStartX >= -10 && selStartX <= w + 10) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(selStartX, rulerH);
      ctx.lineTo(selStartX, rulerH + selectionH);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.fillRect(selStartX, rulerH, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('[', selStartX + 4, rulerH + 13);
    }

    // Red Stop ] Line
    if (selEndX >= -10 && selEndX <= w + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(selEndX, rulerH);
      ctx.lineTo(selEndX, rulerH + selectionH);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(selEndX - 16, rulerH, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(']', selEndX - 12, rulerH + 13);
    }

    // 5. Time Ruler
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, rulerH);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, rulerH);
    ctx.lineTo(w, rulerH);
    ctx.stroke();

    const msPerPx = getMsPerPixel();
    let stepMs = 1000;
    if (msPerPx < 1.0) stepMs = 200;
    else if (msPerPx < 2.5) stepMs = 500;
    else if (msPerPx < 6.0) stepMs = 1000;
    else stepMs = 2000;

    const vStartMs = xToTime(0);
    const vEndMs = xToTime(w);
    const firstTick = Math.floor(vStartMs / stepMs) * stepMs;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let t = firstTick; t <= vEndMs; t += stepMs) {
      const tx = timeToX(t);
      if (tx >= 0 && tx <= w) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(tx, rulerH - 8);
        ctx.lineTo(tx, rulerH);
        ctx.stroke();
        ctx.fillText(TimeFormatter.formatFull(t), tx + 4, 16);
      }
    }

    // Ruler lines for start/end
    if (selStartX >= -10 && selStartX <= w + 10) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(selStartX, 0);
      ctx.lineTo(selStartX, rulerH);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(selStartX - 2, 0, 4, 3);
    }
    if (selEndX >= -10 && selEndX <= w + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(selEndX, 0);
      ctx.lineTo(selEndX, rulerH);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(selEndX - 2, 0, 4, 3);
    }

    // 6. Yellow Playhead Line (NO lower triangle below time ruler)
    const playheadMs = audio ? audio.getCurrentPosition() : 0;
    const playheadX = timeToX(playheadMs);
    if (playheadX >= -10 && playheadX <= w + 10) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, rulerH);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 7);
      ctx.closePath();
      ctx.fill();

      // Main canvas area line only (no bottom triangle indicator)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, contentBottom);
      ctx.stroke();
    }

    // 7. Minimap
    ctx.fillStyle = '#0b0f19';
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, h - miniH, w, miniH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - miniH);
    ctx.lineTo(w, h - miniH);
    ctx.stroke();

    const durMs = audio.durationMs;
    if (durMs > 0) {
      // Groove line
      ctx.fillStyle = '#1e293b';
      const grooveH = Math.max(2, Math.round(miniH * 0.3));
      const grooveY = (h - miniH) + Math.round((miniH - grooveH) / 2);
      ctx.fillRect(0, grooveY, w, grooveH);

      const thumbStartMs = Math.max(0, scrollOffsetMsRef.current);
      const thumbEndMs = Math.min(durMs, scrollOffsetMsRef.current + w * msPerPx);
      const thumbX = (thumbStartMs / durMs) * w;
      const thumbW = Math.max(16, ((thumbEndMs - thumbStartMs) / durMs) * w);

      const thumbPadY = 1;
      const thumbH = Math.max(4, miniH - thumbPadY * 2);
      const thumbY = (h - miniH) + thumbPadY;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, Math.min(3, thumbH / 2));
        ctx.fill();
      } else {
        ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
      }
    }

    ctx.restore();
  }, [audio, cues, activeCue, spectrogram, viewMode, selectionStartMs, selectionEndMs, hasVisibleTranscript, getMsPerPixel, timeToX, xToTime, clampScroll]);

  // Animation frame loop
  useEffect(() => {
    let animId: number;
    const tick = () => {
      renderCanvas();
      if (audio) {
        setCursorTimeMs(audio.getCurrentPosition());
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas, audio]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Mouse gestures for Canvas (including word purple line hover & drag)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDragging = false;
    let dragTarget: 'START' | 'END' | 'PLAYHEAD' | 'PAN' | 'WORD' | 'CUE_START' | 'CUE_END' | null = null;
    let dragWordInfo: { cue: SubtitleCue; wordIdx: number } | null = null;
    let dragCueEdgeInfo: { cue: SubtitleCue } | null = null;
    let dragStartX = 0;
    let dragStartScrollMs = 0;

    const getX = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      return clientX - canvas.getBoundingClientRect().left;
    };

    const getY = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return clientY - canvas.getBoundingClientRect().top;
    };

    const findWordHandleAt = (mouseX: number, mouseY: number): { cue: SubtitleCue; wordIdx: number } | null => {
      const rectH = canvas.getBoundingClientRect().height;
      if (mouseY < rulerHeight || mouseY > rectH - minimapHeight) return null;

      let bestMatch: { cue: SubtitleCue; wordIdx: number; dist: number } | null = null;
      for (const cue of cues) {
        if (cue.clockState !== CueClockState.EDITING_WORDS) continue;
        const words = cue.resolvedWordTimings();
        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const wx = timeToX(words[wIdx].startMs);
          const dist = Math.abs(mouseX - wx);
          if (dist <= 7 && (!bestMatch || dist < bestMatch.dist)) {
            bestMatch = { cue, wordIdx: wIdx, dist };
          }
        }
      }
      return bestMatch ? { cue: bestMatch.cue, wordIdx: bestMatch.wordIdx } : null;
    };

    const findYellowCueEdgeAt = (mouseX: number, mouseY: number): { cue: SubtitleCue; edge: 'START' | 'END' } | null => {
      const rectH = canvas.getBoundingClientRect().height;
      if (mouseY < rulerHeight || mouseY > rectH - minimapHeight) return null;

      for (const cue of cues) {
        if (cue.clockState !== CueClockState.EDITING_TIME) continue;
        const sx = timeToX(cue.startMs);
        const ex = timeToX(cue.endMs);
        if (Math.abs(mouseX - sx) <= 8) return { cue, edge: 'START' };
        if (Math.abs(mouseX - ex) <= 8) return { cue, edge: 'END' };
      }
      return null;
    };

    const updateCursor = (mouseX: number, mouseY: number) => {
      if (isDragging) {
        if (dragTarget === 'WORD' || dragTarget === 'START' || dragTarget === 'END' || dragTarget === 'PLAYHEAD' || dragTarget === 'CUE_START' || dragTarget === 'CUE_END') {
          canvas.style.cursor = 'ew-resize';
        }
        return;
      }

      // 1. Check purple word lines first
      if (findWordHandleAt(mouseX, mouseY)) {
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // 2. Check yellow time-edit cue boundaries
      if (findYellowCueEdgeAt(mouseX, mouseY)) {
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // 3. Check selection [ Start / Stop ] and Playhead
      const startX = timeToX(selectionStartMs);
      const endX = timeToX(selectionEndMs);
      const playheadX = timeToX(audio.getCurrentPosition());
      const isNearStart = Math.abs(mouseX - startX) <= 8 || (mouseX >= startX && mouseX <= startX + 18 && mouseY >= rulerHeight && mouseY <= rulerHeight + 22);
      const isNearEnd = Math.abs(mouseX - endX) <= 8 || (mouseX >= endX - 18 && mouseX <= endX && mouseY >= rulerHeight && mouseY <= rulerHeight + 22);
      const isNearPlayhead = Math.abs(mouseX - playheadX) <= 8;

      if (isNearStart || isNearEnd || isNearPlayhead) {
        canvas.style.cursor = 'ew-resize';
        return;
      }

      const subH = hasVisibleTranscript ? subOverlayHeight : 0;
      if (mouseY <= rulerHeight || (subH > 0 && mouseY <= rulerHeight + subH)) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    };

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      dragStartX = getX(e);
      const dragStartY = getY(e);
      dragStartScrollMs = scrollOffsetMsRef.current;
      const curTime = xToTime(dragStartX);
      const startX = timeToX(selectionStartMs);
      const endX = timeToX(selectionEndMs);
      const playheadX = timeToX(audio.getCurrentPosition());
      const subH = hasVisibleTranscript ? subOverlayHeight : 0;

      // 1. Priority: Dragging purple word handle in EDITING_WORDS mode
      const wordHit = findWordHandleAt(dragStartX, dragStartY);
      if (wordHit) {
        dragTarget = 'WORD';
        dragWordInfo = wordHit;
        onSelectCue(wordHit.cue);
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // 2. Dragging [ Start or Stop ] handles
      if (Math.abs(dragStartX - startX) <= 10 || (dragStartX >= startX && dragStartX <= startX + 18 && dragStartY >= rulerHeight && dragStartY <= rulerHeight + 22)) {
        dragTarget = 'START';
        canvas.style.cursor = 'ew-resize';
        return;
      }
      if (Math.abs(dragStartX - endX) <= 10 || (dragStartX >= endX - 18 && dragStartX <= endX && dragStartY >= rulerHeight && dragStartY <= rulerHeight + 22)) {
        dragTarget = 'END';
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // 3. Dragging yellow cue edges in EDITING_TIME mode
      const yellowEdgeHit = findYellowCueEdgeAt(dragStartX, dragStartY);
      if (yellowEdgeHit) {
        dragTarget = yellowEdgeHit.edge === 'START' ? 'CUE_START' : 'CUE_END';
        dragCueEdgeInfo = { cue: yellowEdgeHit.cue };
        onSelectCue(yellowEdgeHit.cue);
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // 4. Dragging Playhead
      if (Math.abs(dragStartX - playheadX) <= 10) {
        dragTarget = 'PLAYHEAD';
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // 5. Clicking on Subtitle Strip
      if (subH > 0 && dragStartY >= rulerHeight && dragStartY <= rulerHeight + subH) {
        const clickedCue = cues.find(c => c.clockState !== CueClockState.OFF && curTime >= c.startMs && curTime <= c.endMs);
        if (clickedCue) {
          onSelectCue(clickedCue);
          audio.seek(clickedCue.startMs);
          dragTarget = null;
          isDragging = false;
          return;
        }
        dragTarget = 'PAN';
        return;
      }

      // 6. Clicking on Time Ruler
      if (dragStartY <= rulerHeight) {
        audio.seek(Math.max(0, Math.min(audio.durationMs, curTime)));
        dragTarget = 'PLAYHEAD';
        canvas.style.cursor = 'ew-resize';
        return;
      }

      dragTarget = 'PAN';
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const curX = getX(e);
      const curY = getY(e);

      if (!isDragging) {
        updateCursor(curX, curY);
        return;
      }

      const curTime = xToTime(curX);

      if (dragTarget === 'WORD' && dragWordInfo) {
        dragWordInfo.cue.setWordStartMs(dragWordInfo.wordIdx, curTime);
        canvas.style.cursor = 'ew-resize';
        onUpdateCues([...cues]);
      } else if (dragTarget === 'CUE_START' && dragCueEdgeInfo) {
        const c = dragCueEdgeInfo.cue;
        const newStart = Math.max(0, Math.min(c.endMs - 50, Math.round(curTime)));
        c.startMs = newStart;
        setSelectionStartMs(newStart);
        canvas.style.cursor = 'ew-resize';
        onUpdateCues([...cues]);
      } else if (dragTarget === 'CUE_END' && dragCueEdgeInfo) {
        const c = dragCueEdgeInfo.cue;
        const newEnd = Math.max(c.startMs + 50, Math.min(audio.durationMs, Math.round(curTime)));
        c.endMs = newEnd;
        setSelectionEndMs(newEnd);
        canvas.style.cursor = 'ew-resize';
        onUpdateCues([...cues]);
      } else if (dragTarget === 'START') {
        const newStart = Math.max(0, Math.min(selectionEndMs - 50, Math.round(curTime)));
        setSelectionStartMs(newStart);
        if (activeCue && activeCue.clockState !== CueClockState.SHOW_LOCKED) {
          activeCue.startMs = newStart;
          onUpdateCues([...cues]);
        }
        canvas.style.cursor = 'ew-resize';
      } else if (dragTarget === 'END') {
        const newEnd = Math.max(selectionStartMs + 50, Math.min(audio.durationMs, Math.round(curTime)));
        setSelectionEndMs(newEnd);
        if (activeCue && activeCue.clockState !== CueClockState.SHOW_LOCKED) {
          activeCue.endMs = newEnd;
          onUpdateCues([...cues]);
        }
        canvas.style.cursor = 'ew-resize';
      } else if (dragTarget === 'PLAYHEAD') {
        audio.seek(Math.max(0, Math.min(audio.durationMs, curTime)));
        canvas.style.cursor = 'ew-resize';
      } else if (dragTarget === 'PAN') {
        scrollOffsetMsRef.current = dragStartScrollMs - (curX - dragStartX) * getMsPerPixel();
      }
    };

    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      if (isDragging && dragTarget === 'PAN') {
        const clientX = 'changedTouches' in e && e.changedTouches.length > 0
          ? e.changedTouches[0].clientX
          : (e as MouseEvent).clientX;
        const curX = clientX - canvas.getBoundingClientRect().left;
        if (Math.abs(curX - dragStartX) < 5) {
          audio.seek(xToTime(curX));
        }
      }
      isDragging = false;
      dragTarget = null;
      dragWordInfo = null;
      dragCueEdgeInfo = null;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const mouseX = e.clientX - canvas.getBoundingClientRect().left;
      const timeAtMouse = xToTime(mouseX);
      const delta = e.deltaY < 0 ? 8 : -8;
      const newZoom = Math.max(5, Math.min(200, zoomFactorRef.current + delta));
      if (newZoom !== zoomFactorRef.current) {
        setZoomFactor(newZoom);
        zoomFactorRef.current = newZoom;
        scrollOffsetMsRef.current = timeAtMouse - mouseX * (100.0 / Math.max(5.0, newZoom));
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown, { passive: true });
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [audio, cues, activeCue, selectionStartMs, selectionEndMs, hasVisibleTranscript, xToTime, timeToX, getMsPerPixel, onSelectCue, onUpdateCues]);

  // Pane Splitter Dragging
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const initialHeight = splitterHeight;
    const totalHeight = window.innerHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newPct = Math.max(25, Math.min(75, initialHeight + (delta / totalHeight) * 100));
      setSplitterHeight(newPct);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Play Line (S)
  const handlePlayLine = () => {
    const cueToPlay = activeCue || (cues.length > 0 ? cues[0] : null);
    if (cueToPlay) {
      audio.loopStartMs = cueToPlay.startMs;
      audio.loopEndMs = cueToPlay.endMs;
      audio.play(cueToPlay.startMs, cueToPlay.endMs);
    } else {
      audio.loopStartMs = selectionStartMs;
      audio.loopEndMs = selectionEndMs;
      audio.play(selectionStartMs, selectionEndMs);
    }
  };

  // Play Word (W): chỉ chạy từ mà thanh vàng đang ở đó
  // (chạy từ vạch tím của từ đó tới từ tiếp theo hoặc tới vạch stop nếu đó là từ cuối của câu)
  const handlePlayWord = () => {
    const curPos = audio.getCurrentPosition();

    // 1. Tìm câu phụ đề mà thanh vàng đang ở trong
    let targetCue = cues.find(c => curPos >= c.startMs && curPos <= c.endMs);
    if (!targetCue) {
      if (activeCue) {
        targetCue = activeCue;
      } else if (cues.length > 0) {
        // Tìm câu gần vị trí thanh vàng nhất
        targetCue = cues.reduce((prev, curr) => {
          const prevDist = Math.min(Math.abs(curPos - prev.startMs), Math.abs(curPos - prev.endMs));
          const currDist = Math.min(Math.abs(curPos - curr.startMs), Math.abs(curPos - curr.endMs));
          return currDist < prevDist ? curr : prev;
        }, cues[0]);
      }
    }

    if (!targetCue) return;

    if (activeCue?.id !== targetCue.id) {
      onSelectCue(targetCue);
    }

    const words = targetCue.resolvedWordTimings();
    if (words.length === 0) {
      audio.loopStartMs = targetCue.startMs;
      audio.loopEndMs = targetCue.endMs;
      audio.play(targetCue.startMs, targetCue.endMs);
      return;
    }

    // 2. Xác định từ mà thanh vàng đang ở đó
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

    // Chạy từ vạch tím của từ đó tới vạch tím của từ tiếp theo (hoặc vạch stop của câu nếu là từ cuối)
    const wStart = words[targetWordIdx].startMs;
    const wEnd = (targetWordIdx < words.length - 1) ? words[targetWordIdx + 1].startMs : targetCue.endMs;

    audio.loopStartMs = wStart;
    audio.loopEndMs = wEnd;
    audio.play(wStart, wEnd);
  };

  // Set Start ([)
  const handleSetStart = () => {
    const cur = audio.getCurrentPosition();
    setSelectionStartMs(cur);
    if (activeCue) {
      activeCue.startMs = cur;
      onUpdateCues([...cues]);
    }
  };

  // Set Stop (])
  const handleSetStop = () => {
    const cur = audio.getCurrentPosition();
    setSelectionEndMs(cur);
    if (activeCue) {
      activeCue.endMs = cur;
      onUpdateCues([...cues]);
    }
  };

  // Toggle Loop (L)
  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    audio.isLooping = next;
  };

  // 3-Level Eye Button Cycle: SPECTROGRAM -> WAVEFORM -> DUAL
  const handleCycleViewMode = () => {
    const modes: ViewMode[] = ['SPECTROGRAM', 'WAVEFORM', 'DUAL'];
    const nextIdx = (modes.indexOf(viewMode) + 1) % modes.length;
    onChangeViewMode(modes[nextIdx]);
  };

  const getViewModeLabel = (mode: ViewMode) => {
    if (mode === 'SPECTROGRAM') return 'Spectro';
    if (mode === 'WAVEFORM') return 'Waveform';
    return 'Dual';
  };

  const getClockTooltip = (state: CueClockStateType) => {
    switch (state) {
      case CueClockState.OFF:
        return 'Chế độ [TẮT - Xám]: Không hiện dòng transcript dưới thanh thời gian';
      case CueClockState.SHOW_LOCKED:
        return 'Chế độ [HIỆN & KHÓA - Xanh Dương]: Hiện dòng text dưới thanh thời gian';
      case CueClockState.EDITING_TIME:
        return 'Chế độ [SỬA THỜI GIAN - Vàng]: Ám vàng nhạt vùng phổ/sóng & cho phép kéo chỉnh mốc';
      case CueClockState.EDITING_WORDS:
        return 'Chế độ [SỬA TỪNG TỪ - Tím]: Ám tím nhạt & kéo các vạch tím đậm để chỉnh vị trí từng từ';
    }
  };

  // Master clock toggle
  const handleMasterClockToggle = () => {
    const states: CueClockStateType[] = [
      CueClockState.OFF,
      CueClockState.SHOW_LOCKED,
      CueClockState.EDITING_TIME,
      CueClockState.EDITING_WORDS
    ];
    const currentFirst = cues[0]?.clockState || CueClockState.SHOW_LOCKED;
    const nextIdx = (states.indexOf(currentFirst) + 1) % states.length;
    const nextState = states[nextIdx];

    const updated = cues.map(c => {
      c.clockState = nextState;
      if (nextState === CueClockState.EDITING_WORDS && (!c.wordTimings || c.wordTimings.length === 0)) {
        c.wordTimings = c.resolvedWordTimings();
      }
      return c;
    });
    onUpdateCues([...updated]);
  };

  // Toggle single cue clock state
  const handleCueClockToggle = (cue: SubtitleCue) => {
    const states: CueClockStateType[] = [
      CueClockState.OFF,
      CueClockState.SHOW_LOCKED,
      CueClockState.EDITING_TIME,
      CueClockState.EDITING_WORDS
    ];
    const curIdx = states.indexOf(cue.clockState);
    const nextState = states[(curIdx + 1) % states.length];
    cue.clockState = nextState;
    if (nextState === CueClockState.EDITING_WORDS && (!cue.wordTimings || cue.wordTimings.length === 0)) {
      cue.wordTimings = cue.resolvedWordTimings();
    }
    onSelectCue(cue);
    onUpdateCues([...cues]);
  };

  // Toggle checkbox selection for a cue
  const handleToggleSelectCue = (cueId: string) => {
    setSelectedCueIds(prev => {
      const next = new Set(prev);
      if (next.has(cueId)) next.delete(cueId);
      else next.add(cueId);
      return next;
    });
  };

  // Move selected cues Up / Down
  const getTargetMoveIds = (): Set<string> => {
    if (selectedCueIds.size > 0) return selectedCueIds;
    if (activeCue) return new Set([activeCue.id]);
    return new Set();
  };

  const handleMoveCuesUp = () => {
    const targetIds = getTargetMoveIds();
    if (targetIds.size === 0 || cues.length < 2) return;
    const next = [...cues];
    let moved = false;
    for (let i = 1; i < next.length; i++) {
      if (targetIds.has(next[i].id) && !targetIds.has(next[i - 1].id)) {
        const tmp = next[i - 1];
        next[i - 1] = next[i];
        next[i] = tmp;
        moved = true;
      }
    }
    if (moved) {
      onUpdateCues(next);
    }
  };

  const handleMoveCuesDown = () => {
    const targetIds = getTargetMoveIds();
    if (targetIds.size === 0 || cues.length < 2) return;
    const next = [...cues];
    let moved = false;
    for (let i = next.length - 2; i >= 0; i--) {
      if (targetIds.has(next[i].id) && !targetIds.has(next[i + 1].id)) {
        const tmp = next[i + 1];
        next[i + 1] = next[i];
        next[i] = tmp;
        moved = true;
      }
    }
    if (moved) {
      onUpdateCues(next);
    }
  };

  // Delete cue
  const handleDeleteCue = (cue: SubtitleCue) => {
    const idx = cues.indexOf(cue);
    const updated = cues.filter(c => c.id !== cue.id);
    onUpdateCues(updated);
    if (updated.length > 0) {
      onSelectCue(updated[Math.max(0, idx - 1)]);
    }
  };

  const hasMoveTargets = selectedCueIds.size > 0 || activeCue !== null;

  return (
    <section id="tab-pane-1" className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Aegisub Toolbar */}
      <nav className="aegisub-toolbar">
        <div className="toolbar-row">
          {/* Play / Stop */}
          <button
            id="btn-play"
            className={`tb-btn play-main icon-only ${isPlaying ? 'playing' : ''}`}
            title="Phát / Dừng (Phím Space)"
            onClick={() => audio.togglePlay()}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Play Line */}
          <button
            id="btn-play-line"
            className="tb-btn play-selection icon-only"
            title="Phát câu đang chọn (Phím S)"
            onClick={handlePlayLine}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>

          {/* Play Word */}
          <button
            id="btn-play-word"
            className="tb-btn play-word icon-only"
            title="Phát từ tại con trỏ (Phím W) - Chỉ phát từ mà thanh vàng đang ở đó"
            onClick={handlePlayWord}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16" />
            </svg>
          </button>

          {/* Loop Toggle */}
          <button
            id="btn-loop"
            className={`tb-btn icon-only ${isLooping ? 'loop-active' : ''}`}
            title="Bật/Tắt Lặp đoạn (Phím L)"
            onClick={handleToggleLoop}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* Set Start */}
          <button className="tb-btn set-start" title="Gán điểm Bắt đầu câu tại con trỏ (Phím [)" onClick={handleSetStart}>
            [ Start
          </button>

          {/* Set Stop */}
          <button className="tb-btn set-end" title="Gán điểm Kết thúc câu tại con trỏ (Phím ])" onClick={handleSetStop}>
            Stop ]
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px' }} />

          {/* Zoom Controls */}
          <button
            className="tb-btn icon-only"
            title="Thu nhỏ thời gian (Phím -)"
            onClick={() => setZoomFactor(Math.max(5, zoomFactor - 10))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            className="tb-btn icon-only"
            title="Phóng to thời gian (Phím +)"
            onClick={() => setZoomFactor(Math.min(200, zoomFactor + 10))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Playback Speed */}
          <select
            className="tb-select mono-font"
            title="Tốc độ phát Tab 1"
            value={speed}
            onChange={(e) => {
              setSpeed(e.target.value);
              audio.setSpeed(parseFloat(e.target.value));
            }}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px' }} />

          {/* 3-Level Eye Button (Cycles directly: Spectro -> Waveform -> Dual) */}
          <button
            id="btn-view-mode"
            className="tb-btn"
            title={`Chế độ hiển thị hiện tại: ${getViewModeLabel(viewMode)} (Bấm để chuyển: Spectro → Waveform → Dual)`}
            type="button"
            onClick={handleCycleViewMode}
            style={{
              borderColor: viewMode === 'DUAL' ? '#38bdf8' : viewMode === 'SPECTROGRAM' ? '#a855f7' : '#10b981',
              color: viewMode === 'DUAL' ? '#38bdf8' : viewMode === 'SPECTROGRAM' ? '#d8b4fe' : '#6ee7b7',
              background: viewMode === 'DUAL'
                ? 'rgba(56, 189, 248, 0.14)'
                : viewMode === 'SPECTROGRAM'
                  ? 'rgba(168, 85, 247, 0.14)'
                  : 'rgba(16, 185, 129, 0.14)',
              fontWeight: 600,
              padding: '0 10px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{getViewModeLabel(viewMode)}</span>
          </button>
        </div>
      </nav>

      {/* Split Pane Workspace */}
      <div className="workspace-split">
        {/* Canvas Panel */}
        <section className="canvas-panel" style={{ height: `${splitterHeight}%` }}>
          <canvas ref={canvasRef} id="spectrogram-canvas" style={{ display: 'block', width: '100%', height: '100%' }} />

          <button
            className="freq-legend-btn"
            title="Xem chú giải dải tần số ngữ âm (Formants & Liaisons)"
            onClick={onOpenFreqLegend}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          <div className="cursor-time-badge mono-font">
            {TimeFormatter.formatFull(cursorTimeMs)}
          </div>
        </section>

        {/* Resizable Divider */}
        <div className="pane-splitter" onMouseDown={handleSplitterMouseDown}>
          <div className="splitter-handle" />
        </div>

        {/* Subtitle Panel */}
        <section className="subtitle-panel" style={{ height: `${100 - splitterHeight}%` }}>
          <div className="sub-header">
            <div className="sub-header-left">
              <span className="sub-title">
                Danh sách câu ({cues.length})
                {selectedCueIds.size > 0 ? ` • Đã chọn ${selectedCueIds.size}` : ''}
              </span>

              {/* Move Selected Cues Up / Down */}
              <button
                className="cue-move-btn"
                title="Di chuyển các câu đã chọn lên trên"
                disabled={!hasMoveTargets || cues.length < 2}
                onClick={handleMoveCuesUp}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <button
                className="cue-move-btn"
                title="Di chuyển các câu đã chọn xuống dưới"
                disabled={!hasMoveTargets || cues.length < 2}
                onClick={handleMoveCuesDown}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <button
                className="master-clock-btn"
                data-state={cues[0]?.clockState || 'SHOW_LOCKED'}
                title={`Đồng bộ chế độ đồng hồ tất cả các câu (${getClockTooltip(cues[0]?.clockState || 'SHOW_LOCKED')})`}
                onClick={handleMasterClockToggle}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
            </div>

            <button
              className="tb-btn"
              style={{ background: '#1e1b4b', borderColor: '#6366f1', color: '#c7d2fe' }}
              onClick={onOpenAddCues}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Thêm</span>
            </button>
          </div>

          <div className="cues-list-container">
            {cues.map((cue) => {
              const isActive = activeCue?.id === cue.id;
              const isChecked = selectedCueIds.has(cue.id);
              return (
                <div
                  key={cue.id}
                  className={`cue-card ${isActive ? 'active' : ''} ${isChecked ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectCue(cue);
                    scrollOffsetMsRef.current = cue.startMs - (canvasRef.current?.getBoundingClientRect().width || 800) * getMsPerPixel() * 0.15;
                    audio.seek(cue.startMs);
                  }}
                >
                  {/* Left Checkbox for Selecting Cue */}
                  <div
                    className="cue-card-left-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelectCue(cue.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      className="cue-select-checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      title="Chọn câu này để di chuyển Lên/Xuống"
                    />
                  </div>

                  {/* Main Cue Content */}
                  <div className="cue-card-main">
                    <div className="cue-card-row1">
                      <div className="cue-meta-left">
                        <span
                          className="cue-time-badge mono-font"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCue(cue);
                            audio.seek(cue.startMs);
                          }}
                        >
                          {TimeFormatter.formatMinuteSecond(cue.startMs)}
                        </span>

                        <button
                          className="cue-clock-btn"
                          data-state={cue.clockState}
                          title={getClockTooltip(cue.clockState)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCueClockToggle(cue);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="nudge-btn"
                          style={{ color: '#ef4444' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCue(cue);
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <input
                      className="cue-text-input"
                      value={cue.text}
                      onChange={(e) => {
                        cue.text = e.target.value;
                        onUpdateCues([...cues]);
                      }}
                      onFocus={() => onSelectCue(cue)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
};
