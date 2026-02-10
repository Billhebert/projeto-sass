import React from "react";
import PropTypes from "prop-types";
import "./OrdersTable.css";

/**
 * Orders table component
 * @param {Object} props - Component props
 * @param {Array} props.orders - List of orders
 * @param {Function} props.onViewDetails - Callback to view order details
 * @param {Function} props.formatCurrency - Currency formatter
 * @param {Function} props.formatDate - Date formatter
 * @param {Function} props.getStatusBadgeClass - Get status badge CSS class
 */
function OrdersTable({
  orders,
  onViewDetails,
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
}) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <span className="material-icons">inbox</span>
        <h3>Nenhum pedido encontrado</h3>
        <p>Clique em sincronizar para buscar pedidos do Mercado Livre</p>
      </div>
    );
  }

  return (
    <div className="orders-table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>ID Pedido</th>
            <th>Data</th>
            <th>Comprador</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const orderId = order.id || order.mlOrderId || order.ml_order_id;
            const dateCreated = order.dateCreated || order.date_created;
            const totalAmount = order.totalAmount || order.total_amount || 0;
            const currencyId = order.currencyId || order.currency_id || "BRL";
            const orderItems = order.orderItems || order.order_items || [];

            return (
              <tr key={order._id || orderId}>
                <td className="order-id">#{orderId}</td>
                <td>{formatDate(dateCreated)}</td>
                <td>
                  <div className="buyer-info">
                    <span>{order.buyer?.nickname || "N/A"}</span>
                  </div>
                </td>
                <td>
                  <div className="items-preview">
                    {orderItems.slice(0, 2).map((item, idx) => (
                      <span key={idx} className="item-title">
                        {(item.title || item.item?.title)?.substring(0, 30)}...
                      </span>
                    ))}
                    {orderItems.length > 2 && (
                      <span className="more-items">
                        +{orderItems.length - 2} mais
                      </span>
                    )}
                  </div>
                </td>
                <td className="order-total">
                  {formatCurrency(totalAmount, currencyId)}
                </td>
                <td>
                  <span
                    className={`badge ${getStatusBadgeClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon"
                      title="Ver detalhes"
                      onClick={() => onViewDetails(orderId)}
                      aria-label={`Ver detalhes do pedido ${orderId}`}
                    >
                      <span className="material-icons">visibility</span>
                    </button>
                    <a
                      href={`https://www.mercadolivre.com.br/vendas/${orderId}/detalhe`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      title="Ver no ML"
                      aria-label={`Ver pedido ${orderId} no Mercado Livre`}
                    >
                      <span className="material-icons">open_in_new</span>
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

OrdersTable.propTypes = {
  orders: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      status: PropTypes.string,
      buyer: PropTypes.shape({
        nickname: PropTypes.string,
      }),
    }),
  ).isRequired,
  onViewDetails: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  getStatusBadgeClass: PropTypes.func.isRequired,
};

export default OrdersTable;
