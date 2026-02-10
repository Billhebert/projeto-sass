import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "./DashboardRecentOrders.css";

/**
 * Dashboard recent orders section
 * @param {Object} props - Component props
 * @param {Array} props.orders - Recent orders list
 * @param {Function} props.formatCurrency - Currency formatter function
 */
function DashboardRecentOrders({ orders, formatCurrency }) {
  const getStatusLabel = (status) => {
    const statusMap = {
      paid: "Pago",
      pending: "Pendente",
      cancelled: "Cancelado",
    };
    return statusMap[status] || status;
  };

  return (
    <div className="orders-card">
      <div className="card-header">
        <h3>Pedidos Recentes</h3>
        <Link to="/orders" className="view-all">
          Ver todos <span className="material-icons">arrow_forward</span>
        </Link>
      </div>
      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">inbox</span>
            <p>Nenhum pedido recente</p>
          </div>
        ) : (
          orders.slice(0, 5).map((order) => (
            <div key={order.id} className="order-item">
              <div className="order-info">
                <span className="order-id">#{order.id}</span>
                <span className="order-date">
                  {new Date(order.date_created).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="order-details">
                <span className={`order-status ${order.status}`}>
                  {getStatusLabel(order.status)}
                </span>
                <span className="order-amount">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

DashboardRecentOrders.propTypes = {
  orders: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      date_created: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      total_amount: PropTypes.number.isRequired,
    }),
  ).isRequired,
  formatCurrency: PropTypes.func.isRequired,
};

export default DashboardRecentOrders;
