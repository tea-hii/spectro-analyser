# Strict Development Rules for Spectrogram Analyzer

1. **Full File Integrity & Complete Code Blocks:**
   - Khi chỉnh sửa bất kỳ logic nào trong `index.html`, `app.js`, hoặc `style.css`, KHÔNG được chắp vá cẩu thả từng dòng làm mất biến phụ thuộc (như kích thước Canvas, tên hàm, ID phần tử).
   - Luôn đọc và nắm trọn vẹn context liên quan, đảm bảo mọi biến toán học (tọa độ Canvas, kích thước ruler, minimap, audio duration) đều được định nghĩa rõ ràng, không bao giờ để xảy ra `NaN` hay `undefined`.

2. **DOM Safety & Null Checks:**
   - Mọi thao tác truy vấn phần tử giao diện (`document.getElementById`, `querySelector`) bắt buộc phải bọc trong kiểm tra an toàn hoặc gán giá trị mặc định: `if (!element) return;`.
   - Toàn bộ logic khởi tạo DOM và canvas bắt buộc phải chạy sau khi cấu trúc HTML đã sẵn sàng (`DOMContentLoaded` hoặc `window.addEventListener('load', ...)`).

3. **Single Source of Truth (Root Directory):**
   - Mã nguồn ứng dụng chạy trực tiếp từ thư mục gốc (`c:\Setup\Spectrogram_Analyzer`): gồm `index.html`, `app.js`, `style.css`, `chord-worker.js` và thư mục `assets/`.
   - Không phân mảnh hay tạo thư mục script rời rạc (`webapp/`) gây lệch phiên bản mã nguồn với server `http://localhost:8080`.

4. **Web Audio Lifecycle & Autoplay Policy:**
   - Không tự động kích hoạt `AudioContext` phát tiếng khi tải trang (tránh lỗi Autoplay/Suspended của trình duyệt).
   - Chỉ `resume()` hoặc kích hoạt âm thanh khi người dùng chủ động click (Play, Scrub, hoặc nạp file).
   - Luôn có cơ chế Fallback tổng hợp tín hiệu âm thanh mẫu nếu ứng dụng được mở trực tiếp dưới giao thức `file:///`.
