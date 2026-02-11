import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { tokens } from '@/styles/tokens';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colors.neutral[50],
  };

  const mainContainerStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    position: 'relative',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    marginLeft: sidebarOpen ? '260px' : '0',
    transition: `margin-left ${tokens.transitions.base}`,
    padding: tokens.spacing[6],
    overflowY: 'auto',
  };

  return (
    <div style={containerStyle}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div style={mainContainerStyle}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main style={contentStyle}>
          {children}
        </main>
      </div>
    </div>
  );
};
