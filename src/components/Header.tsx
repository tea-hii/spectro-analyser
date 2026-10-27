import React, { useState, useRef, useEffect } from 'react';
import { TabType, TimeFormatter } from '../types';

interface HeaderProps {
  currentTab: TabType;
  trackName: string;
  durationMs: number;
  onOpenDrawer: () => void;
  onSelectFile: () => void;
  onLoadPreset: (presetId: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  trackName,
  durationMs,
  onOpenDrawer,
  onSelectFile,
  onLoadPreset
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        {/* 3-Lines Hamburger Menu Button */}
        <button
          className="hamburger-btn"
          title="Mở danh mục chọn Tab (Phân tích Giọng nói / Phân tích Hợp âm)"
          onClick={onOpenDrawer}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="app-brand" onClick={() => window.location.reload()}>
          <img src="/icon.svg" alt="SpectroSub Logo" className="app-logo-icon" />
          <h1 className="app-title">Web SpectroSub</h1>
        </div>

        {/* Current Active Tab Badge */}
        <span className="active-tab-badge">
          {currentTab === 'tab1' ? 'Tab 1: Speech Spectrogram' : 'Tab 2: Musical Chord Analyzer'}
        </span>
      </div>

      {/* Active Track Meta Chip */}
      <div className="track-meta-chip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <span className="track-name-text" title={trackName}>
          {trackName || 'Chưa nạp file'}
        </span>
        <span className="mono-font" style={{ color: '#38bdf8', fontWeight: 600 }}>
          {TimeFormatter.formatMinuteSecond(durationMs)}
        </span>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        <div className="dropdown-wrapper" ref={dropdownRef}>
          <button
            className="tb-btn dropdown-trigger"
            title="Tải file từ máy hoặc chọn Ví dụ mẫu"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="btn-text">Tải File</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu" style={{ display: 'block' }}>
              <button
                className="dropdown-item"
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onSelectFile();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Tải file từ máy</span>
              </button>

              <button
                className="dropdown-item"
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onLoadPreset(1);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21" />
                </svg>
                <span>Ví dụ 1</span>
              </button>
            </div>
          )}
        </div>

        {/* Disabled / Inactive Export Button per Clean UI specification */}
        <button
          className="tb-btn disabled"
          title="Tính năng lưu / xuất kịch bản tạm thời bị tắt theo yêu cầu giao diện tối giản"
          disabled
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span className="btn-text">Xuất Script (Đã tắt)</span>
        </button>
      </div>
    </header>
  );
};
