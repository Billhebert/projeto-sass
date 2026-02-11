import React from 'react';
import { tokens } from '@/styles/tokens';

// ============================================
// TYPES
// ============================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// ============================================
// STYLES
// ============================================

const baseStyles: React.CSSProperties = {
  fontFamily: tokens.typography.fontFamily.sans,
  fontWeight: tokens.typography.fontWeight.medium,
  borderRadius: tokens.borderRadius.md,
  transition: tokens.transitions.base,
  cursor: 'pointer',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.spacing[2],
  outline: 'none',
  position: 'relative',
};

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    backgroundColor: tokens.colors.primary[500],
    color: '#fff',
  },
  secondary: {
    backgroundColor: tokens.colors.secondary[500],
    color: '#fff',
  },
  outline: {
    backgroundColor: 'transparent',
    color: tokens.colors.neutral[700],
    border: `1px solid ${tokens.colors.neutral[300]}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: tokens.colors.neutral[700],
  },
  danger: {
    backgroundColor: tokens.colors.error[500],
    color: '#fff',
  },
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
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
    padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
    fontSize: tokens.typography.fontSize.lg,
    minHeight: '3rem',
  },
};

const disabledStyles: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
};

// ============================================
// COMPONENT
// ============================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const buttonStyles: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && disabledStyles),
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={buttonStyles}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
            aria-label="Loading"
          />
        )}
        {!loading && leftIcon && <span>{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Add keyframes animation (inject once)
if (typeof document !== 'undefined' && !document.getElementById('button-animations')) {
  const style = document.createElement('style');
  style.id = 'button-animations';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
