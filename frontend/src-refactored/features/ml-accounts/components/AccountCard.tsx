import React, { useState } from 'react';
import { Card, Badge, Button, Modal, ModalFooter } from '@/components/ui';
import { useSyncMLAccount, useDeleteMLAccount } from '../hooks/useMLAccounts';
import type { MLAccount } from '@/types/api.types';
import { tokens } from '@/styles/tokens';

interface AccountCardProps {
  account: MLAccount;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { mutate: syncAccount, isPending: isSyncing } = useSyncMLAccount();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteMLAccount();

  const cardStyle: React.CSSProperties = {
    padding: tokens.spacing[6],
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing[4],
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[1],
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const infoGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
  };

  const infoItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[1],
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.neutral[600],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[3],
    paddingTop: tokens.spacing[4],
    borderTop: `1px solid ${tokens.colors.neutral[200]}`,
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
      active: { variant: 'success', label: 'Ativa' },
      inactive: { variant: 'warning', label: 'Inativa' },
      expired: { variant: 'error', label: 'Expirada' },
    };

    const config = statusMap[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleDelete = () => {
    deleteAccount(account.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
      },
    });
  };

  return (
    <>
      <Card>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <div>
              <h3 style={titleStyle}>{account.nickname}</h3>
              <p style={subtitleStyle}>ID: {account.mlUserId}</p>
            </div>
            {getStatusBadge(account.status)}
          </div>

          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={labelStyle}>Email</span>
              <span style={valueStyle}>{account.email || 'N/A'}</span>
            </div>

            <div style={infoItemStyle}>
              <span style={labelStyle}>Último Sync</span>
              <span style={valueStyle}>
                {account.lastSync ? formatDate(account.lastSync) : 'Nunca'}
              </span>
            </div>

            {account.points !== undefined && (
              <div style={infoItemStyle}>
                <span style={labelStyle}>Pontos</span>
                <span style={valueStyle}>{account.points}</span>
              </div>
            )}

            {account.reputation !== undefined && (
              <div style={infoItemStyle}>
                <span style={labelStyle}>Reputação</span>
                <span style={valueStyle}>{account.reputation}</span>
              </div>
            )}
          </div>

          <div style={actionsStyle}>
            <Button
              size="sm"
              variant="primary"
              onClick={() => syncAccount(account.id)}
              loading={isSyncing}
              disabled={isSyncing || isDeleting}
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Navigate to account details
                window.location.href = `/ml-accounts/${account.id}`;
              }}
              disabled={isSyncing || isDeleting}
            >
              Ver Detalhes
            </Button>

            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSyncing || isDeleting}
            >
              Remover
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remover Conta"
      >
        <p style={{ marginBottom: tokens.spacing[4], fontFamily: tokens.typography.fontFamily.sans }}>
          Tem certeza que deseja remover a conta <strong>{account.nickname}</strong>?
        </p>
        <p style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
          Esta ação não pode ser desfeita. Todos os dados associados a esta conta serão removidos.
        </p>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? 'Removendo...' : 'Remover Conta'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
