# SpectroSub & Musical Chord Analyzer (Web PWA)

Ứng dụng web Progressive Web App (PWA) Client-Side tĩnh 100% (Zero Backend), chuyển đổi hoàn chỉnh từ ứng dụng Android gốc phân tích phổ âm thanh (Spectrogram) và mở rộng thêm công cụ phân tích hợp âm trực quan (Musical Chord Analyzer).

---

## 🚀 Đặc Điểm Kiến Trúc Nổi Bật

1. **100% Client-Side SPA (Không Cần Backend)**:
   - Toàn bộ thuật toán DSP, giải mã âm thanh, tính toán FFT, CQT và vẽ đồ thị đều chạy trực tiếp trong trình duyệt bằng Web Audio API, Web Workers và HTML5 Canvas.
   - Không có bất kỳ dữ liệu âm thanh nào bị tải lên máy chủ (Bảo mật tối đa, an toàn tuyệt đối cho người dùng).
   - Có thể tải lên GitHub Pages, Cloudflare Pages, Vercel, Netlify hoặc mở trực tiếp trên máy tính.

2. **Kiến Trúc 2 Tab Độc Lập Hoàn Toàn (Zero Data Leakage)**:
   - Nút Menu 3 gạch (Hamburger) ở góc trên bên trái mở thanh trượt (Drawer) chuyển đổi giữa 2 tab:
     - **Tab 1: Speech & Audio Spectrogram** (Phân tích ngữ âm & hình thái âm thanh giọng nói tiếng Pháp).
     - **Tab 2: Musical Chord Analyzer** (Phân tích nốt nhạc, cao độ và hợp âm trực quan từ stem nhạc cụ).
   - **Cách ly bộ nhớ tuyệt đối**: Mỗi tab sở hữu bộ nạp file (`<input type="file">`) riêng và instance `AudioContext` riêng trong RAM. Chuyển tab không bao giờ rò rỉ dữ liệu hay tự động nạp file từ tab khác.

3. **Chuẩn Thuật Toán DSP Kế Thừa Chính Xác Từ Bản Android**:
   - Tự động downsample về mono 16.000 Hz để xử lý tốc độ cao.
   - Bộ lọc tiền nhấn mạnh (Pre-emphasis filter): $y[n] = x[n] - 0.92 \cdot x[n-1]$.
   - Cửa sổ Hann (Hann window) căn giữa tâm: $f \times \text{hopSize}$.
   - FFT size 512, Hop size 256 (16ms/khung), 128 dải tần số (62.5 Hz/bin, Nyquist 8.000 Hz).
   - Thang đo dB: $20 \log_{10}(\text{amplitude} + 10^{-6})$, lượng tử hóa bước 0.5 dB ($((db + 90) \times 2)$) giới hạn trong $[0 \dots 255]$.
   - Chuẩn hóa dải động 65 dB (130 bước).
   - Canvas ảo hóa (virtualization/tiling) 60fps mượt mà, hỗ trợ zoom/cuộn thời gian và tần số, thước đo Hz/giây, và 5 bảng màu chuẩn: *Aegisub Classic, Inferno, Viridis, Neon Cyber, Phonetic Paper*.

4. **Tab 2 - Phân Tích Hợp Âm & Nốt Nhạc (Musical Chord Analyzer)**:
   - Chạy phép tính phân tích CQT (Constant-Q Transform) và 12-Tone Chromagram ngầm trong **Web Worker** (`worker.js`), không làm đơ giao diện (No UI Freeze).
   - Tập trung dải tần số âm nhạc hữu dụng dưới 3.000 Hz.
   - Tự động triệt tiêu bồi âm (harmonic overtone suppression) để làm nổi bật nốt gốc (fundamental pitch).
   - Bố cục 2 tầng đồ thị đồng bộ (Stacked Layout):
     - **Tầng trên (Dynamic CQT Spectrogram)**: Tự động phát hiện dải nốt vang lên (Auto-crop pitch range) hoặc chọn nhanh preset (D2-E5, Bass, Piano 88 phím), kèm nhãn phím đàn piano roll.
     - **Tầng dưới (12-Tone Chromagram)**: Triệt tiêu quãng tám (octave invariance), hiển thị 12 nốt C, C#, D, D#, E, F, F#, G, G#, A, A#, B sáng rực rỡ khi hợp âm vang lên.
     - Huy hiệu nhận diện hợp âm tự động hiển thị trực tiếp theo thời gian phát thực.

