import React, { useState } from 'react';
import { tokens } from '@/styles/tokens';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: { track: '36px', thumb: '16px', translate: '20px' },
  md: { track: '44px', thumb: '20px', translate: '24px' },
  lg: { track: '52px', thumb: '24px', translate: '28px' },
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className = '',
}) => {
  const sizes = sizeMap[size];

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing[3],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    width: sizes.track,
    height: parseInt(sizes.track) / 2,
    backgroundColor: checked ? tokens.colors.primary[600] : tokens.colors.neutral[300],
    borderRadius: tokens.borderRadius.full,
    transition: `all ${tokens.transitions.fast}`,
    flexShrink: 0,
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '2px',
    left: checked ? `calc(100% - ${sizes.thumb} - 2px)` : '2px',
    width: sizes.thumb,
    height: sizes.thumb,
    backgroundColor: tokens.colors.neutral[0],
    borderRadius: tokens.borderRadius.full,
    boxShadow: tokens.shadows.sm,
    transition: `all ${tokens.transitions.fast}`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[700],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  return (
    <div
      style={containerStyle}
      className={className}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div style={trackStyle}>
        <div style={thumbStyle} />
      </div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
};
