import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, Badge, Button } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { MenuIcon, LogOutIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const headerStyle: React.CSSProperties = {
    height: '64px',
    backgroundColor: tokens.colors.neutral[0],
    borderBottom: `1px solid ${tokens.colors.neutral[200]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${tokens.spacing[6]}`,
    position: 'sticky',
    top: 0,
    zIndex: tokens.zIndex.sticky,
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[4],
  };

  const logoStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.primary[600],
    fontFamily: tokens.typography.fontFamily.sans,
    textDecoration: 'none',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[4],
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[3],
    cursor: 'pointer',
    padding: tokens.spacing[2],
    borderRadius: tokens.borderRadius.md,
    transition: `background-color ${tokens.transitions.fast}`,
    position: 'relative',
  };

  const userMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: tokens.spacing[2],
    backgroundColor: tokens.colors.neutral[0],
    border: `1px solid ${tokens.colors.neutral[200]}`,
    borderRadius: tokens.borderRadius.md,
    boxShadow: tokens.shadows.lg,
    minWidth: '200px',
    zIndex: tokens.zIndex.dropdown,
  };

  const menuItemStyle: React.CSSProperties = {
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    cursor: 'pointer',
    transition: `background-color ${tokens.transitions.fast}`,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[3],
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sans,
    color: tokens.colors.neutral[700],
  };

  const userNameStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const emailStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  return (
    <header style={headerStyle}>
      <div style={leftSectionStyle}>
        <button
          onClick={onMenuClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: tokens.spacing[2],
            display: 'flex',
            alignItems: 'center',
            color: tokens.colors.neutral[600],
          }}
          aria-label="Toggle menu"
        >
          <MenuIcon size={24} />
        </button>

        <Link to="/dashboard" style={logoStyle}>
          Vendata
        </Link>
      </div>

      <div style={rightSectionStyle}>
        {/* Notifications badge placeholder */}
        <div style={{ position: 'relative' }}>
          <Badge variant="error" size="sm" style={{ position: 'absolute', top: -4, right: -4 }}>
            3
          </Badge>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={tokens.colors.neutral[600]}
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        {/* User menu */}
        <div
          style={userInfoStyle}
          onClick={() => setShowUserMenu(!showUserMenu)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={userNameStyle}>
            <span style={nameStyle}>{user?.name || 'User'}</span>
            <span style={emailStyle}>{user?.email}</span>
          </div>
          <Avatar name={user?.name} size="md" />

          {showUserMenu && (
            <div style={userMenuStyle}>
              <div
                style={menuItemStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOutIcon size={18} />
                <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