5. **Tối Giản Hóa Giao Diện (Clean UI) & PWA**:
   - Đã loại bỏ hoàn toàn tính năng load file script/văn bản.
   - Nút Save / Export hiển thị ở trạng thái làm mờ (Disabled / Inactive state).
   - Đầy đủ `manifest.json` (`display: standalone`) và `service-worker.js` hỗ trợ offline, cho phép người dùng bấm **"Add to Home Screen"** trên điện thoại / tablet hoặc máy tính như ứng dụng Native.

---

## 📁 Cấu Trúc Thư Mục

```text
C:\Setup\Spectrogram_Analyzer\webapp\
├── index.html            # Giao diện chính (Dual Tab SPA, Header, Drawer, Viewports, Modals)
├── style.css             # Giao diện Dark theme, responsive, styling Canvas, Piano Roll, Drawer
├── app.js                # Toàn bộ logic ứng dụng, AudioEngine độc lập, FFT, Canvas Virtualization, Playback
├── worker.js             # Web Worker xử lý CQT, Chromagram, Triệt tiêu bồi âm, Nhận diện hợp âm
├── manifest.json         # Cấu hình PWA Standalone cho Desktop & Mobile
├── service-worker.js     # Bộ đệm Cache-First cho phép chạy Offline hoàn toàn
├── icon.svg              # Logo ứng dụng vector
├── icon-192.png          # Biểu tượng PWA kích thước 192x192
├── icon-512.png          # Biểu tượng PWA kích thước 512x512
├── assets/               # File âm thanh mẫu kiểm thử (French pronunciation & conversations)
│   ├── french_conversation.mp3
│   ├── french_conversation.wav
│   ├── french_liaisons.mp3
│   └── french_liaisons.wav
└── README.md             # Hướng dẫn chi tiết
```

---

## 💻 Cách Khởi Chạy & Sử Dụng

### Cách 1: Khởi chạy cục bộ (Local Server)
Do tính năng Web Worker và Service Worker yêu cầu giao thức HTTP/HTTPS (bảo mật bảo vệ sandbox trình duyệt), bạn nên mở thư mục bằng một HTTP server nội bộ:

- **Dùng Python**:
  ```powershell
  cd C:\Setup\Spectrogram_Analyzer\webapp
  python -m http.server 8080
  ```
  Sau đó mở trình duyệt truy cập: `http://localhost:8080`

- **Dùng Node.js / npx**:
  ```powershell
  cd C:\Setup\Spectrogram_Analyzer\webapp
  npx serve
  ```

- **Dùng VS Code**: Cài extension **Live Server** -> Bấm chuột phải vào `index.html` -> Chọn **Open with Live Server**.

### Cách 2: Triển khai lên GitHub Pages (Miễn phí)
1. Đẩy toàn bộ thư mục `webapp` lên một repository mới trên GitHub (hoặc nhánh `gh-pages`).
2. Vào phần thiết lập **Settings** -> **Pages** trên repository.
3. Chọn nhánh deploy là `main` (hoặc `gh-pages`), thư mục gốc `/ (root)`.
4. Bấm **Save**. Trang web của bạn sẽ hoạt động toàn cầu với HTTPS hoàn toàn miễn phí.

---

## ⌨️ Phím Tắt Tiện Dụng
- `Space`: Phát / Tạm dừng âm thanh (Play / Pause).
- `Ctrl + O` / `Cmd + O`: Mở nhanh hộp thoại nạp file âm thanh cho tab đang chọn.
- `+` / `-`: Phóng to / Thu nhỏ trục thời gian (Zoom In / Out).
- `Esc`: Đóng Menu Drawer hoặc các cửa sổ Modal thông tin.
