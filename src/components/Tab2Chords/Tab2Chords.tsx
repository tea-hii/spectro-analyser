import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChordAnalyzerData, PaletteKey, PitchRangeMode, NOTE_NAMES, midiToNoteLabel, TimeFormatter } from '../../types';
import { AudioEngine } from '../../audio/AudioEngine';
import { ColorLUT } from '../../audio/ColorLUT';

interface Tab2ChordsProps {
  audio: AudioEngine;
  data: ChordAnalyzerData | null;
  onSelectFile: () => void;
  onFileDrop: (file: File) => void;
}

export const Tab2Chords: React.FC<Tab2ChordsProps> = ({
  audio,
  data,
  onSelectFile,
  onFileDrop
}) => {
  const [isPlaying, setIsPlaying] = useState(audio.isPlaying);
  const [isLooping, setIsLooping] = useState(audio.isLooping);
  const [zoomFactor, setZoomFactor] = useState(35.0);
  const [cursorTimeMs, setCursorTimeMs] = useState(0);
  const [pitchRangeMode, setPitchRangeMode] = useState<PitchRangeMode>('AUTO');
  const [paletteKey, setPaletteKey] = useState<PaletteKey>('INFERNO');
  const [currentChord, setCurrentChord] = useState('--');

  const cqtCanvasRef = useRef<HTMLCanvasElement>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement>(null);
  const cqtTileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chromaTileCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const scrollOffsetMsRef = useRef(0);
  const zoomFactorRef = useRef(zoomFactor);
  zoomFactorRef.current = zoomFactor;

  const rulerHeight = 24;
  const minimapHeight = 24;
  const leftGutterWidth = 54;

  if (!cqtTileCanvasRef.current) {
    cqtTileCanvasRef.current = document.createElement('canvas');
  }
  if (!chromaTileCanvasRef.current) {
    chromaTileCanvasRef.current = document.createElement('canvas');
  }

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
    return leftGutterWidth + (ms - scrollOffsetMsRef.current) / getMsPerPixel();
  }, [getMsPerPixel]);

  const xToTime = useCallback((x: number) => {
    return scrollOffsetMsRef.current + (x - leftGutterWidth) * getMsPerPixel();
  }, [getMsPerPixel]);

  const getPitchBounds = useCallback(() => {
    if (!data) return { minMidi: 36, maxMidi: 76 };
    if (pitchRangeMode === 'AUTO') {
      return { minMidi: data.autoMinMidi, maxMidi: data.autoMaxMidi };
    } else if (pitchRangeMode === 'GUITAR_KEYS') {
      return { minMidi: 40, maxMidi: 88 }; // E2 - E6
    } else if (pitchRangeMode === 'BASS_MID') {
      return { minMidi: 24, maxMidi: 72 }; // C1 - C5
    } else if (pitchRangeMode === 'VOCAL_LEAD') {
      return { minMidi: 45, maxMidi: 81 }; // A2 - A5
    } else {
      return { minMidi: data.minMidi, maxMidi: data.maxMidi };
    }
  }, [data, pitchRangeMode]);

  const clampScroll = useCallback((viewWidth: number) => {
    if (!audio || audio.durationMs <= 0) return;
    const plotW = viewWidth - leftGutterWidth;
    const visibleWindowMs = plotW * getMsPerPixel();
    const minScroll = -200;
    const maxScroll = Math.max(minScroll, audio.durationMs + 200 - visibleWindowMs);
    scrollOffsetMsRef.current = Math.max(minScroll, Math.min(maxScroll, scrollOffsetMsRef.current));
  }, [audio, getMsPerPixel]);

  // Render CQT Tier
  const renderCqt = useCallback(() => {
    const canvas = cqtCanvasRef.current;
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

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    if (!data) {
      ctx.restore();
      return;
    }

    clampScroll(w);

    const rulerH = rulerHeight;
    const graphH = h - rulerH;
    const gutterW = leftGutterWidth;

    const { minMidi, maxMidi } = getPitchBounds();
    const renderedSemitones = maxMidi - minMidi + 1;
    const semitoneH = graphH / renderedSemitones;

    // 1. Piano Roll Note Labels (Left gutter)
    for (let m = minMidi; m <= maxMidi; m++) {
      const row = maxMidi - m; // lowest note at bottom
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

      // Grid line
      ctx.strokeStyle = (pc === 0) ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(gutterW, y + semitoneH);
      ctx.lineTo(w, y + semitoneH);
      ctx.stroke();
    }

    // 2. CQT Spectrogram Heatmap Tile
    const vStartMs = xToTime(gutterW);
    const vEndMs = xToTime(w);
    const fStart = Math.max(0, Math.floor(vStartMs / data.timeResolutionMs));
    const fEnd = Math.min(data.numFrames - 1, Math.ceil(vEndMs / data.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;

    if (renderFrames > 0 && renderedSemitones > 0 && cqtTileCanvasRef.current) {
      const tileCanvas = cqtTileCanvasRef.current;
      if (tileCanvas.width !== renderFrames || tileCanvas.height !== renderedSemitones) {
        tileCanvas.width = renderFrames;
        tileCanvas.height = renderedSemitones;
      }
      const tileCtx = tileCanvas.getContext('2d', { alpha: false });
      if (tileCtx) {
        const imgData = tileCtx.createImageData(renderFrames, renderedSemitones);
        const buf32 = new Uint32Array(imgData.data.buffer);
        const lut = ColorLUT[paletteKey] || ColorLUT.INFERNO;
        const cqtMatrix = new Uint8Array(data.cqtMatrix);
        const totalBins = data.numSemitones;
        const globalMinM = data.minMidi;

        for (let fIdx = 0; fIdx < renderFrames; fIdx++) {
          const frame = fStart + fIdx;
          const frameBase = frame * totalBins;

          for (let row = 0; row < renderedSemitones; row++) {
            const m = maxMidi - row;
            const sIdx = m - globalMinM;
            const q = (sIdx >= 0 && sIdx < totalBins) ? cqtMatrix[frameBase + sIdx] : 0;
            buf32[row * renderFrames + fIdx] = lut[q];
          }
        }

        tileCtx.putImageData(imgData, 0, 0);

        const startX = timeToX(fStart * data.timeResolutionMs);
        const endX = timeToX((fEnd + 1) * data.timeResolutionMs);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tileCanvas, 0, 0, renderFrames, renderedSemitones, startX, rulerH, endX - startX, graphH);
      }
    }

    // 3. Top Time Ruler
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, rulerH);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, rulerH);
    ctx.lineTo(w, rulerH);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, gutterW, rulerH);

    const msPerPx = getMsPerPixel();
    let stepMs = 1000;
    if (msPerPx < 1.0) stepMs = 200;
    else if (msPerPx < 2.5) stepMs = 500;
    else if (msPerPx < 6.0) stepMs = 1000;
    else stepMs = 2000;

    const firstTick = Math.floor(vStartMs / stepMs) * stepMs;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    for (let t = firstTick; t <= vEndMs; t += stepMs) {
      const tx = timeToX(t);
      if (tx >= gutterW && tx <= w) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(tx, rulerH - 6);
        ctx.lineTo(tx, rulerH);
        ctx.stroke();
        ctx.fillText(TimeFormatter.formatFull(t), tx + 4, 14);
      }
    }

    // 4. Yellow Playhead Line on CQT
    const playheadMs = audio.getCurrentPosition();
    const playheadX = timeToX(playheadMs);
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

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(playheadX - 5, rulerH);
      ctx.lineTo(playheadX + 5, rulerH);
      ctx.lineTo(playheadX, rulerH + 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [audio, data, paletteKey, getPitchBounds, getMsPerPixel, timeToX, xToTime, clampScroll]);

  // Render Chroma Tier
  const renderChroma = useCallback(() => {
    const canvas = chromaCanvasRef.current;
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

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    if (!data) {
      ctx.restore();
      return;
    }

    const miniH = minimapHeight;
    const graphH = h - miniH;
    const gutterW = leftGutterWidth;
    const laneH = graphH / 12.0;

    // 1. Gutter: 12 Pitch Classes (B down to C)
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

    // 2. Chromagram Heatmap Tile
    const vStartMs = xToTime(gutterW);
    const vEndMs = xToTime(w);
    const fStart = Math.max(0, Math.floor(vStartMs / data.timeResolutionMs));
    const fEnd = Math.min(data.numFrames - 1, Math.ceil(vEndMs / data.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;

    if (renderFrames > 0 && chromaTileCanvasRef.current) {
      const tileCanvas = chromaTileCanvasRef.current;
      if (tileCanvas.width !== renderFrames || tileCanvas.height !== 12) {
        tileCanvas.width = renderFrames;
        tileCanvas.height = 12;
      }
      const tileCtx = tileCanvas.getContext('2d', { alpha: false });
      if (tileCtx) {
        const imgData = tileCtx.createImageData(renderFrames, 12);
        const buf32 = new Uint32Array(imgData.data.buffer);
        const chromaMatrix = new Uint8Array(data.chromagramMatrix);

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

        tileCtx.putImageData(imgData, 0, 0);

        const startX = timeToX(fStart * data.timeResolutionMs);
        const endX = timeToX((fEnd + 1) * data.timeResolutionMs);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tileCanvas, 0, 0, renderFrames, 12, startX, 0, endX - startX, graphH);
      }
    }

    // 3. Playhead on Chromagram
    const playheadMs = audio.getCurrentPosition();
    const playheadX = timeToX(playheadMs);
    if (playheadX >= gutterW && playheadX <= w) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, graphH);
      ctx.stroke();
    }

    // 4. Minimap at Bottom
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, h - miniH, w, miniH);

    const durMs = audio.durationMs;
    if (durMs > 0) {
      const plotW = w - gutterW;
      const minP = audio.minPeaks, maxP = audio.maxPeaks;
      if (minP && maxP && minP.length > 0) {
        const centerY = (h - miniH) + miniH / 2;
        const halfH = miniH / 2 - 2;
        ctx.fillStyle = '#334155';
        for (let px = 0; px < plotW; px++) {
          const b = Math.floor((px / plotW) * minP.length);
          const maxV = maxP[b], minV = minP[b];
          ctx.fillRect(gutterW + px, centerY - maxV * halfH, 1, Math.max(1, (maxV - minV) * halfH));
        }
      }

      const thumbStartMs = Math.max(0, scrollOffsetMsRef.current);
      const thumbEndMs = Math.min(durMs, scrollOffsetMsRef.current + plotW * getMsPerPixel());
      const thumbX = gutterW + (thumbStartMs / durMs) * plotW;
      const thumbW = Math.max(14, ((thumbEndMs - thumbStartMs) / durMs) * plotW);

      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.fillRect(thumbX, h - miniH, thumbW, miniH);
      ctx.strokeStyle = '#a855f7';
      ctx.strokeRect(thumbX, h - miniH, thumbW, miniH);
    }

    ctx.restore();
  }, [audio, data, getMsPerPixel, timeToX, xToTime]);

  // Update current chord indicator
  const updateCurrentChord = useCallback(() => {
    if (!data || !data.detectedChords) return;
    const curMs = audio.getCurrentPosition();
    const f = Math.max(0, Math.min(data.numFrames - 1, Math.floor(curMs / data.timeResolutionMs)));
    const chord = data.detectedChords[f] || '--';
    setCurrentChord(chord);
  }, [audio, data]);

  // 60fps Loop
  useEffect(() => {
    let animId: number;
    const tick = () => {
      renderCqt();
      renderChroma();
      updateCurrentChord();
      if (audio) {
        setCursorTimeMs(audio.getCurrentPosition());
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [renderCqt, renderChroma, updateCurrentChord, audio]);

  // Bind mouse gestures to CQT and Chroma canvas
  useEffect(() => {
    const canvases = [cqtCanvasRef.current, chromaCanvasRef.current].filter(Boolean) as HTMLCanvasElement[];
    const cleanupList: (() => void)[] = [];

    canvases.forEach(canvas => {
      let isDragging = false;
      let dragStartX = 0;
      let dragStartScrollMs = 0;

      const getX = (e: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
        return clientX - canvas.getBoundingClientRect().left;
      };

      const handleMouseDown = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        dragStartX = getX(e);
        dragStartScrollMs = scrollOffsetMsRef.current;
        const curTime = xToTime(dragStartX);
        const playheadX = timeToX(audio.getCurrentPosition());

        if (Math.abs(dragStartX - playheadX) <= 12) {
          audio.seek(Math.max(0, Math.min(audio.durationMs, curTime)));
        } else if (dragStartX > leftGutterWidth) {
          audio.seek(Math.max(0, Math.min(audio.durationMs, curTime)));
        }
      };

      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const curX = getX(e);
        scrollOffsetMsRef.current = dragStartScrollMs - (curX - dragStartX) * getMsPerPixel();
      };

      const handleMouseUp = () => {
        isDragging = false;
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
          scrollOffsetMsRef.current = timeAtMouse - (mouseX - leftGutterWidth) * (100.0 / Math.max(5.0, newZoom));
        }
      };

      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('touchstart', handleMouseDown, { passive: true });
      window.addEventListener('touchmove', handleMouseMove, { passive: true });
      window.addEventListener('touchend', handleMouseUp);
      canvas.addEventListener('wheel', handleWheel, { passive: false });

      cleanupList.push(() => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('touchstart', handleMouseDown);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
        canvas.removeEventListener('wheel', handleWheel);
      });
    });

    return () => {
      cleanupList.forEach(fn => fn());
    };
  }, [audio, timeToX, xToTime, getMsPerPixel]);

  // Drag and drop for Tab 2
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  };

  return (
    <section className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="chord-analyzer-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Tab 2 Toolbar */}
        <div className="chord-toolbar">
          <div className="chord-toolbar-group">
            {/* Play / Stop */}
            <button
              className={`tb-btn play-main icon-only ${isPlaying ? 'playing' : ''}`}
              title="Phát / Dừng Tab 2 (Phím Space)"
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

            {/* Loop Toggle */}
            <button
              className={`tb-btn icon-only ${isLooping ? 'active' : ''}`}
              title="Bật/Tắt Lặp đoạn"
              onClick={() => {
                const next = !isLooping;
                setIsLooping(next);
                audio.isLooping = next;
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>

            <div className="mono-font" style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', padding: '0 4px' }}>
              {TimeFormatter.formatFull(cursorTimeMs)}
            </div>

            <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px' }} />

            {/* Zoom Controls */}
            <button
              className="tb-btn icon-only"
              title="Thu nhỏ thời gian"
              onClick={() => setZoomFactor(Math.max(5, zoomFactor - 8))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              className="tb-btn icon-only"
              title="Phóng to thời gian"
              onClick={() => setZoomFactor(Math.min(200, zoomFactor + 8))}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Pitch Range Presets */}
            <select
              className="tb-select"
              title="Phạm vi nốt trục tung CQT"
              value={pitchRangeMode}
              onChange={(e) => setPitchRangeMode(e.target.value as PitchRangeMode)}
            >
              <option value="AUTO">✨ Tự động Auto-Crop Dải Nốt</option>
              <option value="GUITAR_KEYS">Guitar &amp; Keys (E2 – E6)</option>
              <option value="BASS_MID">Bass &amp; Mid (C1 – C5)</option>
              <option value="VOCAL_LEAD">Vocal &amp; Lead (A2 – A5)</option>
              <option value="FULL">Toàn dải (A0 – C7)</option>
            </select>

            {/* Palette */}
            <select
              className="tb-select"
              title="Bảng màu CQT"
              value={paletteKey}
              onChange={(e) => setPaletteKey(e.target.value as PaletteKey)}
            >
              <option value="INFERNO">Inferno Heatmap</option>
              <option value="CYBERPUNK">Neon Cyberpunk</option>
              <option value="AEGISUB_BLUE">Aegisub Blue</option>
              <option value="VIRIDIS">Viridis Bio</option>
            </select>
          </div>

          {/* Detected Chord Badge */}
          <div className="chord-toolbar-group">
            <div className="detected-chord-badge">
              <span className="chord-label-sub">Hợp Âm Hiện Tại:</span>
              <span className="chord-name-val mono-font">{currentChord}</span>
            </div>

            <button
              className="tb-btn"
              style={{ background: '#1e1b4b', borderColor: '#8b5cf6', color: '#ede9fe' }}
              title="Nạp file nhạc / stem riêng cho Tab 2"
              onClick={onSelectFile}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>Nạp Bài Nhạc</span>
            </button>
          </div>
        </div>

        {/* Stacked 2-Tier Graph Viewports */}
        <div className="chord-stacked-viewports" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Empty State Dropzone when no data */}
          {!data && (
            <div className="tab2-empty-placeholder" onDragOver={handleDragOver} onDrop={handleDrop}>
              <div className="dropzone-box">
                <div style={{ fontSize: 40 }}>🎹</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#ffffff' }}>Musical Chord Analyzer (Tab 2)</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Bộ phân tích hợp âm trực quan qua <strong>Constant-Q Transform</strong> &amp; <strong>Chromagram 12 nốt</strong> triệt tiêu bồi âm. Giúp bạn nhìn rõ nốt cấu thành hợp âm để vẽ lại MIDI trong DAW.
                </p>
                <button
                  className="tb-btn play-main"
                  style={{ padding: '10px 20px', height: 'auto', fontSize: 13, fontWeight: 700 }}
                  onClick={onSelectFile}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Chọn File Audio / Video Nhạc Cụ</span>
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Hoặc kéo thả file trực tiếp vào khung này (Hỗ trợ MP3, WAV, AAC, M4A, FLAC, OGG, MP4)
                </span>
              </div>
            </div>
          )}

          {/* Tier 1: Dynamic CQT Spectrogram (Semitones) */}
          <div className="cqt-tier-container" style={{ flex: 1, position: 'relative' }}>
            <canvas ref={cqtCanvasRef} id="cqt-canvas" style={{ display: 'block', width: '100%', height: '100%' }} />
            <div className="tier-label-overlay">Dynamic CQT Spectrogram (Bám theo cao độ nửa cung)</div>
          </div>

          {/* Tier 2: 12-Tone Chromagram */}
          <div className="chroma-tier-container" style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chromaCanvasRef} id="chroma-canvas" style={{ display: 'block', width: '100%', height: '100%' }} />
            <div className="tier-label-overlay">Chromagram 12 Nốt (Triệt tiêu bồi âm - Octave Invariance)</div>
          </div>
        </div>
      </div>
    </section>
  );
};
