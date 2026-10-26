# SpectroSub & Musical Chord Analyzer (React + TypeScript + Vite)

Ứng dụng web Progressive Web App (PWA) Client-Side 100% xây dựng trên **React 19**, **TypeScript** và **Vite**, phân tích phổ âm thanh (Speech Spectrogram STFT) và phân tích hợp âm trực quan (Musical Chord Analyzer CQT & Chromagram).

---

## 🚀 Đặc Điểm Kiến Trúc Nổi Bật

1. **100% Client-Side React SPA**:
   - Toàn bộ thuật toán DSP, giải mã âm thanh, tính toán FFT, CQT và vẽ đồ thị đều chạy trực tiếp trong trình duyệt bằng Web Audio API, Web Workers và HTML5 Canvas.
   - Không có bất kỳ dữ liệu âm thanh nào bị tải lên máy chủ (Bảo mật tối đa, an toàn tuyệt đối cho người dùng).

2. **Kiến Trúc 2 Tab Độc Lập Hoàn Toàn (Zero Data Leakage)**:
   - Nút Menu 3 gạch (Hamburger) ở góc trên bên trái mở thanh trượt (Drawer) chuyển đổi giữa 2 tab:
     - **Tab 1: Speech & Audio Spectrogram** (Phân tích ngữ âm & hình thái âm thanh giọng nói tiếng Pháp, STFT 16kHz, căn chỉnh từ/câu).
     - **Tab 2: Musical Chord Analyzer** (Phân tích nốt nhạc, cao độ và hợp âm trực quan từ stem nhạc cụ).
   - **Cách ly bộ nhớ tuyệt đối**: Mỗi tab sở hữu bộ nạp file riêng và instance `AudioContext` riêng trong RAM. Chuyển tab không làm rò rỉ dữ liệu hay xung đột âm thanh.

3. **Chuẩn Thuật Toán DSP**:
   - Tự động downsample về mono 16.000 Hz để xử lý tốc độ cao.
   - Bộ lọc tiền nhấn mạnh (Pre-emphasis filter): $y[n] = x[n] - 0.92 \cdot x[n-1]$.
   - Cửa sổ Hann (Hann window) căn giữa tâm: $f \times \text{hopSize}$.
   - FFT size 512, Hop size 256 (16ms/khung), 128 dải tần số (62.5 Hz/bin, Nyquist 8.000 Hz).
   - Thang đo dB: $20 \log_{10}(\text{amplitude} + 10^{-6})$, lượng tử hóa bước 0.5 dB ($((db + 90) \times 2)$) giới hạn trong $[0 \dots 255]$.
   - Chuẩn hóa dải động 65 dB (130 bước).
   - Canvas 60fps mượt mà, hỗ trợ zoom/cuộn thời gian và tần số, thước đo Hz/giây, và 5 bảng màu chuẩn: *Aegisub Classic, Inferno, Viridis, Neon Cyber, Phonetic Paper*.

4. **Tab 2 - Phân Tích Hợp Âm & Nốt Nhạc (Musical Chord Analyzer)**:
   - Chạy phép tính phân tích CQT (Constant-Q Transform) và 12-Tone Chromagram ngầm trong **Web Worker** (`/chord-worker.js`), không làm đơ giao diện (No UI Freeze).
   - Tập trung dải tần số âm nhạc hữu dụng dưới 3.000 Hz.
   - Tự động triệt tiêu bồi âm (harmonic overtone suppression) để làm nổi bật nốt gốc (fundamental pitch).
   - Bố cục 2 tầng đồ thị đồng bộ (Stacked Layout):
     - **Tầng trên (Dynamic CQT Spectrogram)**: Tự động phát hiện dải nốt vang lên (Auto-crop pitch range) hoặc chọn nhanh preset (D2-E5, Bass, Piano 88 phím), kèm nhãn phím đàn piano roll.
     - **Tầng dưới (12-Tone Chromagram)**: Triệt tiêu quãng tám (octave invariance), hiển thị 12 nốt C, C#, D, D#, E, F, F#, G, G#, A, A#, B sáng rực rỡ khi hợp âm vang lên.
     - Huy hiệu nhận diện hợp âm tự động hiển thị trực tiếp theo thời gian phát thực.

5. **Giao diện Aegisub Dark Theme & Phím Tắt**:
   - `Space`: Phát / Tạm dừng âm thanh (Play / Pause).
   - `S`: Phát câu đang chọn (Tab 1).
   - `W`: Phát từ tại vị trí con trỏ (Tab 1).
   - `L`: Bật / Tắt Lặp đoạn (Loop).
   - `[` / `]`: Gán mốc Bắt đầu / Kết thúc câu phụ đề tại con trỏ.
   - `Mũi tên Trái / Phải`: Tua lùi / tiến 100ms (hoặc 500ms khi giữ Shift).
   - `+` / `-`: Phóng to / Thu nhỏ trục thời gian.

---

## 📁 Cấu Trúc Thư Mục

```text
/
├── index.html                    # Entry HTML & App Mount
├── package.json                  # React 19, TypeScript, Vite scripts
├── tsconfig.json                 # Cấu hình TypeScript
├── vite.config.ts                # Cấu hình Vite dev & build
├── metadata.json                 # Metadata ứng dụng AI Studio
├── style.css                     # Giao diện Dark theme, responsive Canvas, Aegisub layout
├── public/
│   ├── chord-worker.js           # Web Worker xử lý CQT & Chromagram
│   ├── icon.svg                  # Vector App Logo
│   ├── icon-192.png              # Icon 192x192
│   ├── icon-512.png              # Icon 512x512
│   ├── manifest.json             # PWA Manifest
│   └── assets/                   # Audio sample files (French phonetics)
└── src/
    ├── main.tsx                  # React DOM Root
    ├── App.tsx                   # Container quản lý 2 tabs và Audio Engines
    ├── types.ts                  # Interfaces, SubtitleCue, TimeFormatter
    ├── audio/
    │   ├── AudioEngine.ts        # Web Audio API isolated per tab, 16kHz resampling, envelope
    │   ├── FFTEngine.ts          # 512-pt Cooley-Tukey STFT Spectrogram
    │   └── ColorLUT.ts           # Aegisub Blue, Inferno, Viridis, Cyberpunk LUTs
    └── components/
        ├── Header.tsx            # Header bar, track meta, presets & upload dropdown
        ├── TabDrawer.tsx         # Sidebar menu chuyển đổi 2 Tabs
        ├── Tab1Speech/
        │   └── Tab1Speech.tsx    # Dual Spectrogram & Waveform Canvas, Aegisub toolbar, cues list
        ├── Tab2Chords/
        │   └── Tab2Chords.tsx    # Stacked CQT & Chromagram Canvas, Chord detector, dropzone
        └── Modals/
            ├── AddCuesModal.tsx  # Hộp thoại thêm hàng loạt câu phụ đề
            ├── FreqLegendModal.tsx # Chú giải dải tần số ngữ âm (Formants F0-F3, Liaisons)
            └── LoadingOverlay.tsx # Thanh tiến trình tải và phân tích DSP
```

## 💻 Khởi Chạy
- Dev server: `npm run dev` (Port 3000)
- Build: `npm run build`
- Typecheck: `npm run lint`
