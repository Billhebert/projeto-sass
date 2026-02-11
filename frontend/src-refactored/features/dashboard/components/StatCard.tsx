import React from 'react';
import { Card } from '@/components/ui';
import { tokens } from '@/styles/tokens';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  loading?: boolean;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  loading = false,
  color = tokens.colors.primary[600],
}) => {
  const contentStyle: React.CSSProperties = {
    padding: tokens.spacing[6],
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[4],
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  };

  const iconContainerStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadius.lg,
    backgroundColor: `${color}15`,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.typography.fontSize['2xl'],
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[2],
  };

  const valueStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    lineHeight: 1,
  };

  const trendContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[1],
    marginTop: tokens.spacing[2],
  };

  const trendStyle = (direction: 'up' | 'down'): React.CSSProperties => ({
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: direction === 'up' ? tokens.colors.success[600] : tokens.colors.error[600],
    fontFamily: tokens.typography.fontFamily.sans,
  });

  const skeletonStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.neutral[200],
    borderRadius: tokens.borderRadius.md,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  if (loading) {
    return (
      <Card>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
        <div style={contentStyle}>
          <div style={headerStyle}>
            <div>
              <div style={{ ...skeletonStyle, width: '100px', height: '16px', marginBottom: tokens.spacing[2] }} />
              <div style={{ ...skeletonStyle, width: '150px', height: '40px' }} />
            </div>
            <div style={{ ...skeletonStyle, width: '48px', height: '48px', borderRadius: tokens.borderRadius.lg }} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <div style={{ flex: 1 }}>
            <div style={titleStyle}>{title}</div>
            <div style={valueStyle}>{value}</div>
            {trend && (
              <div style={trendContainerStyle}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{
                    transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none',
                    color: trend.direction === 'up' ? tokens.colors.success[600] : tokens.colors.error[600],
                  }}
                >
                  <path
                    d="M8 3L12 7L11.3 7.7L8 4.4L4.7 7.7L4 7L8 3Z"
                    fill="currentColor"
                  />
                </svg>
                <span style={trendStyle(trend.direction)}>
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          {icon && <div style={iconContainerStyle}>{icon}</div>}
        </div>
      </div>
    </Card>
  );
};
