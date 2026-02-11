import React from 'react';
import { tokens } from '@/styles/tokens';

// ============================================
// TYPES
// ============================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// STYLES
// ============================================

const containerStyles = (fullWidth?: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[2],
  width: fullWidth ? '100%' : 'auto',
});

const labelStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.neutral[700],
  fontFamily: tokens.typography.fontFamily.sans,
};

const inputWrapperStyles: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const baseInputStyles: React.CSSProperties = {
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.base,
  color: tokens.colors.neutral[900],
  backgroundColor: '#fff',
  border: `1px solid ${tokens.colors.neutral[300]}`,
  borderRadius: tokens.borderRadius.md,
  transition: tokens.transitions.base,
  outline: 'none',
  width: '100%',
};

const sizeStyles: Record<NonNullable<InputProps['size']>, React.CSSProperties> = {
  sm: {
    padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
    fontSize: tokens.typography.fontSize.sm,
    minHeight: '2rem',
  },
  md: {
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    fontSize: tokens.typography.fontSize.base,
    minHeight: '2.5rem',
  },
  lg: {
    padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
    fontSize: tokens.typography.fontSize.lg,
    minHeight: '3rem',
  },
};

const focusStyles: React.CSSProperties = {
  borderColor: tokens.colors.primary[500],
  boxShadow: `0 0 0 3px ${tokens.colors.primary[50]}`,
};

const errorStyles: React.CSSProperties = {
  borderColor: tokens.colors.error[500],
};

const disabledStyles: React.CSSProperties = {
  backgroundColor: tokens.colors.neutral[100],
  cursor: 'not-allowed',
  opacity: 0.6,
};

const iconStyles: React.CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  color: tokens.colors.neutral[500],
  pointerEvents: 'none',
};

const helperTextStyles = (error?: boolean): React.CSSProperties => ({
  fontSize: tokens.typography.fontSize.sm,
  color: error ? tokens.colors.error[500] : tokens.colors.neutral[600],
  fontFamily: tokens.typography.fontFamily.sans,
});

// ============================================
// COMPONENT
// ============================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth,
      size = 'md',
      disabled,
      style,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const inputId = id || `input-${React.useId()}`;

    const inputStyles: React.CSSProperties = {
      ...baseInputStyles,
      ...sizeStyles[size],
      ...(leftIcon && { paddingLeft: tokens.spacing[10] }),
      ...(rightIcon && { paddingRight: tokens.spacing[10] }),
      ...(isFocused && focusStyles),
      ...(error && errorStyles),
      ...(disabled && disabledStyles),
      ...style,
    };

    return (
      <div style={containerStyles(fullWidth)}>
        {label && (
          <label htmlFor={inputId} style={labelStyles}>
            {label}
          </label>
        )}
        <div style={inputWrapperStyles}>
          {leftIcon && (
            <span style={{ ...iconStyles, left: tokens.spacing[3] }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            name={props.name}
            disabled={disabled}
            style={inputStyles}
            type={props.type}
            placeholder={props.placeholder}
            value={props.value}
            onChange={props.onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={error || helperText ? `${inputId}-helper` : undefined}
          />
          {rightIcon && (
            <span style={{ ...iconStyles, right: tokens.spacing[3] }}>
              {rightIcon}
            </span>
          )}
        </div>
        {(error || helperText) && (
          <span id={`${inputId}-helper`} style={helperTextStyles(!!error)} role={error ? 'alert' : undefined}>
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
