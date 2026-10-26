import React from 'react';
import { TabType } from '../types';

interface TabDrawerProps {
  isOpen: boolean;
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onClose: () => void;
}

export const TabDrawer: React.FC<TabDrawerProps> = ({ isOpen, currentTab, onSelectTab, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <aside className="tab-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <img src="/icon.svg" width="22" height="22" alt="" />
            <span>Chuyển Đổi Không Gian</span>
          </div>
          <button
            className="tb-btn icon-only"
            style={{ background: 'transparent', border: 'none', fontSize: 16 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <nav className="drawer-nav">
          {/* Item Tab 1 */}
          <button
            className={`drawer-tab-item ${currentTab === 'tab1' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('tab1');
              onClose();
            }}
          >
            <span className="tab-icon">🗣️</span>
            <div className="tab-info">
              <span className="tab-name">Tab 1: Speech Spectrogram</span>
              <span className="tab-desc">Phân tích ngữ âm, giọng nói tiếng Pháp &amp; biểu đồ phổ STFT 16kHz (60fps Canvas)</span>
            </div>
          </button>

          {/* Item Tab 2 */}
          <button
            className={`drawer-tab-item ${currentTab === 'tab2' ? 'active' : ''}`}
            onClick={() => {
              onSelectTab('tab2');
              onClose();
            }}
          >
            <span className="tab-icon">🎹</span>
            <div className="tab-info">
              <span className="tab-name">Tab 2: Musical Chord Analyzer</span>
              <span className="tab-desc">Phân tích hợp âm trực quan từ stem nhạc cụ, Dynamic CQT Semitones &amp; Chromagram 12 nốt</span>
            </div>
          </button>
        </nav>

        <div style={{ padding: 14, borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          🔒 <strong>Zero-leakage:</strong> Mỗi tab sử dụng AudioContext và bộ nhớ RAM hoàn toàn riêng biệt. Không chia sẻ file giữa 2 tab.
        </div>
      </aside>
    </div>
  );
};
