import React from 'react';

interface FreqLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FreqLegendModal: React.FC<FreqLegendModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Chú Giải Dải Tần Số Ngữ Âm (Speech Spectrogram)</h3>
          <button className="tb-btn icon-only modal-close-btn" style={{ border: 'none', background: 'transparent' }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ borderLeft: '3px solid #38bdf8', paddingLeft: 8 }}>
            <strong style={{ color: '#38bdf8' }}>0 – 300 Hz (Pitch / F0):</strong>
            <div>Tần số cơ bản của thanh quản, phản ánh cao độ giọng nói (nam ~100-150Hz, nữ ~200-250Hz).</div>
          </div>
          <div style={{ borderLeft: '3px solid #10b981', paddingLeft: 8 }}>
            <strong style={{ color: '#10b981' }}>300 – 1.000 Hz (Formant F1):</strong>
            <div>Độ mở của miệng / nguyên âm (Vowel Height). F1 cao với nguyên âm mở [a], thấp với nguyên âm khép [i], [u].</div>
          </div>
          <div style={{ borderLeft: '3px solid #eab308', paddingLeft: 8 }}>
            <strong style={{ color: '#eab308' }}>1.000 – 2.500 Hz (Formant F2):</strong>
            <div>Độ tiến/lùi của lưỡi (Vowel Frontness). F2 rất cao ở các nguyên âm trước của tiếng Pháp [i], [e], [y].</div>
          </div>
          <div style={{ borderLeft: '3px solid #a855f7', paddingLeft: 8 }}>
            <strong style={{ color: '#a855f7' }}>2.500 – 4.500 Hz (Formant F3 &amp; Nasal Antiformants):</strong>
            <div>Âm sắc cá nhân, vần mũi tiếng Pháp (voyelles nasales [õ], [ã], [ɛ̃]) và âm tắc bật hơi [p, t, k].</div>
          </div>
          <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: 8 }}>
            <strong style={{ color: '#ef4444' }}>4.500 – 8.000 Hz (Liaisons, Fricatives [s, z, ʃ, ʒ]):</strong>
            <div>Vùng năng lượng ma sát của phụ âm xát và hiện tượng nối âm Liaison ([z], [t]). Hiển thị rõ rệt trên biểu đồ phổ!</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="tb-btn modal-close-btn" onClick={onClose}>Đã hiểu</button>
        </div>
      </div>
    </div>
  );
};
