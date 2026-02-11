import React, { useState } from 'react';
import { Card, Badge, Button, Modal, ModalFooter, Input } from '@/components/ui';
import { useChangeItemStatus } from '../hooks/useItems';
import type { ItemListItem } from '../types/items.types';
import { tokens } from '@/styles/tokens';

interface ItemCardProps {
  item: ItemListItem;
  accountId: string;
  onEdit?: (item: ItemListItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, accountId, onEdit }) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { mutate: changeStatus, isPending } = useChangeItemStatus();

  const cardStyle: React.CSSProperties = {
    padding: tokens.spacing[4],
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[4],
  };

  const imageStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: tokens.borderRadius.md,
    flexShrink: 0,
  };

  const infoStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[2],
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const priceStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.success[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[4],
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[2],
    marginTop: tokens.spacing[3],
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
      active: { variant: 'success', label: 'Ativo' },
      paused: { variant: 'warning', label: 'Pausado' },
      closed: { variant: 'error', label: 'Fechado' },
      under_review: { variant: 'warning', label: 'Em Revisão' },
      inactive: { variant: 'error', label: 'Inativo' },
    };

    const config = statusMap[status] || { variant: 'warning' as const, label: status };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleToggleStatus = () => {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    changeStatus(
      { accountId, itemId: item.id, status: newStatus },
      {
        onSuccess: () => setShowStatusModal(false),
      }
    );
  };

  return (
    <>
      <Card>
        <div style={cardStyle}>
          <div style={contentStyle}>
            <img src={item.thumbnail} alt={item.title} style={imageStyle} />

            <div style={infoStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={titleStyle}>{item.title}</h3>
                {getStatusBadge(item.status)}
              </div>

              <div style={priceStyle}>{formatCurrency(item.price)}</div>

              <div style={metaStyle}>
                <span>Estoque: {item.availableQuantity}</span>
                <span>•</span>
                <span>Vendidos: {item.soldQuantity}</span>
                <span>•</span>
                <span>{item.listingType.replace(/_/g, ' ').toUpperCase()}</span>
              </div>

              <div style={actionsStyle}>
                <Button
                  size="sm"
                  variant={item.status === 'active' ? 'warning' : 'primary'}
                  onClick={() => setShowStatusModal(true)}
                  disabled={isPending}
                >
                  {item.status === 'active' ? 'Pausar' : 'Ativar'}
                </Button>

                {onEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                    Editar
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(item.permalink, '_blank')}
                >
                  Ver no ML
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={item.status === 'active' ? 'Pausar Produto' : 'Ativar Produto'}
      >
        <p style={{ marginBottom: tokens.spacing[4], fontFamily: tokens.typography.fontFamily.sans }}>
          Tem certeza que deseja {item.status === 'active' ? 'pausar' : 'ativar'} este produto?
        </p>
        <p style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
          <strong>{item.title}</strong>
        </p>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant={item.status === 'active' ? 'warning' : 'primary'}
            onClick={handleToggleStatus}
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? 'Processando...' : item.status === 'active' ? 'Pausar' : 'Ativar'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
