import React, { useState } from 'react';

interface AddCuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string, position: 'AFTER_SELECTED' | 'BEFORE_SELECTED' | 'START_OF_LIST' | 'END_OF_LIST') => void;
}

export const AddCuesModal: React.FC<AddCuesModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [position, setPosition] = useState<'AFTER_SELECTED' | 'BEFORE_SELECTED' | 'START_OF_LIST' | 'END_OF_LIST'>('AFTER_SELECTED');
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (text.trim()) {
      onConfirm(text, position);
      setText('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Thêm câu hoặc đoạn văn bản</h3>
          <button className="tb-btn icon-only modal-close-btn" style={{ border: 'none', background: 'transparent' }} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Vị trí chèn câu:</label>
          <select
            className="tb-select"
            style={{ width: '100%' }}
            value={position}
            onChange={(e) => setPosition(e.target.value as 'AFTER_SELECTED' | 'BEFORE_SELECTED' | 'START_OF_LIST' | 'END_OF_LIST')}
          >
            <option value="AFTER_SELECTED">Sau câu đang chọn</option>
            <option value="BEFORE_SELECTED">Trước câu đang chọn</option>
            <option value="START_OF_LIST">Đầu danh sách</option>
            <option value="END_OF_LIST">Cuối danh sách</option>
          </select>

          <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Nội dung (mỗi dòng sẽ tạo một câu riêng):
          </label>
          <textarea
            rows={6}
            className="cue-text-input"
            placeholder="Dán văn bản hoặc các câu tiếng Pháp vào đây..."
            style={{ resize: 'vertical' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="tb-btn modal-close-btn" onClick={onClose}>Hủy</button>
          <button className="tb-btn play-selection" onClick={handleSubmit}>Xác nhận Thêm</button>
        </div>
      </div>
    </div>
  );
};
