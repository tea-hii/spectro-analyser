import React from 'react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message: string;
  progress: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isOpen, message, progress }) => {
  if (!isOpen) return null;

  return (
    <div className="loading-overlay" style={{ display: 'flex' }}>
      <div className="loading-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{message}</span>
        </div>
        <div className="loading-bar-bg" style={{ width: '100%', height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden', marginTop: 10 }}>
          <div
            className="loading-bar-fill"
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
              transition: 'width 0.15s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
};
