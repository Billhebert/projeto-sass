import React from "react";
import PropTypes from "prop-types";
import "./OrdersStats.css";

/**
 * Orders statistics cards
 * @param {Object} props - Component props
 * @param {Object} props.stats - Statistics data
 * @param {Function} props.formatCurrency - Currency formatter
 */
function OrdersStats({ stats, formatCurrency }) {
  if (!stats) {
    return null;
  }

  const statsCards = [
    {
      icon: "receipt_long",
      color: "blue",
      value: stats.total || 0,
      label: "Total de Pedidos",
    },
    {
      icon: "check_circle",
      color: "green",
      value: stats.paid || 0,
      label: "Pagos",
    },
    {
      icon: "schedule",
      color: "yellow",
      value: stats.pending || 0,
      label: "Pendentes",
    },
    {
      icon: "attach_money",
      color: "purple",
      value: formatCurrency(stats.totalRevenue || 0),
      label: "Receita Total",
    },
  ];

  return (
    <div className="stats-grid">
      {statsCards.map((card, index) => (
        <div key={index} className="stat-card">
          <div className={`stat-icon ${card.color}`}>
            <span className="material-icons">{card.icon}</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{card.value}</span>
            <span className="stat-label">{card.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

OrdersStats.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number,
    paid: PropTypes.number,
    pending: PropTypes.number,
    cancelled: PropTypes.number,
    totalRevenue: PropTypes.number,
  }),
  formatCurrency: PropTypes.func.isRequired,
};

export default OrdersStats;
