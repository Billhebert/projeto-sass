import React from 'react';
import { tokens } from '@/styles/tokens';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = tokens.colors.primary[600],
  className = '',
}) => {
  const dimension = sizeMap[size];

  const containerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: dimension,
    height: dimension,
  };

  const spinnerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: `${Math.max(2, dimension / 8)}px solid ${tokens.colors.neutral[200]}`,
    borderTop: `${Math.max(2, dimension / 8)}px solid ${color}`,
    borderRadius: tokens.borderRadius.full,
    animation: 'spin 0.8s linear infinite',
  };

  return (
    <div className={className} style={containerStyle} role="status" aria-label="Loading">
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={spinnerStyle} />
    </div>
  );
};
