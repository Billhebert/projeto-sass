import React from 'react';
import { tokens } from '@/styles/tokens';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: tokens.colors.neutral[100],
    color: tokens.colors.neutral[700],
  },
  primary: {
    backgroundColor: tokens.colors.primary[100],
    color: tokens.colors.primary[700],
  },
  success: {
    backgroundColor: tokens.colors.success[100],
    color: tokens.colors.success[700],
  },
  warning: {
    backgroundColor: tokens.colors.warning[100],
    color: tokens.colors.warning[700],
  },
  error: {
    backgroundColor: tokens.colors.error[100],
    color: tokens.colors.error[700],
  },
  info: {
    backgroundColor: tokens.colors.info[100],
    color: tokens.colors.info[700],
  },
};

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
    fontSize: tokens.typography.fontSize.xs,
  },
  md: {
    padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
    fontSize: tokens.typography.fontSize.sm,
  },
  lg: {
    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
    fontSize: tokens.typography.fontSize.base,
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius.full,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.sans,
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  return (
    <span className={className} style={badgeStyle}>
      {children}
    </span>
  );
};
