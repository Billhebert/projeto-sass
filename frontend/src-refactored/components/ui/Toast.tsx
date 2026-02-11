import React, { createContext, useContext, useEffect, useState } from 'react';
import { tokens } from '@/styles/tokens';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: tokens.spacing[4],
    right: tokens.spacing[4],
    zIndex: tokens.zIndex.toast,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[2],
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const typeColors = {
    success: {
      bg: tokens.colors.success[50],
      border: tokens.colors.success[500],
      text: tokens.colors.success[700],
    },
    error: {
      bg: tokens.colors.error[50],
      border: tokens.colors.error[500],
      text: tokens.colors.error[700],
    },
    warning: {
      bg: tokens.colors.warning[50],
      border: tokens.colors.warning[500],
      text: tokens.colors.warning[700],
    },
    info: {
      bg: tokens.colors.info[50],
      border: tokens.colors.info[500],
      text: tokens.colors.info[700],
    },
  };

  const colors = typeColors[toast.type];

  const toastStyle: React.CSSProperties = {
    backgroundColor: colors.bg,
    borderLeft: `4px solid ${colors.border}`,
    color: colors.text,
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    borderRadius: tokens.borderRadius.md,
    boxShadow: tokens.shadows.lg,
    minWidth: '300px',
    maxWidth: '500px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing[3],
    animation: isExiting ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out',
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: tokens.typography.lineHeight.relaxed,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.text,
    cursor: 'pointer',
    fontSize: tokens.typography.fontSize.lg,
    padding: 0,
    lineHeight: 1,
    opacity: 0.7,
  };

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
      <div style={toastStyle} role="alert" aria-live="polite">
        <span>{toast.message}</span>
        <button
          style={closeButtonStyle}
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
          }}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </>
  );
};
