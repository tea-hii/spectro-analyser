/**
 * Web SpectroSub - Dual-Tab Client-Side SPA & PWA
 * Tab 1: Speech & Audio Spectrogram (16kHz Mono STFT 60fps)
 * Tab 2: Musical Chord Analyzer (Web Worker CQT & 12-Tone Chromagram)
 * 100% Client-Side, Zero-leakage between tabs, AudioContext per tab.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteLabel(m) {
  const name = NOTE_NAMES[m % 12];
  const oct = Math.floor(m / 12) - 1;
  return `${name}${oct}`;
}

// -------------------------------------------------------------
// Internationalization (i18n): Tiếng Việt (VI) & English (EN)
// -------------------------------------------------------------
const I18N_LOCALES = {
  VI: {
    lang_btn: 'VI',
    lang_btn_title: 'Đổi sang Tiếng Anh (Switch to English)',
    tab1_title: 'Tab 1: Speech Spectrogram',
    tab1_subtitle: 'Phân tích ngữ âm & phụ đề',
    tab2_title: 'Tab 2: Chord Analyser',
    tab2_subtitle: 'Phân tích hợp âm',
    play_title: 'Phát / Dừng (Phím Space)',
    play_line_title: 'Phát câu đang chọn (Phím S)',
    play_word_title: 'Phát từ tại con trỏ (Phím W) - Chỉ phát từ mà thanh vàng đang ở đó',
    loop_title: 'Bật/Tắt Lặp đoạn (Phím L)',
    loop_tab2_title: 'Bật/Tắt Lặp đoạn',
    undo_title: 'Hoàn tác - Undo (Ctrl+Z, tối đa 5 bước)',
    redo_title: 'Làm lại - Forward / Redo (Ctrl+Y, tối đa 5 bước)',
    file_menu_title: 'File (Up File & Save Script)',
    file_upload_heading: '📁 Up File',
    file_save_heading: '💾 Save Script',
    upload_audio: 'Tải file Audio (mp3, wav...)',
    upload_sub: 'Tải phụ đề / kịch bản (.ass, .srt, .json)',
    load_sample_tab1: 'Ví dụ 1 (Mẫu Pháp)',
    save_script: 'Lưu / Xuất Kịch Bản (.ass, .srt)',
    speed_title: 'Tốc độ phát',
    view_mode_prefix: 'Chế độ hiển thị: ',
    view_mode_suffix: ' (Bấm để đổi: Spectro → Waveform → Dual)',
    latency_label: 'Bù trễ:',
    latency_title_tab1: 'Bù trễ âm thanh thủ công (ms): Nhập số dương (+) để vạch vàng lùi lại khớp với âm thanh phát ra loa; nhập số âm (-) để vạch vàng tiến nhanh hơn. Luôn đảm bảo vạch vàng chạy tới cuối từ hoặc câu.',
    latency_title_tab2: 'Bù trễ âm thanh thủ công Tab 2 (ms): Nhập số dương (+) để vạch vàng lùi lại khớp với âm thanh phát ra loa; nhập số âm (-) để vạch vàng tiến nhanh hơn.',
    freq_legend_btn_title: 'Xem chú giải dải tần số ngữ âm (Formants & Liaisons)',
    cues_count_prefix: 'Danh sách câu (',
    select_all_title: 'Chọn tất cả câu',
    delete_selected_title: 'Xóa các câu đã chọn',
    delete_single_title: 'Xóa câu đang chọn',
    delete_multiple_title: (n) => `Xóa ${n} câu đã chọn`,
    move_up_title: 'Di chuyển các câu đã chọn lên trên',
    move_down_title: 'Di chuyển các câu đã chọn xuống dưới',
    master_clock_title: 'Đồng bộ chế độ đồng hồ tất cả các câu (Click để đổi chế độ)',
    master_clock_sync_prefix: 'Đồng bộ chế độ tất cả câu: ',
    move_group_title: 'Di chuyển câu đã chọn lên / xuống',
    btn_add_cue: 'Thêm',
    empty_cues_title: 'Danh sách câu đang trống',
    empty_cues_desc: 'Bấm <strong>"+ Thêm câu"</strong> ở góc phải hoặc nạp file phụ đề (.ass, .srt, .json) để bắt đầu.',
    cue_start_title: 'Thời gian Bắt đầu (phút:giây.tíc tắc). Bấm vào để sửa chính xác',
    cue_end_title: 'Thời gian Kết thúc (phút:giây.tíc tắc). Bấm vào để sửa chính xác',
    cue_locked_tip: 'Bấm vào biểu tượng đồng hồ để đổi chế độ và sửa',
    clock_off: 'Chế độ [TẮT / KHÔNG CHỈNH SỬA - Xám]: Ẩn vạch start/stop & không hiện transcript (Click để đổi chế độ)',
    clock_show_locked: 'Chế độ [HIỆN & KHÓA - Xanh Dương]: Hiện text dưới thanh thời gian & ẩn vạch start/stop (Click để đổi chế độ)',
    clock_editing_time: 'Chế độ [SỬA THỜI GIAN - Vàng]: Ám vàng nhạt vùng phổ/sóng & hiện vạch xanh [start] - đỏ [stop] để kéo chỉnh mốc (Click để đổi chế độ)',
    clock_editing_words: 'Chế độ [SỬA TỪNG TỪ - Tím]: Ám tím nhạt & kéo các vạch tím đậm để chỉnh vị trí từng từ (Click để đổi chế độ)',
    bpm_title: 'Cài đặt BPM & Lưới nhịp phách (Bar / Measure): Chia vạch nhịp trực quan trên phổ âm CQT và Chromagram',
    grid_1_bar: '1 Bar',
    grid_half_bar: '1/2 Bar',
    grid_quarter_bar: '1/4 Bar',
    grid_off: 'Tắt lưới',
    load_btn: 'Load',
    load_btn_title: 'Load bài nhạc (File cục bộ hoặc Ví dụ 1)',
    load_sample_tab2: 'Ví dụ 1 (Piano mẫu)',
    load_local_tab2: 'Chọn file từ máy (Local)...',
    tab2_rewind_title: 'Về điểm đầu (Đưa thanh màu vàng về 0:00)',
    tab2_midi_btn_title: 'Tạo & Hiện/Ẩn dải Piano Roll MIDI giữa 2 gram (AMT)',
    tab2_midi_export_title: 'Tải file .mid về máy (Standard MIDI File)',
    tab2_midi_badge: 'MIDI Piano Roll (AMT)',
    tab2_midi_no_audio: 'Vui lòng chọn hoặc nạp bài nhạc trước khi tạo MIDI!',
    tab2_play_title: 'Phát / Dừng Tab 2 (Phím Space)',
    tab2_empty_desc: 'Bộ phân tích hợp âm trực quan qua <strong>Constant-Q Transform</strong> &amp; <strong>Chromagram 12 nốt</strong> triệt tiêu bồi âm. Giúp bạn nhìn rõ nốt cấu thành hợp âm để vẽ lại MIDI trong DAW.',
    tab2_choose_file_btn: 'Chọn File Audio / Video Nhạc Cụ',
    modal_add_title: 'Thêm câu hoặc đoạn văn bản',
    insert_pos_label: 'Vị trí chèn câu:',
    pos_after: 'Sau câu đang chọn',
    pos_before: 'Trước câu đang chọn',
    pos_start: 'Đầu danh sách',
    pos_end: 'Cuối danh sách',
    content_lines_label: 'Nội dung (mỗi dòng hoặc ngắt bởi dấu chấm sẽ tạo một câu riêng):',
    content_placeholder: 'Dán văn bản hoặc các câu tiếng Pháp vào đây (tách theo dòng hoặc dấu chấm)...',
    btn_cancel: 'Hủy',
    btn_confirm_add: 'Xác nhận Thêm',
    modal_freq_title: 'Chú Giải Dải Tần Số Ngữ Âm (Speech Spectrogram)',
    modal_freq_f0: 'Tần số cơ bản của thanh quản, phản ánh cao độ giọng nói (nam ~100-150Hz, nữ ~200-250Hz).',
    modal_freq_f1: 'Độ mở của miệng / nguyên âm (Vowel Height). F1 cao với nguyên âm mở [a], thấp với nguyên âm khép [i], [u].',
    modal_freq_f2: 'Độ tiến/lùi của lưỡi (Vowel Frontness). F2 rất cao ở các nguyên âm trước [i], [e], [y].',
    modal_freq_f3: 'Âm sắc cá nhân, âm mũi (voyelles nasales [õ], [ã], [ɛ̃]) và âm tắc bật hơi [p, t, k].',
    modal_freq_liaisons: 'Vùng năng lượng ma sát của phụ âm xát và hiện tượng nối âm Liaison ([z], [t]).',
    btn_understood: 'Đã hiểu',
    cues_guide_btn_title: 'Hướng dẫn sử dụng & Mẹo thao tác',
    modal_guide_title: 'Hướng Dẫn Sử Dụng & Mẹo Thao Tác',
    guide_tip_longpress_title: 'Ấn & Giữ nút bấm (Gợi ý):',
    guide_tip_longpress_desc: 'Trên điện thoại, chạm và giữ (~0.4s) vào bất kỳ nút bấm nào để xem giải thích công dụng mà không bị ấn nhầm. Trên máy tính, chỉ cần rê chuột qua nút.',
    guide_tip_clock_title: 'Nút Đồng hồ (3 Chế độ):',
    guide_tip_clock_desc: 'Bấm nút đồng hồ cạnh tiêu đề câu để chuyển đổi đồng loạt: Xem câu (Khóa mốc) ➔ Sửa thời gian câu (Start/End) ➔ Sửa mốc từ (vạch tím).',
    guide_tip_folder_title: 'Nạp bài & Phụ đề (Menu Thư mục):',
    guide_tip_folder_desc: 'Bấm biểu tượng Thư mục ở góc trên để load bài mẫu, mở file audio/video từ máy, hoặc nạp file phụ đề có sẵn (.ass, .srt, .json).',
    guide_tip_save_title: 'Lưu / Xuất Kịch bản (Nút Lưu):',
    guide_tip_save_desc: 'Xuất kịch bản phụ đề ra định dạng .ass (kèm căn chỉnh từng từ karaoke {\\k}), .srt (chuẩn phổ biến), .json (dự án) hoặc .txt.',
    guide_tip_playback_title: 'Phát âm thanh linh hoạt:',
    guide_tip_playback_desc: 'Có 3 chế độ phát: Phát toàn bộ audio (Play), phát riêng câu đang chọn (Play Line), hoặc phát đúng từ tại con trỏ vàng (Play Word).',
    guide_tip_loop_title: 'Luyện nghe & Lặp đoạn (A-B Repeat):',
    guide_tip_loop_desc: 'Bạn có thể tận dụng chia câu/từ rồi bật chế độ Lặp (Loop) để nghe đi nghe lại một phân đoạn âm thanh cần luyện nghe/nói, ngay cả khi không có nhu cầu làm phụ đề.',
    modal_export_title: 'Lưu / Xuất Kịch Bản Phụ Đề',
    choose_format_label: 'Chọn định dạng xuất:',
    export_desc_ass: 'Bao gồm mốc thời gian căn chỉnh từng từ (karaoke {\\k}) nếu có cài đặt vạch tím.',
    export_desc_srt: 'Định dạng phụ đề phổ biến nhất, tương thích mọi trình phát video/âm thanh.',
    export_desc_json: 'Giữ nguyên 100% vạch tím từng từ, trạng thái khóa/sửa, startMs và endMs chính xác.',
    export_desc_txt: 'Xuất các dòng lời thoại đơn giản không kèm mốc thời gian.',
    filename_label: 'Tên file tải về (không cần gõ đuôi):',
    btn_download_file: 'Tải File Về'
  },
  EN: {
    lang_btn: 'EN',
    lang_btn_title: 'Switch to Vietnamese (Đổi sang Tiếng Việt)',
    tab1_title: 'Tab 1: Speech Spectrogram',
    tab1_subtitle: 'Phonetic & Subtitle Analysis',
    tab2_title: 'Tab 2: Chord Analyser',
    tab2_subtitle: 'Chord Recognition',
    play_title: 'Play / Pause (Space)',
    play_line_title: 'Play Selected Line (Key S)',
    play_word_title: 'Play Word at Cursor (Key W)',
    loop_title: 'Toggle Loop (Key L)',
    loop_tab2_title: 'Toggle Loop',
    undo_title: 'Undo (Ctrl+Z, max 5 steps)',
    redo_title: 'Redo (Ctrl+Y, max 5 steps)',
    file_menu_title: 'File (Upload & Export Script)',
    file_upload_heading: '📁 Upload File',
    file_save_heading: '💾 Save Script',
    upload_audio: 'Upload Audio file (mp3, wav...)',
    upload_sub: 'Upload Subtitle / Script (.ass, .srt, .json)',
    load_sample_tab1: 'Example 1 (French Sample)',
    save_script: 'Export / Save Script (.ass, .srt)',
    speed_title: 'Playback Speed',
    view_mode_prefix: 'Display Mode: ',
    view_mode_suffix: ' (Click to toggle: Spectro → Waveform → Dual)',
    latency_label: 'Latency:',
    latency_title_tab1: 'Manual Audio Latency Compensation (ms): Enter positive (+) to delay the yellow playhead to match speaker output; negative (-) to advance.',
    latency_title_tab2: 'Manual Audio Latency Compensation Tab 2 (ms): Enter positive (+) to delay playhead; negative (-) to advance.',
    freq_legend_btn_title: 'View Phonetic Frequency Legend (Formants & Liaisons)',
    cues_count_prefix: 'Subtitle Lines (',
    select_all_title: 'Select All Lines',
    delete_selected_title: 'Delete Selected Lines',
    delete_single_title: 'Delete Selected Line',
    delete_multiple_title: (n) => `Delete ${n} selected lines`,
    move_up_title: 'Move Selected Lines Up',
    move_down_title: 'Move Selected Lines Down',
    master_clock_title: 'Synchronize clock mode for all lines (Click to toggle)',
    master_clock_sync_prefix: 'Sync mode for all cues: ',
    move_group_title: 'Move selected lines up / down',
    btn_add_cue: 'Add',
    empty_cues_title: 'Line list is empty',
    empty_cues_desc: 'Click <strong>"+ Add"</strong> at the right corner or upload subtitle files (.ass, .srt, .json) to get started.',
    cue_start_title: 'Start Time (mm:ss.ms). Click to edit exact timing',
    cue_end_title: 'End Time (mm:ss.ms). Click to edit exact timing',
    cue_locked_tip: 'Click clock icon to change mode and edit timing',
    clock_off: 'Mode [OFF / LOCKED - Gray]: Hide start/stop boundaries & transcript (Click to change mode)',
    clock_show_locked: 'Mode [VISIBLE & LOCKED - Blue]: Show text below time ruler & hide start/stop boundaries (Click to change mode)',
    clock_editing_time: 'Mode [EDIT LINE TIMING - Yellow]: Highlight waveform/spectrogram & show green [start] - red [stop] boundaries to drag (Click to change mode)',
    clock_editing_words: 'Mode [EDIT WORDS - Purple]: Purple highlight & drag purple word handles to align karaoke timing (Click to change mode)',
    bpm_title: 'BPM & Measure Grid Settings: Visual bar/beat lines across CQT and Chromagram',
    grid_1_bar: '1 Bar',
    grid_half_bar: '1/2 Bar',
    grid_quarter_bar: '1/4 Bar',
    grid_off: 'Grid Off',
    load_btn: 'Load',
    load_btn_title: 'Load audio track (Local file or Example 1)',
    load_sample_tab2: 'Example 1 (Piano Chords)',
    load_local_tab2: 'Select Local Audio File...',
    tab2_rewind_title: 'Return to start (Move yellow playhead to 0:00)',
    tab2_midi_btn_title: 'Generate & Toggle MIDI Piano Roll between spectrograms (AMT)',
    tab2_midi_export_title: 'Download .mid file (Standard MIDI File)',
    tab2_midi_badge: 'MIDI Piano Roll (AMT)',
    tab2_midi_no_audio: 'Please select or load an audio track before generating MIDI!',
    tab2_play_title: 'Play / Pause Tab 2 (Space)',
    tab2_empty_desc: 'Visual chord analyzer powered by <strong>Constant-Q Transform</strong> &amp; harmonic-suppressed <strong>12-Tone Chromagram</strong>. Inspect constituent notes to reconstruct MIDI in your DAW.',
    tab2_choose_file_btn: 'Choose Audio / Video File',
    modal_add_title: 'Add Lines or Script Text',
    insert_pos_label: 'Insert Position:',
    pos_after: 'After selected line',
    pos_before: 'Before selected line',
    pos_start: 'Start of list',
    pos_end: 'End of list',
    content_lines_label: 'Content (each line or period-separated sentence will create a cue):',
    content_placeholder: 'Paste text or sentences here (separated by lines or periods)...',
    btn_cancel: 'Cancel',
    btn_confirm_add: 'Confirm & Add',
    modal_freq_title: 'Phonetic Frequency Guide (Speech Spectrogram)',
    modal_freq_f0: 'Laryngeal fundamental frequency reflecting vocal pitch (males ~100-150Hz, females ~200-250Hz).',
    modal_freq_f1: 'Vowel height and mouth opening. High F1 for open vowels [a], low for close vowels [i], [u].',
    modal_freq_f2: 'Vowel frontness and tongue advancement. High F2 for front vowels [i], [e], [y].',
    modal_freq_f3: 'Speaker timbre, nasalization (voyelles nasales [õ], [ã], [ɛ̃]) and burst release [p, t, k].',
    modal_freq_liaisons: 'Fricative consonant energy and liaison transitions ([z], [t]).',
    btn_understood: 'Understood',
    cues_guide_btn_title: 'User Guide & Quick Tips',
    modal_guide_title: 'User Guide & Quick Tips',
    guide_tip_longpress_title: 'Long-Press for Tooltips:',
    guide_tip_longpress_desc: 'On mobile devices, touch and hold (~0.4s) any button to view its tooltip without accidentally triggering the action. On desktop, simply hover your mouse.',
    guide_tip_clock_title: 'Master Clock (3 Modes):',
    guide_tip_clock_desc: 'Click the clock icon next to the list to toggle across all cues: View Only (Locked) ➔ Edit Cue Timing (Start/End) ➔ Edit Word Timing (purple markers).',
    guide_tip_folder_title: 'Load Media & Scripts (Folder Menu):',
    guide_tip_folder_desc: 'Click the Folder menu icon at the top to load built-in samples, open local audio/video files, or import existing subtitles (.ass, .srt, .json).',
    guide_tip_save_title: 'Save / Export Script:',
    guide_tip_save_desc: 'Export your subtitle script as .ass (with word-level karaoke {\\k}), .srt (universal format), .json (full project backup), or plain .txt.',
    guide_tip_playback_title: 'Triple Playback Controls:',
    guide_tip_playback_desc: 'Supports 3 playback modes: Play whole audio track, play current selected line (Play Line), or play the individual word at the yellow cursor (Play Word).',
    guide_tip_loop_title: 'A-B Repeat & Listening Practice:',
    guide_tip_loop_desc: 'Easily create sentences or word segments and enable Loop to shadow pronunciation and practice listening on repeat, even if you do not need to make subtitles.',
    modal_export_title: 'Export / Save Subtitle Script',
    choose_format_label: 'Select Export Format:',
    export_desc_ass: 'Includes word-level karaoke timing ({\\k}) when purple word handles are aligned.',
    export_desc_srt: 'Most widely compatible subtitle format for all video and media players.',
    export_desc_json: 'Full SpectroSub state preserving 100% word timings, lock states, startMs and endMs.',
    export_desc_txt: 'Plain text without timestamps.',
    filename_label: 'File Name (without extension):',
    btn_download_file: 'Download File'
  }
};

let CURRENT_LANG = localStorage.getItem('app_language') === 'EN' ? 'EN' : 'VI';

function t(key, ...args) {
  const dict = I18N_LOCALES[CURRENT_LANG] || I18N_LOCALES.VI;
  const val = dict[key] !== undefined ? dict[key] : (I18N_LOCALES.VI[key] || key);
  if (typeof val === 'function') {
    return val(...args);
  }
  return val;
}

// -------------------------------------------------------------
// 1. Color Palettes (Look-Up Tables)
// -------------------------------------------------------------
const ColorPalettes = {
  INFERNO: 'Inferno Heatmap',
  MAGMA: 'Magma Heatmap',
  TURBO: 'Turbo Spectrum',
  AEGISUB_BLUE: 'Aegisub Classic',
  VIRIDIS: 'Viridis Bio',
  CYBERPUNK: 'Neon Cyber',
  PHONETIC_GRAY: 'Phonetic Paper'
};

const ColorLUT = {};

function initColorLUTs() {
  for (const key of Object.keys(ColorPalettes)) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      let r = 0, g = 0, b = 0;

      if (key === 'AEGISUB_BLUE') {
        if (t < 0.25) {
          const k = t / 0.25;
          r = 0.02 * (1 - k) + 0.05 * k;
          g = 0.04 * (1 - k) + 0.15 * k;
          b = 0.15 * (1 - k) + 0.45 * k;
        } else if (t < 0.6) {
          const k = (t - 0.25) / 0.35;
          r = 0.05 * (1 - k);
          g = 0.15 * (1 - k) + 0.75 * k;
          b = 0.45 * (1 - k) + 0.95 * k;
        } else if (t < 0.85) {
          const k = (t - 0.6) / 0.25;
          r = 0.6 * k;
          g = 0.75 * (1 - k) + 0.95 * k;
          b = 0.95 * (1 - k) + 1.0 * k;
        } else {
          const k = (t - 0.85) / 0.15;
          r = 0.6 * (1 - k) + 1.0 * k;
          g = 0.95 * (1 - k) + 1.0 * k;
          b = 1.0;
        }
      } else if (key === 'INFERNO') {
        if (t < 0.3) {
          const k = t / 0.3;
          r = 0.05 + 0.4 * k; g = 0.02; b = 0.1 + 0.4 * k;
        } else if (t < 0.65) {
          const k = (t - 0.3) / 0.35;
          r = 0.45 + 0.5 * k; g = 0.02 + 0.45 * k; b = 0.5 * (1 - k) + 0.05 * k;
        } else if (t < 0.88) {
          const k = (t - 0.65) / 0.23;
          r = 0.95 + 0.05 * k; g = 0.47 * (1 - k) + 0.48 * k; b = 0.05 + 0.2 * k;
        } else {
          const k = (t - 0.88) / 0.12;
          r = 1.0; g = 0.95 + 0.05 * k; b = 0.25 + 0.75 * k;
        }
      } else if (key === 'MAGMA') {
        if (t < 0.33) {
          const k = t / 0.33;
          r = 0.02 + 0.38 * k; g = 0.01 + 0.08 * k; b = 0.08 + 0.45 * k;
        } else if (t < 0.66) {
          const k = (t - 0.33) / 0.33;
          r = 0.4 + 0.5 * k; g = 0.09 + 0.25 * k; b = 0.53 * (1 - k) + 0.35 * k;
        } else {
          const k = (t - 0.66) / 0.34;
          r = 0.9 + 0.1 * k; g = 0.34 + 0.64 * k; b = 0.35 * (1 - k) + 0.65 * k;
        }
      } else if (key === 'TURBO') {
        // High-contrast Turbo rainbow spectrum
        r = Math.max(0, Math.min(1, 0.1357 + t * (4.5974 - t * (42.681 - t * (152.58 - t * (221.8 - t * 111.4))))));
        g = Math.max(0, Math.min(1, 0.0914 + t * (2.1942 + t * (4.8092 - t * (14.019 - t * (4.217 - t * 11.2))))));
        b = Math.max(0, Math.min(1, 0.1067 + t * (12.58 - t * (72.63 - t * (161.7 - t * (155.8 - t * 54.7))))));
      } else if (key === 'VIRIDIS') {
        if (t < 0.33) {
          const k = t / 0.33;
          r = 0.26 * (1 - k) + 0.18 * k; g = 0.45 * k; b = 0.33 * (1 - k) + 0.55 * k;
        } else if (t < 0.66) {
          const k = (t - 0.33) / 0.33;
          r = 0.18 * (1 - k) + 0.12 * k; g = 0.45 * (1 - k) + 0.74 * k; b = 0.55 * (1 - k) + 0.45 * k;
        } else {
          const k = (t - 0.66) / 0.34;
          r = 0.12 * (1 - k) + 0.98 * k; g = 0.74 * (1 - k) + 0.90 * k; b = 0.45 * (1 - k) + 0.15 * k;
        }
      } else if (key === 'CYBERPUNK') {
        if (t < 0.5) {
          const k = t / 0.5;
          r = 0.08 + 0.8 * k; g = 0.05; b = 0.25 + 0.6 * k;
        } else {
          const k = (t - 0.5) / 0.5;
          r = 0.88 * (1 - k); g = 0.05 * (1 - k) + 0.95 * k; b = 0.85 * (1 - k) + 1.0 * k;
        }
      } else { // PHONETIC_GRAY
        const v = Math.max(0.05, Math.min(0.98, 1.0 - t));
        r = v; g = v; b = v;
      }

      const R = Math.floor(r * 255);
      const G = Math.floor(g * 255);
      const B = Math.floor(b * 255);
      table[i] = (255 << 24) | (B << 16) | (G << 8) | R;
    }
    ColorLUT[key] = table;
  }
}
initColorLUTs();

// -------------------------------------------------------------
// 2. Audio Engine (Isolated per Tab for Zero-Leakage)
// -------------------------------------------------------------
class AudioEngine {
  constructor(name = 'Tab') {
    this.name = name;
    this.audioCtx = null;
    this.audioBuffer = null;
    this.samples16k = null;
    this.sampleRate = 16000;
    this.durationMs = 0;
    this.trackName = 'Chưa nạp file';

    this.minPeaks = null;
    this.maxPeaks = null;
    this.peakAmp = 1.0;
    this.peakBucketMs = 5.0;

    this.isPlaying = false;
    this.isLooping = false;
    this.playbackSpeed = 1.0;
    this.currentPositionMs = 0;
    this.activeSourceNode = null;
    this.startContextTime = 0;
    this.startOffsetMs = 0;
    this.playRangeEndMs = null;

    this.loopStartMs = 0;
    this.loopEndMs = 0;

    this.customLatencyMs = 65; // Bù trễ âm thanh thủ công (ms)

    this.onPositionUpdate = () => {};
    this.onPlayStateChange = () => {};
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      try {
        this.audioCtx.resume().catch(() => {});
      } catch (_) {}
    }
    return this.audioCtx;
  }

  computeEnvelope(samples, sampleRate, bucketMs = 5.0) {
    if (!samples || samples.length === 0) {
      return { minPeaks: new Float32Array(0), maxPeaks: new Float32Array(0), peakAmp: 1.0 };
    }
    const samplesPerBucket = Math.max(1, Math.floor((bucketMs * sampleRate) / 1000.0));
    const numBuckets = Math.max(1, Math.ceil(samples.length / samplesPerBucket));
    const minPeaks = new Float32Array(numBuckets);
    const maxPeaks = new Float32Array(numBuckets);
    let peakAmp = 0.001;

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
      const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
      if (absMax > peakAmp) peakAmp = absMax;
    }
    return { minPeaks, maxPeaks, peakAmp };
  }

  resampleToMono16k(sourceMono, srcRate) {
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

  async loadAudioBuffer(arrayBuffer, name, onProgress = () => {}) {
    onProgress(0.1);
    const ctx = this.getAudioContext();
    const copyBuffer = arrayBuffer.slice(0);
    const audioBuffer = await new Promise((resolve, reject) => {
      let settled = false;
      const onSuccess = (buf) => { if (!settled) { settled = true; resolve(buf); } };
      const onError = (err) => { if (!settled) { settled = true; reject(err || new Error('decodeAudioData failed')); } };
      try {
        const res = ctx.decodeAudioData(copyBuffer, onSuccess, onError);
        if (res && typeof res.then === 'function') {
          res.then(onSuccess).catch(onError);
        }
      } catch (e) {
        onError(e);
      }
    });
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
    const durationMs = Math.round(audioBuffer.duration * 1000);
    const { minPeaks, maxPeaks, peakAmp } = this.computeEnvelope(samples16k, 16000, 5.0);

    this.audioBuffer = audioBuffer;
    this.samples16k = samples16k;
    this.sampleRate = srcRate;
    this.durationMs = durationMs;
    this.trackName = name;
    this.minPeaks = minPeaks;
    this.maxPeaks = maxPeaks;
    this.peakAmp = peakAmp || 1.0;
    this.loopStartMs = 0;
    this.loopEndMs = Math.min(durationMs, 3000);
    this.currentPositionMs = 0;

    return { samples16k, durationMs, trackName: name };
  }

  loadSyntheticSpeechBuffer(durationSec = 6.02, name = 'Ví dụ 1') {
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

    const { minPeaks, maxPeaks, peakAmp } = this.computeEnvelope(channelData, sr, 5.0);
    this.audioBuffer = audioBuf;
    this.samples16k = channelData;
    this.sampleRate = sr;
    this.durationMs = Math.round(durationSec * 1000);
    this.trackName = name;
    this.minPeaks = minPeaks;
    this.maxPeaks = maxPeaks;
    this.peakAmp = peakAmp || 1.0;
    this.loopStartMs = 0;
    this.loopEndMs = Math.min(this.durationMs, 2100);
    this.currentPositionMs = 0;
    return { samples16k: channelData, durationMs: this.durationMs, trackName: name };
  }

  loadSyntheticPianoChordsBuffer(name = 'Ví dụ 1: Piano (C - G - Am - F)') {
    const ctx = this.getAudioContext();
    const sr = 16000;
    const durationSec = 8.0;
    const totalSamples = Math.floor(durationSec * sr);
    const audioBuf = ctx.createBuffer(1, totalSamples, sr);
    const channelData = audioBuf.getChannelData(0);

    function addPianoTone(buffer, startSec, durSec, freq, velocity = 0.5) {
      const startIdx = Math.floor(startSec * sr);
      const endIdx = Math.min(buffer.length, Math.floor((startSec + durSec) * sr));
      for (let i = startIdx; i < endIdx; i++) {
        const t = (i - startIdx) / sr;
        const h1 = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 2.5);
        const h2 = 0.5 * Math.sin(2 * Math.PI * 2 * freq * t) * Math.exp(-t / 1.8);
        const h3 = 0.25 * Math.sin(2 * Math.PI * 3 * freq * t) * Math.exp(-t / 1.2);
        const h4 = 0.12 * Math.sin(2 * Math.PI * 4 * freq * t) * Math.exp(-t / 0.8);
        const strike = (Math.random() - 0.5) * 0.05 * Math.exp(-t / 0.03);
        buffer[i] += velocity * (h1 + h2 + h3 + h4 + strike);
      }
    }

    // 1. Hợp âm C Major (0s - 2s): C3, G3, C4, E4, G4
    addPianoTone(channelData, 0.0, 2.0, 130.81, 0.40);
    addPianoTone(channelData, 0.0, 2.0, 196.00, 0.35);
    addPianoTone(channelData, 0.0, 2.0, 261.63, 0.35);
    addPianoTone(channelData, 0.0, 2.0, 329.63, 0.35);
    addPianoTone(channelData, 0.0, 2.0, 392.00, 0.30);

    // 2. Hợp âm G Major (2s - 4s): G2, D3, G3, B3, D4
    addPianoTone(channelData, 2.0, 2.0, 98.00, 0.40);
    addPianoTone(channelData, 2.0, 2.0, 146.83, 0.35);
    addPianoTone(channelData, 2.0, 2.0, 196.00, 0.35);
    addPianoTone(channelData, 2.0, 2.0, 246.94, 0.35);
    addPianoTone(channelData, 2.0, 2.0, 293.66, 0.30);

    // 3. Hợp âm A Minor (4s - 6s): A2, E3, A3, C4, E4
    addPianoTone(channelData, 4.0, 2.0, 110.00, 0.40);
    addPianoTone(channelData, 4.0, 2.0, 164.81, 0.35);
    addPianoTone(channelData, 4.0, 2.0, 220.00, 0.35);
    addPianoTone(channelData, 4.0, 2.0, 261.63, 0.35);
    addPianoTone(channelData, 4.0, 2.0, 329.63, 0.30);

    // 4. Hợp âm F Major (6s - 8s): F2, C3, F3, A3, C4
    addPianoTone(channelData, 6.0, 2.0, 87.31, 0.40);
    addPianoTone(channelData, 6.0, 2.0, 130.81, 0.35);
    addPianoTone(channelData, 6.0, 2.0, 174.61, 0.35);
    addPianoTone(channelData, 6.0, 2.0, 220.00, 0.35);
    addPianoTone(channelData, 6.0, 2.0, 261.63, 0.30);

    let maxAmp = 0.001;
    for (let i = 0; i < totalSamples; i++) {
      const a = Math.abs(channelData[i]);
      if (a > maxAmp) maxAmp = a;
    }
    for (let i = 0; i < totalSamples; i++) {
      channelData[i] = (channelData[i] / maxAmp) * 0.90;
    }

    const { minPeaks, maxPeaks, peakAmp } = this.computeEnvelope(channelData, sr, 5.0);
    this.audioBuffer = audioBuf;
    this.samples16k = channelData;
    this.sampleRate = sr;
    this.durationMs = Math.round(durationSec * 1000);
    this.trackName = name;
    this.minPeaks = minPeaks;
    this.maxPeaks = maxPeaks;
    this.peakAmp = peakAmp || 0.90;
    this.loopStartMs = 0;
    this.loopEndMs = this.durationMs;
    this.currentPositionMs = 0;
    return { samples16k: channelData, durationMs: this.durationMs, trackName: name };
  }

  play(offsetMs = null, endMs = null) {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();
    if (this.isPlaying) this.stop();

    const pos = (offsetMs !== null) ? offsetMs : this.currentPositionMs;
    const clampedPos = Math.max(0, Math.min(this.durationMs, pos));
    const offsetSec = clampedPos / 1000.0;

    let durationSec = undefined;
    if (endMs !== null && endMs > clampedPos) {
      this.playRangeEndMs = endMs;
      // Cho Web Audio phát vượt thêm buffer bù trễ (+0.35s + độ trễ tùy chỉnh) để âm thanh không bị ngắt sớm
      // trước khi tai người nghe kịp nghe hết và trước khi vạch vàng kịp chạy tới điểm endMs:
      const rawDurSec = (endMs - clampedPos) / 1000.0;
      const extraLatencySec = Math.max(0, (this.customLatencyMs || 65) / 1000.0);
      durationSec = rawDurSec + 0.35 + extraLatencySec;
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
          // Khi audio buffer vật lý chạy hết, các mẫu âm thanh cuối cùng vẫn đang truyền qua DAC buffer (bù trễ).
          // Cho vạch vàng chạy nốt phần bù trễ để chạm đúng mốc targetEnd (durationMs hoặc playRangeEndMs):
          const targetEnd = (this.playRangeEndMs !== null) ? this.playRangeEndMs : this.durationMs;
          const curPos = this.getCurrentPosition();
          const remainingSec = Math.max(0, (targetEnd - curPos) / 1000.0);

          if (remainingSec > 0.01 && remainingSec < 0.8) {
            setTimeout(() => {
              if (!this.isPlaying) return;
              this.isPlaying = false;
              this.activeSourceNode = null;
              this.playRangeEndMs = null;
              this.currentPositionMs = targetEnd;
              this.onPositionUpdate(targetEnd);
              this.onPlayStateChange(false);
            }, remainingSec * 1000);
          } else {
            this.isPlaying = false;
            this.activeSourceNode = null;
            this.playRangeEndMs = null;
            this.currentPositionMs = targetEnd;
            this.onPositionUpdate(targetEnd);
            this.onPlayStateChange(false);
          }
        }
      }
    };
  }

  stop() {
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

  togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      if (this.currentPositionMs >= this.durationMs - 20) {
        this.currentPositionMs = 0;
      }
      this.play(this.currentPositionMs);
    }
  }

  seek(ms) {
    const clamped = Math.max(0, Math.min(this.durationMs, Math.round(ms)));
    this.currentPositionMs = clamped;
    if (this.onSeek) {
      try { this.onSeek(clamped); } catch (_) {}
    }
    if (this.isPlaying) {
      this.play(clamped, this.playRangeEndMs);
    } else {
      this.onPositionUpdate(clamped);
    }
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
    if (this.activeSourceNode) {
      this.activeSourceNode.playbackRate.value = speed;
      const ctx = this.getAudioContext();
      this.startOffsetMs = this.getCurrentPosition();
      this.startContextTime = ctx.currentTime;
    }
  }

  getCurrentPosition() {
    if (!this.isPlaying || !this.audioCtx) {
      return this.currentPositionMs;
    }
    // Bù trễ âm thanh đầu ra: Sử dụng giá trị tùy chỉnh của người dùng (customLatencyMs) nếu có,
    // hoặc tự động dựa trên phần cứng (mặc định 65ms trên Windows).
    let compensationSec = 0.065;
    if (this.customLatencyMs !== undefined && this.customLatencyMs !== null) {
      compensationSec = this.customLatencyMs / 1000.0;
    } else {
      const browserLatency = (this.audioCtx.outputLatency || 0) + (this.audioCtx.baseLatency || 0);
      compensationSec = Math.max(browserLatency, 0.065);
    }

    const rawElapsedSec = this.audioCtx.currentTime - this.startContextTime;
    const elapsedSec = Math.max(0, rawElapsedSec - compensationSec);
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
        const targetEnd = this.playRangeEndMs;
        this.stop();
        this.currentPositionMs = targetEnd;
        this.onPositionUpdate(targetEnd);
        return targetEnd;
      }
    }

    if (currentMs >= this.durationMs) {
      this.stop();
      this.currentPositionMs = this.durationMs;
      this.onPositionUpdate(this.durationMs);
      return this.durationMs;
    }

    this.currentPositionMs = currentMs;
    return this.currentPositionMs;
  }
}

// -------------------------------------------------------------
// 3. Tab 1: FFT Engine & Subtitle Models (Speech Spectrogram)
// -------------------------------------------------------------
class FFTEngine {
  constructor(fftSize = 512, hopSize = 256, targetBins = 128) {
    this.fftSize = fftSize;
    this.hopSize = hopSize;
    this.targetBins = targetBins;
    this.halfFft = fftSize / 2;

    this.hannWindow = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      this.hannWindow[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (fftSize - 1)));
    }

    this.bitRev = new Int32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      let j = i, rev = 0, temp = fftSize;
      while (temp > 1) {
        rev = (rev << 1) | (j & 1);
        j >>= 1;
        temp >>= 1;
      }
      this.bitRev[i] = rev;
    }

    this.cosTable = new Float32Array(this.halfFft);
    this.sinTable = new Float32Array(this.halfFft);
    for (let i = 0; i < this.halfFft; i++) {
      this.cosTable[i] = Math.cos((-2.0 * Math.PI * i) / fftSize);
      this.sinTable[i] = Math.sin((-2.0 * Math.PI * i) / fftSize);
    }

    this.binStart = new Int32Array(targetBins);
    this.binEnd = new Int32Array(targetBins);
    this.binInvCount = new Float32Array(targetBins);
    for (let b = 0; b < targetBins; b++) {
      const s = Math.floor((b * this.halfFft) / targetBins);
      const e = Math.max(s + 1, Math.floor(((b + 1) * this.halfFft) / targetBins));
      this.binStart[b] = Math.min(s, this.halfFft - 1);
      this.binEnd[b] = Math.min(e, this.halfFft);
      this.binInvCount[b] = 1.0 / Math.max(1, this.binEnd[b] - this.binStart[b]);
    }
  }

  fft(real, imag) {
    const n = this.fftSize;
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

  async computeSpectrogramAsync(samples, sampleRate, onProgress = () => {}) {
    if (!samples || samples.length === 0) return null;
    const totalSamples = samples.length;
    const durationMs = Math.round((totalSamples / sampleRate) * 1000);
    const numFrames = Math.max(1, Math.ceil(totalSamples / this.hopSize));
    const packedMagnitudes = new Uint8Array(numFrames * this.targetBins);

    const real = new Float32Array(this.fftSize);
    const imag = new Float32Array(this.fftSize);
    const rawMagnitudes = new Float32Array(this.halfFft);
    let maxQ = 0, minQ = 255;
    const chunkSize = 250;

    for (let fStart = 0; fStart < numFrames; fStart += chunkSize) {
      const fEnd = Math.min(numFrames, fStart + chunkSize);
      for (let f = fStart; f < fEnd; f++) {
        const center = f * this.hopSize;
        const start = center - this.halfFft;
        for (let i = 0; i < this.fftSize; i++) {
          const idx = start + i;
          const cur = (idx >= 0 && idx < totalSamples) ? samples[idx] : 0.0;
          const prev = (i > 0 && idx - 1 >= 0 && idx - 1 < totalSamples) ? samples[idx - 1] : cur;
          real[i] = (cur - 0.92 * prev) * this.hannWindow[i];
          imag[i] = 0.0;
        }

        this.fft(real, imag);

        for (let i = 0; i < this.halfFft; i++) {
          rawMagnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }

        const baseIdx = f * this.targetBins;
        for (let b = 0; b < this.targetBins; b++) {
          let sum = 0;
          for (let k = this.binStart[b]; k < this.binEnd[b]; k++) {
            sum += rawMagnitudes[k];
          }
          const avg = sum * this.binInvCount[b];
          const db = 20.0 * Math.log10(avg + 1e-6);
          const q = Math.max(0, Math.min(255, Math.floor((db + 90.0) * 2.0)));
          packedMagnitudes[baseIdx + b] = q;
          if (q > maxQ) maxQ = q;
          if (q < minQ) minQ = q;
        }
      }
      onProgress(0.5 + 0.45 * (fEnd / numFrames));
      await new Promise(r => setTimeout(r, 0));
    }

    const dynamicRangeQ = 130;
    const floorQ = Math.max(minQ, maxQ - dynamicRangeQ);
    const rangeQ = Math.max(1, maxQ - floorQ);
    for (let idx = 0; idx < packedMagnitudes.length; idx++) {
      const q = packedMagnitudes[idx];
      packedMagnitudes[idx] = Math.max(0, Math.min(255, Math.floor(((q - floorQ) * 255) / rangeQ)));
    }
    onProgress(1.0);

    return {
      packedMagnitudes,
      numFrames,
      timeResolutionMs: (this.hopSize / 16000) * 1000,
      maxFrequencyHz: 8000,
      numBins: this.targetBins,
      durationMs
    };
  }
}

const CueClockState = {
  OFF: 'OFF',
  SHOW_LOCKED: 'SHOW_LOCKED',
  EDITING_TIME: 'EDITING_TIME',
  EDITING_WORDS: 'EDITING_WORDS'
};

class SubtitleCue {
  constructor(data) {
    this.id = data.id || ('cue_' + Math.random().toString(36).substr(2, 9));
    this.startMs = Math.max(0, Math.round(data.startMs || 0));
    this.endMs = Math.max(this.startMs + 50, Math.round(data.endMs || this.startMs + 2000));
    this.text = (data.text || '').trim();
    this.actor = (data.actor || '').trim();
    this.clockState = data.clockState || CueClockState.SHOW_LOCKED;
    this.wordTimings = data.wordTimings || [];
  }

  resolvedWordTimings() {
    const rawWords = this.text.split(/\s+/).filter(w => w.length > 0);
    if (rawWords.length === 0) return [];
    const minGap = 5;
    const dur = Math.max(rawWords.length * minGap * 2, this.endMs - this.startMs);
    const safeEnd = this.startMs + dur;
    let prevMinStart = this.startMs;

    return rawWords.map((w, idx) => {
      const defaultStart = Math.round(this.startMs + (dur * idx) / rawWords.length);
      const candStart = (this.wordTimings[idx] && typeof this.wordTimings[idx].startMs === 'number')
        ? this.wordTimings[idx].startMs : defaultStart;
      const remainingWords = Math.max(0, rawWords.length - 1 - idx);
      const maxAllowed = Math.max(prevMinStart, safeEnd - remainingWords * minGap - minGap);
      const clamped = Math.max(prevMinStart, Math.min(maxAllowed, candStart));
      prevMinStart = Math.min(safeEnd, clamped + minGap);
      return { word: w, startMs: clamped };
    });
  }

  setWordStartMs(wordIdx, targetMs) {
    const resolved = this.resolvedWordTimings();
    if (wordIdx < 0 || wordIdx >= resolved.length) return;
    const minGap = 5;
    const minAllowed = wordIdx === 0 ? this.startMs : resolved[wordIdx - 1].startMs + minGap;
    const maxAllowed = wordIdx < resolved.length - 1 ? resolved[wordIdx + 1].startMs - minGap : this.endMs - minGap;
    const clamped = Math.max(minAllowed, Math.min(maxAllowed, Math.round(targetMs)));
    resolved[wordIdx] = { ...resolved[wordIdx], startMs: clamped };
    this.wordTimings = resolved;
  }
}

const TimeFormatter = {
  formatMinuteSecond(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },
  formatFull(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const millis = Math.max(0, Math.floor(ms % 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  },
  parseFull(str) {
    if (!str) return null;
    const clean = str.trim().replace(',', '.');
    const parts = clean.split(':');
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const secParts = parts[1].split('.');
      const s = parseInt(secParts[0] || '0', 10);
      const ms = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10);
      if (isNaN(m) || isNaN(s) || isNaN(ms)) return null;
      return (m * 60 + s) * 1000 + ms;
    } else if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const secParts = parts[2].split('.');
      const s = parseInt(secParts[0] || '0', 10);
      const ms = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10);
      if (isNaN(h) || isNaN(m) || isNaN(s) || isNaN(ms)) return null;
      return ((h * 60 + m) * 60 + s) * 1000 + ms;
    } else if (parts.length === 1) {
      const sec = parseFloat(clean);
      if (isNaN(sec)) return null;
      return Math.round(sec * 1000);
    }
    return null;
  }
};

function createMidiFileBlob(notes, bpm = 120) {
  const ticksPerBeat = 480;
  const msPerBeat = 60000.0 / Math.max(20, bpm);
  const msToTicks = (ms) => Math.max(0, Math.round((ms / msPerBeat) * ticksPerBeat));

  const events = [];
  for (const n of notes) {
    events.push({
      tick: msToTicks(n.startMs),
      type: 0x90,
      pitch: Math.max(0, Math.min(127, n.pitch)),
      vel: Math.min(127, Math.max(1, Math.round(n.velocity || 80)))
    });
    events.push({
      tick: msToTicks(n.endMs),
      type: 0x80,
      pitch: Math.max(0, Math.min(127, n.pitch)),
      vel: 64
    });
  }

  // Sort events chronologically, note_offs before note_ons if at exact same tick
  events.sort((a, b) => (a.tick - b.tick) || (a.type - b.type));

  const trackBytes = [];
  function pushBytes(...b) { for (const byte of b) trackBytes.push(byte & 0xFF); }
  function pushVarLen(v) {
    let buf = v & 0x7F;
    while ((v >>= 7)) {
      buf <<= 8;
      buf |= ((v & 0x7F) | 0x80);
    }
    while (true) {
      trackBytes.push(buf & 0xFF);
      if (buf & 0x80) buf >>= 8;
      else break;
    }
  }

  // Track name meta event
  pushVarLen(0); pushBytes(0xFF, 0x03, 0x09);
  for (const c of 'CQT-CHORD') pushBytes(c.charCodeAt(0));

  // Tempo meta event
  const mpqn = Math.round(60000000 / Math.max(20, bpm));
  pushVarLen(0); pushBytes(0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

  // Time Signature (4/4)
  pushVarLen(0); pushBytes(0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Program change (Acoustic Grand Piano, Ch 0)
  pushVarLen(0); pushBytes(0xC0, 0x00);

  let lastTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    pushVarLen(delta);
    pushBytes(ev.type, ev.pitch, ev.vel);
    lastTick = ev.tick;
  }

  // End of track meta event
  pushVarLen(0); pushBytes(0xFF, 0x2F, 0x00);

  // Build full SMF
  const out = [];
  function pushOut(...b) { for (const byte of b) out.push(byte & 0xFF); }
  function push32(val) { pushOut((val >> 24) & 0xFF, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF); }
  function push16(val) { pushOut((val >> 8) & 0xFF, val & 0xFF); }

  // MThd chunk
  pushOut(0x4D, 0x54, 0x68, 0x64);
  push32(6);
  push16(0);
  push16(1);
  push16(ticksPerBeat);

  // MTrk chunk
  pushOut(0x4D, 0x54, 0x72, 0x6B);
  push32(trackBytes.length);
  out.push(...trackBytes);

  return new Blob([new Uint8Array(out)], { type: 'audio/midi' });
}

function downloadBlob(content, filename, mimeType) {
  const blob = (content instanceof Blob) ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SubtitleParser = {
  parseSrtTime(str) {
    if (!str) return 0;
    const match = str.trim().match(/(?:(\d+):)?(\d+):(\d+)[,\.](\d+)/);
    if (!match) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    const msStr = (match[4] || '0').padEnd(3, '0').slice(0, 3);
    const ms = parseInt(msStr, 10);
    return ((h * 60 + m) * 60 + s) * 1000 + ms;
  },

  parseAssTime(str) {
    if (!str) return 0;
    const match = str.trim().match(/(?:(\d+):)?(\d+):(\d+)\.(\d+)/);
    if (!match) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    const csStr = (match[4] || '0').padEnd(2, '0').slice(0, 2);
    const cs = parseInt(csStr, 10);
    return (((h * 60 + m) * 60 + s) * 100) * 10 + cs * 10;
  },

  parse(text, filename = '') {
    if (!text || typeof text !== 'string') return [];
    const lowerName = filename.toLowerCase();

    // 1. JSON (SpectroSub Project or array of cues)
    if (lowerName.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : (parsed.cues || []);
        if (Array.isArray(list) && list.length > 0) {
          return list.map(item => new SubtitleCue({
            id: item.id,
            startMs: item.startMs,
            endMs: item.endMs,
            text: item.text,
            actor: item.actor,
            clockState: item.clockState,
            wordTimings: item.wordTimings
          }));
        }
      } catch (_) {}
    }

    // 2. ASS (Advanced SubStation Alpha)
    if (lowerName.endsWith('.ass') || text.includes('[Script Info]') || text.includes('Dialogue:')) {
      const lines = text.split(/\r?\n/);
      const cues = [];
      let formatFields = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.toLowerCase().startsWith('format:')) {
          formatFields = line.substring(7).split(',').map(f => f.trim().toLowerCase());
          continue;
        }
        if (line.toLowerCase().startsWith('dialogue:')) {
          const valStr = rawLine.substring(rawLine.indexOf(':') + 1).trim();
          const parts = [];
          let cur = '', fieldCount = 0;
          for (let i = 0; i < valStr.length; i++) {
            if (fieldCount < formatFields.length - 1 && valStr[i] === ',') {
              parts.push(cur.trim());
              cur = '';
              fieldCount++;
            } else {
              cur += valStr[i];
            }
          }
          parts.push(cur.trim());

          const map = {};
          formatFields.forEach((f, idx) => { map[f] = parts[idx] || ''; });

          const startMs = this.parseAssTime(map['start']);
          const endMs = this.parseAssTime(map['end']);
          const rawDialogue = map['text'] || '';

          const wordTimings = [];
          let hasKaraoke = false;
          if (/\{\\[kK][fo]?\d+\}/.test(rawDialogue)) {
            hasKaraoke = true;
            let curTimeMs = startMs;
            const kRegex = /\{\\[kK][fo]?(\d+)\}([^\{]*)/g;
            let m;
            while ((m = kRegex.exec(rawDialogue)) !== null) {
              const durCs = parseInt(m[1], 10) || 0;
              const wText = m[2].trim();
              if (wText) {
                wordTimings.push({ word: wText, startMs: curTimeMs });
              }
              curTimeMs += durCs * 10;
            }
          }

          const cleanText = rawDialogue.replace(/\{[^\}]*\}/g, '').replace(/\\N/g, ' ').trim();
          if (cleanText) {
            cues.push(new SubtitleCue({
              startMs,
              endMs,
              text: cleanText,
              actor: map['name'] || map['style'] || '',
              clockState: hasKaraoke ? CueClockState.EDITING_WORDS : CueClockState.SHOW_LOCKED,
              wordTimings: wordTimings.length > 0 ? wordTimings : undefined
            }));
          }
        }
      }
      if (cues.length > 0) return cues;
    }

    // 3. SRT / VTT
    if (lowerName.endsWith('.srt') || lowerName.endsWith('.vtt') || text.includes('-->')) {
      const blocks = text.trim().split(/\r?\n\s*\r?\n/);
      const cues = [];
      for (const block of blocks) {
        const bLines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        let timeIdx = -1;
        for (let i = 0; i < bLines.length; i++) {
          if (bLines[i].includes('-->')) {
            timeIdx = i;
            break;
          }
        }
        if (timeIdx === -1) continue;
        const [startStr, endStr] = bLines[timeIdx].split('-->').map(s => s.trim());
        const startMs = this.parseSrtTime(startStr);
        const endMs = this.parseSrtTime(endStr);
        const cueText = bLines.slice(timeIdx + 1).join(' ').replace(/<[^>]*>/g, '').trim();
        if (cueText) {
          cues.push(new SubtitleCue({
            startMs,
            endMs,
            text: cueText,
            clockState: CueClockState.SHOW_LOCKED
          }));
        }
      }
      if (cues.length > 0) return cues;
    }

    // 4. Plain text lines fallback
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    return rawLines.map((l, i) => new SubtitleCue({
      startMs: i * 2500,
      endMs: (i + 1) * 2500,
      text: l,
      clockState: CueClockState.SHOW_LOCKED
    }));
  }
};

const SubtitleExporter = {
  formatSrtTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const millis = Math.max(0, ms % 1000);
    const s = totalSec % 60;
    const totalM = Math.floor(totalSec / 60);
    const m = totalM % 60;
    const h = Math.floor(totalM / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  },

  formatAssTime(ms) {
    const totalCs = Math.max(0, Math.round(ms / 10));
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const s = totalSec % 60;
    const totalM = Math.floor(totalSec / 60);
    const m = totalM % 60;
    const h = Math.floor(totalM / 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  },

  toSrt(cues) {
    return cues.map((cue, idx) => {
      const start = this.formatSrtTime(cue.startMs);
      const end = this.formatSrtTime(cue.endMs);
      return `${idx + 1}\n${start} --> ${end}\n${cue.text}`;
    }).join('\n\n') + '\n';
  },

  toAss(cues, trackName = 'SpectroSub') {
    const header = [
      '[Script Info]',
      `Title: ${trackName}`,
      'ScriptType: v4.00+',
      'WrapStyle: 0',
      'ScaledBorderAndShadow: yes',
      'PlayResX: 1920',
      'PlayResY: 1080',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      'Style: Default,Arial,28,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,20,1',
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
    ];

    const dialogues = cues.map(cue => {
      const s = this.formatAssTime(cue.startMs);
      const e = this.formatAssTime(cue.endMs);
      const actor = cue.actor || '';

      let textContent = cue.text;
      if (cue.clockState === CueClockState.EDITING_WORDS) {
        const words = cue.resolvedWordTimings();
        if (words.length > 0) {
          textContent = words.map((w, wIdx) => {
            const nextStart = (wIdx < words.length - 1) ? words[wIdx + 1].startMs : cue.endMs;
            const durCs = Math.max(1, Math.round((nextStart - w.startMs) / 10));
            return `{\\k${durCs}}${w.word}`;
          }).join(' ');
        }
      }

      return `Dialogue: 0,${s},${e},Default,${actor},0,0,0,,${textContent}`;
    });

    return header.concat(dialogues).join('\n') + '\n';
  },

  toJson(cues, trackName = '', durationMs = 0) {
    const payload = {
      generator: 'Web SpectroSub 2.1.0',
      trackName,
      durationMs,
      exportedAt: new Date().toISOString(),
      cues: cues.map(c => ({
        id: c.id,
        startMs: c.startMs,
        endMs: c.endMs,
        text: c.text,
        actor: c.actor,
        clockState: c.clockState,
        wordTimings: c.wordTimings
      }))
    };
    return JSON.stringify(payload, null, 2);
  },

  toTxt(cues) {
    return cues.map(c => c.text).join('\n') + '\n';
  }
};

// -------------------------------------------------------------
// 4. Tab 1: Spectrogram Canvas Renderer
// -------------------------------------------------------------
class SpectrogramCanvasRenderer {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    this.audio = audioEngine;
    this.spectrogram = null;
    this.cues = [];
    this.activeCue = null;

    this.viewMode = 'DUAL';
    this.paletteKey = 'AEGISUB_BLUE';
    this.zoomFactor = 40.0;
    this.scrollOffsetMs = -Math.round(70 * (100.0 / 40.0)); // Thụt vào 70px tạo khoảng đen ở đầu
    this.selectionStartMs = 0;
    this.selectionEndMs = 2100;

    this.rulerHeight = 28;
    this.minimapHeight = 24;
    this.subOverlayHeight = 28;
    this.isDraggingScrollbar = false;

    this.specY = 0;
    this.specH = 0;
    this.hoveredFreq = null;

    this.tileCanvas = document.createElement('canvas');
    this.tileCtx = this.tileCanvas.getContext('2d', { alpha: false });
    this._lastFStart = -1;
    this._lastFEnd = -1;
    this._lastPalette = null;
    this._lastSpec = null;

    if (this.canvas) {
      this.initEvents();
    }
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  get leadMarginPx() {
    return 70; // Visual lead margin (khoảng đen thụt vào ở đầu)
  }

  get msPerPixel() {
    return Math.max(0.5, 100.0 / Math.max(0.05, this.zoomFactor));
  }

  timeToX(ms) {
    return (ms - this.scrollOffsetMs) / this.msPerPixel;
  }

  xToTime(x) {
    return this.scrollOffsetMs + x * this.msPerPixel;
  }

  clampScroll() {
    if (!this.audio || this.audio.durationMs <= 0) return;
    const durMs = this.audio.durationMs;
    const visibleDurMs = (this.width || 800) * this.msPerPixel;
    const leadMs = Math.round(this.leadMarginPx * this.msPerPixel);

    const minScroll = -leadMs;
    const maxScroll = Math.max(minScroll, durMs - visibleDurMs + leadMs);
    this.scrollOffsetMs = Math.max(minScroll, Math.min(maxScroll, this.scrollOffsetMs));
  }

  resetScrollToStart() {
    // Điểm 00:00.000 thụt vào 1 đoạn (~70px) tạo khoảng đen phía trước để không bị sát mép trái
    this.scrollOffsetMs = -Math.round(this.leadMarginPx * this.msPerPixel);
    this.clampScroll();
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;
    if (this.canvas.offsetParent === null) return; // Tab is hidden

    const ctx = this.ctx, w = this.width, h = this.height;

    ctx.fillStyle = '#080d18';
    ctx.fillRect(0, 0, w, h);

    const hasAudio = (this.audio && this.audio.durationMs > 0);
    const hasCues = (this.cues && this.cues.length > 0);

    if (!hasAudio && !hasCues) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa tải file âm thanh Tab 1. Bấm "Tải File" để nạp file từ máy hoặc Ví dụ 1.', w / 2, h / 2);
      return;
    }

    if (!hasAudio && hasCues) {
      const maxEnd = Math.max(...this.cues.map(c => c.endMs || 0));
      this.audio.durationMs = Math.max(7000, maxEnd + 1000);
    }

    this.clampScroll();

    const hasVisibleTranscript = this.cues.some(c => c.clockState !== CueClockState.OFF);
    const rulerH = this.rulerHeight;
    // When no transcript is visible (all OFF), do NOT show empty space below ruler
    const subH = hasVisibleTranscript ? this.subOverlayHeight : 0;
    const miniH = this.minimapHeight;
    const contentY = rulerH + subH;
    const contentH = Math.max(20, h - contentY - miniH);
    const contentBottom = h - miniH;

    let specH = 0, waveH = 0, specY = contentY, waveY = contentY;
    if (this.viewMode === 'DUAL') {
      // Giới hạn chiều cao Waveform nhỏ gọn (18% contentH, tối đa 65px, tối thiểu 36px) để nhường không gian tối đa cho Spectrogram
      waveH = Math.min(65, Math.max(36, Math.floor(contentH * 0.18)));
      waveY = contentY;
      specH = contentH - waveH;
      specY = waveY + waveH;
    } else if (this.viewMode === 'SPECTROGRAM') {
      specH = contentH;
      specY = contentY;
    } else {
      waveH = contentH;
      waveY = contentY;
    }

    this.specY = specY;
    this.specH = specH;

    if (waveH > 0) {
      this.drawWaveform(ctx, 0, waveY, w, waveH);
    }
    if (specH > 0) {
      if (this.spectrogram && this.spectrogram.numFrames > 0) {
        this.drawSpectrogram(ctx, 0, specY, w, specH);
      }
      this.drawFrequencyColorAxis(ctx, 0, specY, 6, specH);
    }

    // Divider between Waveform and Spectrogram in Dual mode
    if (this.viewMode === 'DUAL' && waveH > 0 && specH > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, specY);
      ctx.lineTo(w, specY);
      ctx.stroke();
    }

    // Yellow & Purple clock tints over spectrogram / waveform
    if (this.cues) {
      this.cues.forEach(cue => {
        if (cue.clockState !== CueClockState.EDITING_TIME && cue.clockState !== CueClockState.EDITING_WORDS) return;
        const cStartX = this.timeToX(cue.startMs);
        const cEndX = this.timeToX(cue.endMs);
        if (cEndX < 0 || cStartX > w) return;

        const drawX = Math.max(0, cStartX);
        const drawW = Math.min(w, cEndX) - drawX;
        if (drawW <= 0) return;

        if (cue.clockState === CueClockState.EDITING_TIME) {
          // Yellow clock: light yellow tint
          ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
          ctx.fillRect(drawX, contentY, drawW, contentH);

          ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cStartX, contentY); ctx.lineTo(cStartX, contentBottom);
          ctx.moveTo(cEndX, contentY); ctx.lineTo(cEndX, contentBottom);
          ctx.stroke();
        } else if (cue.clockState === CueClockState.EDITING_WORDS) {
          // Purple clock: soft & delicate purple tint
          ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
          ctx.fillRect(drawX, contentY, drawW, contentH);

          ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(cStartX, contentY); ctx.lineTo(cStartX, contentBottom);
          ctx.moveTo(cEndX, contentY); ctx.lineTo(cEndX, contentBottom);
          ctx.stroke();
        }
      });
    }

    // Subtitle transcript strip (only when subH > 0)
    if (subH > 0) {
      this.drawSubtitlesOverlay(ctx, 0, rulerH, w, subH, contentBottom);
    }

    // Selection window across full interactive area
    const selectionH = h - rulerH - miniH;
    this.drawSelectionWindow(ctx, 0, rulerH, w, selectionH);

    // Time ruler on top
    this.drawTimeRuler(ctx, 0, 0, w, rulerH);

    // Positions for Start, Stop, and Playhead lines
    const startX = this.timeToX(this.selectionStartMs);
    const endX = this.timeToX(this.selectionEndMs);
    const playheadMs = this.audio ? this.audio.getCurrentPosition() : 0;
    const playheadX = this.timeToX(playheadMs);
    const isHiddenStartStop = !!(this.activeCue && (this.activeCue.clockState === CueClockState.SHOW_LOCKED || this.activeCue.clockState === CueClockState.OFF));

    // 1) Green Start line on time ruler (Hidden when clock is Blue [SHOW_LOCKED] or Gray [OFF])
    if (!isHiddenStartStop && startX >= -10 && startX <= w + 10) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, 0); ctx.lineTo(startX, rulerH); ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(startX - 2, 0, 4, 3);
    }

    // 2) Red Stop line on time ruler (Hidden when clock is Blue [SHOW_LOCKED] or Gray [OFF])
    if (!isHiddenStartStop && endX >= -10 && endX <= w + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(endX, 0); ctx.lineTo(endX, rulerH); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(endX - 2, 0, 4, 3);
    }

    // 3) Yellow Playhead line: Top indicator on ruler + clean straight vertical line (NO lower triangle)
    if (playheadX >= -10 && playheadX <= w + 10) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0); ctx.lineTo(playheadX, rulerH); ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 7);
      ctx.closePath();
      ctx.fill();

      // Clean straight yellow line across canvas (NO lower triangle indicator)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, contentBottom);
      ctx.stroke();
    }

    // Đường chỉ ranh giới trực quan cho điểm Bắt đầu Audio (00:00.000) và điểm Kết thúc Audio
    if (hasAudio) {
      const durMs = this.audio.durationMs;
      const audioStartX = this.timeToX(0);
      const audioEndX = this.timeToX(durMs);

      // Vạch nét đứt mảnh màu xanh Cyan tại 00:00.000 (Audio Start)
      if (audioStartX >= 0 && audioStartX <= w) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(audioStartX, rulerH);
        ctx.lineTo(audioStartX, contentBottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vạch nét đứt mảnh màu hồng Rose tại Audio End
      if (audioEndX >= 0 && audioEndX <= w) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(audioEndX, rulerH);
        ctx.lineTo(audioEndX, contentBottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    this.drawMinimap(ctx, 0, h - miniH, w, miniH);
  }
  drawSpectrogram(ctx, x, y, width, height) {
    const spec = this.spectrogram;
    const numFrames = spec.numFrames;
    const numBins = spec.numBins;
    const packed = spec.packedMagnitudes;
    const lut = ColorLUT[this.paletteKey] || ColorLUT.AEGISUB_BLUE;

    // Nền đen đặc cho vùng làm việc ngoài dải audio
    ctx.fillStyle = '#080d18';
    ctx.fillRect(x, y, width, height);

    const vStartMs = this.xToTime(0);
    const vEndMs = this.xToTime(width);
    const fStart = Math.max(0, Math.floor(vStartMs / spec.timeResolutionMs));
    const fEnd = Math.min(numFrames - 1, Math.ceil(vEndMs / spec.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;
    if (renderFrames <= 0) return;

    if (this.tileCanvas.width !== renderFrames || this.tileCanvas.height !== numBins) {
      this.tileCanvas.width = renderFrames;
      this.tileCanvas.height = numBins;
      this._lastFStart = -1; // Cần vẽ lại khi kích thước thay đổi
    }

    // Tối ưu hiệu năng 60 FPS: Chỉ tái tạo buffer tile khi dải frame, spectrogram hoặc bảng màu thực sự thay đổi
    if (this._lastFStart !== fStart || this._lastFEnd !== fEnd || this._lastPalette !== this.paletteKey || this._lastSpec !== spec) {
      const imgData = this.tileCtx.createImageData(renderFrames, numBins);
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

      this.tileCtx.putImageData(imgData, 0, 0);
      this._lastFStart = fStart;
      this._lastFEnd = fEnd;
      this._lastPalette = this.paletteKey;
      this._lastSpec = spec;
    }

    const startX = this.timeToX(fStart * spec.timeResolutionMs);
    const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.tileCanvas, 0, 0, renderFrames, numBins, startX, y, endX - startX, height);
  }

  drawFrequencyColorAxis(ctx, x, y, width, height) {
    if (!ctx || height <= 0) return;

    ctx.save();

    // 1. Linear Vertical Gradient matching the 5 Phonetic Frequency Bands:
    // Top (y, 8000 Hz) down to Bottom (y + height, 0 Hz)
    const grad = ctx.createLinearGradient(x, y, x, y + height);

    // Dải tần số ngữ âm (Phonetic Speech Spectrogram Legend Bands):
    // 4.500 – 8.000 Hz: Red (#ef4444) -> Liaisons & Fricatives [s, z, ʃ, ʒ]
    // 2.500 – 4.500 Hz: Purple (#a855f7) -> Formant F3 & Nasals [õ, ã, ɛ̃]
    // 1.000 – 2.500 Hz: Yellow (#eab308) -> Formant F2 (Độ tiến/lùi của lưỡi)
    //   300 – 1.000 Hz: Green (#10b981) -> Formant F1 (Độ mở miệng [a, i, u])
    //     0 –   300 Hz: Cyan (#38bdf8) -> Pitch / F0 (Cao độ thanh quản)

    grad.addColorStop(0.00, '#ef4444'); // 8000 Hz
    grad.addColorStop(0.38, '#ef4444');
    grad.addColorStop(0.44, '#a855f7'); // 4500 Hz boundary transition
    grad.addColorStop(0.64, '#a855f7');
    grad.addColorStop(0.69, '#eab308'); // 2500 Hz boundary transition
    grad.addColorStop(0.83, '#eab308');
    grad.addColorStop(0.88, '#10b981'); // 1000 Hz boundary transition
    grad.addColorStop(0.94, '#10b981');
    grad.addColorStop(0.965, '#38bdf8'); // 300 Hz boundary transition
    grad.addColorStop(1.00, '#38bdf8'); // 0 Hz

    // Background shadow bar for clean separation
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x, y, width + 1, height);

    // Draw thin gradient color axis
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);

    // Subtle 1px right border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width + 0.5, y);
    ctx.lineTo(x + width + 0.5, y + height);
    ctx.stroke();

    // Boundary tick markers & clean mini kHz labels
    const ticks = [
      { f: 8000, label: '8k',   color: '#f87171' },
      { f: 4500, label: '4.5k', color: '#c084fc' },
      { f: 2500, label: '2.5k', color: '#fde047' },
      { f: 1000, label: '1k',   color: '#34d399' },
      { f: 300,  label: '300',  color: '#38bdf8' }
    ];

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ticks.forEach(t => {
      const frac = 1.0 - (t.f / 8000.0);
      const ty = Math.round(y + frac * height);
      if (ty >= y && ty <= y + height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.moveTo(x + width, ty);
        ctx.lineTo(x + width + 3, ty);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        const tw = ctx.measureText(t.label).width;
        ctx.fillRect(x + width + 4, ty - 5, tw + 2, 10);

        ctx.fillStyle = t.color;
        ctx.fillText(t.label, x + width + 5, ty);
      }
    });

    // If mouse is hovered over the axis, highlight exact frequency & band description
    if (this.hoveredFreq !== null) {
      const hFrac = 1.0 - (this.hoveredFreq / 8000.0);
      const hy = Math.round(y + hFrac * height);

      // Indicator ring on the axis
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + width / 2, hy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tooltip pill badge showing ONLY the exact frequency value
      const text = `${this.hoveredFreq} Hz`;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const mText = ctx.measureText(text);
      const boxW = mText.width + 12;
      const boxH = 20;
      const boxX = x + width + 14;
      const boxY = Math.max(y + 2, Math.min(y + height - boxH - 2, hy - boxH / 2));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, boxX + 6, boxY + boxH / 2);
    }

    ctx.restore();
  }

  getFrequencyBandTooltip(freq) {
    return `${freq} Hz`;
  }

  drawWaveform(ctx, x, y, width, height) {
    const minP = this.audio.minPeaks, maxP = this.audio.maxPeaks;
    if (!minP || !maxP || minP.length === 0) return;
    const centerY = y + height / 2;
    // Tự động scale biên độ sóng lấp đầy vừa vặn chiều cao hiển thị, loại bỏ khoảng trống thừa ở trên và dưới
    const peakAmp = this.audio.peakAmp || 1.0;
    const gain = Math.min(2.5, 0.94 / Math.max(0.08, peakAmp));
    const halfH = Math.max(2, (height / 2 - 2) * gain);

    ctx.fillStyle = '#0a101d';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath(); ctx.moveTo(x, centerY); ctx.lineTo(x + width, centerY); ctx.stroke();

    const bucketMs = this.audio.peakBucketMs;
    const bStart = Math.max(0, Math.floor(this.xToTime(0) / bucketMs));
    const bEnd = Math.min(minP.length - 1, Math.ceil(this.xToTime(width) / bucketMs));

    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.beginPath();
    for (let b = bStart; b <= bEnd; b++) {
      const px = this.timeToX(b * bucketMs);
      const topY = Math.max(y, centerY - maxP[b] * halfH);
      const botY = Math.min(y + height, centerY - minP[b] * halfH);
      ctx.rect(px, topY, Math.max(1, 100 / this.zoomFactor * 0.05), Math.max(1, botY - topY));
    }
    ctx.fill();
  }

  drawSubtitlesOverlay(ctx, x, y, width, height, contentBottom) {
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();

    if (!this.cues) return;
    this.cues.forEach(cue => {
      if (cue.clockState === CueClockState.OFF) return;
      const startX = this.timeToX(cue.startMs);
      const endX = this.timeToX(cue.endMs);
      const cueW = endX - startX;
      if (endX < 0 || startX > width) return;

      const isActive = this.activeCue && this.activeCue.id === cue.id;
      const padY = 2;
      const barH = height - padY * 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, y + padY, Math.max(8, cueW), barH);
      ctx.clip();

      if (cue.clockState === CueClockState.EDITING_TIME) {
        ctx.fillStyle = isActive ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.22)';
        ctx.fillRect(startX, y + padY, cueW, barH);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeRect(startX + 1, y + padY + 1, Math.max(6, cueW - 2), barH - 2);
      } else if (cue.clockState === CueClockState.EDITING_WORDS) {
        ctx.fillStyle = isActive ? 'rgba(168, 85, 247, 0.20)' : 'rgba(168, 85, 247, 0.12)';
        ctx.fillRect(startX, y + padY, cueW, barH);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = isActive ? 1.5 : 1.0;
        ctx.strokeRect(startX + 1, y + padY + 1, Math.max(6, cueW - 2), barH - 2);
      } else {
        // SHOW_LOCKED (Blue)
        if (isActive) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(startX, y + padY, cueW, barH);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(startX + 1, y + padY + 1, Math.max(6, cueW - 2), barH - 2);
        } else {
          ctx.fillStyle = 'rgba(14, 116, 144, 0.35)';
          ctx.fillRect(startX, y + padY, cueW, barH);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(startX, y + padY, Math.max(8, cueW), barH);
        }
      }

      // Word rendering with overlap crop & soft fade-out
      if (cue.clockState === CueClockState.EDITING_WORDS || (cue.wordTimings && cue.wordTimings.length > 0)) {
        const words = cue.resolvedWordTimings();
        ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        words.forEach((wt, wIdx) => {
          const wx = this.timeToX(wt.startMs);
          const nextWx = (wIdx < words.length - 1) ? this.timeToX(words[wIdx + 1].startMs) : endX;
          const availW = nextWx - wx;
          if (availW <= 2 || nextWx < 0 || wx > width) return;

          const padLeft = 5;
          const textW = ctx.measureText(wt.word).width;
          const neededW = padLeft + textW + 2;
          const isOverlapping = neededW > availW;

          ctx.save();
          ctx.beginPath();
          ctx.rect(wx, y + padY, Math.max(0, availW - 1), barH);
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

          ctx.fillText(wt.word, wx + padLeft, y + height / 2);
          ctx.restore();
        });
      } else {
        ctx.fillStyle = isActive ? '#ffffff' : '#e2e8f0';
        ctx.font = (isActive ? 'bold ' : '') + '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(cue.text, startX + 6, y + height / 2);
      }

      ctx.restore();

      // Soft & delicate purple vertical lines at word boundaries in EDITING_WORDS mode
      if (cue.clockState === CueClockState.EDITING_WORDS) {
        const words = cue.resolvedWordTimings();
        words.forEach(wt => {
          const wx = this.timeToX(wt.startMs);
          if (wx >= -2 && wx <= width + 2) {
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(wx, y);
            ctx.lineTo(wx, contentBottom);
            ctx.stroke();

            // Small, clean handle at top
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(wx - 1, y + 2, 2, 6);
          }
        });
      }
    });
  }

  drawSelectionWindow(ctx, x, y, width, height) {
    // Ẩn thanh start và stop (selection window) khi đồng hồ màu xanh dương [HIỆN & KHÓA] hoặc màu xám [OFF - chế độ không chỉnh sửa gì]
    if (this.activeCue && (this.activeCue.clockState === CueClockState.SHOW_LOCKED || this.activeCue.clockState === CueClockState.OFF)) {
      return;
    }
    const startX = this.timeToX(this.selectionStartMs);
    const endX = this.timeToX(this.selectionEndMs);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.fillRect(Math.max(0, startX), y, Math.min(width, endX - startX), height);

    if (startX >= -10 && startX <= width + 10) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX, y + height); ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(startX, y, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('[', startX + 4, y + 13);
    }

    if (endX >= -10 && endX <= width + 10) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(endX, y); ctx.lineTo(endX, y + height); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(endX - 16, y, 16, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(']', endX - 12, y + 13);
    }
  }

  drawTimeRuler(ctx, x, y, width, height) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + width, y + height); ctx.stroke();

    const durMs = this.audio ? this.audio.durationMs : 0;
    const msPerPx = this.msPerPixel;
    let stepMs = 1000;
    if (msPerPx < 1.0) stepMs = 200;
    else if (msPerPx < 2.5) stepMs = 500;
    else if (msPerPx < 6.0) stepMs = 1000;
    else if (msPerPx < 15.0) stepMs = 2000;
    else if (msPerPx < 35.0) stepMs = 5000;
    else if (msPerPx < 80.0) stepMs = 10000;
    else if (msPerPx < 180.0) stepMs = 20000;
    else if (msPerPx < 350.0) stepMs = 30000;
    else stepMs = 60000;

    const vStartMs = this.xToTime(0);
    const vEndMs = this.xToTime(width);
    const firstTick = Math.floor(vStartMs / stepMs) * stepMs;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let t = firstTick; t <= vEndMs; t += stepMs) {
      if (t < 0) continue; // Không vẽ mốc âm trước 00:00.000
      const isPastAudio = durMs > 0 && t > durMs;
      const tx = this.timeToX(t);
      if (tx >= 0 && tx <= width) {
        ctx.strokeStyle = isPastAudio ? '#27272a' : '#475569';
        ctx.beginPath(); ctx.moveTo(tx, y + height - 8); ctx.lineTo(tx, y + height); ctx.stroke();
        ctx.fillStyle = isPastAudio ? '#52525b' : '#94a3b8';
        ctx.fillText(TimeFormatter.formatFull(t), tx + 4, y + 16);
      }
    }

    // Nhãn đánh dấu điểm kết thúc Audio (End Marker)
    if (durMs > 0) {
      const endTx = this.timeToX(durMs);
      if (endTx >= 0 && endTx <= width) {
        ctx.strokeStyle = '#f43f5e';
        ctx.beginPath(); ctx.moveTo(endTx, y + height - 12); ctx.lineTo(endTx, y + height); ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('END ' + TimeFormatter.formatFull(durMs), endTx + 4, y + 12);
        ctx.fillStyle = '#94a3b8';
      }
    }
  }

  drawMinimap(ctx, x, y, width, height) {
    // 1. Dark sleek track background (no waveform mirror)
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    const durMs = this.audio ? this.audio.durationMs : 0;
    if (durMs <= 0) return;

    // 2. Subtle groove line along center of track
    ctx.fillStyle = '#1e293b';
    const grooveH = Math.max(4, Math.round(height * 0.35));
    const grooveY = y + Math.round((height - grooveH) / 2);
    ctx.fillRect(x, grooveY, width, grooveH);

    // 3. Compact modern scrollbar thumb (enlarged for easy mobile touch)
    const visibleDurMs = width * this.msPerPixel;
    const thumbStartMs = Math.max(0, Math.min(durMs, this.scrollOffsetMs));
    const thumbEndMs = Math.max(0, Math.min(durMs, this.scrollOffsetMs + visibleDurMs));
    const thumbX = (thumbStartMs / durMs) * width;
    const thumbW = Math.max(28, ((thumbEndMs - thumbStartMs) / durMs) * width);

    const thumbPadY = 3;
    const thumbH = Math.max(8, height - thumbPadY * 2);
    const thumbY = y + thumbPadY;

    ctx.fillStyle = this.isDraggingScrollbar ? '#38bdf8' : 'rgba(56, 189, 248, 0.75)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbW, thumbH, Math.min(4, thumbH / 2));
      ctx.fill();
    } else {
      ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
    }
  }

  initEvents() {
    const c = this.canvas;
    if (!c) return;
    let isDragging = false, dragTarget = 'PAN', dragStartX = 0, dragStartScrollMs = 0;
    let dragWordInfo = null;
    let dragCueEdgeInfo = null;

    // Mobile Pinch-to-zoom tracking for Tab 1
    let isPinching = false;
    let pinchStartDistX = 0;
    let pinchStartZoom = this.zoomFactor;
    let pinchCenterTime = 0;

    const getCanvasPos = (touchOrMouse) => {
      const rect = c.getBoundingClientRect();
      return {
        x: touchOrMouse.clientX - rect.left,
        y: touchOrMouse.clientY - rect.top
      };
    };

    const getX = (e) => (e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX) - c.getBoundingClientRect().left;
    const getY = (e) => (e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY) - c.getBoundingClientRect().top;

    const findWordHandleAt = (mouseX, mouseY) => {
      const rectH = c.getBoundingClientRect().height;
      if (mouseY < this.rulerHeight || mouseY > rectH - this.minimapHeight) return null;
      let best = null;
      for (const cue of this.cues) {
        if (cue.clockState !== CueClockState.EDITING_WORDS) continue;
        const words = cue.resolvedWordTimings();
        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const wx = this.timeToX(words[wIdx].startMs);
          const dist = Math.abs(mouseX - wx);
          if (dist <= 10 && (!best || dist < best.dist)) {
            best = { cue, wordIdx: wIdx, dist };
          }
        }
      }
      return best;
    };

    const findYellowCueEdgeAt = (mouseX, mouseY) => {
      const rectH = c.getBoundingClientRect().height;
      if (mouseY < this.rulerHeight || mouseY > rectH - this.minimapHeight) return null;
      for (const cue of this.cues) {
        if (cue.clockState !== CueClockState.EDITING_TIME) continue;
        const sx = this.timeToX(cue.startMs);
        const ex = this.timeToX(cue.endMs);
        if (Math.abs(mouseX - sx) <= 8) return { cue, edge: 'START' };
        if (Math.abs(mouseX - ex) <= 8) return { cue, edge: 'END' };
      }
      return null;
    };

    const updateCursor = (mouseX, mouseY) => {
      if (isDragging) {
        if (['WORD', 'START', 'END', 'PLAYHEAD', 'CUE_START', 'CUE_END'].includes(dragTarget)) {
          c.style.cursor = 'ew-resize';
        }
        return;
      }

      if (findWordHandleAt(mouseX, mouseY) || findYellowCueEdgeAt(mouseX, mouseY)) {
        c.style.cursor = 'ew-resize';
        return;
      }

      const startX = this.timeToX(this.selectionStartMs);
      const endX = this.timeToX(this.selectionEndMs);
      const playheadX = this.timeToX(this.audio.getCurrentPosition());
      const HIT = 8;
      const isHiddenStartStop = !!(this.activeCue && (this.activeCue.clockState === CueClockState.SHOW_LOCKED || this.activeCue.clockState === CueClockState.OFF));

      const isNearStart = !isHiddenStartStop && (Math.abs(mouseX - startX) <= HIT ||
        (mouseX >= startX && mouseX <= startX + 18 && mouseY >= this.rulerHeight && mouseY <= this.rulerHeight + 22));
      const isNearEnd = !isHiddenStartStop && (Math.abs(mouseX - endX) <= HIT ||
        (mouseX >= endX - 18 && mouseX <= endX && mouseY >= this.rulerHeight && mouseY <= this.rulerHeight + 22));
      const isNearYellow = Math.abs(mouseX - playheadX) <= HIT;

      const hasVisibleTranscript = this.cues.some(cue => cue.clockState !== CueClockState.OFF);
      const subH = hasVisibleTranscript ? this.subOverlayHeight : 0;

      const rectH = c.getBoundingClientRect().height;
      if (mouseY >= rectH - this.minimapHeight) {
        c.style.cursor = 'pointer';
        return;
      }

      if (isNearStart || isNearEnd || isNearYellow) {
        c.style.cursor = 'ew-resize';
      } else if (mouseY <= this.rulerHeight || (subH > 0 && mouseY <= this.rulerHeight + subH)) {
        c.style.cursor = 'pointer';
      } else {
        c.style.cursor = 'crosshair';
      }
    };

    c.addEventListener('mousemove', (e) => {
      const mouseX = getX(e);
      const mouseY = getY(e);
      updateCursor(mouseX, mouseY);

      // Check if mouse is hovering over the left frequency color axis
      if (this.specH > 0 && mouseX <= 32 && mouseY >= this.specY && mouseY <= this.specY + this.specH) {
        const frac = (mouseY - this.specY) / this.specH;
        const freqHz = Math.round(8000 * (1 - frac));
        if (this.hoveredFreq !== freqHz) {
          this.hoveredFreq = freqHz;
          this.render();
        }
      } else {
        if (this.hoveredFreq !== null) {
          this.hoveredFreq = null;
          this.render();
        }
      }
    });

    c.addEventListener('mouseleave', () => {
      if (!isDragging) c.style.cursor = 'crosshair';
      if (this.hoveredFreq !== null) {
        this.hoveredFreq = null;
        this.render();
      }
    });

    const onStart = (e) => {
      // Multi-touch pinch detection for horizontal zoom (Mobile)
      if (e.touches && e.touches.length >= 2) {
        isPinching = true;
        isDragging = false;
        dragTarget = null;
        this.isDraggingScrollbar = false;

        const p1 = getCanvasPos(e.touches[0]);
        const p2 = getCanvasPos(e.touches[1]);
        pinchStartDistX = Math.max(10, Math.abs(p1.x - p2.x));
        pinchStartZoom = this.zoomFactor;
        const midX = (p1.x + p2.x) / 2;
        pinchCenterTime = this.xToTime(midX);
        return;
      }

      isDragging = true;
      dragStartX = getX(e);
      const dragStartY = getY(e);
      dragStartScrollMs = this.scrollOffsetMs;
      const curTime = this.xToTime(dragStartX);
      const startX = this.timeToX(this.selectionStartMs);
      const endX = this.timeToX(this.selectionEndMs);
      const playheadX = this.timeToX(this.audio.getCurrentPosition());
      const rectH = c.getBoundingClientRect().height;

      // 1. Click / drag on slim bottom scrollbar (moves in swipe direction!)
      const isTouch = (e.touches && e.touches.length > 0);
      const scrollbarHitHeight = isTouch ? Math.max(36, this.minimapHeight + 12) : this.minimapHeight;
      if (dragStartY >= rectH - scrollbarHitHeight) {
        dragTarget = 'SCROLLBAR';
        this.isDraggingScrollbar = true;
        c.style.cursor = 'grabbing';
        const durMs = this.audio ? this.audio.durationMs : 0;
        if (durMs > 0) {
          const visibleDurMs = this.width * this.msPerPixel;
          const thumbStartMs = Math.max(0, this.scrollOffsetMs);
          const thumbEndMs = Math.min(durMs, this.scrollOffsetMs + visibleDurMs);
          const thumbX = (thumbStartMs / durMs) * this.width;
          const thumbW = Math.max(28, ((thumbEndMs - thumbStartMs) / durMs) * this.width);

          // If clicked outside the current thumb, center thumb at click location
          if (dragStartX < thumbX || dragStartX > thumbX + thumbW) {
            const targetTimeMs = (dragStartX / this.width) * durMs;
            const desired = targetTimeMs - visibleDurMs / 2;
            this.scrollOffsetMs = desired;
            this.clampScroll();
            dragStartScrollMs = this.scrollOffsetMs;
            this.render();
          }
        }
        return;
      }

      const wordHit = findWordHandleAt(dragStartX, dragStartY);
      if (wordHit) {
        dragTarget = 'WORD';
        dragWordInfo = wordHit;
        if (this.onBeforeCuesChange) this.onBeforeCuesChange();
        if (this.onCueSelect) this.onCueSelect(wordHit.cue);
        c.style.cursor = 'ew-resize';
        return;
      }

      const yellowHit = findYellowCueEdgeAt(dragStartX, dragStartY);
      if (yellowHit) {
        dragTarget = yellowHit.edge === 'START' ? 'CUE_START' : 'CUE_END';
        dragCueEdgeInfo = { cue: yellowHit.cue };
        if (this.onBeforeCuesChange) this.onBeforeCuesChange();
        if (this.onCueSelect) this.onCueSelect(yellowHit.cue);
        c.style.cursor = 'ew-resize';
        return;
      }

      const isHiddenStartStop = !!(this.activeCue && (this.activeCue.clockState === CueClockState.SHOW_LOCKED || this.activeCue.clockState === CueClockState.OFF));

      if (!isHiddenStartStop && (Math.abs(dragStartX - startX) <= 12 || (dragStartX >= startX && dragStartX <= startX + 18 && dragStartY >= this.rulerHeight && dragStartY <= this.rulerHeight + 22))) {
        dragTarget = 'START';
        if (this.onBeforeCuesChange) this.onBeforeCuesChange();
        c.style.cursor = 'ew-resize';
      } else if (!isHiddenStartStop && (Math.abs(dragStartX - endX) <= 12 || (dragStartX >= endX - 18 && dragStartX <= endX && dragStartY >= this.rulerHeight && dragStartY <= this.rulerHeight + 22))) {
        dragTarget = 'END';
        if (this.onBeforeCuesChange) this.onBeforeCuesChange();
        c.style.cursor = 'ew-resize';
      } else if (Math.abs(dragStartX - playheadX) <= 12) {
        dragTarget = 'PLAYHEAD';
        c.style.cursor = 'ew-resize';
      } else if (dragStartY <= this.rulerHeight) {
        this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        dragTarget = 'PLAYHEAD';
        c.style.cursor = 'ew-resize';
        this.render();
      } else {
        dragTarget = 'PAN';
      }
    };

    const onMove = (e) => {
      // Multi-touch pinch-to-zoom handling (Mobile)
      if (isPinching && e.touches && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        const p1 = getCanvasPos(e.touches[0]);
        const p2 = getCanvasPos(e.touches[1]);
        const curDistX = Math.abs(p1.x - p2.x);
        const midX = (p1.x + p2.x) / 2;

        const rawRatio = pinchStartDistX > 0 ? curDistX / pinchStartDistX : 1.0;
        const scaleX = rawRatio < 1.0 ? Math.pow(rawRatio, 1.8) : Math.pow(rawRatio, 1.4);
        const newZoom = Math.max(0.05, Math.min(200, pinchStartZoom * scaleX));
        if (newZoom !== this.zoomFactor) {
          this.zoomFactor = newZoom;
          this.scrollOffsetMs = pinchCenterTime - midX * this.msPerPixel;
          this.clampScroll();
        }
        this.render();
        return;
      }

      if (!isDragging) return;
      const curX = getX(e);
      const curTime = this.xToTime(curX);

      if (dragTarget === 'WORD' && dragWordInfo) {
        dragWordInfo.cue.setWordStartMs(dragWordInfo.wordIdx, curTime);
        c.style.cursor = 'ew-resize';
        if (this.onCuesUpdate) this.onCuesUpdate();
      } else if (dragTarget === 'CUE_START' && dragCueEdgeInfo) {
        dragCueEdgeInfo.cue.startMs = Math.max(0, Math.min(dragCueEdgeInfo.cue.endMs - 50, Math.round(curTime)));
        this.selectionStartMs = dragCueEdgeInfo.cue.startMs;
        c.style.cursor = 'ew-resize';
        if (this.onCuesUpdate) this.onCuesUpdate();
      } else if (dragTarget === 'CUE_END' && dragCueEdgeInfo) {
        dragCueEdgeInfo.cue.endMs = Math.max(dragCueEdgeInfo.cue.startMs + 50, Math.min(this.audio.durationMs, Math.round(curTime)));
        this.selectionEndMs = dragCueEdgeInfo.cue.endMs;
        c.style.cursor = 'ew-resize';
        if (this.onCuesUpdate) this.onCuesUpdate();
      } else if (dragTarget === 'START') {
        this.selectionStartMs = Math.max(0, Math.min(this.selectionEndMs - 50, Math.round(curTime)));
        if (this.activeCue && this.activeCue.clockState !== CueClockState.SHOW_LOCKED && this.activeCue.clockState !== CueClockState.OFF) {
          this.activeCue.startMs = this.selectionStartMs;
          if (this.onCuesUpdate) this.onCuesUpdate();
        }
        c.style.cursor = 'ew-resize';
      } else if (dragTarget === 'END') {
        this.selectionEndMs = Math.max(this.selectionStartMs + 50, Math.min(this.audio.durationMs, Math.round(curTime)));
        if (this.activeCue && this.activeCue.clockState !== CueClockState.SHOW_LOCKED && this.activeCue.clockState !== CueClockState.OFF) {
          this.activeCue.endMs = this.selectionEndMs;
          if (this.onCuesUpdate) this.onCuesUpdate();
        }
        c.style.cursor = 'ew-resize';
      } else if (dragTarget === 'PLAYHEAD') {
        this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        c.style.cursor = 'ew-resize';
      } else if (dragTarget === 'SCROLLBAR') {
        const durMs = this.audio ? this.audio.durationMs : 0;
        if (durMs > 0) {
          const deltaX = curX - dragStartX;
          const msPerScrollbarPixel = durMs / Math.max(1, this.width);
          // Positive deltaX (drag right) moves forward in time (+ deltaMs)
          const newOffset = dragStartScrollMs + deltaX * msPerScrollbarPixel;
          this.scrollOffsetMs = newOffset;
          this.clampScroll();
        }
        c.style.cursor = 'grabbing';
      } else {
        this.scrollOffsetMs = dragStartScrollMs - (curX - dragStartX) * this.msPerPixel;
        this.clampScroll();
      }
      this.render();
    };

    const onEnd = (e) => {
      if (isPinching) {
        if (!e.touches || e.touches.length < 2) {
          isPinching = false;
        }
      }
      if (isDragging && dragTarget === 'PAN') {
        const curX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - c.getBoundingClientRect().left;
        if (Math.abs(curX - dragStartX) < 5) {
          this.audio.seek(this.xToTime(curX));
        }
      }
      isDragging = false;
      this.isDraggingScrollbar = false;
      dragTarget = null;
      dragWordInfo = null;
      dragCueEdgeInfo = null;
      this.render();
    };

    c.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    c.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Trackpad or Shift+wheel horizontal scrolling in natural swipe direction
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || (e.shiftKey && !e.ctrlKey)) {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        this.scrollOffsetMs += delta * this.msPerPixel * 0.8;
        this.clampScroll();
        this.render();
        return;
      }
      const mouseX = e.clientX - c.getBoundingClientRect().left;
      const timeAtMouse = this.xToTime(mouseX);
      const factor = e.deltaY < 0 ? 1.30 : (1.0 / 1.30);
      const newZoom = Math.max(0.05, Math.min(200, this.zoomFactor * factor));
      if (newZoom !== this.zoomFactor) {
        this.zoomFactor = newZoom;
        this.scrollOffsetMs = timeAtMouse - mouseX * this.msPerPixel;
        this.clampScroll();
        this.render();
      }
    }, { passive: false });
  }
}

// -------------------------------------------------------------
// 5. Tab 2: Musical Chord Analyzer (Stacked CQT & Chromagram)
// -------------------------------------------------------------
class MusicalChordAnalyzer {
  constructor(cqtCanvas, chromaCanvas, audioEngine, midiCanvas = null) {
    this.cqtCanvas = cqtCanvas;
    this.chromaCanvas = chromaCanvas;
    this.midiCanvas = midiCanvas || document.getElementById('midi-canvas');
    this.cqtCtx = cqtCanvas ? cqtCanvas.getContext('2d', { alpha: false }) : null;
    this.chromaCtx = chromaCanvas ? chromaCanvas.getContext('2d', { alpha: false }) : null;
    this.midiCtx = this.midiCanvas ? this.midiCanvas.getContext('2d') : null;
    this.audio = audioEngine;

    // MIDI Transcription state
    this.isMidiVisible = false;
    this.midiNotes = null;
    this.midiWidth = 0;
    this.midiHeight = 0;

    this.data = null;
    this.paletteKey = 'INFERNO';
    this.zoomFactor = 35.0;
    this.scrollOffsetMs = 0;

    this.pitchRangeMode = 'AUTO';
    this.activeMinMidi = 38; // Default D2
    this.activeMaxMidi = 76; // Default E5

    this.rulerHeight = 24;
    this.minimapHeight = 24;
    this.leftGutterWidth = 54;
    this.isDraggingScrollbar = false;

    this.bpm = 120;
    this.barGridMode = '1_BAR'; // '1_BAR', 'HALF_BAR', 'QUARTER_BAR', 'OFF'

    // Offscreen Canvases for 60 FPS GPU-accelerated blitting
    this.cqtOffscreen = document.createElement('canvas');
    this.cqtOffscreenCtx = this.cqtOffscreen.getContext('2d', { alpha: false });

    this.chromaOffscreen = document.createElement('canvas');
    this.chromaOffscreenCtx = this.chromaOffscreen.getContext('2d', { alpha: false });

    this.offscreenValid = false;

    if (this.cqtCanvas && this.chromaCanvas) {
      this.initEvents();
    }
  }

  resize() {
    if (!this.cqtCanvas || !this.chromaCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const r1 = this.cqtCanvas.getBoundingClientRect();
    const r2 = this.chromaCanvas.getBoundingClientRect();

    if (r1.width > 0 && r1.height > 0) {
      this.cqtCanvas.width = Math.round(r1.width * dpr);
      this.cqtCanvas.height = Math.round(r1.height * dpr);
      this.cqtCtx.scale(dpr, dpr);
      this.cqtWidth = r1.width;
      this.cqtHeight = r1.height;
    }

    if (r2.width > 0 && r2.height > 0) {
      this.chromaCanvas.width = Math.round(r2.width * dpr);
      this.chromaCanvas.height = Math.round(r2.height * dpr);
      this.chromaCtx.scale(dpr, dpr);
      this.chromaWidth = r2.width;
      this.chromaHeight = r2.height;
    }

    if (this.midiCanvas && this.isMidiVisible) {
      if (!this.midiCtx) {
        this.midiCtx = this.midiCanvas.getContext('2d');
      }
      const rMidi = this.midiCanvas.getBoundingClientRect();
      if (rMidi.width > 0 && rMidi.height > 0) {
        this.midiCanvas.width = Math.round(rMidi.width * dpr);
        this.midiCanvas.height = Math.round(rMidi.height * dpr);
        if (this.midiCtx) {
          this.midiCtx.scale(dpr, dpr);
        }
        this.midiWidth = rMidi.width;
        this.midiHeight = rMidi.height;
      }
    }

    this.render();
  }

  get msPerPixel() {
    return Math.max(0.5, 100.0 / Math.max(0.05, this.zoomFactor));
  }

  timeToX(ms) {
    return this.leftGutterWidth + (ms - this.scrollOffsetMs) / this.msPerPixel;
  }

  xToTime(x) {
    return this.scrollOffsetMs + (x - this.leftGutterWidth) * this.msPerPixel;
  }

  resetPitchRangeToAuto() {
    if (this.data && typeof this.data.autoMinMidi === 'number' && typeof this.data.autoMaxMidi === 'number') {
      this.activeMinMidi = this.data.autoMinMidi;
      this.activeMaxMidi = this.data.autoMaxMidi;
    } else {
      this.activeMinMidi = 38;
      this.activeMaxMidi = 76;
    }
  }

  updatePitchRangeBounds() {
    if (typeof this.activeMinMidi !== 'number' || typeof this.activeMaxMidi !== 'number') {
      this.resetPitchRangeToAuto();
    }
  }

  buildOffscreenCanvases() {
    if (!this.data) return;
    const spec = this.data;
    const numFrames = spec.numFrames;
    if (numFrames <= 0) return;

    this.updatePitchRangeBounds();
    const minM = this.activeMinMidi;
    const maxM = this.activeMaxMidi;
    const renderedSemitones = maxM - minM + 1;
    if (renderedSemitones <= 0) return;

    // 1. Pre-render full CQT matrix to offscreen canvas
    if (this.cqtOffscreen.width !== numFrames || this.cqtOffscreen.height !== renderedSemitones) {
      this.cqtOffscreen.width = numFrames;
      this.cqtOffscreen.height = renderedSemitones;
    }

    const cqtImgData = this.cqtOffscreenCtx.createImageData(numFrames, renderedSemitones);
    const cqtBuf32 = new Uint32Array(cqtImgData.data.buffer);
    const lut = ColorLUT[this.paletteKey] || ColorLUT.INFERNO;
    const cqtMatrix = new Uint8Array(spec.cqtMatrix);
    const totalBins = spec.numSemitones;
    const globalMinM = spec.minMidi;

    for (let f = 0; f < numFrames; f++) {
      const frameBase = f * totalBins;
      for (let row = 0; row < renderedSemitones; row++) {
        const m = maxM - row;
        const sIdx = m - globalMinM;
        const q = (sIdx >= 0 && sIdx < totalBins) ? cqtMatrix[frameBase + sIdx] : 0;
        cqtBuf32[row * numFrames + f] = lut[q];
      }
    }
    this.cqtOffscreenCtx.putImageData(cqtImgData, 0, 0);

    // 2. Pre-render full 12-Tone Chromagram to offscreen canvas
    if (this.chromaOffscreen.width !== numFrames || this.chromaOffscreen.height !== 12) {
      this.chromaOffscreen.width = numFrames;
      this.chromaOffscreen.height = 12;
    }

    const chromaImgData = this.chromaOffscreenCtx.createImageData(numFrames, 12);
    const chromaBuf32 = new Uint32Array(chromaImgData.data.buffer);
    const chromaMatrix = new Uint8Array(spec.chromagramMatrix);

    for (let f = 0; f < numFrames; f++) {
      const frameBase = f * 12;
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
        chromaBuf32[row * numFrames + f] = (255 << 24) | (B << 16) | (G << 8) | R;
      }
    }
    this.chromaOffscreenCtx.putImageData(chromaImgData, 0, 0);

    this.offscreenValid = true;
  }

  clampScroll() {
    if (!this.audio || this.audio.durationMs <= 0) return;
    const viewW = (this.cqtWidth || 800) - this.leftGutterWidth;
    const visibleWindowMs = viewW * this.msPerPixel;
    const minScroll = 0;
    const maxScroll = Math.max(0, this.audio.durationMs - visibleWindowMs);
    this.scrollOffsetMs = Math.max(minScroll, Math.min(maxScroll, this.scrollOffsetMs));
  }

  render() {
    if (!this.cqtCanvas || this.cqtCanvas.offsetParent === null) return;
    this.clampScroll();
    this.renderCqtTier();
    if (this.isMidiVisible) {
      this.renderMidiTier();
    }
    this.renderChromaTier();
    this.updateCurrentChordIndicator();
  }

  renderCqtTier() {
    if (!this.cqtCtx || !this.cqtWidth || !this.cqtHeight) return;
    const ctx = this.cqtCtx, w = this.cqtWidth, h = this.cqtHeight;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, w, h);

    if (!this.data) return;

    this.updatePitchRangeBounds();

    const rulerH = this.rulerHeight;
    const graphH = h - rulerH;
    const gutterW = this.leftGutterWidth;

    const minM = this.activeMinMidi;
    const maxM = this.activeMaxMidi;
    const renderedSemitones = maxM - minM + 1;
    const semitoneH = graphH / renderedSemitones;

    // Piano Roll Labels (Active Range) & Horizontal Grid Lines
    // Thiết kế phím đàn Piano chân thực: Phím đen thụt vào so với phím trắng, font nhỏ hơn, chỉ ghi nhãn phím trắng
    const blackKeyW = Math.round(gutterW * 0.62); // Phím đen thụt vào ~38% chiều rộng gutter

    // 1. Vẽ các phím trắng trước (nền phím trắng rộng hết gutterW)
    for (let m = minM; m <= maxM; m++) {
      const row = maxM - m;
      const y = rulerH + row * semitoneH;
      const pc = m % 12;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      if (!isBlack) {
        ctx.fillStyle = '#222634';
        ctx.fillRect(0, y, gutterW, semitoneH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y, gutterW, semitoneH);

        // Chỉ ghi chú giá trị nốt cho phím trắng với cỡ chữ nhỏ 8.5px
        ctx.fillStyle = (pc === 0) ? '#38bdf8' : '#e2e8f0';
        ctx.font = (pc === 0 ? 'bold ' : '') + '8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(midiToNoteLabel(m), gutterW - 4, y + semitoneH / 2);
      }
    }

    // 2. Vẽ các phím đen (ngắn hơn, thụt vào phía trong) và đường lưới ngang
    for (let m = minM; m <= maxM; m++) {
      const row = maxM - m;
      const y = rulerH + row * semitoneH;
      const pc = m % 12;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      if (isBlack) {
        // Khoảng lộ ra của phím trắng ở phần đầu thụt vào
        ctx.fillStyle = '#1b1e2a';
        ctx.fillRect(blackKeyW, y, gutterW - blackKeyW, semitoneH);

        // Thân phím đen (ngắn hơn, màu đen tuyền obsidian)
        ctx.fillStyle = '#0d0f17';
        ctx.fillRect(0, y + 0.5, blackKeyW, semitoneH - 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y + 0.5, blackKeyW, semitoneH - 1);
      }

      // Đường lưới ngang qua Spectrogram
      ctx.strokeStyle = (pc === 0) ? 'rgba(56, 189, 248, 0.3)' : (isBlack ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.08)');
      ctx.beginPath();
      ctx.moveTo(gutterW, y + semitoneH);
      ctx.lineTo(w, y + semitoneH);
      ctx.stroke();
    }

    // Fast 60 FPS Blit from Pre-rendered Offscreen Canvas
    const spec = this.data;
    if (!this.offscreenValid) {
      this.buildOffscreenCanvases();
    }

    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(w);
    const fStart = Math.max(0, Math.floor(vStartMs / spec.timeResolutionMs));
    const fEnd = Math.min(spec.numFrames - 1, Math.ceil(vEndMs / spec.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;

    if (renderFrames > 0 && renderedSemitones > 0 && this.offscreenValid) {
      const startX = this.timeToX(fStart * spec.timeResolutionMs);
      const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.cqtOffscreen,
        fStart, 0, renderFrames, renderedSemitones,
        startX, rulerH, endX - startX, graphH
      );
    }

    // BPM & Bar / Beat Grid lines across CQT Spectrogram
    this.drawBpmGrid(ctx, gutterW, rulerH, w, graphH, false);

    // Time Ruler
    this.drawTimeRuler(ctx, 0, 0, w, rulerH);

    // Yellow Playhead (clean straight line, no lower triangle)
    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
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

      // Clean straight yellow line across CQT (NO lower triangle)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }

  renderChromaTier() {
    if (!this.chromaCtx || !this.chromaWidth || !this.chromaHeight) return;
    const ctx = this.chromaCtx, w = this.chromaWidth, h = this.chromaHeight;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, w, h);

    if (!this.data) return;

    const miniH = this.minimapHeight;
    const graphH = h - miniH;
    const gutterW = this.leftGutterWidth;
    const laneH = graphH / 12.0;

    for (let pcRow = 0; pcRow < 12; pcRow++) {
      const pc = 11 - pcRow;
      const y = pcRow * laneH;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      ctx.fillStyle = isBlack ? '#18181b' : '#27272a';
      ctx.fillRect(0, y, gutterW, laneH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(0, y, gutterW, laneH);

      ctx.fillStyle = (pc === 0) ? '#fde047' : '#f4f4f5';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(NOTE_NAMES[pc], gutterW - 8, y + laneH / 2);

      // Horizontal grid lines across Chromagram
      ctx.strokeStyle = (pc === 0) ? 'rgba(253, 224, 71, 0.28)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(gutterW, y + laneH);
      ctx.lineTo(w, y + laneH);
      ctx.stroke();
    }

    // Fast 60 FPS Blit from Pre-rendered Chromagram Offscreen Canvas
    const spec = this.data;
    if (!this.offscreenValid) {
      this.buildOffscreenCanvases();
    }

    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(w);
    const fStart = Math.max(0, Math.floor(vStartMs / spec.timeResolutionMs));
    const fEnd = Math.min(spec.numFrames - 1, Math.ceil(vEndMs / spec.timeResolutionMs));
    const renderFrames = fEnd - fStart + 1;

    if (renderFrames > 0 && this.offscreenValid) {
      const startX = this.timeToX(fStart * spec.timeResolutionMs);
      const endX = this.timeToX((fEnd + 1) * spec.timeResolutionMs);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.chromaOffscreen,
        fStart, 0, renderFrames, 12,
        startX, 0, endX - startX, graphH
      );
    }

    // BPM & Bar / Beat Grid lines across Chromagram
    this.drawBpmGrid(ctx, gutterW, 0, w, graphH, false);

    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
    if (playheadX >= gutterW && playheadX <= w) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, graphH);
      ctx.stroke();
    }

    this.drawMinimap(ctx, 0, h - miniH, w, miniH);
  }

  renderMidiTier() {
    if (!this.midiCanvas || !this.midiCtx || !this.midiWidth || !this.midiHeight) return;
    const ctx = this.midiCtx, w = this.midiWidth, h = this.midiHeight;

    // Background
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, w, h);

    const gutterW = this.leftGutterWidth;
    const minM = this.activeMinMidi;
    const maxM = this.activeMaxMidi;
    const renderedSemitones = Math.max(1, maxM - minM + 1);
    const semitoneH = h / renderedSemitones;

    // Gutter piano roll labels
    const blackKeyW = Math.round(gutterW * 0.62);
    for (let m = minM; m <= maxM; m++) {
      const row = maxM - m;
      const y = row * semitoneH;
      const pc = m % 12;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      if (!isBlack) {
        ctx.fillStyle = '#222634';
        ctx.fillRect(0, y, gutterW, semitoneH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y, gutterW, semitoneH);

        const octave = Math.floor(m / 12) - 1;
        ctx.fillStyle = (pc === 0) ? '#fde047' : '#94a3b8';
        ctx.font = (pc === 0) ? 'bold 10px "JetBrains Mono", monospace' : '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${NOTE_NAMES[pc]}${octave}`, gutterW - 6, y + semitoneH / 2);
      }
    }

    for (let m = minM; m <= maxM; m++) {
      const row = maxM - m;
      const y = row * semitoneH;
      const pc = m % 12;
      const isBlack = (pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10);

      if (isBlack) {
        ctx.fillStyle = '#11131a';
        ctx.fillRect(0, y, blackKeyW, semitoneH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y, blackKeyW, semitoneH);
      }

      // Horizontal grid lines across timeline
      ctx.strokeStyle = (pc === 0) ? 'rgba(250, 204, 21, 0.22)' : 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(gutterW, y + semitoneH);
      ctx.lineTo(w, y + semitoneH);
      ctx.stroke();
    }

    // BPM & Bar / Beat Grid lines across MIDI Piano Roll
    this.drawBpmGrid(ctx, gutterW, 0, w, h, false);

    // Render transcribed MIDI notes
    if (this.midiNotes && this.midiNotes.length > 0) {
      const vStartMs = this.xToTime(gutterW);
      const vEndMs = this.xToTime(w);

      for (const note of this.midiNotes) {
        if (note.endMs < vStartMs || note.startMs > vEndMs) continue;
        if (note.pitch < minM || note.pitch > maxM) continue;

        const row = maxM - note.pitch;
        const noteY = row * semitoneH;
        const x1 = Math.max(gutterW, this.timeToX(note.startMs));
        const x2 = Math.min(w, this.timeToX(note.endMs));
        const noteW = Math.max(3.5, x2 - x1);
        const noteH = Math.max(3, semitoneH - 1.5);

        // Unified clean MIDI note color (all notes share the same aesthetic)
        const gradTop = '#38bdf8';
        const gradBottom = '#0284c7';
        const strokeCol = '#7dd3fc';

        const grad = ctx.createLinearGradient(x1, noteY, x1, noteY + noteH);
        grad.addColorStop(0, gradTop);
        grad.addColorStop(1, gradBottom);

        ctx.fillStyle = grad;
        const cornerR = Math.min(3, noteW / 3, noteH / 3);
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x1, noteY + 0.75, noteW, noteH, cornerR);
          ctx.fill();
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillRect(x1, noteY + 0.75, noteW, noteH);
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, noteY + 0.75, noteW, noteH);
        }

        // Note label inside bar if wide enough
        if (noteW >= 24 && noteH >= 9) {
          const octave = Math.floor(note.pitch / 12) - 1;
          const noteText = `${NOTE_NAMES[note.pitch % 12]}${octave}`;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(noteText, x1 + noteW / 2, noteY + noteH / 2 + 0.5);
        }
      }
    } else {
      // Empty hint when no notes transcribed yet
      ctx.fillStyle = '#71717a';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Đang chuẩn bị dữ liệu MIDI từ CQT & Hợp âm...', (gutterW + w) / 2, h / 2);
    }

    // Yellow Playhead
    const playheadMs = this.audio.getCurrentPosition();
    const playheadX = this.timeToX(playheadMs);
    if (playheadX >= gutterW && playheadX <= w) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }

  transcribeMidiFromCqt() {
    if (!this.data) return [];
    const spec = this.data;
    const numFrames = spec.numFrames;
    const totalBins = spec.numSemitones;
    const globalMinM = spec.minMidi;
    const globalMaxM = spec.maxMidi;
    const timeResMs = spec.timeResolutionMs || 20.0;
    const detectedChords = spec.detectedChords || [];

    if (!spec.cqtMatrix || numFrames <= 0 || totalBins <= 0) return [];
    const cqtMatrix = new Uint8Array(spec.cqtMatrix);

    const CHORD_NOTES_MAP = {
      'C': [0, 4, 7], 'C#': [1, 5, 8], 'Db': [1, 5, 8],
      'D': [2, 6, 9], 'D#': [3, 7, 10], 'Eb': [3, 7, 10],
      'E': [4, 8, 11],
      'F': [5, 9, 0], 'F#': [6, 10, 1], 'Gb': [6, 10, 1],
      'G': [7, 11, 2], 'G#': [8, 0, 3], 'Ab': [8, 0, 3],
      'A': [9, 1, 4], 'A#': [10, 2, 5], 'Bb': [10, 2, 5],
      'B': [11, 3, 6],
      'Cm': [0, 3, 7], 'C#m': [1, 4, 8], 'Dbm': [1, 4, 8],
      'Dm': [2, 5, 9], 'D#m': [3, 6, 10], 'Ebm': [3, 6, 10],
      'Em': [4, 7, 11],
      'Fm': [5, 8, 0], 'F#m': [6, 9, 1], 'Gbm': [6, 9, 1],
      'Gm': [7, 10, 2], 'G#m': [8, 11, 3], 'Abm': [8, 11, 3],
      'Am': [9, 0, 4], 'A#m': [10, 1, 5], 'Bbm': [10, 1, 5],
      'Bm': [11, 2, 6]
    };

    const notes = [];
    const activeTracks = new Map(); // pitch -> { startFrame, lastFrame, lastVal, maxVal, chord }

    for (let f = 0; f < numFrames; f++) {
      const frameBase = f * totalBins;
      const chord = detectedChords[f] || '';
      const chordPcs = CHORD_NOTES_MAP[chord] || null;

      // Nếu frame không nhận diện được hợp âm hợp lệ thì bỏ qua
      if (!chordPcs || chordPcs.length === 0) continue;

      const currentFramePitches = new Map();

      // Chỉ xét các nốt thuộc hợp âm đã nhận diện (ví dụ G -> G, B, D) trên toàn bộ dải cao độ CQT
      for (let m = globalMinM; m <= globalMaxM; m++) {
        const pc = m % 12;
        if (!chordPcs.includes(pc)) continue; // Lọc sạch mọi nốt không thuộc hợp âm

        const s = m - globalMinM;
        if (s < 0 || s >= totalBins) continue;

        const val = cqtMatrix[frameBase + s];
        const valPrev = (s > 0) ? cqtMatrix[frameBase + s - 1] : 0;
        const valNext = (s < totalBins - 1) ? cqtMatrix[frameBase + s + 1] : 0;

        // Đối chiếu lại với CQT để xem cao độ đó có thực sự phát ra âm thanh không
        const peakEnergy = Math.max(val, valPrev, valNext);
        if (peakEnergy >= 36) {
          if (val >= 34 && (val >= valPrev * 0.90 || val >= valNext * 0.90)) {
            currentFramePitches.set(m, {
              val: peakEnergy,
              chord
            });
          }
        }
      }

      // Cập nhật các note tracks liên tục theo thời gian
      for (const [m, pData] of currentFramePitches) {
        if (activeTracks.has(m)) {
          const track = activeTracks.get(m);
          // Onset detection: nếu năng lượng tăng vọt đột ngột (+40) sau một khoảng thời gian -> ngắt note cũ và gõ lại note mới
          if (pData.val > track.lastVal + 40 && (f - track.startFrame) >= 5) {
            const durFrames = track.lastFrame - track.startFrame + 1;
            if (durFrames >= 3) {
              notes.push({
                pitch: m,
                startMs: Math.round(track.startFrame * timeResMs),
                endMs: Math.round((track.lastFrame + 1) * timeResMs),
                velocity: Math.min(127, Math.max(50, Math.round(40 + (track.maxVal / 255) * 85))),
                chordName: track.chord
              });
            }
            activeTracks.set(m, {
              startFrame: f,
              lastFrame: f,
              lastVal: pData.val,
              maxVal: pData.val,
              chord: pData.chord
            });
          } else {
            track.lastFrame = f;
            track.lastVal = pData.val;
            track.maxVal = Math.max(track.maxVal, pData.val);
          }
        } else {
          activeTracks.set(m, {
            startFrame: f,
            lastFrame: f,
            lastVal: pData.val,
            maxVal: pData.val,
            chord: pData.chord
          });
        }
      }

      // Đóng các nốt đã ngắt tiếng
      for (const [m, track] of activeTracks.entries()) {
        if (!currentFramePitches.has(m)) {
          if (f - track.lastFrame > 1) {
            const durFrames = track.lastFrame - track.startFrame + 1;
            if (durFrames >= 3 && track.maxVal >= 38) {
              notes.push({
                pitch: m,
                startMs: Math.round(track.startFrame * timeResMs),
                endMs: Math.round((track.lastFrame + 1) * timeResMs),
                velocity: Math.min(127, Math.max(50, Math.round(40 + (track.maxVal / 255) * 85))),
                chordName: track.chord
              });
            }
            activeTracks.delete(m);
          }
        }
      }
    }

    // Kết thúc bài: ghi nhận các nốt còn lại
    for (const [m, track] of activeTracks.entries()) {
      const durFrames = track.lastFrame - track.startFrame + 1;
      if (durFrames >= 3 && track.maxVal >= 38) {
        notes.push({
          pitch: m,
          startMs: Math.round(track.startFrame * timeResMs),
          endMs: Math.round((track.lastFrame + 1) * timeResMs),
          velocity: Math.min(127, Math.max(50, Math.round(40 + (track.maxVal / 255) * 85))),
          chordName: track.chord
        });
      }
    }

    // Sắp xếp các nốt theo thứ tự thời gian
    notes.sort((a, b) => (a.startMs - b.startMs) || (a.pitch - b.pitch));

    // Nối các phân đoạn cùng nốt nếu khoảng cách quá ngắn (<= 60ms)
    const merged = [];
    for (const note of notes) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        if (prev.pitch === note.pitch && (note.startMs - prev.endMs) <= 60 && prev.chordName === note.chordName) {
          prev.endMs = Math.max(prev.endMs, note.endMs);
          prev.velocity = Math.round((prev.velocity + note.velocity) / 2);
          continue;
        }
      }
      merged.push(note);
    }

    this.midiNotes = merged;
    return merged;
  }


  drawTimeRuler(ctx, x, y, width, height) {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = '#27272a';
    ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + width, y + height); ctx.stroke();

    const gutterW = this.leftGutterWidth;
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, y, gutterW, height);

    const msPerPx = this.msPerPixel;
    let stepMs = 1000;
    if (msPerPx < 1.0) stepMs = 200;
    else if (msPerPx < 2.5) stepMs = 500;
    else if (msPerPx < 6.0) stepMs = 1000;
    else stepMs = 2000;

    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(width);
    const firstTick = Math.floor(vStartMs / stepMs) * stepMs;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    const durMs = this.audio ? this.audio.durationMs : 0;
    for (let t = firstTick; t <= vEndMs; t += stepMs) {
      if (t < 0) continue;
      const isPastAudio = durMs > 0 && t > durMs;
      const tx = this.timeToX(t);
      if (tx >= gutterW && tx <= width) {
        ctx.strokeStyle = isPastAudio ? '#27272a' : '#475569';
        ctx.beginPath(); ctx.moveTo(tx, y + height - 6); ctx.lineTo(tx, y + height); ctx.stroke();
        ctx.fillStyle = isPastAudio ? '#52525b' : '#94a3b8';
        ctx.fillText(TimeFormatter.formatFull(t), tx + 4, y + 14);
      }
    }

    if (durMs > 0) {
      const endTx = this.timeToX(durMs);
      if (endTx >= gutterW && endTx <= width) {
        ctx.strokeStyle = '#f43f5e';
        ctx.beginPath(); ctx.moveTo(endTx, y + height - 10); ctx.lineTo(endTx, y + height); ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('END ' + TimeFormatter.formatFull(durMs), endTx + 4, y + 11);
      }
    }

    // BPM & Bar / Beat Markers on Time Ruler
    this.drawBpmGrid(ctx, gutterW, y, width, height, true);
  }

  drawBpmGrid(ctx, gutterW, topY, width, height, isRuler = false) {
    if (this.barGridMode === 'OFF' || !this.bpm || this.bpm <= 0) return;

    const beatMs = 60000.0 / this.bpm;
    const barMs = beatMs * 4.0; // 4/4 meter
    const msPerPx = this.msPerPixel;
    const pixelsPerBar = barMs / msPerPx;
    if (pixelsPerBar < 6) return; // Song is zoomed out to bird's-eye view, skip bar grid to avoid visual clutter
    let gridStepMs = barMs;
    if (this.barGridMode === 'HALF_BAR') gridStepMs = barMs / 2.0;
    else if (this.barGridMode === 'QUARTER_BAR') gridStepMs = barMs / 4.0;

    const vStartMs = this.xToTime(gutterW);
    const vEndMs = this.xToTime(width);
    const firstGridMs = Math.floor(vStartMs / gridStepMs) * gridStepMs;

    ctx.save();
    for (let t = firstGridMs; t <= vEndMs; t += gridStepMs) {
      if (t < -0.1) continue;
      const gx = this.timeToX(t);
      if (gx < gutterW || gx > width) continue;

      const eps = 1.0;
      const remBar = Math.abs(t % barMs);
      const isFullBar = remBar < eps || Math.abs(remBar - barMs) < eps;
      const remHalf = Math.abs(t % (barMs / 2.0));
      const isHalfBar = remHalf < eps || Math.abs(remHalf - (barMs / 2.0)) < eps;

      if (isFullBar) {
        // Vạch 1 Bar (Khuôn nhịp): Màu vàng kim hổ phách sắc nét
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx, topY + height);
        ctx.stroke();

        if (isRuler) {
          const barNum = Math.round(t / barMs) + 1;
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Bar ${barNum}`, gx, topY + 11);
        }
      } else if (isHalfBar) {
        // Vạch 1/2 Bar: Nét đứt màu xanh Cyan
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx, topY + height);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Vạch 1/4 Bar (Phách): Nét đứt mảnh mờ
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx, topY + height);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  drawMinimap(ctx, x, y, width, height) {
    // 1. Sleek modern track background (clean, no waveform mirror)
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    const durMs = this.audio.durationMs;
    if (durMs <= 0) return;

    const gutterW = this.leftGutterWidth;
    const plotW = width - gutterW;

    // 2. Subtle groove line along center of track
    ctx.fillStyle = '#1e293b';
    const grooveH = Math.max(2, Math.round(height * 0.28));
    const grooveY = y + Math.round((height - grooveH) / 2);
    ctx.fillRect(gutterW, grooveY, plotW, grooveH);

    // 3. Compact modern scrollbar thumb (violet theme for Tab 2)
    const visibleDurMs = plotW * this.msPerPixel;
    const thumbStartMs = Math.max(0, Math.min(durMs, this.scrollOffsetMs));
    const thumbEndMs = Math.max(0, Math.min(durMs, this.scrollOffsetMs + visibleDurMs));
    const thumbX = gutterW + (thumbStartMs / durMs) * plotW;
    const thumbW = Math.max(16, ((thumbEndMs - thumbStartMs) / durMs) * plotW);

    const thumbPadY = 2;
    const thumbH = Math.max(4, height - thumbPadY * 2);
    const thumbY = y + thumbPadY;

    ctx.fillStyle = this.isDraggingScrollbar ? '#c084fc' : 'rgba(168, 85, 247, 0.65)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbW, thumbH, Math.min(3, thumbH / 2));
      ctx.fill();
    } else {
      ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
    }
  }

  updateCurrentChordIndicator() {
    if (!this.data || !this.data.detectedChords) return;
    const curMs = this.audio.getCurrentPosition();
    const f = Math.max(0, Math.min(this.data.numFrames - 1, Math.floor(curMs / this.data.timeResolutionMs)));
    const chord = this.data.detectedChords[f] || '--';
    const el = document.getElementById('tab2-detected-chord');
    if (el) el.textContent = chord;
  }

  initEvents() {
    const bindCanvasGestures = (canvas) => {
      if (!canvas) return;
      let isDragging = false, dragTarget = 'PAN';
      let dragStartX = 0, dragStartY = 0, dragStartScrollMs = 0;
      let dragStartMinMidi = 0, dragStartMaxMidi = 0;

      // Pinch-to-zoom tracking for mobile / multi-touch
      let isPinching = false;
      let pinchStartDistX = 0, pinchStartDistY = 0;
      let pinchStartZoom = this.zoomFactor;
      let pinchStartSpan = 0;
      let pinchCenterTime = 0;
      let pinchCenterFracY = 0;
      let pinchCenterNote = 0;
      let pinchLockedAxis = null; // 'X' (horizontal time zoom) or 'Y' (vertical pitch zoom)

      const getCanvasPos = (touchOrMouse) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: touchOrMouse.clientX - rect.left,
          y: touchOrMouse.clientY - rect.top
        };
      };

      const getX = (e) => (e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
      const getY = (e) => (e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY) - canvas.getBoundingClientRect().top;

      canvas.addEventListener('mousemove', (e) => {
        if (isDragging) return;
        const curX = getX(e);
        const curY = getY(e);
        const rectH = canvas.getBoundingClientRect().height;

        // Minimap scrollbar hover on bottom of chroma
        if (canvas === this.chromaCanvas && curY >= rectH - this.minimapHeight && curX >= this.leftGutterWidth) {
          canvas.style.cursor = 'pointer';
          return;
        }

        const playheadX = this.timeToX(this.audio.getCurrentPosition());
        if (Math.abs(curX - playheadX) <= 8 && curX >= this.leftGutterWidth) {
          canvas.style.cursor = 'ew-resize';
        } else {
          canvas.style.cursor = 'default';
        }
      });

      canvas.addEventListener('mouseleave', () => {
        if (!isDragging) canvas.style.cursor = 'default';
      });

      const onStart = (e) => {
        // Multi-touch pinch-to-zoom detection (Mobile)
        if (e.touches && e.touches.length >= 2) {
          isPinching = true;
          isDragging = false;
          dragTarget = null;
          this.isDraggingScrollbar = false;

          const p1 = getCanvasPos(e.touches[0]);
          const p2 = getCanvasPos(e.touches[1]);

          pinchStartDistX = Math.abs(p1.x - p2.x);
          pinchStartDistY = Math.abs(p1.y - p2.y);
          pinchStartZoom = this.zoomFactor;
          pinchStartSpan = Math.max(6, this.activeMaxMidi - this.activeMinMidi);

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          pinchCenterTime = this.xToTime(midX);

          if (canvas === this.cqtCanvas && this.cqtHeight > this.rulerHeight) {
            const rulerH = this.rulerHeight;
            const graphH = this.cqtHeight - rulerH;
            const clampedY = Math.max(rulerH, Math.min(this.cqtHeight, midY));
            pinchCenterFracY = Math.max(0, Math.min(1, (clampedY - rulerH) / Math.max(1, graphH)));
            pinchCenterNote = this.activeMaxMidi - pinchCenterFracY * pinchStartSpan;
          }

          // Separate horizontal from vertical zoom by analyzing primary pinch direction
          pinchLockedAxis = pinchStartDistY > pinchStartDistX * 1.35 ? 'Y' : 'X';
          return;
        }

        isDragging = true;
        dragStartX = getX(e);
        dragStartY = getY(e);
        dragStartScrollMs = this.scrollOffsetMs;
        dragStartMinMidi = this.activeMinMidi;
        dragStartMaxMidi = this.activeMaxMidi;

        const rectH = canvas.getBoundingClientRect().height;
        const durMs = this.audio ? this.audio.durationMs : 0;

        // 1. Click / drag on slim bottom scrollbar (Chromagram bottom minimap)
        const isTouchTab2 = (e.touches && e.touches.length > 0);
        const tab2HitH = isTouchTab2 ? Math.max(36, this.minimapHeight + 12) : this.minimapHeight;
        if (canvas === this.chromaCanvas && dragStartY >= rectH - tab2HitH && dragStartX >= this.leftGutterWidth) {
          dragTarget = 'SCROLLBAR';
          this.isDraggingScrollbar = true;
          canvas.style.cursor = 'grabbing';
          if (durMs > 0) {
            const plotW = Math.max(1, this.chromaWidth - this.leftGutterWidth);
            const clickFrac = Math.max(0, Math.min(1, (dragStartX - this.leftGutterWidth) / plotW));
            const targetMs = clickFrac * durMs;
            const visibleDurMs = plotW * this.msPerPixel;
            this.scrollOffsetMs = targetMs - visibleDurMs * 0.5;
            this.clampScroll();
            dragStartScrollMs = this.scrollOffsetMs;
            this.render();
          }
          return;
        }

        const curTime = this.xToTime(dragStartX);
        const playheadX = this.timeToX(this.audio.getCurrentPosition());

        if (Math.abs(dragStartX - playheadX) <= 10 && dragStartX >= this.leftGutterWidth) {
          dragTarget = 'PLAYHEAD';
          this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        } else if (dragStartX > this.leftGutterWidth) {
          dragTarget = 'PAN';
          this.audio.seek(Math.max(0, Math.min(this.audio.durationMs, curTime)));
        } else {
          dragTarget = 'PAN';
        }
      };

      const onMove = (e) => {
        // Multi-touch pinch handling (Mobile)
        if (isPinching && e.touches && e.touches.length >= 2) {
          if (e.cancelable) e.preventDefault();
          const p1 = getCanvasPos(e.touches[0]);
          const p2 = getCanvasPos(e.touches[1]);

          const curDistX = Math.abs(p1.x - p2.x);
          const curDistY = Math.abs(p1.y - p2.y);
          const midX = (p1.x + p2.x) / 2;

          // Determine/confirm axis of zoom gesture
          if (!pinchLockedAxis) {
            if (curDistY > curDistX * 1.35) pinchLockedAxis = 'Y';
            else if (curDistX > curDistY * 1.35) pinchLockedAxis = 'X';
          }

          if (pinchLockedAxis === 'Y' && canvas === this.cqtCanvas && this.cqtHeight > this.rulerHeight) {
            // Zoom theo chiều dọc (Dải cao độ nốt)
            const scaleY = pinchStartDistY > 0 ? curDistY / pinchStartDistY : 1.0;
            // scaleY > 1: tách 2 ngón ra xa theo chiều dọc -> Zoom in (thu hẹp dải nốt)
            let newSpan = Math.round(pinchStartSpan / Math.max(0.1, scaleY));
            newSpan = Math.max(8, Math.min(88, newSpan));

            let newMaxMidi = Math.round(pinchCenterNote + pinchCenterFracY * newSpan);
            let newMinMidi = newMaxMidi - newSpan;
            const globalMin = 21, globalMax = 108;
            if (newMinMidi < globalMin) { newMinMidi = globalMin; newMaxMidi = Math.min(globalMax, globalMin + newSpan); }
            if (newMaxMidi > globalMax) { newMaxMidi = globalMax; newMinMidi = Math.max(globalMin, globalMax - newSpan); }

            if (newMinMidi !== this.activeMinMidi || newMaxMidi !== this.activeMaxMidi) {
              this.activeMinMidi = newMinMidi;
              this.activeMaxMidi = newMaxMidi;
              this.offscreenValid = false;
              this.buildOffscreenCanvases();
            }
          } else {
            // Zoom theo chiều ngang (Trục thời gian)
            const rawRatio = pinchStartDistX > 0 ? curDistX / pinchStartDistX : 1.0;
            const scaleX = rawRatio < 1.0 ? Math.pow(rawRatio, 1.8) : Math.pow(rawRatio, 1.4);
            const newZoom = Math.max(0.05, Math.min(250, pinchStartZoom * scaleX));
            if (newZoom !== this.zoomFactor) {
              this.zoomFactor = newZoom;
              this.scrollOffsetMs = pinchCenterTime - (midX - this.leftGutterWidth) * this.msPerPixel;
              this.clampScroll();
            }
          }

          this.render();
          return;
        }

        if (!isDragging) return;
        const curX = getX(e);
        const durMs = this.audio ? this.audio.durationMs : 0;

        if (dragTarget === 'SCROLLBAR') {
          if (durMs > 0) {
            const plotW = Math.max(1, this.chromaWidth - this.leftGutterWidth);
            const deltaX = curX - dragStartX;
            const msPerScrollbarPixel = durMs / plotW;
            // Positive deltaX (drag right) moves forward in time (+ deltaMs)
            this.scrollOffsetMs = dragStartScrollMs + deltaX * msPerScrollbarPixel;
            this.clampScroll();
          }
          canvas.style.cursor = 'grabbing';
        } else {
          // Standard pan across spectrogram
          this.scrollOffsetMs = dragStartScrollMs - (curX - dragStartX) * this.msPerPixel;
          this.clampScroll();

          // Kéo chuột theo chiều dọc trên CQT Canvas để cuộn dải nốt (Vertical Pitch Pan)
          if (canvas === this.cqtCanvas && this.cqtHeight > this.rulerHeight) {
            const curY = getY(e);
            const graphH = this.cqtHeight - this.rulerHeight;
            const currentSpan = dragStartMaxMidi - dragStartMinMidi + 1;
            const semitoneH = graphH / Math.max(1, currentSpan);
            const deltaNotes = Math.round((curY - dragStartY) / semitoneH);

            if (deltaNotes !== 0) {
              const span = dragStartMaxMidi - dragStartMinMidi;
              let newMin = dragStartMinMidi + deltaNotes;
              let newMax = dragStartMaxMidi + deltaNotes;
              const globalMin = 21, globalMax = 108;
              if (newMin < globalMin) { newMin = globalMin; newMax = globalMin + span; }
              if (newMax > globalMax) { newMax = globalMax; newMin = globalMax - span; }
              if (newMin !== this.activeMinMidi || newMax !== this.activeMaxMidi) {
                this.activeMinMidi = newMin;
                this.activeMaxMidi = newMax;
                this.offscreenValid = false;
                this.buildOffscreenCanvases();
              }
            }
          }
        }

        this.render();
      };

      const onEnd = (e) => {
        if (isPinching) {
          if (e.touches && e.touches.length < 2) {
            isPinching = false;
            pinchLockedAxis = null;
          }
        }
        isDragging = false;
        dragTarget = null;
        this.isDraggingScrollbar = false;
        this.render();
      };

      canvas.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      canvas.addEventListener('touchstart', onStart, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);

      // Mouse & Trackpad Zoom / Scroll (Tách riêng Zoom dọc và Zoom ngang)
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Cuộn ngang 2 ngón trackpad thông thường: cuộn dòng thời gian
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          this.scrollOffsetMs += e.deltaX * this.msPerPixel * 0.8;
          this.clampScroll();
          this.render();
          return;
        }

        // Tách Zoom dọc và Zoom ngang:
        // - Shift + Wheel (hoặc con trỏ rê ở cột nốt bên trái piano): Zoom THEO CHIỀU DỌC (Cao độ nốt)
        // - Cuộn bánh xe thông thường: Zoom THEO CHIỀU NGANG (Thời gian)
        const isVerticalZoomIntent = e.shiftKey || (mouseX < this.leftGutterWidth && canvas === this.cqtCanvas);

        if (isVerticalZoomIntent && canvas === this.cqtCanvas && this.cqtHeight > this.rulerHeight) {
          // --- ZOOM THEO CHIỀU DỌC (Cao độ nốt CQT) ---
          const rulerH = this.rulerHeight;
          const graphH = this.cqtHeight - rulerH;
          const currentSpan = Math.max(6, this.activeMaxMidi - this.activeMinMidi);

          // Tỉ lệ vị trí Y chuột trong biểu đồ CQT (0 = đỉnh, 1 = đáy)
          const clampedMouseY = Math.max(rulerH, Math.min(this.cqtHeight, mouseY));
          const fracY = Math.max(0, Math.min(1, (clampedMouseY - rulerH) / graphH));
          const noteAtMouse = this.activeMaxMidi - fracY * currentSpan;

          const wheelDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
          const zoomFactorY = wheelDelta < 0 ? 0.85 : 1.18;
          let newSpan = Math.round(currentSpan * zoomFactorY);
          newSpan = Math.max(8, Math.min(88, newSpan)); // Tối thiểu 8 nốt, tối đa 88 nốt piano

          if (newSpan !== currentSpan) {
            let newMaxMidi = Math.round(noteAtMouse + fracY * newSpan);
            let newMinMidi = newMaxMidi - newSpan;

            const globalMin = 21; // A0
            const globalMax = 108; // C8

            if (newMinMidi < globalMin) {
              newMinMidi = globalMin;
              newMaxMidi = Math.min(globalMax, globalMin + newSpan);
            }
            if (newMaxMidi > globalMax) {
              newMaxMidi = globalMax;
              newMinMidi = Math.max(globalMin, globalMax - newSpan);
            }

            if (newMinMidi !== this.activeMinMidi || newMaxMidi !== this.activeMaxMidi) {
              this.activeMinMidi = newMinMidi;
              this.activeMaxMidi = newMaxMidi;
              this.offscreenValid = false;
              this.buildOffscreenCanvases();
            }
          }
        } else {
          // --- ZOOM THEO CHIỀU NGANG (Trục thời gian X), tâm tại con trỏ mouseX ---
          const timeAtMouse = this.xToTime(mouseX);
          const factor = e.deltaY < 0 ? 1.30 : (1.0 / 1.30);
          const newZoom = Math.max(0.05, Math.min(250, this.zoomFactor * factor));
          if (newZoom !== this.zoomFactor) {
            this.zoomFactor = newZoom;
            this.scrollOffsetMs = timeAtMouse - (mouseX - this.leftGutterWidth) * this.msPerPixel;
            this.clampScroll();
          }
        }

        this.render();
      }, { passive: false });
    };

    bindCanvasGestures(this.cqtCanvas);
    bindCanvasGestures(this.chromaCanvas);
    if (this.midiCanvas) {
      bindCanvasGestures(this.midiCanvas);
    }
  }
}

// -------------------------------------------------------------
// 6. Main Application Controller (SpectroSubApp)
// -------------------------------------------------------------
class SpectroSubApp {
  constructor() {
    this.currentTab = 'tab1';

    // Isolated Audio Engines
    this.audioTab1 = new AudioEngine('Tab1');
    this.audioTab2 = new AudioEngine('Tab2');

    // Tab 1 Subtitle cues & Selection
    this.cuesTab1 = [];
    this.activeCueTab1 = null;
    this.selectedCueIds = new Set();

    // Tab 1 DSP & Canvas
    this.fftTab1 = new FFTEngine(512, 256, 128);
    const canvas1 = document.getElementById('spectrogram-canvas');
    this.rendererTab1 = new SpectrogramCanvasRenderer(canvas1, this.audioTab1);

    // Tab 2 DSP & Canvases
    const cqtCanvas = document.getElementById('cqt-canvas');
    const chromaCanvas = document.getElementById('chroma-canvas');
    const midiCanvas = document.getElementById('midi-canvas');
    this.chordAnalyzerTab2 = new MusicalChordAnalyzer(cqtCanvas, chromaCanvas, this.audioTab2, midiCanvas);
    this.chordWorker = null;

    // Undo / Redo history stacks for Tab 1 (Max 5 steps)
    this.historyStack = [];
    this.futureStack = [];
    this.maxHistorySteps = 5;

    // Track last played word for replay capability
    this.lastPlayedWordTab1 = null;
    this.audioTab1.onSeek = () => {
      this.lastPlayedWordTab1 = null;
    };
    this.audioTab1.onPositionUpdate = (ms) => {
      if (this.currentTab === 'tab1') {
        const badge1 = document.getElementById('cursor-time-badge');
        if (badge1) badge1.textContent = TimeFormatter.formatFull(ms);
        this.rendererTab1.render();
      }
    };
    this.audioTab1.onPlayStateChange = () => {
      if (this.currentTab === 'tab1') {
        this.rendererTab1.render();
      }
    };

    this.audioTab2.onPositionUpdate = (ms) => {
      if (this.currentTab === 'tab2') {
        const badge2 = document.getElementById('tab2-time-badge');
        if (badge2) badge2.textContent = TimeFormatter.formatFull(ms);
        this.chordAnalyzerTab2.render();
      }
    };
    this.audioTab2.onPlayStateChange = () => {
      if (this.currentTab === 'tab2') {
        this.chordAnalyzerTab2.render();
      }
    };

    // Connect renderer callbacks
    this.rendererTab1.onBeforeCuesChange = () => {
      this.pushHistoryState();
    };
    this.rendererTab1.onCuesUpdate = () => {
      this.renderTab1CuesList();
    };
    this.rendererTab1.onCueSelect = (cue) => {
      this.selectTab1Cue(cue);
      this.renderTab1CuesList();
    };

    this.initUI();
    this.initAudioPlaybackLoop();
    this.bindKeyboardShortcuts();

    // Resize observer
    window.addEventListener('resize', () => {
      if (this.currentTab === 'tab1') {
        this.rendererTab1.resize();
      } else {
        this.chordAnalyzerTab2.resize();
      }
    });

    // Call initial resize and layout immediately
    this.rendererTab1.resize();
    this.chordAnalyzerTab2.resize();

    // Auto load Sample 1 for Tab 1 and Tab 2
    this.loadTab1Preset(1);
    this.loadTab2Preset(1);
    this.updateUndoRedoButtonsState();
  }

  snapshotCuesState() {
    return {
      cues: (this.cuesTab1 || []).map(c => new SubtitleCue({
        id: c.id,
        startMs: c.startMs,
        endMs: c.endMs,
        text: c.text,
        actor: c.actor,
        clockState: c.clockState,
        wordTimings: c.wordTimings ? c.wordTimings.map(w => ({ ...w })) : null
      })),
      activeCueId: this.activeCueTab1 ? this.activeCueTab1.id : null
    };
  }

  pushHistoryState() {
    const snap = this.snapshotCuesState();
    this.historyStack.push(snap);
    if (this.historyStack.length > this.maxHistorySteps) {
      this.historyStack.shift(); // Max 5 steps
    }
    this.futureStack = [];
    this.updateUndoRedoButtonsState();
  }

  undo() {
    if (this.historyStack.length === 0) return;
    const currentState = this.snapshotCuesState();
    const previousState = this.historyStack.pop();

    this.futureStack.push(currentState);
    if (this.futureStack.length > this.maxHistorySteps) {
      this.futureStack.shift();
    }

    this.restoreCuesState(previousState);
    this.updateUndoRedoButtonsState();
  }

  redo() {
    if (this.futureStack.length === 0) return;
    const currentState = this.snapshotCuesState();
    const nextState = this.futureStack.pop();

    this.historyStack.push(currentState);
    if (this.historyStack.length > this.maxHistorySteps) {
      this.historyStack.shift();
    }

    this.restoreCuesState(nextState);
    this.updateUndoRedoButtonsState();
  }

  restoreCuesState(state) {
    if (!state || !state.cues) return;
    this.cuesTab1 = state.cues.map(c => new SubtitleCue(c));
    this.rendererTab1.cues = this.cuesTab1;

    let targetCue = null;
    if (state.activeCueId) {
      targetCue = this.cuesTab1.find(c => c.id === state.activeCueId);
    }
    if (!targetCue && this.cuesTab1.length > 0) {
      targetCue = this.cuesTab1[0];
    }
    this.selectTab1Cue(targetCue);
    this.renderTab1CuesList();
    this.rendererTab1.render();
  }

  updateLanguage(lang) {
    if (lang !== 'VI' && lang !== 'EN') return;
    CURRENT_LANG = lang;
    localStorage.setItem('app_language', lang);

    // 1. Language Toggle Buttons text & title
    const btnLang1 = document.getElementById('btn-lang-tab1');
    const btnLang2 = document.getElementById('btn-lang-tab2');
    if (btnLang1) {
      btnLang1.textContent = t('lang_btn');
      btnLang1.title = t('lang_btn_title');
    }
    if (btnLang2) {
      btnLang2.textContent = t('lang_btn');
      btnLang2.title = t('lang_btn_title');
    }

    // 2. Translatable HTML data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    // 3. Tab 1 Toolbar Titles & Tooltips
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) btnPlay.title = t('play_title');

    const btnPlayLine = document.getElementById('btn-play-line');
    if (btnPlayLine) btnPlayLine.title = t('play_line_title');

    const btnPlayWord = document.getElementById('btn-play-word');
    if (btnPlayWord) btnPlayWord.title = t('play_word_title');

    const btnLoop = document.getElementById('btn-loop');
    if (btnLoop) btnLoop.title = t('loop_title');

    const btnFileMenu = document.getElementById('btn-file-menu');
    if (btnFileMenu) btnFileMenu.title = t('file_menu_title');

    // Tab 1 File Dropdown Menu Localization
    const fileMenuHeaderUpload = document.getElementById('file-menu-header-upload');
    if (fileMenuHeaderUpload) fileMenuHeaderUpload.textContent = t('file_upload_heading');

    const btnUploadAudio = document.getElementById('btn-file-upload-audio');
    if (btnUploadAudio) {
      const span = btnUploadAudio.querySelector('span');
      if (span) span.textContent = t('upload_audio');
    }

    const btnUploadSub = document.getElementById('btn-file-upload-sub');
    if (btnUploadSub) {
      const span = btnUploadSub.querySelector('span');
      if (span) span.textContent = t('upload_sub');
    }

    const btnLoadSampleTab1 = document.getElementById('btn-file-load-sample');
    if (btnLoadSampleTab1) {
      const span = btnLoadSampleTab1.querySelector('span');
      if (span) span.textContent = t('load_sample_tab1');
    }

    const fileMenuHeaderSave = document.getElementById('file-menu-header-save');
    if (fileMenuHeaderSave) fileMenuHeaderSave.textContent = t('file_save_heading');

    const btnSaveScript = document.getElementById('btn-file-save-script');
    if (btnSaveScript) {
      const span = btnSaveScript.querySelector('span');
      if (span) span.textContent = t('save_script');
    }

    const selectSpeed = document.getElementById('select-speed');
    if (selectSpeed) selectSpeed.title = t('speed_title');

    const latencyGroupTab1 = document.querySelector('#tab-pane-1 .latency-control-group');
    if (latencyGroupTab1) latencyGroupTab1.title = t('latency_title_tab1');
    const latencyLabelTab1 = document.querySelector('#tab-pane-1 .latency-label span');
    if (latencyLabelTab1) latencyLabelTab1.textContent = t('latency_label');

    const latencyGroupTab2 = document.querySelector('#tab-pane-2 .latency-control-group');
    if (latencyGroupTab2) latencyGroupTab2.title = t('latency_title_tab2');
    const latencyLabelTab2 = document.querySelector('#tab-pane-2 .latency-label span');
    if (latencyLabelTab2) latencyLabelTab2.textContent = t('latency_label');

    const btnViewMode = document.getElementById('btn-view-mode');
    if (btnViewMode) {
      const mode = this.rendererTab1 ? this.rendererTab1.viewMode : 'DUAL';
      btnViewMode.title = `${t('view_mode_prefix')}${mode}${t('view_mode_suffix')}`;
    }

    const btnFreqLegend = document.getElementById('btn-freq-legend');
    if (btnFreqLegend) btnFreqLegend.title = t('freq_legend_btn_title');

    const btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) btnSelectAll.title = t('select_all_title');

    const cueMoveGroup = document.getElementById('cue-move-group');
    if (cueMoveGroup) cueMoveGroup.title = t('move_group_title');

    const btnMasterClock = document.getElementById('btn-master-clock');
    if (btnMasterClock) {
      const curState = btnMasterClock.getAttribute('data-state') || (this.cuesTab1[0]?.clockState || CueClockState.SHOW_LOCKED);
      btnMasterClock.title = `${t('master_clock_sync_prefix')}${this.getClockStateTooltip(curState)}`;
    }

    const btnOpenAddCues = document.getElementById('btn-open-add-cues');
    if (btnOpenAddCues) {
      btnOpenAddCues.title = t('modal_add_title');
    }

    // Tab 2 Toolbar elements
    const btnTab2Rewind = document.getElementById('btn-tab2-rewind');
    if (btnTab2Rewind) btnTab2Rewind.title = t('tab2_rewind_title');

    const btnTab2Play = document.getElementById('btn-tab2-play');
    if (btnTab2Play) btnTab2Play.title = t('tab2_play_title');
    const btnTab2MidiEl = document.getElementById('btn-tab2-midi');
    if (btnTab2MidiEl) btnTab2MidiEl.title = t('tab2_midi_btn_title');

    const btnTab2ExportMidiEl = document.getElementById('btn-tab2-export-midi');
    if (btnTab2ExportMidiEl) btnTab2ExportMidiEl.title = t('tab2_midi_export_title');

    const btnTab2Loop = document.getElementById('btn-tab2-loop');
    if (btnTab2Loop) btnTab2Loop.title = t('loop_tab2_title');

    const btnTab2Load = document.getElementById('btn-tab2-load');
    if (btnTab2Load) {
      btnTab2Load.title = t('load_btn_title');
    }

    const inputTab2Bpm = document.getElementById('input-tab2-bpm');
    const bpmGroup = inputTab2Bpm ? inputTab2Bpm.closest('.latency-control-group') : null;
    if (bpmGroup) bpmGroup.title = t('bpm_title');

    const selBarGrid = document.getElementById('select-tab2-bar-grid');
    if (selBarGrid && selBarGrid.options) {
      if (selBarGrid.options[0]) selBarGrid.options[0].textContent = t('grid_1_bar');
      if (selBarGrid.options[1]) selBarGrid.options[1].textContent = t('grid_half_bar');
      if (selBarGrid.options[2]) selBarGrid.options[2].textContent = t('grid_quarter_bar');
      if (selBarGrid.options[3]) selBarGrid.options[3].textContent = t('grid_off');
    }

    const btnTab2LoadSample1 = document.getElementById('btn-tab2-load-sample1');
    if (btnTab2LoadSample1) {
      const span = btnTab2LoadSample1.querySelector('span');
      if (span) span.textContent = t('load_sample_tab2');
    }

    const btnTab2LoadLocal = document.getElementById('btn-tab2-load-local');
    if (btnTab2LoadLocal) {
      const span = btnTab2LoadLocal.querySelector('span');
      if (span) span.textContent = t('load_local_tab2');
    }

    // Modal: Add Cues
    const modalAddTitle = document.querySelector('#modal-add-cues .modal-title');
    if (modalAddTitle) modalAddTitle.textContent = t('modal_add_title');

    const insertPosLabel = document.querySelector('#modal-add-cues label:first-of-type');
    if (insertPosLabel) insertPosLabel.textContent = t('insert_pos_label');

    const selInsertPos = document.getElementById('select-insert-pos');
    if (selInsertPos && selInsertPos.options) {
      if (selInsertPos.options[0]) selInsertPos.options[0].textContent = t('pos_after');
      if (selInsertPos.options[1]) selInsertPos.options[1].textContent = t('pos_before');
      if (selInsertPos.options[2]) selInsertPos.options[2].textContent = t('pos_start');
      if (selInsertPos.options[3]) selInsertPos.options[3].textContent = t('pos_end');
    }

    const contentLinesLabel = document.getElementById('label-add-cues-content') || document.querySelector('#modal-add-cues label:nth-of-type(2)');
    if (contentLinesLabel) contentLinesLabel.textContent = t('content_lines_label');

    const textareaAdd = document.getElementById('textarea-add-cues');
    if (textareaAdd) textareaAdd.placeholder = t('content_placeholder');

    const btnConfirmAdd = document.getElementById('btn-confirm-add-cues');
    if (btnConfirmAdd) btnConfirmAdd.textContent = t('btn_confirm_add');

    // Modal: Frequency Guide
    const modalFreqTitle = document.querySelector('#modal-freq-legend .modal-title');
    if (modalFreqTitle) modalFreqTitle.textContent = t('modal_freq_title');

    const descF0 = document.getElementById('freq-desc-f0');
    if (descF0) descF0.textContent = t('modal_freq_f0');
    const descF1 = document.getElementById('freq-desc-f1');
    if (descF1) descF1.textContent = t('modal_freq_f1');
    const descF2 = document.getElementById('freq-desc-f2');
    if (descF2) descF2.textContent = t('modal_freq_f2');
    const descF3 = document.getElementById('freq-desc-f3');
    if (descF3) descF3.textContent = t('modal_freq_f3');
    const descLiaisons = document.getElementById('freq-desc-liaisons');
    if (descLiaisons) descLiaisons.textContent = t('modal_freq_liaisons');

    const btnModalFreqClose = document.querySelector('#modal-freq-legend .modal-footer .modal-close-btn');
    if (btnModalFreqClose) btnModalFreqClose.textContent = t('btn_understood');

    // Modal: Cues & User Guide
    const btnCuesGuide = document.getElementById('btn-cues-guide');
    if (btnCuesGuide) btnCuesGuide.title = t('cues_guide_btn_title');

    const modalGuideTitle = document.querySelector('#modal-cues-guide .modal-title');
    if (modalGuideTitle) modalGuideTitle.textContent = t('modal_guide_title');

    const guideTitleLongpress = document.getElementById('guide-title-longpress');
    if (guideTitleLongpress) guideTitleLongpress.textContent = t('guide_tip_longpress_title');
    const guideDescLongpress = document.getElementById('guide-desc-longpress');
    if (guideDescLongpress) guideDescLongpress.textContent = t('guide_tip_longpress_desc');

    const guideTitleClock = document.getElementById('guide-title-clock');
    if (guideTitleClock) guideTitleClock.textContent = t('guide_tip_clock_title');
    const guideDescClock = document.getElementById('guide-desc-clock');
    if (guideDescClock) guideDescClock.textContent = t('guide_tip_clock_desc');

    const guideTitleFolder = document.getElementById('guide-title-folder');
    if (guideTitleFolder) guideTitleFolder.textContent = t('guide_tip_folder_title');
    const guideDescFolder = document.getElementById('guide-desc-folder');
    if (guideDescFolder) guideDescFolder.textContent = t('guide_tip_folder_desc');

    const guideTitleSave = document.getElementById('guide-title-save');
    if (guideTitleSave) guideTitleSave.textContent = t('guide_tip_save_title');
    const guideDescSave = document.getElementById('guide-desc-save');
    if (guideDescSave) guideDescSave.textContent = t('guide_tip_save_desc');

    const guideTitlePlayback = document.getElementById('guide-title-playback');
    if (guideTitlePlayback) guideTitlePlayback.textContent = t('guide_tip_playback_title');
    const guideDescPlayback = document.getElementById('guide-desc-playback');
    if (guideDescPlayback) guideDescPlayback.textContent = t('guide_tip_playback_desc');

    const guideTitleLoop = document.getElementById('guide-title-loop');
    if (guideTitleLoop) guideTitleLoop.textContent = t('guide_tip_loop_title');
    const guideDescLoop = document.getElementById('guide-desc-loop');
    if (guideDescLoop) guideDescLoop.textContent = t('guide_tip_loop_desc');

    // Modal: Export descriptions
    const descExportAss = document.getElementById('desc-export-ass');
    if (descExportAss) descExportAss.textContent = t('export_desc_ass');
    const descExportSrt = document.getElementById('desc-export-srt');
    if (descExportSrt) descExportSrt.textContent = t('export_desc_srt');
    const descExportJson = document.getElementById('desc-export-json');
    if (descExportJson) descExportJson.textContent = t('export_desc_json');
    const descExportTxt = document.getElementById('desc-export-txt');
    if (descExportTxt) descExportTxt.textContent = t('export_desc_txt');
    const labelExportFilename = document.getElementById('label-export-filename');
    if (labelExportFilename) labelExportFilename.textContent = t('filename_label');

    // Modal: Export
    const modalExportTitle = document.querySelector('#modal-export .modal-title');
    if (modalExportTitle) modalExportTitle.textContent = t('modal_export_title');

    const exportFormatLabel = document.querySelector('#modal-export .modal-body label:first-of-type');
    if (exportFormatLabel) exportFormatLabel.textContent = t('choose_format_label');

    const btnConfirmExport = document.getElementById('btn-confirm-export');
    if (btnConfirmExport) btnConfirmExport.textContent = t('btn_download_file');

    const modalCancelBtns = document.querySelectorAll('.modal-footer .modal-close-btn');
    modalCancelBtns.forEach(btn => {
      if (btn !== btnModalFreqClose) btn.textContent = t('btn_cancel');
    });

    this.updateUndoRedoButtonsState();
    this.renderTab1CuesList();
  }

  toggleLanguage() {
    const nextLang = CURRENT_LANG === 'VI' ? 'EN' : 'VI';
    this.updateLanguage(nextLang);
  }

  updateUndoRedoButtonsState() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) {
      const canUndo = this.historyStack.length > 0;
      btnUndo.disabled = !canUndo;
      btnUndo.classList.toggle('disabled', !canUndo);
      btnUndo.style.opacity = canUndo ? '1' : '0.35';
      btnUndo.title = canUndo
        ? (CURRENT_LANG === 'EN' ? `Undo (${this.historyStack.length}/5 steps) (Ctrl+Z)` : `Hoàn tác - Undo (${this.historyStack.length}/5 bước) (Ctrl+Z)`)
        : (CURRENT_LANG === 'EN' ? 'Nothing to undo (Ctrl+Z)' : 'Không có thao tác nào để hoàn tác (Ctrl+Z)');
    }
    if (btnRedo) {
      const canRedo = this.futureStack.length > 0;
      btnRedo.disabled = !canRedo;
      btnRedo.classList.toggle('disabled', !canRedo);
      btnRedo.style.opacity = canRedo ? '1' : '0.35';
      btnRedo.title = canRedo
        ? (CURRENT_LANG === 'EN' ? `Redo (${this.futureStack.length}/5 steps) (Ctrl+Y)` : `Làm lại - Forward / Redo (${this.futureStack.length}/5 bước) (Ctrl+Y)`)
        : (CURRENT_LANG === 'EN' ? 'Nothing to redo (Ctrl+Y)' : 'Không có thao tác nào để làm lại (Ctrl+Y)');
    }
  }

  updateHeaderMeta(title, durationMs) {
    const titleEl = document.getElementById('track-title');
    const durEl = document.getElementById('track-duration');
    if (titleEl) titleEl.textContent = title || 'Chưa nạp file';
    if (durEl) durEl.textContent = TimeFormatter.formatMinuteSecond(durationMs || 0);
  }

  showLoading(msg, progress = 0) {
    const msgEl = document.getElementById('loading-msg');
    const barEl = document.getElementById('loading-bar');
    const overlayEl = document.getElementById('loading-overlay');
    if (msgEl) msgEl.textContent = msg;
    if (barEl) barEl.style.width = `${Math.round(progress * 100)}%`;
    if (overlayEl) overlayEl.style.display = 'flex';
  }

  hideLoading() {
    const overlayEl = document.getElementById('loading-overlay');
    if (overlayEl) overlayEl.style.display = 'none';
  }

  switchTab(targetTab) {
    if (this.currentTab === targetTab) return;

    if (this.currentTab === 'tab1' && this.audioTab1.isPlaying) {
      this.audioTab1.stop();
    } else if (this.currentTab === 'tab2' && this.audioTab2.isPlaying) {
      this.audioTab2.stop();
    }

    this.currentTab = targetTab;

    const pane1 = document.getElementById('tab-pane-1');
    const pane2 = document.getElementById('tab-pane-2');
    const nav1 = document.getElementById('nav-tab-1');
    const nav2 = document.getElementById('nav-tab-2');
    const item1 = document.getElementById('menu-item-tab-1');
    const item2 = document.getElementById('menu-item-tab-2');
    const badge = document.getElementById('header-active-tab-badge');

    if (pane1) {
      pane1.classList.toggle('active', targetTab === 'tab1');
      pane1.style.display = targetTab === 'tab1' ? 'flex' : 'none';
    }
    if (pane2) {
      pane2.classList.toggle('active', targetTab === 'tab2');
      pane2.style.display = targetTab === 'tab2' ? 'flex' : 'none';
    }
    if (nav1) nav1.classList.toggle('active', targetTab === 'tab1');
    if (nav2) nav2.classList.toggle('active', targetTab === 'tab2');
    if (item1) item1.classList.toggle('active-tab-item', targetTab === 'tab1');
    if (item2) item2.classList.toggle('active-tab-item', targetTab === 'tab2');

    if (badge) {
      badge.textContent = targetTab === 'tab1' ? 'Tab 1: Speech Spectrogram' : 'Tab 2: Chord Analyser';
    }

    // Update Web App brand title per active Tab
    const appTitle = document.getElementById('app-title-header') || document.querySelector('.app-title');
    if (targetTab === 'tab2') {
      if (appTitle) appTitle.textContent = 'Chord Analyser';
      document.title = 'Chord Analyser - Musical Chord Analyzer';
    } else {
      if (appTitle) appTitle.textContent = 'Spectrogram Analyzer';
      document.title = 'Spectrogram Analyzer - Speech Spectrogram & Musical Chord Analyzer';
    }

    // Toggle Save Button availability between Tab 1 and Tab 2
    const btnSave = document.getElementById('btn-open-export');
    if (btnSave) {
      if (targetTab === 'tab2') {
        btnSave.disabled = true;
        btnSave.classList.add('disabled');
        btnSave.style.opacity = '0.35';
        btnSave.style.pointerEvents = 'none';
        btnSave.title = 'Lưu script chỉ khả dụng trong Tab 1 (Speech Spectrogram)';
      } else {
        btnSave.disabled = false;
        btnSave.classList.remove('disabled');
        btnSave.style.opacity = '1';
        btnSave.style.pointerEvents = 'auto';
        btnSave.title = 'Lưu / Xuất kịch bản phụ đề (.ass, .srt, .json)';
      }
    }

    const drawer = document.getElementById('tab-drawer-overlay');
    if (drawer) drawer.style.display = 'none';

    // Close all open dropdown menus when switching tabs
    ['tab-dropdown-menu', 'tab2-tab-dropdown-menu', 'file-dropdown-menu', 'tab2-load-dropdown-menu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('show');
        el.style.display = 'none';
      }
    });

    const tab2Item1 = document.getElementById('tab2-menu-item-tab-1');
    const tab2Item2 = document.getElementById('tab2-menu-item-tab-2');
    if (tab2Item1) tab2Item1.classList.toggle('active-tab-item', targetTab === 'tab1');
    if (tab2Item2) tab2Item2.classList.toggle('active-tab-item', targetTab === 'tab2');

    if (targetTab === 'tab1') {
      this.updateHeaderMeta(this.audioTab1.trackName, this.audioTab1.durationMs);
      this.rendererTab1.resize();
    } else {
      this.updateHeaderMeta(this.audioTab2.trackName, this.audioTab2.durationMs);
      this.chordAnalyzerTab2.resize();
    }
  }

  initMobileLongPressTooltips() {
    let tooltipToast = document.getElementById('mobile-tooltip-toast');
    if (!tooltipToast) {
      tooltipToast = document.createElement('div');
      tooltipToast.id = 'mobile-tooltip-toast';
      tooltipToast.className = 'mobile-tooltip-toast';
      document.body.appendChild(tooltipToast);
    }

    let longPressTimer = null;
    let isLongPressActive = false;
    let suppressClickUntil = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let targetEl = null;
    let hideTimer = null;

    const hideTooltip = () => {
      clearTimeout(hideTimer);
      if (tooltipToast) {
        tooltipToast.classList.remove('visible');
      }
    };

    const showTooltip = (text, clientX, clientY, targetRect) => {
      if (!text || !tooltipToast) return;
      clearTimeout(hideTimer);
      tooltipToast.textContent = text;
      tooltipToast.classList.add('visible');

      const toastRect = tooltipToast.getBoundingClientRect();
      const padding = 8;
      let left = clientX - toastRect.width / 2;
      let top = (targetRect ? targetRect.top : clientY) - toastRect.height - 8;

      if (top < padding) {
        top = (targetRect ? targetRect.bottom : clientY) + 8;
      }

      const maxLeft = window.innerWidth - toastRect.width - padding;
      if (left < padding) left = padding;
      if (left > maxLeft) left = maxLeft;

      tooltipToast.style.left = `${Math.round(left)}px`;
      tooltipToast.style.top = `${Math.round(top)}px`;

      hideTimer = setTimeout(hideTooltip, 3000);
    };

    document.addEventListener('touchstart', (e) => {
      clearTimeout(longPressTimer);
      if (tooltipToast && tooltipToast.classList.contains('visible')) {
        hideTooltip();
      }
      isLongPressActive = false;

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      const el = e.target.closest('[title], [data-tooltip]');
      if (!el) {
        targetEl = null;
        return;
      }

      const text = el.getAttribute('title') || el.getAttribute('data-tooltip');
      if (!text || !text.trim()) {
        targetEl = null;
        return;
      }

      targetEl = el;

      longPressTimer = setTimeout(() => {
        isLongPressActive = true;
        const rect = targetEl ? targetEl.getBoundingClientRect() : null;
        showTooltip(text.trim(), touchStartX, touchStartY, rect);
        if (navigator.vibrate) {
          try { navigator.vibrate(25); } catch (_) {}
        }
      }, 380);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!longPressTimer && !isLongPressActive) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);
        if (dist > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
          if (isLongPressActive) {
            hideTooltip();
            isLongPressActive = false;
          }
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (isLongPressActive) {
        suppressClickUntil = Date.now() + 650;
        isLongPressActive = false;
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    document.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isLongPressActive = false;
    }, { passive: true });

    window.addEventListener('click', (e) => {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else {
        hideTooltip();
      }
    }, true);

    window.addEventListener('scroll', hideTooltip, { passive: true });
  }

  initUI() {
    this.initMobileLongPressTooltips();

    // Language Toggle Buttons (Tab 1 & Tab 2)
    const btnLang1 = document.getElementById('btn-lang-tab1');
    const btnLang2 = document.getElementById('btn-lang-tab2');
    if (btnLang1) {
      btnLang1.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLanguage();
      });
    }
    if (btnLang2) {
      btnLang2.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLanguage();
      });
    }
    this.updateLanguage(CURRENT_LANG);

    // Helpers for responsive, unclipped dropdown positioning
    const closeAllDropdowns = () => {
      ['tab-dropdown-menu', 'tab2-tab-dropdown-menu', 'file-dropdown-menu', 'tab2-load-dropdown-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('show');
          el.style.display = 'none';
        }
      });
    };

    const openDropdown = (dropdownEl, triggerEl, align = 'left') => {
      if (!dropdownEl || !triggerEl) return;
      closeAllDropdowns();
      const rect = triggerEl.getBoundingClientRect();
      dropdownEl.style.position = 'fixed';
      dropdownEl.style.top = `${Math.round(rect.bottom + 4)}px`;
      if (align === 'right') {
        const rightOffset = Math.max(8, window.innerWidth - rect.right);
        dropdownEl.style.right = `${rightOffset}px`;
        dropdownEl.style.left = 'auto';
      } else {
        const leftOffset = Math.max(8, Math.min(rect.left, window.innerWidth - 260));
        dropdownEl.style.left = `${leftOffset}px`;
        dropdownEl.style.right = 'auto';
      }
      dropdownEl.style.zIndex = '99999';
      dropdownEl.classList.add('show');
      dropdownEl.style.display = 'flex';
    };

    const closeDropdown = (dropdownEl) => {
      if (!dropdownEl) return;
      dropdownEl.classList.remove('show');
      dropdownEl.style.display = 'none';
    };

    // Close any dropdown when viewport resizes or scrolls
    window.addEventListener('resize', closeAllDropdowns);

    // 3-Lines Hamburger Menu Button & Dropdown for Tab Switching (Tab 1)
    const btnHam = document.getElementById('btn-hamburger');
    const tabDropdown = document.getElementById('tab-dropdown-menu');
    if (btnHam && tabDropdown) {
      btnHam.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = tabDropdown.classList.contains('show');
        if (isOpen) {
          closeDropdown(tabDropdown);
        } else {
          openDropdown(tabDropdown, btnHam, 'left');
          tabDropdown.classList.add('show');
          tabDropdown.style.display = 'flex';
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#hamburger-dropdown-wrapper') && !e.target.closest('#tab-dropdown-menu')) {
          closeDropdown(tabDropdown);
        }
      });
    }

    const itemTab1 = document.getElementById('menu-item-tab-1');
    const itemTab2 = document.getElementById('menu-item-tab-2');
    if (itemTab1) {
      itemTab1.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdown(tabDropdown);
        this.switchTab('tab1');
      });
    }
    if (itemTab2) {
      itemTab2.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdown(tabDropdown);
        this.switchTab('tab2');
      });
    }

    // 3-Lines Hamburger Menu Button & Dropdown for Tab Switching (Tab 2)
    const btnHam2 = document.getElementById('btn-tab2-hamburger');
    const tab2Dropdown = document.getElementById('tab2-tab-dropdown-menu');
    if (btnHam2 && tab2Dropdown) {
      btnHam2.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = tab2Dropdown.classList.contains('show');
        if (isOpen) {
          closeDropdown(tab2Dropdown);
        } else {
          openDropdown(tab2Dropdown, btnHam2, 'left');
          tab2Dropdown.classList.add('show');
          tab2Dropdown.style.display = 'flex';
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#tab2-hamburger-dropdown-wrapper') && !e.target.closest('#tab2-tab-dropdown-menu')) {
          closeDropdown(tab2Dropdown);
        }
      });
    }

    const tab2Item1 = document.getElementById('tab2-menu-item-tab-1');
    const tab2Item2 = document.getElementById('tab2-menu-item-tab-2');
    if (tab2Item1) {
      tab2Item1.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdown(tab2Dropdown);
        this.switchTab('tab1');
      });
    }
    if (tab2Item2) {
      tab2Item2.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdown(tab2Dropdown);
        this.switchTab('tab2');
      });
    }

    // File Menu Button & Dropdown (Up File & Save Script in Tab 1 Toolbar)
    const btnFileMenu = document.getElementById('btn-file-menu');
    const fileDropdown = document.getElementById('file-dropdown-menu');
    if (btnFileMenu && fileDropdown) {
      btnFileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = fileDropdown.classList.contains('show');
        if (isOpen) {
          closeDropdown(fileDropdown);
        } else {
          openDropdown(fileDropdown, btnFileMenu, 'left');
          fileDropdown.classList.add('show');
          fileDropdown.style.display = 'flex';
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#file-menu-dropdown-wrapper') && !e.target.closest('#file-dropdown-menu')) {
          closeDropdown(fileDropdown);
        }
      });
    }

    const btnFileUploadAudio = document.getElementById('btn-file-upload-audio');
    if (btnFileUploadAudio) {
      btnFileUploadAudio.addEventListener('click', () => {
        if (fileDropdown) {
          fileDropdown.classList.remove('show');
          fileDropdown.style.display = 'none';
        }
        const input = document.getElementById('input-audio-tab1');
        if (input) input.click();
      });
    }

    const btnFileUploadSub = document.getElementById('btn-file-upload-sub');
    if (btnFileUploadSub) {
      btnFileUploadSub.addEventListener('click', () => {
        if (fileDropdown) {
          fileDropdown.classList.remove('show');
          fileDropdown.style.display = 'none';
        }
        const input = document.getElementById('input-sub-tab1');
        if (input) input.click();
      });
    }

    const btnFileLoadSample = document.getElementById('btn-file-load-sample');
    if (btnFileLoadSample) {
      btnFileLoadSample.addEventListener('click', () => {
        if (fileDropdown) {
          fileDropdown.classList.remove('show');
          fileDropdown.style.display = 'none';
        }
        this.loadTab1Preset(1);
      });
    }

    const btnFileSaveScript = document.getElementById('btn-file-save-script');
    if (btnFileSaveScript) {
      btnFileSaveScript.addEventListener('click', () => {
        if (fileDropdown) {
          fileDropdown.classList.remove('show');
          fileDropdown.style.display = 'none';
        }
        const modalExport = document.getElementById('modal-export');
        const inputExportFilename = document.getElementById('export-filename');
        if (modalExport) {
          if (inputExportFilename) {
            const defaultName = (this.audioTab1.trackName || 'transcript').replace(/\.[^/.]+$/, '');
            inputExportFilename.value = defaultName;
          }
          modalExport.style.display = 'flex';
        }
      });
    }

    // Optional Drawer overlay support
    const drawer = document.getElementById('tab-drawer-overlay');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    if (btnCloseDrawer && drawer) {
      btnCloseDrawer.addEventListener('click', () => { drawer.style.display = 'none'; });
    }
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) drawer.style.display = 'none';
      });
    }

    // Navigation items
    const nav1 = document.getElementById('nav-tab-1');
    const nav2 = document.getElementById('nav-tab-2');
    if (nav1) nav1.addEventListener('click', () => this.switchTab('tab1'));
    if (nav2) nav2.addEventListener('click', () => this.switchTab('tab2'));

    // Header Upload dropdown
    const btnUpload = document.getElementById('btn-upload-file-header');
    const menuUpload = document.getElementById('upload-dropdown-menu');
    if (btnUpload && menuUpload) {
      btnUpload.addEventListener('click', (e) => {
        e.stopPropagation();
        menuUpload.style.display = (menuUpload.style.display === 'block') ? 'none' : 'block';
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#upload-dropdown-wrapper')) {
          menuUpload.style.display = 'none';
        }
      });
    }

    const btnDropUpload = document.getElementById('btn-dropdown-upload-file');
    if (btnDropUpload) {
      btnDropUpload.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        const input = (this.currentTab === 'tab1')
          ? document.getElementById('input-audio-tab1')
          : document.getElementById('input-audio-tab2');
        if (input) input.click();
      });
    }

    const btnDropUploadAudio = document.getElementById('btn-dropdown-upload-audio');
    if (btnDropUploadAudio) {
      btnDropUploadAudio.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        const input = (this.currentTab === 'tab1')
          ? document.getElementById('input-audio-tab1')
          : document.getElementById('input-audio-tab2');
        if (input) input.click();
      });
    }

    const btnDropUploadSub = document.getElementById('btn-dropdown-upload-sub');
    if (btnDropUploadSub) {
      btnDropUploadSub.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        const input = document.getElementById('input-sub-tab1');
        if (input) input.click();
      });
    }

    const btnSample1 = document.getElementById('btn-dropdown-load-sample1');
    if (btnSample1) {
      btnSample1.addEventListener('click', () => {
        if (menuUpload) menuUpload.style.display = 'none';
        this.loadTab1Preset(1);
      });
    }

    // Tab 1 Playback buttons
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) btnPlay.addEventListener('click', () => this.audioTab1.togglePlay());

    const btnPlayLine = document.getElementById('btn-play-line');
    if (btnPlayLine) {
      btnPlayLine.addEventListener('click', () => {
        const cueToPlay = this.activeCueTab1 || (this.cuesTab1.length > 0 ? this.cuesTab1[0] : null);
        if (cueToPlay) {
          this.audioTab1.loopStartMs = cueToPlay.startMs;
          this.audioTab1.loopEndMs = cueToPlay.endMs;
          this.audioTab1.play(cueToPlay.startMs, cueToPlay.endMs);
        } else {
          this.audioTab1.loopStartMs = this.rendererTab1.selectionStartMs;
          this.audioTab1.loopEndMs = this.rendererTab1.selectionEndMs;
          this.audioTab1.play(this.rendererTab1.selectionStartMs, this.rendererTab1.selectionEndMs);
        }
      });
    }

    // btn-play-word: Only play the word where the yellow playhead bar currently is!
    const btnPlayWord = document.getElementById('btn-play-word');
    if (btnPlayWord) {
      btnPlayWord.addEventListener('click', () => {
        const curPos = this.audioTab1.getCurrentPosition();

        let targetCue = this.cuesTab1.find(c => curPos >= c.startMs && curPos <= c.endMs);
        if (!targetCue) {
          if (this.activeCueTab1) {
            targetCue = this.activeCueTab1;
          } else if (this.cuesTab1.length > 0) {
            targetCue = this.cuesTab1.reduce((prev, curr) => {
              const prevDist = Math.min(Math.abs(curPos - prev.startMs), Math.abs(curPos - prev.endMs));
              const currDist = Math.min(Math.abs(curPos - curr.startMs), Math.abs(curPos - curr.endMs));
              return currDist < prevDist ? curr : prev;
            }, this.cuesTab1[0]);
          }
        }

        if (!targetCue) return;

        if (!this.activeCueTab1 || this.activeCueTab1.id !== targetCue.id) {
          this.selectTab1Cue(targetCue);
        }

        const words = targetCue.resolvedWordTimings();
        if (words.length === 0) {
          this.audioTab1.loopStartMs = targetCue.startMs;
          this.audioTab1.loopEndMs = targetCue.endMs;
          this.audioTab1.play(targetCue.startMs, targetCue.endMs);
          return;
        }

        // Nếu người dùng bấm lại nút Play Word khi từ đang phát hoặc vừa phát xong (con trỏ đang ở mốc cuối từ):
        // Phát lại chính từ đó thay vì nhảy sang từ tiếp theo
        if (this.lastPlayedWordTab1 && this.lastPlayedWordTab1.cueId === targetCue.id) {
          const isReplay = this.audioTab1.isPlaying ||
            Math.abs(curPos - this.lastPlayedWordTab1.endMs) < 60 ||
            (curPos >= this.lastPlayedWordTab1.startMs && curPos <= this.lastPlayedWordTab1.endMs);
          if (isReplay) {
            const wStart = this.lastPlayedWordTab1.startMs;
            const wEnd = this.lastPlayedWordTab1.endMs;
            this.audioTab1.loopStartMs = wStart;
            this.audioTab1.loopEndMs = wEnd;
            this.audioTab1.play(wStart, wEnd);
            return;
          }
        }

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

        const wStart = words[targetWordIdx].startMs;
        const wEnd = (targetWordIdx < words.length - 1) ? words[targetWordIdx + 1].startMs : targetCue.endMs;

        this.lastPlayedWordTab1 = {
          cueId: targetCue.id,
          wordIdx: targetWordIdx,
          startMs: wStart,
          endMs: wEnd
        };

        this.audioTab1.loopStartMs = wStart;
        this.audioTab1.loopEndMs = wEnd;
        this.audioTab1.play(wStart, wEnd);
      });
    }

    const btnLoop = document.getElementById('btn-loop');
    if (btnLoop) {
      btnLoop.addEventListener('click', () => {
        this.audioTab1.isLooping = !this.audioTab1.isLooping;
        btnLoop.classList.toggle('loop-active', this.audioTab1.isLooping);
      });
    }

    // Undo / Redo Buttons (Tab 1)
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        this.undo();
      });
    }

    const btnRedo = document.getElementById('btn-redo');
    if (btnRedo) {
      btnRedo.addEventListener('click', () => {
        this.redo();
      });
    }

    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.rendererTab1.zoomFactor = Math.max(5, this.rendererTab1.zoomFactor - 10);
        this.rendererTab1.render();
      });
    }

    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.rendererTab1.zoomFactor = Math.min(200, this.rendererTab1.zoomFactor + 10);
        this.rendererTab1.render();
      });
    }

    const selSpeed = document.getElementById('select-speed');
    if (selSpeed) {
      selSpeed.addEventListener('change', (e) => {
        this.audioTab1.setSpeed(parseFloat(e.target.value));
      });
    }

    // Direct 3-level Eye View Mode Switch (Spectro -> Waveform -> Dual)
    const btnViewMode = document.getElementById('btn-view-mode');
    const viewModeLabel = document.getElementById('view-mode-label');
    if (btnViewMode) {
      btnViewMode.addEventListener('click', () => {
        const modes = ['SPECTROGRAM', 'WAVEFORM', 'DUAL'];
        const nextIdx = (modes.indexOf(this.rendererTab1.viewMode) + 1) % modes.length;
        const nextMode = modes[nextIdx];
        this.rendererTab1.viewMode = nextMode;

        if (viewModeLabel) {
          viewModeLabel.textContent = nextMode === 'SPECTROGRAM' ? 'Spectro' : nextMode === 'WAVEFORM' ? 'Waveform' : 'Dual';
        }
        btnViewMode.title = `Chế độ hiển thị: ${nextMode} (Bấm để đổi: Spectro → Waveform → Dual)`;
        btnViewMode.style.borderColor = nextMode === 'DUAL' ? '#38bdf8' : nextMode === 'SPECTROGRAM' ? '#a855f7' : '#10b981';
        btnViewMode.style.color = nextMode === 'DUAL' ? '#38bdf8' : nextMode === 'SPECTROGRAM' ? '#d8b4fe' : '#6ee7b7';
        btnViewMode.style.background = nextMode === 'DUAL'
          ? 'rgba(56, 189, 248, 0.14)'
          : nextMode === 'SPECTROGRAM'
            ? 'rgba(168, 85, 247, 0.14)'
            : 'rgba(16, 185, 129, 0.14)';

        this.rendererTab1.render();
      });
    }

    // Audio Latency Offset Input (Bù trễ âm thanh thủ công ms)
    const inputLatency = document.getElementById('input-latency-offset');
    if (inputLatency) {
      const savedLatency = localStorage.getItem('tab1_latency_compensation_ms');
      if (savedLatency !== null) {
        const val = parseFloat(savedLatency);
        if (!isNaN(val)) {
          inputLatency.value = val;
          this.audioTab1.customLatencyMs = val;
        }
      } else {
        this.audioTab1.customLatencyMs = 65;
        inputLatency.value = 65;
      }

      const onLatencyChange = () => {
        const val = parseFloat(inputLatency.value);
        if (!isNaN(val)) {
          this.audioTab1.customLatencyMs = val;
          localStorage.setItem('tab1_latency_compensation_ms', val);
        }
      };

      inputLatency.addEventListener('input', onLatencyChange);
      inputLatency.addEventListener('change', onLatencyChange);
    }

    // Select All Cues
    const btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        if (!this.cuesTab1 || this.cuesTab1.length === 0) return;
        const allSelected = this.selectedCueIds.size === this.cuesTab1.length;
        if (allSelected) {
          this.selectedCueIds.clear();
        } else {
          this.cuesTab1.forEach(c => this.selectedCueIds.add(c.id));
        }
        this.renderTab1CuesList();
      });
    }

    // Delete Selected Cues (Trash Button)
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    if (btnDeleteSelected) {
      btnDeleteSelected.addEventListener('click', () => {
        const targetIds = this.selectedCueIds.size > 0
          ? new Set(this.selectedCueIds)
          : (this.activeCueTab1 ? new Set([this.activeCueTab1.id]) : new Set());

        if (targetIds.size === 0 || !this.cuesTab1 || this.cuesTab1.length === 0) return;

        this.pushHistoryState();
        const firstDeletedIdx = this.cuesTab1.findIndex(c => targetIds.has(c.id));
        this.cuesTab1 = this.cuesTab1.filter(c => !targetIds.has(c.id));
        this.selectedCueIds.clear();

        if (this.cuesTab1.length > 0) {
          const nextIdx = Math.min(Math.max(0, firstDeletedIdx), this.cuesTab1.length - 1);
          this.selectTab1Cue(this.cuesTab1[nextIdx]);
        } else {
          this.activeCueTab1 = null;
          this.rendererTab1.activeCue = null;
          this.rendererTab1.cues = [];
        }
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });
    }

    // Move Selected Cues Up / Down
    const btnMoveUp = document.getElementById('btn-move-up');
    if (btnMoveUp) {
      btnMoveUp.addEventListener('click', () => {
        const targetIds = this.selectedCueIds.size > 0 ? this.selectedCueIds : (this.activeCueTab1 ? new Set([this.activeCueTab1.id]) : new Set());
        if (targetIds.size === 0 || this.cuesTab1.length < 2) return;

        this.pushHistoryState();
        let moved = false;
        for (let i = 1; i < this.cuesTab1.length; i++) {
          if (targetIds.has(this.cuesTab1[i].id) && !targetIds.has(this.cuesTab1[i - 1].id)) {
            const tmp = this.cuesTab1[i - 1];
            this.cuesTab1[i - 1] = this.cuesTab1[i];
            this.cuesTab1[i] = tmp;
            moved = true;
          }
        }
        if (moved) {
          this.renderTab1CuesList();
          this.rendererTab1.render();
        }
      });
    }

    const btnMoveDown = document.getElementById('btn-move-down');
    if (btnMoveDown) {
      btnMoveDown.addEventListener('click', () => {
        const targetIds = this.selectedCueIds.size > 0 ? this.selectedCueIds : (this.activeCueTab1 ? new Set([this.activeCueTab1.id]) : new Set());
        if (targetIds.size === 0 || this.cuesTab1.length < 2) return;

        this.pushHistoryState();
        let moved = false;
        for (let i = this.cuesTab1.length - 2; i >= 0; i--) {
          if (targetIds.has(this.cuesTab1[i].id) && !targetIds.has(this.cuesTab1[i + 1].id)) {
            const tmp = this.cuesTab1[i + 1];
            this.cuesTab1[i + 1] = this.cuesTab1[i];
            this.cuesTab1[i] = tmp;
            moved = true;
          }
        }
        if (moved) {
          this.renderTab1CuesList();
          this.rendererTab1.render();
        }
      });
    }

    // Master clock toggle
    const btnMasterClock = document.getElementById('btn-master-clock');
    if (btnMasterClock) {
      btnMasterClock.addEventListener('click', () => {
        const states = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
        const curFirst = this.cuesTab1[0]?.clockState || CueClockState.SHOW_LOCKED;
        const nextIdx = (states.indexOf(curFirst) + 1) % states.length;
        const nextState = states[nextIdx];

        this.pushHistoryState();
        this.cuesTab1.forEach(c => {
          c.clockState = nextState;
          if (nextState === CueClockState.EDITING_WORDS && (!c.wordTimings || c.wordTimings.length === 0)) {
            c.wordTimings = c.resolvedWordTimings();
          }
        });
        btnMasterClock.setAttribute('data-state', nextState);
        btnMasterClock.title = `${t('master_clock_sync_prefix')}${this.getClockStateTooltip(nextState)}`;
        this.updateStartEndButtonsState();
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });
    }

    // Frequency Legend modal
    const btnFreqLegend = document.getElementById('btn-freq-legend');
    const modalFreq = document.getElementById('modal-freq-legend');
    if (btnFreqLegend && modalFreq) {
      btnFreqLegend.addEventListener('click', () => { modalFreq.style.display = 'flex'; });
    }

    // Cues / User Guide modal
    const btnCuesGuide = document.getElementById('btn-cues-guide');
    const modalCuesGuide = document.getElementById('modal-cues-guide');
    if (btnCuesGuide && modalCuesGuide) {
      btnCuesGuide.addEventListener('click', () => { modalCuesGuide.style.display = 'flex'; });
    }

    // Add Cues modal
    const btnOpenAddCues = document.getElementById('btn-open-add-cues');
    const modalAddCues = document.getElementById('modal-add-cues');
    const btnConfirmAdd = document.getElementById('btn-confirm-add-cues');
    const textareaAdd = document.getElementById('textarea-add-cues');
    const selectPos = document.getElementById('select-insert-pos');

    if (btnOpenAddCues && modalAddCues) {
      btnOpenAddCues.addEventListener('click', () => { modalAddCues.style.display = 'flex'; });
    }
    if (btnConfirmAdd && textareaAdd && modalAddCues) {
      btnConfirmAdd.addEventListener('click', () => {
        const text = textareaAdd.value;
        const pos = selectPos ? selectPos.value : 'AFTER_SELECTED';
        this.addTab1CuesFromText(text, pos);
        textareaAdd.value = '';
        modalAddCues.style.display = 'none';
      });
    }

    // Modal close buttons & backdrop click
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const m = e.target.closest('.modal-overlay');
        if (m) m.style.display = 'none';
      });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    });

    // Pane Splitter resizing (Tab 1)
    const splitter = document.getElementById('pane-splitter');
    const canvasPanel = document.getElementById('canvas-panel');
    if (splitter && canvasPanel) {
      let isDraggingSplitter = false, startY = 0, startHeight = 0;

      const onSplitterStart = (clientY) => {
        isDraggingSplitter = true;
        startY = clientY;
        startHeight = canvasPanel.getBoundingClientRect().height;
        splitter.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
      };

      const onSplitterMove = (clientY) => {
        if (!isDraggingSplitter) return;
        const delta = clientY - startY;
        const totalH = window.innerHeight;
        const newPct = Math.max(20, Math.min(80, ((startHeight + delta) / totalH) * 100));
        canvasPanel.style.height = `${newPct}%`;
        const subPanel = document.querySelector('.subtitle-panel');
        if (subPanel) subPanel.style.height = `${100 - newPct}%`;
        this.rendererTab1.resize();
      };

      const onSplitterEnd = () => {
        if (isDraggingSplitter) {
          isDraggingSplitter = false;
          splitter.classList.remove('dragging');
          document.body.style.cursor = '';
          this.rendererTab1.resize();
        }
      };

      splitter.addEventListener('mousedown', (e) => onSplitterStart(e.clientY));
      window.addEventListener('mousemove', (e) => onSplitterMove(e.clientY));
      window.addEventListener('mouseup', onSplitterEnd);

      splitter.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          onSplitterStart(e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDraggingSplitter) return;
        if (e.cancelable) e.preventDefault();
        if (e.touches && e.touches.length > 0) {
          onSplitterMove(e.touches[0].clientY);
        }
      }, { passive: false });

      window.addEventListener('touchend', onSplitterEnd);
      window.addEventListener('touchcancel', onSplitterEnd);
    }

    // Tab 2 Horizontal Splitter resizing between CQT and Chromagram
    const tab2Splitter = document.getElementById('tab2-pane-splitter');
    const tab2CqtContainer = document.getElementById('tab2-cqt-container');
    const stackedViewports = document.querySelector('.chord-stacked-viewports');

    if (tab2Splitter && tab2CqtContainer && stackedViewports) {
      let isDraggingTab2Splitter = false, tab2StartY = 0, tab2StartHeight = 0;

      const onTab2SplitterStart = (clientY) => {
        isDraggingTab2Splitter = true;
        tab2StartY = clientY;
        tab2StartHeight = tab2CqtContainer.getBoundingClientRect().height;
        tab2Splitter.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
      };

      const onTab2SplitterMove = (clientY) => {
        if (!isDraggingTab2Splitter) return;
        const delta = clientY - tab2StartY;
        const totalH = stackedViewports.getBoundingClientRect().height || 500;
        const newPct = Math.max(18, Math.min(82, ((tab2StartHeight + delta) / totalH) * 100));
        tab2CqtContainer.style.height = `${newPct}%`;
        this.chordAnalyzerTab2.resize();
      };

      const onTab2SplitterEnd = () => {
        if (isDraggingTab2Splitter) {
          isDraggingTab2Splitter = false;
          tab2Splitter.classList.remove('dragging');
          document.body.style.cursor = '';
          this.chordAnalyzerTab2.resize();
        }
      };

      tab2Splitter.addEventListener('mousedown', (e) => onTab2SplitterStart(e.clientY));
      window.addEventListener('mousemove', (e) => onTab2SplitterMove(e.clientY));
      window.addEventListener('mouseup', onTab2SplitterEnd);

      tab2Splitter.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          onTab2SplitterStart(e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDraggingTab2Splitter) return;
        if (e.cancelable) e.preventDefault();
        if (e.touches && e.touches.length > 0) {
          onTab2SplitterMove(e.touches[0].clientY);
        }
      }, { passive: false });

      window.addEventListener('touchend', onTab2SplitterEnd);
      window.addEventListener('touchcancel', onTab2SplitterEnd);
    }

    // Tab 2 Horizontal Splitter between MIDI and Chromagram
    const tab2MidiSplitter = document.getElementById('tab2-midi-splitter');
    const tab2MidiContainer = document.getElementById('tab2-midi-container');

    if (tab2MidiSplitter && tab2MidiContainer && stackedViewports) {
      let isDraggingMidiSplitter = false, midiStartY = 0, midiStartHeight = 0;

      const onMidiSplitterStart = (clientY) => {
        isDraggingMidiSplitter = true;
        midiStartY = clientY;
        midiStartHeight = tab2MidiContainer.getBoundingClientRect().height;
        tab2MidiSplitter.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
      };

      const onMidiSplitterMove = (clientY) => {
        if (!isDraggingMidiSplitter) return;
        const delta = clientY - midiStartY;
        const totalH = stackedViewports.getBoundingClientRect().height || 500;
        const newPct = Math.max(12, Math.min(55, ((midiStartHeight + delta) / totalH) * 100));
        tab2MidiContainer.style.height = `${newPct}%`;
        this.chordAnalyzerTab2.resize();
      };

      const onMidiSplitterEnd = () => {
        if (isDraggingMidiSplitter) {
          isDraggingMidiSplitter = false;
          tab2MidiSplitter.classList.remove('dragging');
          document.body.style.cursor = '';
          this.chordAnalyzerTab2.resize();
        }
      };

      tab2MidiSplitter.addEventListener('mousedown', (e) => onMidiSplitterStart(e.clientY));
      window.addEventListener('mousemove', (e) => onMidiSplitterMove(e.clientY));
      window.addEventListener('mouseup', onMidiSplitterEnd);

      tab2MidiSplitter.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) onMidiSplitterStart(e.touches[0].clientY);
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDraggingMidiSplitter) return;
        if (e.cancelable) e.preventDefault();
        if (e.touches && e.touches.length > 0) onMidiSplitterMove(e.touches[0].clientY);
      }, { passive: false });

      window.addEventListener('touchend', onMidiSplitterEnd);
      window.addEventListener('touchcancel', onMidiSplitterEnd);
    }

    // Drag and Drop on Spectrogram Canvas Panel (Audio or Subtitle)
    if (canvasPanel) {
      canvasPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      });
      canvasPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          if (['ass', 'srt', 'vtt', 'json', 'txt'].includes(ext)) {
            this.loadTab1SubtitleFile(file);
          } else {
            this.loadTab1AudioFile(file);
          }
        }
      });
    }

    // Tab 1 file input (Audio)
    const inputTab1 = document.getElementById('input-audio-tab1');
    if (inputTab1) {
      inputTab1.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadTab1AudioFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Tab 1 file input (Subtitles: .ass, .srt, .json, .vtt, .txt)
    const inputSubTab1 = document.getElementById('input-sub-tab1');
    if (inputSubTab1) {
      inputSubTab1.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadTab1SubtitleFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Export / Save Script Modal
    const btnOpenExport = document.getElementById('btn-open-export');
    const modalExport = document.getElementById('modal-export');
    const btnConfirmExport = document.getElementById('btn-confirm-export');
    const inputExportFilename = document.getElementById('export-filename');

    if (btnOpenExport && modalExport) {
      btnOpenExport.addEventListener('click', () => {
        if (inputExportFilename) {
          const defaultName = (this.audioTab1.trackName || 'transcript').replace(/\.[^/.]+$/, '');
          inputExportFilename.value = defaultName;
        }
        modalExport.style.display = 'flex';
      });
    }

    if (btnConfirmExport && modalExport) {
      btnConfirmExport.addEventListener('click', () => {
        if (!this.cuesTab1 || this.cuesTab1.length === 0) {
          alert('Danh sách câu hiện đang trống, không có phụ đề để lưu.');
          return;
        }

        const selectedRadio = document.querySelector('input[name="export-format"]:checked');
        const format = selectedRadio ? selectedRadio.value : 'ass';
        const baseName = (inputExportFilename && inputExportFilename.value.trim()) || 'transcript';

        let content = '';
        let mimeType = 'text/plain;charset=utf-8';
        const ext = format;

        switch (format) {
          case 'ass':
            content = SubtitleExporter.toAss(this.cuesTab1, baseName);
            mimeType = 'text/x-ssa;charset=utf-8';
            break;
          case 'srt':
            content = SubtitleExporter.toSrt(this.cuesTab1);
            mimeType = 'application/x-subrip;charset=utf-8';
            break;
          case 'json':
            content = SubtitleExporter.toJson(this.cuesTab1, this.audioTab1.trackName, this.audioTab1.durationMs);
            mimeType = 'application/json;charset=utf-8';
            break;
          case 'txt':
            content = SubtitleExporter.toTxt(this.cuesTab1);
            mimeType = 'text/plain;charset=utf-8';
            break;
        }

        downloadBlob(content, `${baseName}.${ext}`, mimeType);
        modalExport.style.display = 'none';
      });
    }

    // Tab 2 Controls
    const btnTab2Rewind = document.getElementById('btn-tab2-rewind');
    if (btnTab2Rewind) {
      btnTab2Rewind.addEventListener('click', () => {
        this.audioTab2.seek(0);
        this.chordAnalyzerTab2.scrollOffsetMs = 0;
        this.chordAnalyzerTab2.clampScroll();
        this.chordAnalyzerTab2.render();
        const badge2 = document.getElementById('tab2-time-badge');
        if (badge2) badge2.textContent = TimeFormatter.formatFull(0);
      });
    }

    const btnTab2Play = document.getElementById('btn-tab2-play');
    if (btnTab2Play) btnTab2Play.addEventListener('click', () => this.audioTab2.togglePlay());

    const btnTab2Loop = document.getElementById('btn-tab2-loop');
    if (btnTab2Loop) {
      btnTab2Loop.addEventListener('click', () => {
        this.audioTab2.isLooping = !this.audioTab2.isLooping;
        btnTab2Loop.classList.toggle('loop-active', this.audioTab2.isLooping);
      });
    }

    // Tab 2 MIDI Button (Toggle & Transcribe)
    const btnTab2Midi = document.getElementById('btn-tab2-midi');
    const tab2MidiPanel = document.getElementById('tab2-midi-container');
    const tab2MidiSpl = document.getElementById('tab2-midi-splitter');
    const tab2CqtBox = document.getElementById('tab2-cqt-container');
    const btnTab2ExportMidi = document.getElementById('btn-tab2-export-midi');

    if (btnTab2Midi) {
      btnTab2Midi.addEventListener('click', () => {
        if (!this.chordAnalyzerTab2.data) {
          alert(I18N_LOCALES[this.currentLang]?.tab2_midi_no_audio || 'Vui lòng chọn hoặc nạp bài nhạc trước khi tạo MIDI!');
          return;
        }

        try {
          const nextVisible = !this.chordAnalyzerTab2.isMidiVisible;
          this.chordAnalyzerTab2.isMidiVisible = nextVisible;

          if (nextVisible) {
            // If notes not generated yet, transcribe now
            if (!this.chordAnalyzerTab2.midiNotes) {
              this.chordAnalyzerTab2.transcribeMidiFromCqt();
            }

          if (tab2MidiPanel) {
            tab2MidiPanel.style.display = 'flex';
            tab2MidiPanel.style.height = '28%';
          }
          if (tab2MidiSpl) {
            tab2MidiSpl.style.display = 'block';
          }
          if (tab2CqtBox) {
            tab2CqtBox.style.height = '42%';
          }
          btnTab2Midi.classList.add('active');

          const badgeText = document.getElementById('tab2-midi-badge-text');
          if (badgeText && this.chordAnalyzerTab2.midiNotes) {
            badgeText.textContent = `MIDI Piano Roll (${this.chordAnalyzerTab2.midiNotes.length} nốt)`;
          }
        } else {
          // Hide MIDI tier, but retain midiNotes in memory!
          if (tab2MidiPanel) {
            tab2MidiPanel.style.display = 'none';
          }
          if (tab2MidiSpl) {
            tab2MidiSpl.style.display = 'none';
          }
          if (tab2CqtBox) {
            tab2CqtBox.style.height = '58%';
          }
          btnTab2Midi.classList.remove('active');
        }

        this.chordAnalyzerTab2.resize();
        } catch (err) {
          console.error('Lỗi khi bật dải MIDI Tab 2:', err);
          alert('Lỗi tạo MIDI: ' + err.message);
        }
      });
    }

    if (btnTab2ExportMidi) {
      btnTab2ExportMidi.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.chordAnalyzerTab2.midiNotes || this.chordAnalyzerTab2.midiNotes.length === 0) {
          alert('Chưa có dữ liệu MIDI để xuất file!');
          return;
        }
        const blob = createMidiFileBlob(this.chordAnalyzerTab2.midiNotes, this.chordAnalyzerTab2.bpm || 120);
        const rawName = document.getElementById('header-track-name')?.textContent || 'piano_sample';
        const baseName = rawName.replace(/\.[^/.]+$/, '').trim() || 'cqt_transcription';
        downloadBlob(blob, `${baseName}.mid`, 'audio/midi');
      });
    }

    // Tab 2 Latency Offset Input (Bù trễ âm thanh thủ công ms)
    const inputTab2Latency = document.getElementById('input-tab2-latency-offset');
    if (inputTab2Latency) {
      const savedTab2Latency = localStorage.getItem('tab2_latency_compensation_ms');
      if (savedTab2Latency !== null) {
        const val = parseFloat(savedTab2Latency);
        if (!isNaN(val)) {
          inputTab2Latency.value = val;
          this.audioTab2.customLatencyMs = val;
        }
      } else {
        this.audioTab2.customLatencyMs = 65;
        inputTab2Latency.value = 65;
      }

      const onTab2LatencyChange = () => {
        const val = parseFloat(inputTab2Latency.value);
        if (!isNaN(val)) {
          this.audioTab2.customLatencyMs = val;
          localStorage.setItem('tab2_latency_compensation_ms', val);
        }
      };

      inputTab2Latency.addEventListener('input', onTab2LatencyChange);
      inputTab2Latency.addEventListener('change', onTab2LatencyChange);
    }

    // Tab 2 BPM & Bar / Beat Grid Control
    const inputTab2Bpm = document.getElementById('input-tab2-bpm');
    const selectTab2BarGrid = document.getElementById('select-tab2-bar-grid');

    if (inputTab2Bpm) {
      const savedBpm = localStorage.getItem('tab2_bpm');
      if (savedBpm !== null) {
        const val = parseFloat(savedBpm);
        if (!isNaN(val) && val >= 30 && val <= 300) {
          inputTab2Bpm.value = val;
          this.chordAnalyzerTab2.bpm = val;
        }
      }
      const onBpmChange = () => {
        const val = parseFloat(inputTab2Bpm.value);
        if (!isNaN(val) && val > 0) {
          this.chordAnalyzerTab2.bpm = val;
          localStorage.setItem('tab2_bpm', val);
          this.chordAnalyzerTab2.render();
        }
      };
      inputTab2Bpm.addEventListener('input', onBpmChange);
      inputTab2Bpm.addEventListener('change', onBpmChange);
    }

    if (selectTab2BarGrid) {
      const savedGrid = localStorage.getItem('tab2_bar_grid');
      if (savedGrid !== null) {
        selectTab2BarGrid.value = savedGrid;
        this.chordAnalyzerTab2.barGridMode = savedGrid;
      }
      selectTab2BarGrid.addEventListener('change', (e) => {
        this.chordAnalyzerTab2.barGridMode = e.target.value;
        localStorage.setItem('tab2_bar_grid', e.target.value);
        this.chordAnalyzerTab2.render();
      });
    }

    const selPitchRange = document.getElementById('select-tab2-pitch-range');
    if (selPitchRange) {
      selPitchRange.addEventListener('change', (e) => {
        this.chordAnalyzerTab2.pitchRangeMode = e.target.value;
        this.chordAnalyzerTab2.offscreenValid = false;
        this.chordAnalyzerTab2.buildOffscreenCanvases();
        this.chordAnalyzerTab2.render();
      });
    }

    // Tab 2 Unified Load Dropdown
    const btnTab2Load = document.getElementById('btn-tab2-load');
    const tab2LoadDropdown = document.getElementById('tab2-load-dropdown-menu');
    if (btnTab2Load && tab2LoadDropdown) {
      btnTab2Load.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = tab2LoadDropdown.classList.contains('show');
        if (isOpen) {
          closeDropdown(tab2LoadDropdown);
        } else {
          openDropdown(tab2LoadDropdown, btnTab2Load, 'right');
          tab2LoadDropdown.classList.add('show');
          tab2LoadDropdown.style.display = 'flex';
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#tab2-load-dropdown-wrapper') && !e.target.closest('#tab2-load-dropdown-menu')) {
          closeDropdown(tab2LoadDropdown);
        }
      });
    }

    const btnTab2LoadSample1 = document.getElementById('btn-tab2-load-sample1');
    if (btnTab2LoadSample1) {
      btnTab2LoadSample1.addEventListener('click', () => {
        closeDropdown(tab2LoadDropdown);
        this.loadTab2Preset(1);
      });
    }

    const btnTab2LoadLocal = document.getElementById('btn-tab2-load-local');
    const btnTab2Select = document.getElementById('btn-tab2-select-file');
    const inputTab2 = document.getElementById('input-audio-tab2');

    if (btnTab2LoadLocal && inputTab2) {
      btnTab2LoadLocal.addEventListener('click', () => {
        closeDropdown(tab2LoadDropdown);
        inputTab2.click();
      });
    }
    if (btnTab2Select && inputTab2) {
      btnTab2Select.addEventListener('click', () => inputTab2.click());
    }
    if (inputTab2) {
      inputTab2.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadTab2AudioFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Tab 2 Drag and Drop
    const dropzone = document.getElementById('tab2-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadTab2AudioFile(e.dataTransfer.files[0]);
        }
      });
    }
  }

  // -------------------------------------------------------------
  // Tab 1 Operations
  // -------------------------------------------------------------
  async loadTab1AudioFile(file) {
    try {
      this.showLoading(`Đang đọc file "${file.name}" vào RAM Tab 1...`, 0.05);
      const arrayBuf = await file.arrayBuffer();

      this.showLoading('Đang giải mã & Downsample 16kHz Mono (Tab 1)...', 0.25);
      await this.audioTab1.loadAudioBuffer(arrayBuf, file.name, (p) => {
        this.showLoading('Đang phân tích âm thanh Tab 1...', p);
      });

      this.showLoading('Đang tính ma trận 2D STFT (512-pt Cooley-Tukey FFT)...', 0.5);
      const spec = await this.fftTab1.computeSpectrogramAsync(
        this.audioTab1.samples16k,
        16000,
        (p) => this.showLoading('Đang vẽ biểu đồ phổ Tab 1...', p)
      );

      this.rendererTab1.spectrogram = spec;
      this.rendererTab1.selectionStartMs = 0;
      this.rendererTab1.selectionEndMs = Math.min(3000, this.audioTab1.durationMs);

      // Reset hoàn toàn danh sách câu từ file audio cũ
      this.cuesTab1 = [];
      this.selectedCueIds.clear();
      this.selectTab1Cue(null);

      // Reset lịch sử Undo / Redo cho file audio mới
      this.historyStack = [];
      this.redoStack = [];
      this.updateUndoRedoButtonsState();

      this.updateHeaderMeta(file.name, this.audioTab1.durationMs);
      this.hideLoading();
      this.rendererTab1.resetScrollToStart();
      this.rendererTab1.resize();
      this.renderTab1CuesList();
    } catch (err) {
      console.error(err);
      this.hideLoading();
      alert('Không thể đọc file audio Tab 1: ' + err.message);
    }
  }

  async loadTab1SubtitleFile(file) {
    try {
      this.showLoading(`Đang đọc file phụ đề "${file.name}"...`, 0.2);
      const text = await file.text();
      const parsedCues = SubtitleParser.parse(text, file.name);

      if (!parsedCues || parsedCues.length === 0) {
        this.hideLoading();
        alert('Không tìm thấy dòng phụ đề hợp lệ trong file: ' + file.name);
        return;
      }

      this.cuesTab1 = parsedCues;
      this.selectedCueIds.clear();

      const maxEnd = Math.max(...parsedCues.map(c => c.endMs || 0));
      if (!this.audioTab1.durationMs || this.audioTab1.durationMs < maxEnd) {
        this.audioTab1.durationMs = Math.max(7000, maxEnd + 1000);
      }

      this.selectTab1Cue(parsedCues[0]);
      this.renderTab1CuesList();
      this.rendererTab1.render();
      this.hideLoading();
    } catch (err) {
      console.error(err);
      this.hideLoading();
      alert('Không thể đọc file phụ đề: ' + err.message);
    }
  }

  getClockStateTooltip(state) {
    switch (state) {
      case CueClockState.OFF:
        return t('clock_off');
      case CueClockState.SHOW_LOCKED:
        return t('clock_show_locked');
      case CueClockState.EDITING_TIME:
        return t('clock_editing_time');
      case CueClockState.EDITING_WORDS:
        return t('clock_editing_words');
      default:
        return t('master_clock_title');
    }
  }

  async loadTab1Preset(presetId = 1) {
    const trackLabel = 'Ví dụ 1';
    const candidatePaths = [
      './assets/french_liaisons.mp3',
      'assets/french_liaisons.mp3',
      './assets/french_liaisons.wav',
      'assets/french_liaisons.wav',
      '/assets/french_liaisons.mp3',
      '/assets/french_liaisons.wav'
    ];
    const presetCues = [
      new SubtitleCue({
        startMs: 0,
        endMs: 2100,
        text: "C'est une très belle histoire",
        actor: "Ví dụ 1",
        clockState: CueClockState.EDITING_WORDS
      }),
      new SubtitleCue({
        startMs: 2100,
        endMs: 4100,
        text: "les enfants adorent les oiseaux",
        actor: "Ví dụ 1",
        clockState: CueClockState.EDITING_TIME
      }),
      new SubtitleCue({
        startMs: 4100,
        endMs: 6020,
        text: "et nous allons ensemble à Paris",
        actor: "Ví dụ 1",
        clockState: CueClockState.SHOW_LOCKED
      })
    ];

    this.cuesTab1 = presetCues;
    this.selectTab1Cue(presetCues[0]);
    this.renderTab1CuesList();

    // 1) Instant 0ms render with synthetic speech so canvas is never blank or stuck
    const durSec = presetCues.length > 0 ? (presetCues[presetCues.length - 1].endMs / 1000.0) : 6.02;
    this.audioTab1.loadSyntheticSpeechBuffer(durSec, trackLabel);
    this.updateHeaderMeta(trackLabel, this.audioTab1.durationMs);
    this.rendererTab1.resetScrollToStart();
    this.rendererTab1.resize();

    try {
      const initialSpec = await this.fftTab1.computeSpectrogramAsync(this.audioTab1.samples16k, 16000, () => {});
      this.rendererTab1.spectrogram = initialSpec;
      this.rendererTab1.resize();
      this.renderTab1CuesList();
    } catch (_) {}

    // 2) Asynchronously load real audio file in background without blocking UI
    (async () => {
      let arrayBuf = null;
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
        try {
          await this.audioTab1.loadAudioBuffer(arrayBuf, trackLabel, () => {});
          const realSpec = await this.fftTab1.computeSpectrogramAsync(this.audioTab1.samples16k, 16000, () => {});
          this.rendererTab1.spectrogram = realSpec;
          if (this.currentTab === 'tab1') {
            this.updateHeaderMeta(trackLabel, this.audioTab1.durationMs);
          }
          this.rendererTab1.resize();
        } catch (loadErr) {
          console.warn('Real audio decode fallback:', loadErr);
        }
      }
    })();
  }

  updateStartEndButtonsState() {
    const btnSetStart = document.getElementById('btn-set-start');
    const btnSetEnd = document.getElementById('btn-set-end');
    if (!btnSetStart || !btnSetEnd) return;

    const isLockedOrOff = !!(this.activeCueTab1 && (this.activeCueTab1.clockState === CueClockState.SHOW_LOCKED || this.activeCueTab1.clockState === CueClockState.OFF));

    if (isLockedOrOff) {
      btnSetStart.disabled = true;
      btnSetStart.classList.add('locked-disabled');
      btnSetStart.title = 'Phím [ Start ] bị ẩn và làm tối khi đồng hồ màu xanh dương hoặc màu xám (chế độ không chỉnh sửa). Đổi đồng hồ sang Vàng để chỉnh mốc.';

      btnSetEnd.disabled = true;
      btnSetEnd.classList.add('locked-disabled');
      btnSetEnd.title = 'Phím [ Stop ] bị ẩn và làm tối khi đồng hồ màu xanh dương hoặc màu xám (chế độ không chỉnh sửa). Đổi đồng hồ sang Vàng để chỉnh mốc.';
    } else {
      btnSetStart.disabled = false;
      btnSetStart.classList.remove('locked-disabled');
      btnSetStart.title = 'Gán điểm Bắt đầu câu tại con trỏ (Phím [)';

      btnSetEnd.disabled = false;
      btnSetEnd.classList.remove('locked-disabled');
      btnSetEnd.title = 'Gán điểm Kết thúc (Stop) câu tại con trỏ (Phím ])';
    }
  }

  selectTab1Cue(cue) {
    if (!this.activeCueTab1 || (cue && cue.id !== this.activeCueTab1.id)) {
      this.lastPlayedWordTab1 = null;
    }
    this.activeCueTab1 = cue;
    this.rendererTab1.activeCue = cue;
    this.rendererTab1.cues = this.cuesTab1;
    if (cue) {
      this.rendererTab1.selectionStartMs = cue.startMs;
      this.rendererTab1.selectionEndMs = cue.endMs;
      this.audioTab1.loopStartMs = cue.startMs;
      this.audioTab1.loopEndMs = cue.endMs;
    }
    this.updateStartEndButtonsState();
    this.rendererTab1.render();
  }

  addTab1CuesFromText(rawText, position = 'AFTER_SELECTED') {
    let sentences = [];
    if (typeof rawText === 'string' && rawText.trim().length > 0) {
      sentences = rawText
        .split(/(?<=[.!?])\s+|(?<=[.!?])(?=[A-Za-z\u00C0-\u024F])|\r?\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Nếu không nhập nội dung gì, vẫn tạo 1 câu trống tương ứng hợp lệ
    if (sentences.length === 0) {
      sentences = [''];
    }

    this.pushHistoryState();

    let baseStart = 0;
    if (this.cuesTab1 && this.cuesTab1.length > 0) {
      if (position === 'START_OF_LIST') {
        baseStart = 0;
      } else if (position === 'BEFORE_SELECTED' && this.activeCueTab1) {
        baseStart = Math.max(0, this.activeCueTab1.startMs - 2500);
      } else if (position === 'AFTER_SELECTED' && this.activeCueTab1) {
        baseStart = this.activeCueTab1.endMs;
      } else {
        const lastCue = this.cuesTab1[this.cuesTab1.length - 1];
        baseStart = lastCue ? lastCue.endMs : 0;
      }
    } else {
      baseStart = this.audioTab1 ? this.audioTab1.getCurrentPosition() : 0;
    }

    const defaultDuration = 2500;
    const newCues = sentences.map((s, i) => new SubtitleCue({
      startMs: Math.round(baseStart + i * defaultDuration),
      endMs: Math.round(baseStart + (i + 1) * defaultDuration),
      text: s,
      clockState: CueClockState.SHOW_LOCKED
    }));

    if (!this.cuesTab1 || this.cuesTab1.length === 0) {
      this.cuesTab1 = newCues;
    } else if (position === 'START_OF_LIST') {
      this.cuesTab1.unshift(...newCues);
    } else if (position === 'END_OF_LIST' || !this.activeCueTab1) {
      this.cuesTab1.push(...newCues);
    } else {
      const idx = this.cuesTab1.indexOf(this.activeCueTab1);
      this.cuesTab1.splice(position === 'BEFORE_SELECTED' ? idx : idx + 1, 0, ...newCues);
    }

    const maxEnd = Math.max(...this.cuesTab1.map(c => c.endMs || 0));
    if (!this.audioTab1.durationMs || this.audioTab1.durationMs < maxEnd) {
      this.audioTab1.durationMs = Math.max(7000, maxEnd + 1000);
    }

    this.selectTab1Cue(newCues[0]);
    this.renderTab1CuesList();
    this.rendererTab1.render();
  }

  renderTab1CuesList() {
    this.updateStartEndButtonsState();
    const container = document.getElementById('cues-list-container');
    if (!container) return;
    container.innerHTML = '';

    const countLabel = document.getElementById('cues-count-label');
    if (countLabel) {
      const selectedSuffix = this.selectedCueIds.size > 0
        ? (CURRENT_LANG === 'EN' ? ` • Selected ${this.selectedCueIds.size}` : ` • Đã chọn ${this.selectedCueIds.size}`)
        : '';
      countLabel.textContent = `${t('cues_count_prefix')}${this.cuesTab1.length})${selectedSuffix}`;
    }

    const hasSelected = this.selectedCueIds.size > 0;

    const btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) {
      btnSelectAll.style.display = hasSelected ? 'inline-flex' : 'none';
      const allSelected = this.cuesTab1.length > 0 && this.selectedCueIds.size === this.cuesTab1.length;
      btnSelectAll.classList.toggle('active', allSelected);
      btnSelectAll.title = allSelected
        ? (CURRENT_LANG === 'EN' ? 'Deselect all lines' : 'Bỏ chọn tất cả')
        : t('select_all_title');
      btnSelectAll.disabled = this.cuesTab1.length === 0;
    }

    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    if (btnDeleteSelected) {
      btnDeleteSelected.style.display = hasSelected ? 'inline-flex' : 'none';
      btnDeleteSelected.disabled = !hasSelected;
      btnDeleteSelected.title = hasSelected
        ? t('delete_multiple_title', this.selectedCueIds.size)
        : t('delete_selected_title');
    }

    const btnMoveUp = document.getElementById('btn-move-up');
    const btnMoveDown = document.getElementById('btn-move-down');
    const canMove = this.cuesTab1.length >= 2 && (this.selectedCueIds.size > 0 || this.activeCueTab1);
    if (btnMoveUp) {
      btnMoveUp.disabled = !canMove;
      btnMoveUp.title = t('move_up_title');
    }
    if (btnMoveDown) {
      btnMoveDown.disabled = !canMove;
      btnMoveDown.title = t('move_down_title');
    }

    if (this.cuesTab1.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'padding: 36px 16px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;';
      emptyDiv.innerHTML = `
        <div style="font-size: 26px; margin-bottom: 6px;">📝</div>
        <div style="font-weight: 600; color: #94a3b8; margin-bottom: 4px;">${t('empty_cues_title')}</div>
        <div style="font-size: 12px; color: #64748b;">${t('empty_cues_desc')}</div>
      `;
      container.appendChild(emptyDiv);
      return;
    }

    this.cuesTab1.forEach((cue) => {
      const isActive = this.activeCueTab1 && this.activeCueTab1.id === cue.id;
      const isSelected = this.selectedCueIds.has(cue.id);

      const card = document.createElement('div');
      card.className = `cue-card ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.nudge-btn') || e.target.closest('.cue-clock-btn') || e.target.tagName === 'INPUT') return;
        this.selectTab1Cue(cue);
        this.rendererTab1.scrollOffsetMs = cue.startMs - (this.rendererTab1.width * this.rendererTab1.msPerPixel) * 0.15;
        this.rendererTab1.clampScroll();
        this.audioTab1.seek(cue.startMs);
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      // Left selection checkbox
      const leftSelect = document.createElement('div');
      leftSelect.className = 'cue-card-left-select';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cue-select-checkbox';
      checkbox.checked = isSelected;
      checkbox.title = 'Chọn câu này để di chuyển Lên/Xuống';
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedCueIds.has(cue.id)) {
          this.selectedCueIds.delete(cue.id);
        } else {
          this.selectedCueIds.add(cue.id);
        }
        this.renderTab1CuesList();
      });
      leftSelect.appendChild(checkbox);
      card.appendChild(leftSelect);

      // Main content
      const cardMain = document.createElement('div');
      cardMain.className = 'cue-card-main';

      const row1 = document.createElement('div');
      row1.className = 'cue-card-row1';

      const metaLeft = document.createElement('div');
      metaLeft.className = 'cue-meta-left';

      const canEditTimes = (cue.clockState === CueClockState.EDITING_TIME || cue.clockState === CueClockState.EDITING_WORDS);
      const lockedTip = t('cue_locked_tip');

      // Start Time Input (Màu xanh khi edit - chìm màu xám khi clock xám/xanh)
      const startInput = document.createElement('input');
      startInput.type = 'text';
      startInput.className = canEditTimes
        ? 'cue-time-input start-time mono-font'
        : 'cue-time-input start-time mono-font time-muted';
      startInput.value = TimeFormatter.formatFull(cue.startMs);
      startInput.readOnly = !canEditTimes;
      startInput.title = canEditTimes
        ? t('cue_start_title')
        : lockedTip;
      startInput.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectTab1Cue(cue);
      });
      startInput.addEventListener('focus', () => {
        this.selectTab1Cue(cue);
      });
      if (canEditTimes) {
        startInput.addEventListener('change', () => {
          const parsed = TimeFormatter.parseFull(startInput.value);
          if (parsed !== null && parsed >= 0 && parsed < cue.endMs) {
            this.pushHistoryState();
            cue.startMs = parsed;
            this.rendererTab1.selectionStartMs = parsed;
            this.audioTab1.loopStartMs = parsed;
            startInput.value = TimeFormatter.formatFull(parsed);
            this.rendererTab1.render();
          } else {
            startInput.value = TimeFormatter.formatFull(cue.startMs);
          }
        });
        startInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') startInput.blur();
        });
      }

      // Dấu mũi tên phân tách
      const arrowSep = document.createElement('span');
      arrowSep.className = 'cue-time-arrow' + (!canEditTimes ? ' time-muted' : '');
      arrowSep.textContent = '→';

      // End Time Input (Màu đỏ khi edit - chìm màu xám khi clock xám/xanh)
      const endInput = document.createElement('input');
      endInput.type = 'text';
      endInput.className = canEditTimes
        ? 'cue-time-input end-time mono-font'
        : 'cue-time-input end-time mono-font time-muted';
      endInput.value = TimeFormatter.formatFull(cue.endMs);
      endInput.readOnly = !canEditTimes;
      endInput.title = canEditTimes
        ? t('cue_end_title')
        : lockedTip;
      endInput.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectTab1Cue(cue);
      });
      endInput.addEventListener('focus', () => {
        this.selectTab1Cue(cue);
      });
      if (canEditTimes) {
        endInput.addEventListener('change', () => {
          const parsed = TimeFormatter.parseFull(endInput.value);
          if (parsed !== null && parsed > cue.startMs) {
            this.pushHistoryState();
            cue.endMs = parsed;
            this.rendererTab1.selectionEndMs = parsed;
            this.audioTab1.loopEndMs = parsed;
            endInput.value = TimeFormatter.formatFull(parsed);
            this.rendererTab1.render();
          } else {
            endInput.value = TimeFormatter.formatFull(cue.endMs);
          }
        });
        endInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') endInput.blur();
        });
      }

      const clockBtn = document.createElement('button');
      clockBtn.className = 'cue-clock-btn';
      clockBtn.setAttribute('data-state', cue.clockState);
      clockBtn.title = this.getClockStateTooltip(cue.clockState);
      clockBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      clockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pushHistoryState();
        const states = [CueClockState.OFF, CueClockState.SHOW_LOCKED, CueClockState.EDITING_TIME, CueClockState.EDITING_WORDS];
        const curIdx = states.indexOf(cue.clockState);
        cue.clockState = states[(curIdx + 1) % states.length];
        if (cue.clockState === CueClockState.EDITING_WORDS && (!cue.wordTimings || cue.wordTimings.length === 0)) {
          cue.wordTimings = cue.resolvedWordTimings();
        }
        clockBtn.setAttribute('data-state', cue.clockState);
        clockBtn.title = this.getClockStateTooltip(cue.clockState);
        this.selectTab1Cue(cue);
        this.renderTab1CuesList();
        this.rendererTab1.render();
      });

      metaLeft.appendChild(startInput);
      metaLeft.appendChild(arrowSep);
      metaLeft.appendChild(endInput);
      metaLeft.appendChild(clockBtn);

      row1.appendChild(metaLeft);
      cardMain.appendChild(row1);

      const textInput = document.createElement('input');
      textInput.className = 'cue-text-input';
      textInput.value = cue.text;
      let prevText = cue.text;
      textInput.addEventListener('focus', () => {
        prevText = cue.text;
        this.selectTab1Cue(cue);
      });
      textInput.addEventListener('change', (e) => {
        if (e.target.value !== prevText) {
          this.pushHistoryState();
          cue.text = e.target.value;
          prevText = cue.text;
          this.rendererTab1.render();
        }
      });
      textInput.addEventListener('input', (e) => {
        cue.text = e.target.value;
        this.rendererTab1.render();
      });
      cardMain.appendChild(textInput);

      card.appendChild(cardMain);
      container.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // Tab 2 Operations
  // -------------------------------------------------------------
  loadTab2Preset(presetId = 1) {
    try {
      const trackLabel = 'Ví dụ 1: Piano (C - G - Am - F)';
      this.audioTab2.loadSyntheticPianoChordsBuffer(trackLabel);

      const emptyOverlay = document.getElementById('tab2-empty-overlay');
      if (emptyOverlay) emptyOverlay.style.display = 'none';

      if (this.currentTab === 'tab2') {
        this.updateHeaderMeta(trackLabel, this.audioTab2.durationMs);
      }

      if (this.chordWorker) {
        this.chordWorker.terminate();
      }

      this.chordWorker = new Worker('./chord-worker.js');
      this.chordWorker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'done') {
          this.chordAnalyzerTab2.data = msg;
          this.chordAnalyzerTab2.resetPitchRangeToAuto();
          this.chordAnalyzerTab2.offscreenValid = false;
          this.chordAnalyzerTab2.buildOffscreenCanvases();
          this.chordAnalyzerTab2.midiNotes = null;
          if (this.chordAnalyzerTab2.isMidiVisible) {
            this.chordAnalyzerTab2.transcribeMidiFromCqt();
            const badgeText = document.getElementById('tab2-midi-badge-text');
            if (badgeText && this.chordAnalyzerTab2.midiNotes) {
              badgeText.textContent = `MIDI Piano Roll (${this.chordAnalyzerTab2.midiNotes.length} nốt)`;
            }
          }
          if (this.currentTab === 'tab2') {
            this.updateHeaderMeta(trackLabel, this.audioTab2.durationMs);
          }
          this.chordAnalyzerTab2.resize();
        } else if (msg.type === 'error') {
          console.error('Lỗi phân tích hợp âm preset Tab 2:', msg.error);
        }
      };

      this.chordWorker.postMessage({
        action: 'analyzeChords',
        samples: this.audioTab2.samples16k,
        sampleRate: 16000
      });
    } catch (err) {
      console.error('loadTab2Preset error:', err);
    }
  }

  async loadTab2AudioFile(file) {
    try {
      this.showLoading(`Đang đọc bài nhạc "${file.name}" vào RAM Tab 2...`, 0.05);
      const arrayBuf = await file.arrayBuffer();

      this.showLoading('Đang giải mã Web Audio & Downsample 16kHz (Tab 2)...', 0.2);
      await this.audioTab2.loadAudioBuffer(arrayBuf, file.name, (p) => {
        this.showLoading('Đang trích xuất dạng sóng Tab 2...', p);
      });

      this.showLoading('Khởi tạo Web Worker phân tích Constant-Q Transform & Chromagram...', 0.35);

      if (this.chordWorker) {
        this.chordWorker.terminate();
      }

      this.chordWorker = new Worker('./chord-worker.js');

      this.chordWorker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          this.showLoading('Đang phân tích CQT Semitones & Triệt tiêu bồi âm trong Web Worker...', 0.35 + msg.progress * 0.6);
        } else if (msg.type === 'done') {
          this.chordAnalyzerTab2.data = msg;
          this.chordAnalyzerTab2.resetPitchRangeToAuto();
          this.chordAnalyzerTab2.offscreenValid = false;
          this.chordAnalyzerTab2.buildOffscreenCanvases();
          this.chordAnalyzerTab2.midiNotes = null;
          if (this.chordAnalyzerTab2.isMidiVisible) {
            this.chordAnalyzerTab2.transcribeMidiFromCqt();
            const badgeText = document.getElementById('tab2-midi-badge-text');
            if (badgeText && this.chordAnalyzerTab2.midiNotes) {
              badgeText.textContent = `MIDI Piano Roll (${this.chordAnalyzerTab2.midiNotes.length} nốt)`;
            }
          }
          this.hideLoading();

          const emptyOverlay = document.getElementById('tab2-empty-overlay');
          if (emptyOverlay) emptyOverlay.style.display = 'none';

          if (this.currentTab === 'tab2') {
            this.updateHeaderMeta(file.name, this.audioTab2.durationMs);
          }

          this.chordAnalyzerTab2.resize();
        } else if (msg.type === 'error') {
          this.hideLoading();
          alert('Lỗi phân tích hợp âm trong Web Worker: ' + msg.error);
        }
      };

      this.chordWorker.postMessage({
        action: 'analyzeChords',
        samples: this.audioTab2.samples16k,
        sampleRate: 16000
      });

    } catch (err) {
      console.error(err);
      this.hideLoading();
      alert('Không thể mở file nhạc Tab 2: ' + err.message);
    }
  }

  // -------------------------------------------------------------
  // Playback Loop & Keyboard Shortcuts
  // -------------------------------------------------------------
  initAudioPlaybackLoop() {
    const playBtn1 = document.getElementById('btn-play');
    this.audioTab1.onPlayStateChange = (playing) => {
      if (!playBtn1) return;
      playBtn1.classList.toggle('playing', playing);
      playBtn1.innerHTML = playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    };

    const playBtn2 = document.getElementById('btn-tab2-play');
    this.audioTab2.onPlayStateChange = (playing) => {
      if (!playBtn2) return;
      playBtn2.classList.toggle('playing', playing);
      playBtn2.innerHTML = playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    };

    const tick = () => {
      if (this.currentTab === 'tab1') {
        if (this.audioTab1.isPlaying) {
          const cur1 = this.audioTab1.getCurrentPosition();
          const visibleWindowMs = (this.rendererTab1.width || 800) * this.rendererTab1.msPerPixel;
          const leftMs = this.rendererTab1.scrollOffsetMs;
          const rightMs = leftMs + visibleWindowMs;
          if (cur1 >= rightMs || cur1 < leftMs) {
            this.rendererTab1.scrollOffsetMs = cur1 - visibleWindowMs * 0.15;
            this.rendererTab1.clampScroll();
          }
          this.rendererTab1.render();
        }
        const cur1 = this.audioTab1.getCurrentPosition();
        const badge1 = document.getElementById('cursor-time-badge');
        if (badge1) badge1.textContent = TimeFormatter.formatFull(cur1);
      } else {
        if (this.audioTab2.isPlaying) {
          const cur2 = this.audioTab2.getCurrentPosition();
          const viewW = (this.chordAnalyzerTab2.cqtWidth || 800) - this.chordAnalyzerTab2.leftGutterWidth;
          const visibleWindowMs = viewW * this.chordAnalyzerTab2.msPerPixel;
          const leftMs = this.chordAnalyzerTab2.scrollOffsetMs;
          const rightMs = leftMs + visibleWindowMs;
          if (cur2 >= rightMs || cur2 < leftMs) {
            this.chordAnalyzerTab2.scrollOffsetMs = Math.max(-200, cur2 - visibleWindowMs * 0.15);
          }
          this.chordAnalyzerTab2.render();
        }
        const cur2 = this.audioTab2.getCurrentPosition();
        const badge2 = document.getElementById('tab2-time-badge');
        if (badge2) badge2.textContent = TimeFormatter.formatFull(cur2);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+Z (Undo) & Ctrl+Y / Ctrl+Shift+Z (Redo) for Tab 1
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (this.currentTab === 'tab1') {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          return;
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (this.currentTab === 'tab1') {
          e.preventDefault();
          this.redo();
          return;
        }
      }

      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.currentTab === 'tab1') this.audioTab1.togglePlay();
        else this.audioTab2.togglePlay();
      } else if (e.code === 'KeyS' && this.currentTab === 'tab1') {
        e.preventDefault();
        const btn = document.getElementById('btn-play-line');
        if (btn) btn.click();
      } else if (e.code === 'KeyW' && this.currentTab === 'tab1') {
        e.preventDefault();
        const btn = document.getElementById('btn-play-word');
        if (btn) btn.click();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        if (this.currentTab === 'tab1') {
          const btn = document.getElementById('btn-loop');
          if (btn) btn.click();
        } else {
          const btn = document.getElementById('btn-tab2-loop');
          if (btn) btn.click();
        }
      } else if (e.code === 'Home') {
        e.preventDefault();
        if (this.currentTab === 'tab1') {
          this.audioTab1.seek(0);
          this.rendererTab1.scrollOffsetMs = 0;
          this.rendererTab1.clampScroll();
          this.rendererTab1.render();
        } else {
          const btnRewind = document.getElementById('btn-tab2-rewind');
          if (btnRewind) btnRewind.click();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -100 : -500;
        const curAudio = (this.currentTab === 'tab1') ? this.audioTab1 : this.audioTab2;
        curAudio.seek(curAudio.getCurrentPosition() + delta);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 100 : 500;
        const curAudio = (this.currentTab === 'tab1') ? this.audioTab1 : this.audioTab2;
        curAudio.seek(curAudio.getCurrentPosition() + delta);
      } else if (e.key === '+' || e.key === '=') {
        if (this.currentTab === 'tab1') {
          this.rendererTab1.zoomFactor = Math.min(200, Math.max(this.rendererTab1.zoomFactor + 1, this.rendererTab1.zoomFactor * 1.22));
          this.rendererTab1.clampScroll();
          this.rendererTab1.render();
        } else {
          this.chordAnalyzerTab2.zoomFactor = Math.min(250, Math.max(this.chordAnalyzerTab2.zoomFactor + 1, this.chordAnalyzerTab2.zoomFactor * 1.22));
          this.chordAnalyzerTab2.clampScroll();
          this.chordAnalyzerTab2.render();
        }
      } else if (e.key === '-' || e.key === '_') {
        if (this.currentTab === 'tab1') {
          this.rendererTab1.zoomFactor = Math.max(0.05, this.rendererTab1.zoomFactor * 0.82);
          this.rendererTab1.clampScroll();
          this.rendererTab1.render();
        } else {
          this.chordAnalyzerTab2.zoomFactor = Math.max(0.05, this.chordAnalyzerTab2.zoomFactor * 0.82);
          this.chordAnalyzerTab2.clampScroll();
          this.chordAnalyzerTab2.render();
        }
      }
    });
  }
}

// -------------------------------------------------------------
// 7. Initialization: 100% Wrapped in window.addEventListener('load', ...)
// -------------------------------------------------------------
function initAppSafely() {
  if (!window.app) {
    window.app = new SpectroSubApp();
  }
}

if (document.readyState === 'complete') {
  initAppSafely();
} else {
  window.addEventListener('load', initAppSafely);
}
