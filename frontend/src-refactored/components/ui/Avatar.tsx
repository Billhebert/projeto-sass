import React from 'react';
import { tokens } from '@/styles/tokens';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const fontSizeMap = {
  sm: tokens.typography.fontSize.sm,
  md: tokens.typography.fontSize.base,
  lg: tokens.typography.fontSize.lg,
  xl: tokens.typography.fontSize.xl,
};

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Generate color from string
 */
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    tokens.colors.primary[500],
    tokens.colors.secondary[500],
    tokens.colors.success[500],
    tokens.colors.info[500],
    tokens.colors.warning[500],
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name = '',
  size = 'md',
  className = '',
}) => {
  const dimension = sizeMap[size];
  const [imageError, setImageError] = React.useState(false);

  const containerStyle: React.CSSProperties = {
    width: dimension,
    height: dimension,
    borderRadius: tokens.borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: name ? stringToColor(name) : tokens.colors.neutral[300],
    color: tokens.colors.neutral[0],
    fontSize: fontSizeMap[size],
    fontWeight: tokens.typography.fontWeight.semibold,
    fontFamily: tokens.typography.fontFamily.sans,
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  // Show image if available and not errored
  if (src && !imageError) {
    return (
      <div className={className} style={containerStyle}>
        <img
          src={src}
          alt={alt || name}
          style={imageStyle}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Show initials if name is provided
  if (name) {
    return (
      <div className={className} style={containerStyle}>
        {getInitials(name)}
      </div>
    );
  }

  // Show default icon
  return (
    <div className={className} style={containerStyle}>
      <svg
        width={dimension * 0.6}
        height={dimension * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
};
