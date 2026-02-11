import React from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Spinner } from '@/components/ui';
import { AccountCard } from '../components/AccountCard';
import { useMLAccounts } from '../hooks/useMLAccounts';
import { UsersIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';
import { AuthService } from '@/features/auth/services/auth.service';

export const MLAccountsPage: React.FC = () => {
  const { data: accounts, isLoading, error } = useMLAccounts();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
    gap: tokens.spacing[4],
  };

  const titleSectionStyle: React.CSSProperties = {
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[2],
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const accountsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: tokens.spacing[6],
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: tokens.spacing[12],
  };

  const emptyIconStyle: React.CSSProperties = {
    marginBottom: tokens.spacing[4],
    color: tokens.colors.neutral[400],
  };

  const emptyTitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    marginBottom: tokens.spacing[2],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const emptyTextStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.neutral[600],
    marginBottom: tokens.spacing[6],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const loadingContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  };

  const handleConnectAccount = async () => {
    try {
      // Get auth URL from backend (which has the credentials)
      const credentials = await AuthService.getMLAuthCredentials();
      if (credentials?.authUrl) {
        window.location.href = credentials.authUrl;
      } else {
        console.error('No auth URL received from backend');
      }
    } catch (error) {
      console.error('Failed to get ML auth URL:', error);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div style={loadingContainerStyle}>
          <Spinner size="xl" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Card>
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              <UsersIcon size={64} />
            </div>
            <h3 style={emptyTitleStyle}>Erro ao carregar contas</h3>
            <p style={emptyTextStyle}>
              Não foi possível carregar suas contas do Mercado Livre. Tente novamente.
            </p>
            <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
          </div>
        </Card>
      </MainLayout>
    );
  }

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <MainLayout>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={titleStyle}>Contas Mercado Livre</h1>
          <p style={subtitleStyle}>
            Gerencie suas contas conectadas do Mercado Livre
          </p>
        </div>

        <Button variant="primary" onClick={handleConnectAccount}>
          + Conectar Nova Conta
        </Button>
      </div>

      {hasAccounts ? (
        <div style={accountsGridStyle}>
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : (
        <Card>
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              <UsersIcon size={64} />
            </div>
            <h3 style={emptyTitleStyle}>Nenhuma conta conectada</h3>
            <p style={emptyTextStyle}>
              Conecte sua primeira conta do Mercado Livre para começar a gerenciar seus produtos e
              vendas.
            </p>
            <Button variant="primary" onClick={handleConnectAccount}>
              Conectar Conta do Mercado Livre
            </Button>
          </div>
        </Card>
      )}
    </MainLayout>
  );
};

export default MLAccountsPage;
