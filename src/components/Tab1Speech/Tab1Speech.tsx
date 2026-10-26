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
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [splitterHeight, setSplitterHeight] = useState(52); // 52% default

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const scrollOffsetMsRef = useRef(0);
  const zoomFactorRef = useRef(zoomFactor);
  zoomFactorRef.current = zoomFactor;

  const rulerHeight = 28;
  const subOverlayHeight = 28;
  const minimapHeight = 28;

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

  // Audio play state sync
  useEffect(() => {
    audio.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
    };
    audio.onPositionUpdate = (ms) => {
      setCursorTimeMs(ms);
    };
  }, [audio]);

  // Close view mode dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) {
        setViewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getMsPerPixel = useCallback(() => {
    return Math.max(0.5, 100.0 / Math.max(5.0, zoomFactorRef.current));
  }, []);

  const timeToX = useCallback((ms: number, width: number) => {
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
    const subH = subOverlayHeight;
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
        const px = timeToX(b * bucketMs, w);
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

          const startX = timeToX(fStart * spectrogram.timeResolutionMs, w);
          const endX = timeToX((fEnd + 1) * spectrogram.timeResolutionMs, w);
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

    // 3. Subtitle strip below time ruler
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
        const startX = timeToX(cue.startMs, w);
        const endX = timeToX(cue.endMs, w);
        const cueW = endX - startX;
        if (endX < 0 || startX > w) return;

        const isActive = activeCue && activeCue.id === cue.id;
        const padY = 2;
        const barH = subH - padY * 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, rulerH + padY, Math.max(8, cueW), barH);
        ctx.clip();

        if (isActive) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(startX, rulerH + padY, cueW, barH);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(startX + 1, rulerH + padY + 1, Math.max(6, cueW - 2), barH - 2);
        } else {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
          ctx.fillRect(startX, rulerH + padY, cueW, barH);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.strokeRect(startX, rulerH + padY, Math.max(8, cueW), barH);
        }

        ctx.fillStyle = isActive ? '#ffffff' : '#cbd5e1';
        ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(cue.text, startX + 6, rulerH + subH / 2);
        ctx.restore();

        if (cue.clockState === CueClockState.EDITING_WORDS) {
          const words = cue.resolvedWordTimings();
          words.forEach(wt => {
            const wx = timeToX(wt.startMs, w);
            if (wx >= 0 && wx <= w) {
              ctx.strokeStyle = '#c084fc';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(wx, rulerH);
              ctx.lineTo(wx, h - miniH);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        }
      });
    }

    // 4. Selection window
    const selStartX = timeToX(selectionStartMs, w);
    const selEndX = timeToX(selectionEndMs, w);
    const selectionH = h - rulerH - miniH;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
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
      const tx = timeToX(t, w);
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

    // 6. Yellow Playhead Line
    const playheadMs = audio ? audio.getCurrentPosition() : 0;
    const playheadX = timeToX(playheadMs, w);
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

      // Main canvas area
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, contentBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(playheadX - 6, rulerH);
      ctx.lineTo(playheadX + 6, rulerH);
      ctx.lineTo(playheadX, rulerH + 9);
      ctx.closePath();
      ctx.fill();
    }

    // 7. Minimap
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, h - miniH, w, miniH);

    const durMs = audio.durationMs;
    if (durMs > 0) {
      const minP = audio.minPeaks, maxP = audio.maxPeaks;
      if (minP && maxP && minP.length > 0) {
        const centerY = (h - miniH) + miniH / 2;
        const halfH = miniH / 2 - 2;
        ctx.fillStyle = '#334155';
        for (let px = 0; px < w; px++) {
          const b = Math.floor((px / w) * minP.length);
          const maxV = maxP[b], minV = minP[b];
          ctx.fillRect(px, centerY - maxV * halfH, 1, Math.max(1, (maxV - minV) * halfH));
        }
      }

      const thumbStartMs = Math.max(0, scrollOffsetMsRef.current);
      const thumbEndMs = Math.min(durMs, scrollOffsetMsRef.current + w * msPerPx);
      const thumbX = (thumbStartMs / durMs) * w;
      const thumbW = Math.max(14, ((thumbEndMs - thumbStartMs) / durMs) * w);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fillRect(thumbX, h - miniH, thumbW, miniH);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(thumbX, h - miniH, thumbW, miniH);
    }

    ctx.restore();
  }, [audio, cues, activeCue, spectrogram, viewMode, selectionStartMs, selectionEndMs, getMsPerPixel, timeToX, xToTime, clampScroll]);

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

  // Mouse gestures for Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDragging = false;
    let dragTarget: 'START' | 'END' | 'PLAYHEAD' | 'PAN' | null = null;
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

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      dragStartX = getX(e);
      const dragStartY = getY(e);
      dragStartScrollMs = scrollOffsetMsRef.current;
      const curTime = xToTime(dragStartX);
      const startX = timeToX(selectionStartMs, canvas.getBoundingClientRect().width);
      const endX = timeToX(selectionEndMs, canvas.getBoundingClientRect().width);
      const playheadX = timeToX(audio.getCurrentPosition(), canvas.getBoundingClientRect().width);

      if (Math.abs(dragStartX - startX) <= 12 || (dragStartX >= startX && dragStartX <= startX + 18 && dragStartY >= rulerHeight && dragStartY <= rulerHeight + 22)) {
        dragTarget = 'START';
      } else if (Math.abs(dragStartX - endX) <= 12 || (dragStartX >= endX - 18 && dragStartX <= endX && dragStartY >= rulerHeight && dragStartY <= rulerHeight + 22)) {
        dragTarget = 'END';
      } else if (Math.abs(dragStartX - playheadX) <= 12) {
        dragTarget = 'PLAYHEAD';
      } else if (dragStartY >= rulerHeight && dragStartY <= rulerHeight + subOverlayHeight) {
        const clickedCue = cues.find(c => curTime >= c.startMs && curTime <= c.endMs);
        if (clickedCue) {
          onSelectCue(clickedCue);
          audio.seek(clickedCue.startMs);
          dragTarget = null;
          isDragging = false;
          return;
        }
        dragTarget = 'PAN';
      } else if (dragStartY <= rulerHeight) {
        audio.seek(Math.max(0, Math.min(audio.durationMs, curTime)));
        dragTarget = 'PLAYHEAD';
      } else {
        dragTarget = 'PAN';
      }
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const curX = getX(e);
      const curTime = xToTime(curX);

      if (dragTarget === 'START') {
        const newStart = Math.max(0, Math.min(selectionEndMs - 50, Math.round(curTime)));
        setSelectionStartMs(newStart);
        if (activeCue) activeCue.startMs = newStart;
      } else if (dragTarget === 'END') {
        const newEnd = Math.max(selectionStartMs + 50, Math.min(audio.durationMs, Math.round(curTime)));
        setSelectionEndMs(newEnd);
        if (activeCue) activeCue.endMs = newEnd;
      } else if (dragTarget === 'PLAYHEAD') {
        audio.seek(Math.max(0, Math.min(audio.durationMs, curTime)));
      } else if (dragTarget === 'PAN') {
        scrollOffsetMsRef.current = dragStartScrollMs - (curX - dragStartX) * getMsPerPixel();
      }
    };

    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      if (isDragging && dragTarget === 'PAN') {
        const curX = getX(e);
        if (Math.abs(curX - dragStartX) < 5) {
          audio.seek(xToTime(curX));
        }
      }
      isDragging = false;
      dragTarget = null;
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
  }, [audio, cues, activeCue, selectionStartMs, selectionEndMs, xToTime, timeToX, getMsPerPixel, onSelectCue]);

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
    if (activeCue) {
      audio.loopStartMs = activeCue.startMs;
      audio.loopEndMs = activeCue.endMs;
      audio.play(activeCue.startMs);
    } else {
      audio.play(selectionStartMs);
    }
  };

  // Play Word (W)
  const handlePlayWord = () => {
    if (!activeCue) return;
    const curPos = audio.getCurrentPosition();
    const words = activeCue.resolvedWordTimings();
    if (words.length === 0) return;

    let targetIdx = 0;
    for (let i = 0; i < words.length; i++) {
      if (curPos >= words[i].startMs) targetIdx = i;
    }
    const wStart = words[targetIdx].startMs;
    const wEnd = targetIdx < words.length - 1 ? words[targetIdx + 1].startMs : activeCue.endMs;

    audio.loopStartMs = wStart;
    audio.loopEndMs = wEnd;
    audio.play(wStart);
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

  // Master clock toggle
  const handleMasterClockToggle = () => {
    const states: CueClockStateType[] = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
    const currentFirst = cues[0]?.clockState || CueClockState.SHOW_LOCKED;
    const nextIdx = (states.indexOf(currentFirst) + 1) % states.length;
    const nextState = states[nextIdx];

    const updated = cues.map(c => {
      c.clockState = nextState;
      return c;
    });
    onUpdateCues([...updated]);
  };

  // Toggle single cue clock state
  const handleCueClockToggle = (cue: SubtitleCue) => {
    const states: CueClockStateType[] = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
    const curIdx = states.indexOf(cue.clockState);
    cue.clockState = states[(curIdx + 1) % states.length];
    onUpdateCues([...cues]);
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

  return (
    <section className="tab-pane active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Aegisub Toolbar */}
      <nav className="aegisub-toolbar">
        <div className="toolbar-row">
          {/* Play / Stop */}
          <button
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
            className="tb-btn play-word icon-only"
            title="Phát từ tại con trỏ (Phím W)"
            onClick={handlePlayWord}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16" />
            </svg>
          </button>

          {/* Loop Toggle */}
          <button
            className={`tb-btn icon-only ${isLooping ? 'active' : ''}`}
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
            <option value="0.5">0.5x (Ngữ âm chậm)</option>
            <option value="0.75">0.75x (Ngữ âm)</option>
            <option value="1.0">1.0x Chuẩn</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px' }} />

          {/* View Mode Dropdown */}
          <div className="dropdown-wrapper" ref={viewDropdownRef}>
            <button
              className="tb-btn icon-only dropdown-trigger"
              title="Chế độ hiển thị (Dual / Spectrogram / Waveform)"
              type="button"
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            {viewDropdownOpen && (
              <div className="dropdown-menu" style={{ display: 'block' }}>
                <button
                  className={`dropdown-item view-mode-item ${viewMode === 'DUAL' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    onChangeViewMode('DUAL');
                    setViewDropdownOpen(false);
                  }}
                >
                  <span className="check-mark">{viewMode === 'DUAL' ? '✓' : ''}</span>
                  <span>Dual</span>
                </button>
                <button
                  className={`dropdown-item view-mode-item ${viewMode === 'SPECTROGRAM' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    onChangeViewMode('SPECTROGRAM');
                    setViewDropdownOpen(false);
                  }}
                >
                  <span className="check-mark">{viewMode === 'SPECTROGRAM' ? '✓' : ''}</span>
                  <span>Spectrogram</span>
                </button>
                <button
                  className={`dropdown-item view-mode-item ${viewMode === 'WAVEFORM' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    onChangeViewMode('WAVEFORM');
                    setViewDropdownOpen(false);
                  }}
                >
                  <span className="check-mark">{viewMode === 'WAVEFORM' ? '✓' : ''}</span>
                  <span>Waveform</span>
                </button>
              </div>
            )}
          </div>
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
              <span className="sub-title">Danh sách câu ({cues.length})</span>
              <button
                className="master-clock-btn"
                data-state={cues[0]?.clockState || 'SHOW_LOCKED'}
                title="Đồng bộ chế độ đồng hồ tất cả các câu"
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
              <span>+ Thêm câu</span>
            </button>
          </div>

          <div className="cues-list-container">
            {cues.map((cue) => {
              const isActive = activeCue?.id === cue.id;
              return (
                <div
                  key={cue.id}
                  className={`cue-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCue(cue);
                    scrollOffsetMsRef.current = cue.startMs - (canvasRef.current?.getBoundingClientRect().width || 800) * getMsPerPixel() * 0.15;
                    audio.seek(cue.startMs);
                  }}
                >
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
                        title={`Chế độ: ${cue.clockState}`}
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
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
};
