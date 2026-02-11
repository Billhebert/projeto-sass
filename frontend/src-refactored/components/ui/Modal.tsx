import React, { useEffect, useRef } from 'react';
import { tokens } from '@/styles/tokens';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const sizeMap = {
  sm: '400px',
  md: '600px',
  lg: '800px',
  xl: '1000px',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: tokens.zIndex.modal,
    padding: tokens.spacing[4],
    animation: 'fadeIn 0.2s ease-out',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.neutral[0],
    borderRadius: tokens.borderRadius.lg,
    boxShadow: tokens.shadows.xl,
    maxWidth: sizeMap[size],
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    animation: 'scaleIn 0.2s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    padding: tokens.spacing[6],
    borderBottom: `1px solid ${tokens.colors.neutral[200]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    margin: 0,
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: tokens.typography.fontSize['2xl'],
    color: tokens.colors.neutral[500],
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: `color ${tokens.transitions.fast}`,
  };

  const contentStyle: React.CSSProperties = {
    padding: tokens.spacing[6],
    overflowY: 'auto',
    flex: 1,
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
      <div style={overlayStyle} onClick={onClose} role="presentation">
        <div
          ref={modalRef}
          style={modalStyle}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          tabIndex={-1}
        >
          {(title || showCloseButton) && (
            <div style={headerStyle}>
              {title && (
                <h2 id="modal-title" style={titleStyle}>
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  style={closeButtonStyle}
                  onClick={onClose}
                  aria-label="Close modal"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = tokens.colors.neutral[700];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tokens.colors.neutral[500];
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div style={contentStyle}>{children}</div>
        </div>
      </div>
    </>
  );
};

interface ModalFooterProps {
  children: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => {
  const footerStyle: React.CSSProperties = {
    padding: tokens.spacing[6],
    borderTop: `1px solid ${tokens.colors.neutral[200]}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacing[3],
  };

  return <div style={footerStyle}>{children}</div>;
};
