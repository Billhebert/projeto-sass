/**
 * EXEMPLO COMPLETO: Como criar uma nova feature usando todas as melhorias
 * 
 * Cenário: Criar uma página de "Promoções Ativas" com:
 * - Listagem de promoções
 * - Filtros
 * - Criar/editar promoções
 * - Responsivo
 * - Performance otimizada
 */

// ============================================================
// 1. CRIAR HOOK DE API (src/hooks/useApi.js)
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Query keys para cache management
export const queryKeys = {
  promotions: (accountId) => ['promotions', accountId],
  promotion: (id) => ['promotion', id],
};

/**
 * Hook para buscar promoções
 */
export function usePromotions(accountId, filters = {}) {
  return useQuery({
    queryKey: [...queryKeys.promotions(accountId), filters],
    queryFn: async () => {
      const response = await api.get(`/promotions/${accountId}`, {
        params: filters,
      });
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para criar promoção
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ accountId, data }) => {
      const response = await api.post(`/promotions/${accountId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalida cache de promoções
      queryClient.invalidateQueries(queryKeys.promotions(variables.accountId));
    },
  });
}

/**
 * Hook para atualizar promoção
 */
export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ accountId, promotionId, data }) => {
      const response = await api.put(
        `/promotions/${accountId}/${promotionId}`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.promotions(variables.accountId));
      queryClient.invalidateQueries(queryKeys.promotion(variables.promotionId));
    },
  });
}

// ============================================================
// 2. CRIAR COMPONENTE DE CARD (src/components/PromotionCard.jsx)
// ============================================================

import PropTypes from 'prop-types';
import { cn } from '../utils/classnames';
import './PromotionCard.css';

/**
 * PromotionCard - Card para exibir uma promoção
 */
function PromotionCard({ promotion, onEdit, onDelete }) {
  const isActive = promotion.status === 'active';
  const hasExpired = new Date(promotion.endDate) < new Date();
  
  return (
    <div 
      className={cn(
        'promotion-card',
        isActive && 'promotion-card--active',
        hasExpired && 'promotion-card--expired'
      )}
      role="article"
      aria-label={`Promoção ${promotion.name}`}
    >
      <div className="promotion-card__header">
        <h3 className="promotion-card__title">{promotion.name}</h3>
        <span 
          className={cn(
            'promotion-card__badge',
            `promotion-card__badge--${promotion.status}`
          )}
        >
          {promotion.status}
        </span>
      </div>
      
      <div className="promotion-card__body">
        <p className="promotion-card__description">
          {promotion.description}
        </p>
        
        <div className="promotion-card__stats">
          <div className="stat">
            <span className="stat__label">Desconto</span>
            <span className="stat__value">{promotion.discount}%</span>
          </div>
          <div className="stat">
            <span className="stat__label">Produtos</span>
            <span className="stat__value">{promotion.itemsCount}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Vendas</span>
            <span className="stat__value">{promotion.sales}</span>
          </div>
        </div>
        
        <div className="promotion-card__dates">
          <span className="date">
            <span className="material-icons">event</span>
            {new Date(promotion.startDate).toLocaleDateString()}
          </span>
          <span className="date-separator">→</span>
          <span className="date">
            {new Date(promotion.endDate).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="promotion-card__actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(promotion)}
          aria-label={`Editar promoção ${promotion.name}`}
        >
          <span className="material-icons">edit</span>
          Editar
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(promotion)}
          aria-label={`Excluir promoção ${promotion.name}`}
        >
          <span className="material-icons">delete</span>
          Excluir
        </button>
      </div>
    </div>
  );
}

PromotionCard.propTypes = {
  promotion: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.oneOf(['active', 'paused', 'ended']).isRequired,
    discount: PropTypes.number.isRequired,
    itemsCount: PropTypes.number,
    sales: PropTypes.number,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default PromotionCard;

// ============================================================
// 3. CRIAR CSS DO CARD (src/components/PromotionCard.css)
// ============================================================

/* PromotionCard.css */

.promotion-card {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-6);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.promotion-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.promotion-card--active {
  border-left: 4px solid var(--success-500);
}

.promotion-card--expired {
  opacity: 0.6;
  background: var(--gray-50);
}

/* Header */
.promotion-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-4);
}

.promotion-card__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.promotion-card__badge {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  border-radius: var(--radius-full);
}

.promotion-card__badge--active {
  background: var(--success-100);
  color: var(--success-700);
}

.promotion-card__badge--paused {
  background: var(--warning-100);
  color: var(--warning-700);
}

.promotion-card__badge--ended {
  background: var(--gray-200);
  color: var(--gray-700);
}

/* Body */
.promotion-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.promotion-card__description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.promotion-card__stats {
  display: flex;
  gap: var(--spacing-6);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.stat__value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.promotion-card__dates {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: var(--gray-50);
  border-radius: var(--radius-base);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.date {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.date .material-icons {
  font-size: 1rem;
}

/* Actions */
.promotion-card__actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-border-light);
}

/* Responsive */
@media (max-width: 767px) {
  .promotion-card {
    padding: var(--spacing-4);
  }
  
  .promotion-card__title {
    font-size: var(--text-base);
  }
  
  .promotion-card__stats {
    gap: var(--spacing-4);
  }
  
  .stat__value {
    font-size: var(--text-lg);
  }
  
  .promotion-card__actions {
    flex-direction: column;
  }
  
  .promotion-card__actions .btn {
    width: 100%;
  }
}

// ============================================================
// 4. CRIAR PÁGINA (src/pages/ActivePromotions.jsx)
// ============================================================

import { useState } from 'react';
import { usePromotions, useCreatePromotion, useUpdatePromotion } from '../hooks/useApi';
import { useResponsive } from '../hooks/useResponsive';
import { useAuthStore } from '../store/authStore';
import PromotionCard from '../components/PromotionCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import './ActivePromotions.css';

function ActivePromotions() {
  const { selectedAccount } = useAuthStore();
  const { isMobile } = useResponsive();
  
  // State
  const [filters, setFilters] = useState({ status: 'active' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  
  // React Query hooks
  const { data: promotions, isLoading, error } = usePromotions(selectedAccount?.id, filters);
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  
  // Handlers
  const handleCreate = () => {
    setEditingPromotion(null);
    setIsModalOpen(true);
  };
  
  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };
  
  const handleSave = async (data) => {
    if (editingPromotion) {
      await updateMutation.mutateAsync({
        accountId: selectedAccount.id,
        promotionId: editingPromotion.id,
        data,
      });
    } else {
      await createMutation.mutateAsync({
        accountId: selectedAccount.id,
        data,
      });
    }
    setIsModalOpen(false);
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };
  
  // Loading state
  if (isLoading) {
    return <LoadingState message="Carregando promoções..." />;
  }
  
  // Error state
  if (error) {
    return (
      <div className="error-state">
        <span className="material-icons">error_outline</span>
        <p>Erro ao carregar promoções: {error.message}</p>
      </div>
    );
  }
  
  // Empty state
  if (!promotions || promotions.length === 0) {
    return (
      <EmptyState
        icon="local_offer"
        title="Nenhuma promoção encontrada"
        description="Crie sua primeira promoção para aumentar suas vendas"
        action={{
          label: 'Criar Promoção',
          onClick: handleCreate,
        }}
      />
    );
  }
  
  return (
    <div className="active-promotions">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__content">
          <h1 className="page-header__title">Promoções Ativas</h1>
          <p className="page-header__description">
            Gerencie suas promoções e acompanhe resultados
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          aria-label="Criar nova promoção"
        >
          <span className="material-icons">add</span>
          {!isMobile && 'Nova Promoção'}
        </button>
      </div>
      
      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
            className="filter-select"
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="paused">Pausadas</option>
            <option value="ended">Encerradas</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="sort-filter">Ordenar:</label>
          <select
            id="sort-filter"
            value={filters.sort}
            onChange={(e) => handleFilterChange({ sort: e.target.value })}
            className="filter-select"
          >
            <option value="recent">Mais Recentes</option>
            <option value="sales">Mais Vendas</option>
            <option value="discount">Maior Desconto</option>
          </select>
        </div>
      </div>
      
      {/* Grid de promoções */}
      <div className="promotions-grid">
        {promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={promotion}
            onEdit={handleEdit}
            onDelete={(p) => console.log('Delete', p)}
          />
        ))}
      </div>
      
      {/* Modal de criar/editar */}
      {isModalOpen && (
        <Modal
          title={editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
          onClose={() => setIsModalOpen(false)}
        >
          <PromotionForm
            promotion={editingPromotion}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

export default ActivePromotions;

// ============================================================
// 5. CRIAR CSS DA PÁGINA (src/pages/ActivePromotions.css)
// ============================================================

/* ActivePromotions.css */

.active-promotions {
  padding: var(--spacing-6);
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-8);
  padding-bottom: var(--spacing-6);
  border-bottom: 1px solid var(--color-border);
}

.page-header__title {
  margin: 0 0 var(--spacing-2);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.page-header__description {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

/* Filters Bar */
.filters-bar {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.filter-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.filter-select {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background: var(--color-bg);
  cursor: pointer;
}

/* Promotions Grid */
.promotions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-6);
}

/* Responsive */
@media (max-width: 767px) {
  .active-promotions {
    padding: var(--spacing-4);
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-4);
  }
  
  .page-header .btn {
    width: 100%;
  }
  
  .page-header__title {
    font-size: var(--text-2xl);
  }
  
  .filters-bar {
    flex-direction: column;
    gap: var(--spacing-3);
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .promotions-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .promotions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

// ============================================================
// 6. ADICIONAR LAZY LOADING (src/App.jsx)
// ============================================================

// No arquivo App.jsx, adicionar:
const ActivePromotions = lazy(() => import('./pages/ActivePromotions'));

// Em <Routes>:
<Route path="/promotions/active" element={<ActivePromotions />} />

// ============================================================
// 7. ADICIONAR NO MENU (src/components/Sidebar.jsx)
// ============================================================

// No array menuSections, adicionar:
{
  title: "Marketing",
  key: "marketing",
  items: [
    { path: "/promotions/active", label: "Promoções Ativas", icon: "local_offer" },
    // ... outros itens
  ],
}

// ============================================================
// RESULTADO FINAL
// ============================================================

/**
 * ✅ Performance:
 * - Lazy loading da página
 * - React Query com cache
 * - Code splitting automático
 * 
 * ✅ Design System:
 * - Design tokens (var(--)
 * - Breakpoints padronizados
 * - Componentes modulares
 * 
 * ✅ State Management:
 * - React Query hooks
 * - Cache automático
 * - Invalidação inteligente
 * 
 * ✅ Responsividade:
 * - Mobile-first CSS
 * - useResponsive hook
 * - Grid responsivo
 * 
 * ✅ Acessibilidade:
 * - ARIA labels
 * - Semantic HTML
 * - Keyboard navigation
 * 
 * ✅ Code Quality:
 * - PropTypes
 * - JSDoc
 * - Componentes < 200 linhas
 * - Código limpo e documentado
 */
