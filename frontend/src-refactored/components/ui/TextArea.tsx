import React from 'react';
import { tokens } from '@/styles/tokens';

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  rows?: number;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  value,
  onChange,
  placeholder = '',
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = false,
  rows = 4,
  className = '',
}) => {
  const containerStyle: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[1],
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: error ? tokens.colors.error[700] : tokens.colors.neutral[700],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    fontSize: tokens.typography.fontSize.base,
    fontFamily: tokens.typography.fontFamily.sans,
    backgroundColor: disabled ? tokens.colors.neutral[50] : tokens.colors.neutral[0],
    border: `1px solid ${error ? tokens.colors.error[500] : tokens.colors.neutral[300]}`,
    borderRadius: tokens.borderRadius.md,
    color: tokens.colors.neutral[900],
    resize: 'vertical',
    outline: 'none',
    transition: `all ${tokens.transitions.fast}`,
    minHeight: `${rows * 24}px`,
  };

  const helperStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: error ? tokens.colors.error[600] : tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  return (
    <div style={containerStyle} className={className}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: tokens.colors.error[500] }}> *</span>}
        </label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={textareaStyle}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = tokens.colors.primary[500];
            e.target.style.boxShadow = `0 0 0 3px ${tokens.colors.primary[100]}`;
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = tokens.colors.neutral[300];
            e.target.style.boxShadow = 'none';
          }
        }}
        onMouseEnter={(e) => {
          if (!disabled && !error) {
            e.currentTarget.style.borderColor = tokens.colors.primary[500];
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !error && document.activeElement !== e.currentTarget) {
            e.currentTarget.style.borderColor = tokens.colors.neutral[300];
          }
        }}
      />

      {(error || helperText) && <span style={helperStyle}>{error || helperText}</span>}
    </div>
  );
};
