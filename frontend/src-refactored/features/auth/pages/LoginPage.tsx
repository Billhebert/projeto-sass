import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import { LoginForm } from '../components/LoginForm';
import { useIsAuthenticated } from '../hooks/useAuth';
import { tokens } from '@/styles/tokens';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.neutral[50],
    padding: tokens.spacing[4],
  };

  const cardWrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '450px',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: tokens.spacing[8],
  };

  const logoStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['4xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.primary[600],
    marginBottom: tokens.spacing[2],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    marginBottom: tokens.spacing[2],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  return (
    <div style={containerStyle}>
      <div style={cardWrapperStyle}>
        <div style={headerStyle}>
          <div style={logoStyle}>Vendata</div>
          <h1 style={titleStyle}>Welcome Back</h1>
          <p style={subtitleStyle}>Sign in to manage your Mercado Livre business</p>
        </div>

        <Card variant="elevated">
          <LoginForm />
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
