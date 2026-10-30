import React from 'react';

interface ToastProps {
  message: string | null;
  isError?: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isError = false, onClose }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-container"
      style={{ backgroundColor: isError ? '#b91c1c' : '#15803d' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {isError ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        ) : (
          <polyline points="20 6 9 17 4 12" />
        )}
      </svg>
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          marginLeft: 6,
          fontWeight: 800,
        }}
      >
        Cerrar
      </button>
    </div>
  );
};
