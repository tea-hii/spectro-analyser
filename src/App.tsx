import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TabType, ViewMode, SubtitleCue, SpectrogramData, ChordAnalyzerData } from './types';
import { AudioEngine } from './audio/AudioEngine';
import { FFTEngine } from './audio/FFTEngine';
import { Header } from './components/Header';
import { TabDrawer } from './components/TabDrawer';
import { Tab1Speech } from './components/Tab1Speech/Tab1Speech';
import { Tab2Chords } from './components/Tab2Chords/Tab2Chords';
import { AddCuesModal } from './components/Modals/AddCuesModal';
import { FreqLegendModal } from './components/Modals/FreqLegendModal';
import { LoadingOverlay } from './components/Modals/LoadingOverlay';

export const App: React.FC = () => {
  // Navigation & Drawer
  const [currentTab, setCurrentTab] = useState<TabType>('tab1');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals
  const [isAddCuesOpen, setIsAddCuesOpen] = useState(false);
  const [isFreqLegendOpen, setIsFreqLegendOpen] = useState(false);

  // Loading state
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Zero-Leakage: Dedicated Audio Engine per Tab
  const audioTab1 = useMemo(() => new AudioEngine('Tab1'), []);
  const audioTab2 = useMemo(() => new AudioEngine('Tab2'), []);
  const fftTab1 = useMemo(() => new FFTEngine(512, 256, 128), []);

  // Worker for Tab 2
  const chordWorkerRef = useRef<Worker | null>(null);

  // Tab 1 state
  const [spectrogramTab1, setSpectrogramTab1] = useState<SpectrogramData | null>(null);
  const [cuesTab1, setCuesTab1] = useState<SubtitleCue[]>([]);
  const [activeCueTab1, setActiveCueTab1] = useState<SubtitleCue | null>(null);
  const [viewModeTab1, setViewModeTab1] = useState<ViewMode>('DUAL');
  const [trackNameTab1, setTrackNameTab1] = useState('Đang nạp Ví dụ 1...');
  const [durationTab1, setDurationTab1] = useState(0);

  // Tab 2 state
  const [chordDataTab2, setChordDataTab2] = useState<ChordAnalyzerData | null>(null);
  const [trackNameTab2, setTrackNameTab2] = useState('Chưa nạp file');
  const [durationTab2, setDurationTab2] = useState(0);

  // File Inputs
  const inputTab1Ref = useRef<HTMLInputElement>(null);
  const inputTab2Ref = useRef<HTMLInputElement>(null);

  const showLoading = (msg: string, progress = 0) => {
    setLoadingMsg(msg);
    setLoadingProgress(progress);
    setLoadingOpen(true);
  };

  const hideLoading = () => {
    setLoadingOpen(false);
  };

  // Tab 1: Load Audio File
  const handleLoadTab1File = async (file: File) => {
    try {
      showLoading(`Đang đọc file "${file.name}" vào RAM Tab 1...`, 0.05);
      const arrayBuf = await file.arrayBuffer();

      showLoading('Đang giải mã & Downsample 16kHz Mono (Tab 1)...', 0.25);
      await audioTab1.loadAudioBuffer(arrayBuf, file.name, (p) => {
        showLoading('Đang phân tích âm thanh Tab 1...', p);
      });

      showLoading('Đang tính ma trận 2D STFT (512-pt Cooley-Tukey FFT)...', 0.5);
      const spec = await fftTab1.computeSpectrogramAsync(
        audioTab1.samples16k!,
        16000,
        (p) => showLoading('Đang vẽ biểu đồ phổ Tab 1...', p)
      );

      setSpectrogramTab1(spec);
      setTrackNameTab1(file.name);
      setDurationTab1(audioTab1.durationMs);

      if (cuesTab1.length === 0) {
        const initialCue = new SubtitleCue({
          startMs: 0,
          endMs: Math.min(3000, audioTab1.durationMs),
          text: 'Câu phụ đề mới'
        });
        setCuesTab1([initialCue]);
        setActiveCueTab1(initialCue);
      } else {
        setActiveCueTab1(cuesTab1[0]);
      }

      hideLoading();
    } catch (err: unknown) {
      console.error(err);
      hideLoading();
      alert('Không thể đọc file audio Tab 1: ' + (err as Error).message);
    }
  };

  // Tab 1: Load Presets
  const handleLoadPreset = useCallback(async (presetId: number) => {
    let trackLabel = 'Ví dụ 1';
    let candidatePaths: string[] = [];
    let presetCues: SubtitleCue[] = [];

    if (presetId === 1) {
      trackLabel = 'Ví dụ 1';
      candidatePaths = [
        '/assets/french_liaisons.mp3',
        './assets/french_liaisons.mp3',
        '/public/assets/french_liaisons.mp3',
        '/assets/french_liaisons.wav'
      ];
      presetCues = [
        new SubtitleCue({ startMs: 0, endMs: 2100, text: "C'est une très belle histoire", actor: "Ví dụ 1" }),
        new SubtitleCue({ startMs: 2100, endMs: 4100, text: "les enfants adorent les oiseaux", actor: "Ví dụ 1" }),
        new SubtitleCue({ startMs: 4100, endMs: 6020, text: "et nous allons ensemble à Paris", actor: "Ví dụ 1" })
      ];
    } else if (presetId === 2) {
      trackLabel = 'Ví dụ 2';
      candidatePaths = [
        '/assets/french_conversation.mp3',
        './assets/french_conversation.mp3',
        '/public/assets/french_conversation.mp3',
        '/assets/french_conversation.wav'
      ];
      presetCues = [
        new SubtitleCue({ startMs: 0, endMs: 2600, text: "Je ne sais pas ce que tu penses", actor: "Ví dụ 2" }),
        new SubtitleCue({ startMs: 2650, endMs: 5560, text: "mais il faut faire attention aux liaisons et aux élisions", actor: "Ví dụ 2" })
      ];
    } else {
      trackLabel = 'Ví dụ 3';
      candidatePaths = [
        '/assets/french_liaisons.wav',
        './assets/french_liaisons.wav',
        '/public/assets/french_liaisons.wav',
        '/assets/french_liaisons.mp3'
      ];
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

    setCuesTab1(presetCues);
    setActiveCueTab1(presetCues[0]);

    try {
      showLoading(`Đang tải bài mẫu "${trackLabel}" vào Tab 1...`, 0.1);
      let arrayBuf: ArrayBuffer | null = null;

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
        showLoading('Đang giải mã & Downsample 16kHz Mono...', 0.35);
        await audioTab1.loadAudioBuffer(arrayBuf, trackLabel, (p) => {
          showLoading('Đang phân tích âm thanh...', p);
        });
      } else {
        showLoading('Đang tạo tín hiệu âm thanh mẫu...', 0.35);
        const durSec = presetCues.length > 0 ? (presetCues[presetCues.length - 1].endMs / 1000.0) : 6.02;
        audioTab1.loadSyntheticSpeechBuffer(durSec, trackLabel);
      }

      showLoading('Đang tính ma trận 2D STFT (512-pt Cooley-Tukey FFT)...', 0.5);
      const spec = await fftTab1.computeSpectrogramAsync(
        audioTab1.samples16k!,
        16000,
        (p) => showLoading('Đang tạo biểu đồ phổ...', p)
      );

      setSpectrogramTab1(spec);
      setTrackNameTab1(trackLabel);
      setDurationTab1(audioTab1.durationMs);
      hideLoading();
    } catch (e) {
      console.warn('Preset load failed, using synthetic fallback:', e);
      try {
        const durSec = presetCues.length > 0 ? (presetCues[presetCues.length - 1].endMs / 1000.0) : 6.02;
        audioTab1.loadSyntheticSpeechBuffer(durSec, trackLabel);
        const spec = await fftTab1.computeSpectrogramAsync(audioTab1.samples16k!, 16000, () => {});
        setSpectrogramTab1(spec);
        setTrackNameTab1(trackLabel);
        setDurationTab1(audioTab1.durationMs);
      } catch (err2) {
        console.error('Synthetic fallback error:', err2);
      }
      hideLoading();
    }
  }, [audioTab1, fftTab1]);

  // Load Preset 1 on initial startup
  useEffect(() => {
    handleLoadPreset(1);
  }, [handleLoadPreset]);

  // Tab 2: Load Audio File
  const handleLoadTab2File = async (file: File) => {
    try {
      showLoading(`Đang đọc bài nhạc "${file.name}" vào RAM Tab 2...`, 0.05);
      const arrayBuf = await file.arrayBuffer();

      showLoading('Đang giải mã Web Audio & Downsample 16kHz (Tab 2)...', 0.2);
      await audioTab2.loadAudioBuffer(arrayBuf, file.name, (p) => {
        showLoading('Đang trích xuất dạng sóng Tab 2...', p);
      });

      showLoading('Khởi tạo Web Worker phân tích Constant-Q Transform & Chromagram...', 0.35);

      if (chordWorkerRef.current) {
        chordWorkerRef.current.terminate();
      }

      chordWorkerRef.current = new Worker('/chord-worker.js');

      chordWorkerRef.current.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          showLoading('Đang phân tích CQT Semitones & Triệt tiêu bồi âm trong Web Worker...', 0.35 + msg.progress * 0.6);
        } else if (msg.type === 'done') {
          setChordDataTab2(msg);
          setTrackNameTab2(file.name);
          setDurationTab2(audioTab2.durationMs);
          hideLoading();
        } else if (msg.type === 'error') {
          hideLoading();
          alert('Lỗi phân tích hợp âm trong Web Worker: ' + msg.error);
        }
      };

      chordWorkerRef.current.postMessage({
        action: 'analyzeChords',
        samples: audioTab2.samples16k,
        sampleRate: 16000
      });
    } catch (err: unknown) {
      console.error(err);
      hideLoading();
      alert('Không thể mở file nhạc Tab 2: ' + (err as Error).message);
    }
  };

  // Add Cues confirmation
  const handleConfirmAddCues = (rawText: string, position: 'AFTER_SELECTED' | 'BEFORE_SELECTED' | 'START_OF_LIST' | 'END_OF_LIST') => {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const baseStart = activeCueTab1 ? activeCueTab1.endMs : (cuesTab1.length > 0 ? cuesTab1[cuesTab1.length - 1].endMs : 0);
    const newCues = lines.map((l, i) => new SubtitleCue({
      startMs: baseStart + i * 2500,
      endMs: baseStart + (i + 1) * 2500,
      text: l
    }));

    let updated = [...cuesTab1];
    if (updated.length === 0) {
      updated = newCues;
    } else if (position === 'START_OF_LIST') {
      updated.unshift(...newCues);
    } else if (position === 'END_OF_LIST' || !activeCueTab1) {
      updated.push(...newCues);
    } else {
      const idx = updated.indexOf(activeCueTab1);
      updated.splice(position === 'BEFORE_SELECTED' ? idx : idx + 1, 0, ...newCues);
    }

    const maxEnd = Math.max(...updated.map(c => c.endMs || 0));
    if (!audioTab1.durationMs || audioTab1.durationMs < maxEnd) {
      audioTab1.durationMs = Math.max(7000, maxEnd + 1000);
      setDurationTab1(audioTab1.durationMs);
    }

    setCuesTab1(updated);
    setActiveCueTab1(newCues[0]);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const activeAudio = currentTab === 'tab1' ? audioTab1 : audioTab2;

      if (e.code === 'Space') {
        e.preventDefault();
        activeAudio.togglePlay();
      } else if (e.code === 'KeyW' && currentTab === 'tab1') {
        e.preventDefault();
        document.getElementById('btn-play-word')?.click();
      } else if (e.code === 'KeyS' && currentTab === 'tab1') {
        e.preventDefault();
        document.getElementById('btn-play-line')?.click();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        activeAudio.isLooping = !activeAudio.isLooping;
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -100 : -500;
        activeAudio.seek(activeAudio.getCurrentPosition() + delta);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 100 : 500;
        activeAudio.seek(activeAudio.getCurrentPosition() + delta);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, audioTab1, audioTab2]);

  // Tab switching: pause the other tab so no concurrent audio bleed
  const handleTabSwitch = (tab: TabType) => {
    if (tab === 'tab1' && audioTab2.isPlaying) {
      audioTab2.stop();
    } else if (tab === 'tab2' && audioTab1.isPlaying) {
      audioTab1.stop();
    }
    setCurrentTab(tab);
  };

  const currentTrackName = currentTab === 'tab1' ? trackNameTab1 : trackNameTab2;
  const currentDuration = currentTab === 'tab1' ? durationTab1 : durationTab2;

  return (
    <div id="app-root">
      {/* Header */}
      <Header
        currentTab={currentTab}
        trackName={currentTrackName}
        durationMs={currentDuration}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onSelectFile={() => {
          if (currentTab === 'tab1') {
            inputTab1Ref.current?.click();
          } else {
            inputTab2Ref.current?.click();
          }
        }}
        onLoadPreset={handleLoadPreset}
      />

      {/* Tab Switcher Drawer */}
      <TabDrawer
        isOpen={isDrawerOpen}
        currentTab={currentTab}
        onSelectTab={handleTabSwitch}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Main Tab Content */}
      <main className="tab-content-area" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {currentTab === 'tab1' ? (
          <Tab1Speech
            audio={audioTab1}
            spectrogram={spectrogramTab1}
            cues={cuesTab1}
            activeCue={activeCueTab1}
            onSelectCue={setActiveCueTab1}
            onUpdateCues={setCuesTab1}
            onOpenAddCues={() => setIsAddCuesOpen(true)}
            onOpenFreqLegend={() => setIsFreqLegendOpen(true)}
            viewMode={viewModeTab1}
            onChangeViewMode={setViewModeTab1}
          />
        ) : (
          <Tab2Chords
            audio={audioTab2}
            data={chordDataTab2}
            onSelectFile={() => inputTab2Ref.current?.click()}
            onFileDrop={handleLoadTab2File}
          />
        )}
      </main>

      {/* Hidden File Inputs */}
      <input
        ref={inputTab1Ref}
        type="file"
        accept="audio/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleLoadTab1File(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={inputTab2Ref}
        type="file"
        accept="audio/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleLoadTab2File(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Modals */}
      <AddCuesModal
        isOpen={isAddCuesOpen}
        onClose={() => setIsAddCuesOpen(false)}
        onConfirm={handleConfirmAddCues}
      />

      <FreqLegendModal
        isOpen={isFreqLegendOpen}
        onClose={() => setIsFreqLegendOpen(false)}
      />

      <LoadingOverlay
        isOpen={loadingOpen}
        message={loadingMsg}
        progress={loadingProgress}
      />
    </div>
  );
};
