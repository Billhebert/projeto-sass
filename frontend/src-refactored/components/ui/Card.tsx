import React from 'react';
import { tokens } from '@/styles/tokens';

// ============================================
// TYPES
// ============================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: keyof typeof tokens.spacing;
  hoverable?: boolean;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// ============================================
// STYLES
// ============================================

const baseCardStyles: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: tokens.borderRadius.lg,
  transition: tokens.transitions.base,
  overflow: 'hidden',
};

const variantStyles: Record<NonNullable<CardProps['variant']>, React.CSSProperties> = {
  default: {
    border: 'none',
  },
  bordered: {
    border: `1px solid ${tokens.colors.neutral[200]}`,
  },
  elevated: {
    boxShadow: tokens.shadows.md,
  },
};

const hoverableStyles: React.CSSProperties = {
  cursor: 'pointer',
  boxShadow: tokens.shadows.lg,
  transform: 'translateY(-2px)',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: `${tokens.spacing[5]} ${tokens.spacing[6]}`,
  borderBottom: `1px solid ${tokens.colors.neutral[100]}`,
};

const headerTextStyles: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[1],
};

const titleStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.lg,
  fontWeight: tokens.typography.fontWeight.semibold,
  color: tokens.colors.neutral[900],
  margin: 0,
  fontFamily: tokens.typography.fontFamily.sans,
};

const subtitleStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  color: tokens.colors.neutral[600],
  fontFamily: tokens.typography.fontFamily.sans,
};

const contentStyles: React.CSSProperties = {
  padding: `${tokens.spacing[6]}`,
};

const footerStyles: React.CSSProperties = {
  padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
  borderTop: `1px solid ${tokens.colors.neutral[100]}`,
  backgroundColor: tokens.colors.neutral[50],
};

// ============================================
// CARD COMPONENT
// ============================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding, hoverable = false, style, children, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const cardStyles: React.CSSProperties = {
      ...baseCardStyles,
      ...variantStyles[variant],
      ...(padding && { padding: tokens.spacing[padding] }),
      ...(hoverable && isHovered && hoverableStyles),
      ...style,
    };

    return (
      <div
        ref={ref}
        style={cardStyles}
        onMouseEnter={() => hoverable && setIsHovered(true)}
        onMouseLeave={() => hoverable && setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// CARD HEADER
// ============================================

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, style, children, ...props }, ref) => {
    return (
      <div ref={ref} style={{ ...headerStyles, ...style }} {...props}>
        {(title || subtitle) && (
          <div style={headerTextStyles}>
            {title && (
              typeof title === 'string' ? (
                <h3 style={titleStyles}>{title}</h3>
              ) : (
                title
              )
            )}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p style={subtitleStyles}>{subtitle}</p>
              ) : (
                subtitle
              )
            )}
          </div>
        )}
        {action && <div>{action}</div>}
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================
// CARD CONTENT
// ============================================

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ style, children, ...props }, ref) => {
    return (
      <div ref={ref} style={{ ...contentStyles, ...style }} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// ============================================
// CARD FOOTER
// ============================================

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ style, children, ...props }, ref) => {
    return (
      <div ref={ref} style={{ ...footerStyles, ...style }} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
