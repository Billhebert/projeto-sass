/**
 * DashboardStats Component
 * Componente separado para mostrar estatísticas do dashboard
 */

import PropTypes from "prop-types";
import "./DashboardStats.css";

function DashboardStats({ stats, isLoading }) {
  const statCards = [
    {
      label: "Anúncios Ativos",
      value: stats.activeProducts,
      total: stats.totalProducts,
      icon: "inventory_2",
      color: "primary",
    },
    {
      label: "Pedidos Pendentes",
      value: stats.pendingOrders,
      total: stats.totalOrders,
      icon: "shopping_cart",
      color: "warning",
    },
    {
      label: "Perguntas Pendentes",
      value: stats.pendingQuestions,
      total: stats.totalQuestions,
      icon: "help_outline",
      color: "info",
    },
    {
      label: "Reclamações Abertas",
      value: stats.openClaims,
      total: stats.totalClaims,
      icon: "report_problem",
      color: "danger",
    },
  ];

  if (isLoading) {
    return (
      <div className="dashboard-stats">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card skeleton">
            <div className="skeleton-icon"></div>
            <div className="skeleton-text"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="dashboard-stats"
      role="region"
      aria-label="Estatísticas do dashboard"
    >
      {statCards.map((card, index) => (
        <div key={index} className={`stat-card stat-card-${card.color}`}>
          <div className="stat-icon">
            <span className="material-icons" aria-hidden="true">
              {card.icon}
            </span>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">{card.label}</h3>
            <p className="stat-value">
              <span className="stat-primary">{card.value}</span>
              {card.total !== undefined && (
                <span className="stat-secondary"> / {card.total}</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

DashboardStats.propTypes = {
  stats: PropTypes.shape({
    totalProducts: PropTypes.number,
    activeProducts: PropTypes.number,
    totalOrders: PropTypes.number,
    pendingOrders: PropTypes.number,
    totalQuestions: PropTypes.number,
    pendingQuestions: PropTypes.number,
    totalClaims: PropTypes.number,
    openClaims: PropTypes.number,
  }).isRequired,
  isLoading: PropTypes.bool,
};

DashboardStats.defaultProps = {
  isLoading: false,
};

export default DashboardStats;
