import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  PackageIcon, 
  ShoppingCartIcon, 
  MessageCircleIcon, 
  AlertCircleIcon,
  SettingsIcon 
} from '@/components/icons';
import { tokens } from '@/styles/tokens';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <HomeIcon size={20} />,
  },
  {
    label: 'Contas ML',
    path: '/ml-accounts',
    icon: <UsersIcon size={20} />,
  },
  {
    label: 'Produtos',
    path: '/items',
    icon: <PackageIcon size={20} />,
  },
  {
    label: 'Pedidos',
    path: '/orders',
    icon: <ShoppingCartIcon size={20} />,
  },
  {
    label: 'Perguntas',
    path: '/questions',
    icon: <MessageCircleIcon size={20} />,
    badge: 5,
  },
  {
    label: 'Reclamações',
    path: '/claims',
    icon: <AlertCircleIcon size={20} />,
    badge: 2,
  },
  {
    label: 'Configurações',
    path: '/settings',
    icon: <SettingsIcon size={20} />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const sidebarStyle: React.CSSProperties = {
    width: '260px',
    height: 'calc(100vh - 64px)',
    backgroundColor: tokens.colors.neutral[0],
    borderRight: `1px solid ${tokens.colors.neutral[200]}`,
    padding: tokens.spacing[4],
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[2],
    position: 'fixed',
    top: '64px',
    left: isOpen ? 0 : '-260px',
    transition: `left ${tokens.transitions.base}`,
    zIndex: tokens.zIndex.sidebar,
    overflowY: 'auto',
  };

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing[3],
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    borderRadius: tokens.borderRadius.md,
    textDecoration: 'none',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.sans,
    transition: `all ${tokens.transitions.fast}`,
    backgroundColor: isActive ? tokens.colors.primary[50] : 'transparent',
    color: isActive ? tokens.colors.primary[700] : tokens.colors.neutral[700],
  });

  const navItemContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[3],
  };

  const badgeStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.error[500],
    color: tokens.colors.neutral[0],
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
    borderRadius: tokens.borderRadius.full,
    minWidth: '20px',
    textAlign: 'center',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: '64px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: tokens.zIndex.sidebar - 1,
    display: isOpen ? 'block' : 'none',
  };

  return (
    <>
      {/* Mobile overlay */}
      <div style={overlayStyle} onClick={onClose} />

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => navLinkStyle(isActive)}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                const isActive = target.classList.contains('active');
                if (!isActive) {
                  target.style.backgroundColor = tokens.colors.neutral[50];
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                const isActive = target.classList.contains('active');
                if (!isActive) {
                  target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={navItemContentStyle}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span style={badgeStyle}>{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};
